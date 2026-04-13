'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Settings } from 'lucide-react'
import { searchCards, type CardWithStatus } from '@/lib/mock-cards'
import { useCards, useTabs } from '@/lib/use-cards'

interface FullWidthGridProps {
  onCardClick: (card: CardWithStatus) => void
  onGlobalAdminClick: () => void
  searchQuery: string
}

export function FullWidthGrid({ onCardClick, onGlobalAdminClick, searchQuery }: FullWidthGridProps) {
  const { cards } = useCards()
  const { tabs } = useTabs()
  const [selectedTab, setSelectedTab] = useState<string>(() => tabs[0] ?? '')

  const activeTab = tabs.includes(selectedTab) ? selectedTab : (tabs[0] ?? '')

  const filteredCards = useMemo(() => {
    const byTab = cards.filter(c => c.category === activeTab)
    return searchCards(byTab, searchQuery)
  }, [cards, activeTab, searchQuery])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 px-4 py-3 backdrop-blur-sm">
        {/* Top row: tab bar + settings */}
        <div className="flex items-center gap-2">
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
          <button
            onClick={onGlobalAdminClick}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <Settings className="h-5 w-5" />
          </button>
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
              {tabs.length === 0 ? '탭을 먼저 생성하세요' : '카드가 없습니다'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
