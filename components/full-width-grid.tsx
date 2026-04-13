'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Search, Settings } from 'lucide-react'
import { searchCards, type CardWithStatus } from '@/lib/mock-cards'
import { useCards } from '@/lib/use-cards'

interface FullWidthGridProps {
  onCardClick: (card: CardWithStatus) => void
  onGlobalAdminClick: () => void
}

export function FullWidthGrid({ onCardClick, onGlobalAdminClick }: FullWidthGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { cards } = useCards()

  const filteredCards = useMemo(
    () => searchCards(cards, searchQuery),
    [cards, searchQuery]
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header with Search and Global Admin */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="카드 검색..."
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
            />
          </div>
          
          {/* Global Admin Settings Button */}
          <button
            onClick={onGlobalAdminClick}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Card Grid */}
      <div className="flex-1 overflow-auto px-4 pb-24">
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
          {filteredCards.map((card) => (
            <button
              key={card.id}
              onClick={() => onCardClick(card)}
              className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-800 transition-all hover:ring-2 hover:ring-amber-500 active:scale-95"
            >
              <Image
                src={card.imageUrl}
                alt={card.name}
                fill
                className={`object-cover transition-transform group-hover:scale-105 ${
                  card.isStopped ? 'grayscale brightness-50' : ''
                }`}
                sizes="(max-width: 640px) 25vw, (max-width: 768px) 20vw, (max-width: 1024px) 16.67vw, 10vw"
              />
              
              {/* "매입 중지" Badge */}
              {card.isStopped && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold text-white shadow-lg">
                    매입 중지
                  </span>
                </div>
              )}
              
              {/* Subtle overlay on hover (only for active cards) */}
              {!card.isStopped && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </button>
          ))}
        </div>

        {filteredCards.length === 0 && (
          <div className="flex h-64 items-center justify-center">
            <p className="text-zinc-500">검색 결과가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
