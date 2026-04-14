'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Settings, Search, X, Power } from 'lucide-react'
import { searchCards, type CardWithStatus } from '@/lib/mock-cards'
import { useCards, useTabs } from '@/lib/use-cards'

interface FullWidthGridProps {
  onCardClick: (card: CardWithStatus) => void
  onGlobalAdminClick: () => void
}

export function FullWidthGrid({ onCardClick, onGlobalAdminClick }: FullWidthGridProps) {
  const { cards } = useCards()
  const { tabs } = useTabs()
  const [selectedTab, setSelectedTab] = useState<string>(() => tabs[0] ?? '')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const activeTab = tabs.includes(selectedTab) ? selectedTab : (tabs[0] ?? '')
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
    else setSearchQuery('')
  }, [searchOpen])

  const filteredCards = useMemo(() => {
    const byTab = cards.filter(c => c.category === activeTab)
    return searchCards(byTab, searchQuery)
  }, [cards, activeTab, searchQuery])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {searchOpen ? (
            /* 검색 모드 */
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
            /* 탭 모드 */
            <div
              className="flex flex-1 gap-1 overflow-x-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
            >
              {tabs.map((tab) => (
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

          {/* 검색 토글 */}
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

          {/* 관리자 설정 */}
          <button
            onClick={onGlobalAdminClick}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* 앱 종료 - Electron 환경에서만 표시 */}
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

      {/* Card Grid */}
      <div className="flex-1 overflow-auto px-4 pb-2 pt-2">
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
          {filteredCards.map((card) => (
            <button
              key={card.id}
              onClick={() => onCardClick(card)}
              className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-900 transition-all hover:ring-2 hover:ring-amber-500 active:scale-95"
            >
              <Image
                src={card.imageUrl}
                alt={card.name}
                fill
                className={`object-contain transition-opacity ${
                  card.isStopped ? 'grayscale brightness-50' : ''
                }`}
                sizes="(max-width: 640px) 25vw, (max-width: 768px) 20vw, (max-width: 1024px) 16.67vw, 10vw"
              />
              {card.isStopped && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white shadow-lg">
                    매입 중지
                  </span>
                </div>
              )}
              {!card.isStopped && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </button>
          ))}
        </div>

        {filteredCards.length === 0 && (
          <div className="flex h-64 items-center justify-center">
            <p className="text-zinc-500">
              {searchQuery ? `"${searchQuery}" 검색 결과 없음` : tabs.length === 0 ? '탭을 먼저 생성하세요' : '카드가 없습니다'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
