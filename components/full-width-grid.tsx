'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { Settings, Search, X, Power } from 'lucide-react'
import { searchCards, type CardWithStatus, type CardPrice, rarityColors, getRarityColors } from '@/lib/mock-cards'
import { useCards, useTabs } from '@/lib/use-cards'
import { useGames } from '@/lib/use-games'
import { useStoreSettings } from '@/lib/use-settings'
import { GameNavBar } from '@/components/game-nav-bar'

interface FullWidthGridProps {
  onCardClick: (card: CardWithStatus) => void
  onGlobalAdminClick: () => void
}

function getActivePrices(card: CardWithStatus): CardPrice[] {
  return card.prices.filter(
    (p) => p.price > 0 && card.enabledRarities[p.rarity] !== false
  )
}

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR')
}

export function FullWidthGrid({ onCardClick, onGlobalAdminClick }: FullWidthGridProps) {
  const { cards } = useCards()
  const { tabs, tabObjects } = useTabs()
  const { games } = useGames()
  const { globalRarities } = useStoreSettings()

  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<string>(() => tabs[0] ?? '')
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI
  const hasGames = games.length > 0

  // 게임 목록 로드 후 첫 게임 자동 선택
  useEffect(() => {
    if (hasGames && !selectedGame && games.length > 0) {
      setSelectedGame(games[0].id)
    }
  }, [games]) // eslint-disable-line react-hooks/exhaustive-deps

  // 게임 선택 시 해당 게임의 첫 번째 탭으로 초기화
  useEffect(() => {
    if (selectedGame) {
      const firstTab = tabObjects.find(t => t.game_id === selectedGame)
      setSelectedTab(firstTab?.name ?? tabs[0] ?? '')
    }
    setSelectedRarity(null)
    setSearchQuery('')
  }, [selectedGame]) // eslint-disable-line react-hooks/exhaustive-deps

  // 현재 보여줄 탭 목록
  const visibleTabs = useMemo(() => {
    if (!hasGames) return tabs
    if (selectedGame) return tabObjects.filter(t => t.game_id === selectedGame).map(t => t.name)
    return []
  }, [hasGames, selectedGame, tabs, tabObjects])

  const activeTab = visibleTabs.includes(selectedTab) ? selectedTab : (visibleTabs[0] ?? '')

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
    else setSearchQuery('')
  }, [searchOpen])

  // 현재 탭에서 실제로 존재하는 레어도만 필터 버튼 표시 (useEffect 보다 먼저 선언)
  const activeRarities = useMemo(() => {
    const byTab = cards.filter(c => c.category === activeTab)
    const raritySet = new Set<string>()
    byTab.forEach(card => {
      card.prices.forEach(p => {
        if (card.enabledRarities[p.rarity] && p.price > 0) raritySet.add(p.rarity)
      })
    })
    return globalRarities.filter(r => raritySet.has(r))
  }, [cards, activeTab, globalRarities])

  useEffect(() => {
    if (selectedRarity && !activeRarities.includes(selectedRarity)) {
      setSelectedRarity(null)
    }
  }, [activeRarities]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredCards = useMemo(() => {
    const byTab = cards.filter(c => c.category === activeTab)
    const searched = searchCards(byTab, searchQuery)
    const byRarity = selectedRarity
      ? searched.filter(card =>
          card.enabledRarities[selectedRarity] &&
          card.prices.some(p => p.rarity === selectedRarity && p.price > 0)
        )
      : searched
    return [...byRarity].sort((a, b) => {
      const maxPrice = (card: CardWithStatus) =>
        getActivePrices(card).reduce((max, p) => Math.max(max, p.price), 0)
      return maxPrice(b) - maxPrice(a)
    })
  }, [cards, activeTab, searchQuery, selectedRarity])

  return (
    <div className="flex h-full flex-col">
      {/* 매장 타이틀 배너 */}
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-950 px-6 py-2">
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-extrabold tracking-tight text-amber-400">
            {hasGames && selectedGame
              ? (() => { const n = games.find(g => g.id === selectedGame)?.name; return n ? `마린포드 ${n} 매입표` : '마린포드 매입표' })()
              : '마린포드 싱글카드 매매표'
            }
          </span>
          <span className="text-xs text-zinc-600">카드를 선택하면 매입가를 확인할 수 있습니다</span>
        </div>
      </div>

      {/* 게임 네비게이션 바 — hasGames 이면 항상 표시 */}
      {hasGames && (
        <GameNavBar
          games={games}
          selectedGameId={selectedGame}
          onSelect={setSelectedGame}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {searchOpen ? (
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="카드 검색..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <div
                className="flex flex-1 gap-1 overflow-x-auto"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
              >
                {visibleTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-amber-500 text-black'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setSearchOpen(v => !v)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-colors ${
                searchOpen
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>

            <button
              onClick={onGlobalAdminClick}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <Settings className="h-5 w-5" />
            </button>

            {isElectron && (
              <button
                onClick={() => window.close()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-600 transition-colors hover:border-red-900 hover:bg-red-950/50 hover:text-red-400"
                title="프로그램 종료"
              >
                <Power className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

      {/* 레어도 필터 바 */}
      {activeRarities.length > 0 && (
        <div
          className="shrink-0 flex items-center gap-2 overflow-x-auto border-b border-zinc-800/60 bg-zinc-950 px-4 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          <button
            onClick={() => setSelectedRarity(null)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              selectedRarity === null
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            전체
          </button>
          {activeRarities.map(rarity => {
            const colors = getRarityColors(rarity)
            const isSelected = selectedRarity === rarity
            return (
              <button
                key={rarity}
                onClick={() => setSelectedRarity(isSelected ? null : rarity)}
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
      )}

      {/* 카드 그리드 */}
      <div className="flex-1 overflow-auto px-4 pb-4 pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={`cards-${activeTab}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6">
              {filteredCards.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.15 }}
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
      className="group relative w-full overflow-hidden rounded-xl bg-zinc-900 transition-all active:scale-95 hover:ring-2 hover:ring-amber-500"
      style={{ aspectRatio: '3 / 4' }}
    >
      <Image
        src={card.imageUrl}
        alt={card.name}
        fill
        className={`object-contain transition-opacity ${
          card.isStopped ? 'brightness-40 grayscale' : ''
        }`}
        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1280px) 20vw, 16.67vw"
      />

      {card.isStopped && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white shadow-lg">
            매입 중지
          </span>
        </div>
      )}

      {!card.isStopped && activePrices.length > 0 && (
        <PriceOverlay prices={activePrices} />
      )}
    </button>
  )
}

const RARITY_BADGE: Record<string, { bg: string; color: string }> = {
  N:   { bg: 'rgba(82,82,91,0.95)',    color: '#e4e4e7' },
  R:   { bg: 'rgba(37,99,235,0.95)',   color: '#fff'    },
  SR:  { bg: 'rgba(217,119,6,0.95)',   color: '#000'    },
  UR:  { bg: 'rgba(225,29,72,0.95)',   color: '#fff'    },
  UL:  { bg: 'rgba(147,51,234,0.95)', color: '#fff'    },
  SE:  { bg: 'rgba(5,150,105,0.95)',   color: '#fff'    },
  PSE: { bg: 'rgba(14,165,233,0.95)',  color: '#000'    },
}
const EXTRA_BADGE: { bg: string; color: string }[] = [
  { bg: 'rgba(131,24,67,0.95)',  color: '#fce7f3' },
  { bg: 'rgba(19,78,74,0.95)',   color: '#ccfbf1' },
  { bg: 'rgba(124,45,18,0.95)',  color: '#ffedd5' },
  { bg: 'rgba(49,46,129,0.95)',  color: '#e0e7ff' },
  { bg: 'rgba(54,83,20,0.95)',   color: '#ecfccb' },
  { bg: 'rgba(22,78,99,0.95)',   color: '#cffafe' },
]

const RARITY_PRICE_COLOR: Record<string, string> = {
  N:   '#a1a1aa',
  R:   '#93c5fd',
  SR:  '#fcd34d',
  UR:  '#fda4af',
  UL:  '#d8b4fe',
  SE:  '#6ee7b7',
  PSE: '#7dd3fc',
}
const EXTRA_PRICE_COLOR = ['#f9a8d4','#99f6e4','#fdba74','#a5b4fc','#bef264','#67e8f9']

function strHashGrid(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
function getBadge(r: string)      { return RARITY_BADGE[r]       ?? EXTRA_BADGE[strHashGrid(r) % EXTRA_BADGE.length] }
function getPriceColor(r: string) { return RARITY_PRICE_COLOR[r]  ?? EXTRA_PRICE_COLOR[strHashGrid(r) % EXTRA_PRICE_COLOR.length] }

function PriceOverlay({ prices }: { prices: CardPrice[] }) {
  const sorted = [...prices].sort((a, b) => b.price - a.price)

  return (
    <div
      className="absolute bottom-0 right-0 rounded-tl-lg px-3 py-2 backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,0.72)' }}
    >
      <div className="flex flex-col items-end gap-1">
        {sorted.map((p) => {
          const badge      = getBadge(p.rarity)
          const priceColor = getPriceColor(p.rarity)
          return (
            <div key={p.rarity} className="flex items-center gap-1.5">
              <span
                className="shrink-0 rounded px-2 py-1 text-sm font-black leading-none"
                style={{ background: badge.bg, color: badge.color }}
              >
                {p.rarity}
              </span>
              <span
                className="text-3xl font-black leading-none tracking-tight drop-shadow-[0_1px_6px_rgba(0,0,0,1)]"
                style={{ color: priceColor }}
              >
                {formatPrice(p.price)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
