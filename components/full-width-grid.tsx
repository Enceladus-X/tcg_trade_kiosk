'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Power, Search, X } from 'lucide-react'
import { searchCards, type CardWithStatus, type CardPrice, getRarityColors } from '@/lib/mock-cards'
import { useCards, useTabs } from '@/lib/use-cards'
import { useGames } from '@/lib/use-games'
import { useStoreSettings } from '@/lib/use-settings'

interface FullWidthGridProps {
  onCardClick: (card: CardWithStatus) => void
  searchOpen: boolean
  searchQuery: string
  onSearchQueryChange: (q: string) => void
}

function getActivePrices(card: CardWithStatus): CardPrice[] {
  return card.prices.filter(
    (p) => p.price > 0 && card.enabledRarities[p.rarity] !== false
  )
}

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR')
}

export function FullWidthGrid({ onCardClick, searchOpen, searchQuery, onSearchQueryChange }: FullWidthGridProps) {
  const { cards } = useCards()
  const { tabs, tabObjects } = useTabs()
  const { games } = useGames()
  const { globalRarities } = useStoreSettings()

  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<string>(() => tabs[0] ?? '')
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null)
  const [tabMenuOpen, setTabMenuOpen] = useState(false)

  const tabMenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const initializedGameRef = useRef<string | null>(null)
  const selectedTabRef = useRef(selectedTab)

  const isElectron = typeof window !== 'undefined' && !!(window as { electronAPI?: unknown }).electronAPI
  const hasGames = games.length > 0

  useEffect(() => {
    if (hasGames && !selectedGame && games.length > 0) {
      setSelectedGame(games[0].id)
    }
  }, [games, hasGames, selectedGame])

  useEffect(() => {
    selectedTabRef.current = selectedTab
  }, [selectedTab])

  useEffect(() => {
    if (!selectedGame) return

    const hasInitializedGame = initializedGameRef.current === selectedGame
    const nextVisibleTabs = tabObjects
      .filter((tab) => tab.game_id === selectedGame)
      .map((tab) => tab.name)
    const fallbackTab = nextVisibleTabs[0] ?? tabs[0] ?? ''

    if (!hasInitializedGame) {
      initializedGameRef.current = selectedGame
      setSelectedTab(fallbackTab)
      setSelectedRarity(null)
      return
    }

    const currentSelectedTab = selectedTabRef.current
    if (currentSelectedTab !== '__ALL_TABS__' && currentSelectedTab && nextVisibleTabs.includes(currentSelectedTab)) {
      return
    }

    setSelectedTab(fallbackTab)
  }, [selectedGame, tabObjects, tabs])

  useEffect(() => {
    if (!tabMenuOpen) return

    const handler = (event: MouseEvent) => {
      if (tabMenuRef.current && !tabMenuRef.current.contains(event.target as Node)) {
        setTabMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [tabMenuOpen])

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus()
    }
  }, [searchOpen])

  const visibleTabs = useMemo(() => {
    if (!hasGames) return tabs
    if (selectedGame) {
      return tabObjects.filter((tab) => tab.game_id === selectedGame).map((tab) => tab.name)
    }
    return []
  }, [hasGames, selectedGame, tabs, tabObjects])

  const activeTab = visibleTabs.includes(selectedTab) ? selectedTab : (visibleTabs[0] ?? '')
  const selectedGameName = selectedGame
    ? games.find((game) => game.id === selectedGame)?.name ?? null
    : null

  const allTabsValue = '__ALL_TABS__'
  const selectableTabs = useMemo(
    () => [{ value: allTabsValue, label: '전체' }, ...visibleTabs.map((tab) => ({ value: tab, label: tab }))],
    [visibleTabs]
  )
  const isAllTabsSelected = selectedTab === allTabsValue
  const activeTabLabel = isAllTabsSelected ? '전체' : activeTab

  useEffect(() => {
    setTabMenuOpen(false)
  }, [selectedTab, selectedGame])

  const activeRarities = useMemo(() => {
    const visibleTabSet = new Set(visibleTabs)
    const byTab = isAllTabsSelected
      ? cards.filter((card) => visibleTabSet.has(card.category))
      : cards.filter((card) => card.category === activeTab)

    const raritySet = new Set<string>()
    byTab.forEach((card) => {
      card.prices.forEach((price) => {
        if (card.enabledRarities[price.rarity] && price.price > 0) {
          raritySet.add(price.rarity)
        }
      })
    })

    return globalRarities.filter((rarity) => raritySet.has(rarity))
  }, [cards, activeTab, globalRarities, isAllTabsSelected, visibleTabs])

  useEffect(() => {
    if (selectedRarity && !activeRarities.includes(selectedRarity)) {
      setSelectedRarity(null)
    }
  }, [activeRarities, selectedRarity])

  const filteredCards = useMemo(() => {
    const visibleTabSet = new Set(visibleTabs)
    const byTab = isAllTabsSelected
      ? cards.filter((card) => visibleTabSet.has(card.category))
      : cards.filter((card) => card.category === activeTab)

    const searched = searchQuery ? searchCards(byTab, searchQuery) : byTab
    const byRarity = selectedRarity
      ? searched.filter(
          (card) =>
            card.enabledRarities[selectedRarity] &&
            card.prices.some((price) => price.rarity === selectedRarity && price.price > 0)
        )
      : searched

    return [...byRarity].sort((a, b) => {
      const maxPrice = (card: CardWithStatus) =>
        getActivePrices(card).reduce((max, price) => Math.max(max, price.price), 0)
      return maxPrice(b) - maxPrice(a)
    })
  }, [cards, activeTab, isAllTabsSelected, selectedRarity, visibleTabs, searchQuery])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const preloadTargets = filteredCards
      .slice(0, 48)
      .map((card) => card.imageUrl)
      .filter(Boolean)

    if (preloadTargets.length === 0) return

    const preload = () => {
      preloadTargets.forEach((src) => {
        const image = new window.Image()
        image.decoding = 'async'
        image.src = src
      })
    }

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => preload(), { timeout: 1200 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = window.setTimeout(preload, 180)
    return () => window.clearTimeout(timeoutId)
  }, [filteredCards])

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-sm">
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2">
          <div className="w-fit max-w-[min(56vw,680px)] rounded-b-[2rem] border border-zinc-700/60 border-t-0 bg-zinc-950/84 px-8 py-3 shadow-[0_18px_34px_rgba(0,0,0,0.36)] backdrop-blur-xl">
            <p className="truncate text-center text-[1.7rem] font-black tracking-tight text-amber-300 xl:text-[2rem]">
              {`마린포드 ${selectedGameName ?? ''} 매입표`}
            </p>
          </div>
        </div>

        <div className="flex items-stretch">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-h-[5rem] items-end px-3 pb-1 pt-2">
              {isElectron && (
                <button
                  onClick={() => window.close()}
                  aria-label="프로그램 종료"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-600 transition-colors hover:border-red-900 hover:bg-red-950/50 hover:text-red-400"
                  title="프로그램 종료"
                >
                  <Power className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="flex min-h-[3rem] items-center gap-2 border-t border-zinc-800/60 px-3 py-1">
              {searchOpen ? (
                <div className="flex min-w-[220px] items-center gap-2 rounded-xl border border-amber-500/60 bg-zinc-900 px-3 py-2">
                  <Search className="h-4 w-4 shrink-0 text-amber-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    placeholder="카드 검색..."
                    aria-label="카드 검색 입력"
                    data-testid="search-input"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => onSearchQueryChange('')}
                      aria-label="검색어 지우기"
                      className="text-zinc-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative shrink-0" ref={tabMenuRef}>
                  <button
                    type="button"
                    aria-label="하위 탭 선택"
                    data-testid="tab-dropdown-trigger"
                    onClick={() => setTabMenuOpen((open) => !open)}
                    className="flex min-w-[220px] items-center justify-between rounded-xl border border-amber-400/60 bg-zinc-900 px-4 py-2 text-sm font-bold text-white shadow-[0_8px_22px_rgba(0,0,0,0.28)] transition-colors hover:border-amber-300"
                  >
                    <span className="truncate">{activeTabLabel || '탭 선택'}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-amber-300 transition-transform ${tabMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {tabMenuOpen && selectableTabs.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="absolute left-0 top-[calc(100%+8px)] z-30 min-w-[220px] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl"
                      >
                        {selectableTabs.map((tab, index) => {
                          const isActive = tab.value === selectedTab || (tab.value === allTabsValue && isAllTabsSelected)
                          return (
                            <motion.button
                              key={tab.value}
                              type="button"
                              data-testid={`tab-option-${tab.value}`}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.02, duration: 0.12 }}
                              onClick={() => {
                                setSelectedTab(tab.value)
                                setTabMenuOpen(false)
                              }}
                              className={`block w-full px-4 py-3 text-left text-sm font-semibold transition-colors ${
                                isActive ? 'bg-amber-500 text-black' : 'text-zinc-200 hover:bg-zinc-800'
                              }`}
                            >
                              {tab.label}
                            </motion.button>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div
                className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
              >
                <button
                  onClick={() => setSelectedRarity(null)}
                  aria-label="전체 레어도 보기"
                  data-testid="rarity-filter-all"
                  className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    selectedRarity === null
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  전체
                </button>
                {activeRarities.map((rarity) => {
                  const colors = getRarityColors(rarity)
                  const isSelected = selectedRarity === rarity
                  return (
                    <button
                      key={rarity}
                      onClick={() => setSelectedRarity(isSelected ? null : rarity)}
                      aria-label={`${rarity} 레어도 필터`}
                      data-testid={`rarity-filter-${rarity}`}
                      className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
                        isSelected
                          ? `${colors.bg} ${colors.text} ring-2 ring-white/20`
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                      }`}
                    >
                      {rarity}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {hasGames && (
            <div className="flex shrink-0 items-center gap-3 px-3 py-2">
              {games.map((game) => {
                const isSelected = game.id === selectedGame
                const hasImage = Boolean(game.imageUrl)
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => setSelectedGame(game.id)}
                    aria-label={`${game.name} 선택`}
                    data-testid={`game-button-${game.id}`}
                    title={game.name}
                    className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-[1.9rem] border shadow-[0_18px_36px_rgba(0,0,0,0.42)] transition-all ${
                      isSelected
                        ? 'border-amber-300/90 bg-zinc-800 shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_18px_36px_rgba(0,0,0,0.42)]'
                        : 'border-zinc-700/90 bg-zinc-800 hover:border-zinc-500'
                    } ${hasImage ? 'h-[5.75rem] w-[10.5rem]' : 'h-[5.75rem] min-w-[148px] px-4'}`}
                  >
                    {hasImage ? (
                      <div className="flex h-full w-full items-center justify-center p-2">
                        <div className="h-full w-full overflow-hidden rounded-2xl bg-white">
                          <img
                            src={game.imageUrl ?? ''}
                            alt={game.name}
                            className="h-full w-full object-contain p-1.5"
                            onError={(event) => {
                              ;(event.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <span className={`max-w-[112px] truncate text-base font-black ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                          {game.name}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4 pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={`cards-${selectedGame ?? 'none'}-${selectedTab}-${selectedRarity ?? 'all'}-${searchQuery || 'nosearch'}`}
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6">
              {filteredCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.18), duration: 0.12 }}
                >
                  <CardTile card={card} onClick={() => onCardClick(card)} />
                </motion.div>
              ))}
            </div>

            {filteredCards.length === 0 && (
              <div className="flex h-64 items-center justify-center">
                <p className="text-zinc-500">
                  {searchQuery
                    ? `"${searchQuery}" 검색 결과 없음`
                    : visibleTabs.length === 0
                    ? hasGames ? '게임에 탭을 배정하세요' : '탭을 먼저 생성하세요'
                    : '카드가 없습니다'}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function CardTile({ card, onClick }: { card: CardWithStatus; onClick: () => void }) {
  const activePrices = getActivePrices(card)

  return (
    <button
      onClick={onClick}
      aria-label={`${card.name} 카드 상세 보기`}
      data-testid={`card-tile-${card.code}`}
      className="group relative w-full overflow-hidden rounded-xl bg-zinc-900 transition-all active:scale-95 hover:ring-2 hover:ring-amber-500"
      style={{ aspectRatio: '3 / 4' }}
    >
      <Image
        src={card.imageUrl}
        alt={card.name}
        fill
        className={`object-contain transition-opacity ${card.isStopped ? 'brightness-40 grayscale' : ''}`}
        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1280px) 20vw, 16.67vw"
      />

      {card.isStopped && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white shadow-lg">
            매입 중지
          </span>
        </div>
      )}

      {!card.isStopped && activePrices.length > 0 && <PriceOverlay prices={activePrices} />}
    </button>
  )
}

const RARITY_BADGE: Record<string, { bg: string; color: string }> = {
  N: { bg: 'rgba(82,82,91,0.95)', color: '#e4e4e7' },
  R: { bg: 'rgba(37,99,235,0.95)', color: '#fff' },
  P: { bg: 'linear-gradient(132deg, rgba(202,240,255,0.96) 0%, rgba(214,225,255,0.96) 18%, rgba(245,214,255,0.94) 36%, rgba(255,236,214,0.92) 54%, rgba(220,255,244,0.92) 74%, rgba(213,228,255,0.96) 100%)', color: '#ffffff' },
  SR: { bg: 'rgba(217,119,6,0.95)', color: '#000' },
  UR: { bg: 'rgba(225,29,72,0.95)', color: '#fff' },
  UL: { bg: 'rgba(147,51,234,0.95)', color: '#fff' },
  SE: { bg: 'rgba(5,150,105,0.95)', color: '#fff' },
  PSE: { bg: 'rgba(14,165,233,0.95)', color: '#000' },
}

const EXTRA_BADGE: { bg: string; color: string }[] = [
  { bg: 'rgba(131,24,67,0.95)', color: '#fce7f3' },
  { bg: 'rgba(19,78,74,0.95)', color: '#ccfbf1' },
  { bg: 'rgba(124,45,18,0.95)', color: '#ffedd5' },
  { bg: 'rgba(49,46,129,0.95)', color: '#e0e7ff' },
  { bg: 'rgba(54,83,20,0.95)', color: '#ecfccb' },
  { bg: 'rgba(22,78,99,0.95)', color: '#cffafe' },
]

const RARITY_PRICE_COLOR: Record<string, string> = {
  N: '#a1a1aa',
  R: '#93c5fd',
  P: '#fff4ff',
  SR: '#fcd34d',
  UR: '#fda4af',
  UL: '#d8b4fe',
  SE: '#6ee7b7',
  PSE: '#7dd3fc',
}

const EXTRA_PRICE_COLOR = ['#f9a8d4', '#99f6e4', '#fdba74', '#a5b4fc', '#bef264', '#67e8f9']

function strHashGrid(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function isPrismRarityGrid(rarity: string) {
  const normalized = rarity.trim().toLowerCase()
  return normalized === 'p' || rarity.includes('★')
}

function getBadge(rarity: string) {
  if (isPrismRarityGrid(rarity)) {
    return {
      bg: 'linear-gradient(132deg, rgba(202,240,255,0.96) 0%, rgba(214,225,255,0.96) 18%, rgba(245,214,255,0.94) 36%, rgba(255,236,214,0.92) 54%, rgba(220,255,244,0.92) 74%, rgba(213,228,255,0.96) 100%)',
      color: '#31265d',
    }
  }
  return RARITY_BADGE[rarity] ?? EXTRA_BADGE[strHashGrid(rarity) % EXTRA_BADGE.length]
}

function getBadgeTextStyle(rarity: string) {
  if (isPrismRarityGrid(rarity)) {
    return {
      WebkitTextStroke: '0.45px rgba(255,255,255,0.72)',
      textShadow: '0 1px 0 rgba(255,255,255,0.82), 0 1px 4px rgba(255,255,255,0.15)',
    } as const
  }

  return undefined
}

function getPriceColor(rarity: string) {
  return RARITY_PRICE_COLOR[rarity] ?? EXTRA_PRICE_COLOR[strHashGrid(rarity) % EXTRA_PRICE_COLOR.length]
}

function getPriceStyle(rarity: string) {
  if (isPrismRarityGrid(rarity)) {
    return {
      color: '#d9c2ff',
      WebkitTextStroke: '0.85px rgba(37,28,74,0.96)',
      textShadow: '0 1px 0 rgba(255,255,255,0.16), 0 2px 10px rgba(0,0,0,0.62), 0 0 10px rgba(130,235,255,0.16)',
    } as const
  }

  return { color: getPriceColor(rarity) }
}

function PriceOverlay({ prices }: { prices: CardPrice[] }) {
  const sorted = [...prices].sort((a, b) => b.price - a.price)

  return (
    <div
      className="absolute bottom-0 right-0 rounded-tl-lg px-3 py-2 backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,0.72)' }}
    >
      <div className="flex flex-col items-end gap-1">
        {sorted.map((price) => {
          const badge = getBadge(price.rarity)
          const badgeTextStyle = getBadgeTextStyle(price.rarity)
          const priceStyle = getPriceStyle(price.rarity)
          return (
            <div key={price.rarity} className="flex items-center gap-1.5">
              <span
                className="shrink-0 rounded px-2 py-1 text-sm font-black leading-none"
                style={{ background: badge.bg, color: badge.color, ...badgeTextStyle }}
              >
                {price.rarity}
              </span>
              <span
                className="text-3xl font-black leading-none tracking-tight drop-shadow-[0_1px_6px_rgba(0,0,0,1)]"
                style={priceStyle}
              >
                {formatPrice(price.price)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
