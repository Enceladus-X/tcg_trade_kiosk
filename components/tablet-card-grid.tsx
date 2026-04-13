'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { type Card, mockCards, searchCards } from '@/lib/mock-cards'

interface TabletCardGridProps {
  onCardClick: (card: Card) => void
}

export function TabletCardGrid({ onCardClick }: TabletCardGridProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCards = useMemo(() => 
    searchCards(mockCards, searchQuery),
    [searchQuery]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-zinc-800">
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input
            placeholder="카드명 또는 코드로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-10 h-12 bg-zinc-800/50 border-zinc-700 text-lg"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Card Grid - Full Width */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
          {filteredCards.map((card) => (
            <button
              key={card.id}
              onClick={() => onCardClick(card)}
              className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-800 border-2 border-transparent hover:border-amber-500/50 transition-all duration-200 hover:scale-[1.03] hover:shadow-xl hover:shadow-amber-500/10 focus:outline-none focus:border-amber-500"
            >
              <Image
                src={card.imageUrl}
                alt={card.name}
                fill
                className="object-cover transition-transform duration-200 group-hover:scale-105"
                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 16vw, (max-width: 1536px) 12vw, 10vw"
              />
              
              {/* Subtle overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Card name on hover */}
              <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                <p className="text-xs font-medium text-white truncate text-center">
                  {card.name}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Empty State */}
        {filteredCards.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
            <Search className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg">검색 결과가 없습니다</p>
            <p className="text-sm">다른 검색어를 입력해 보세요</p>
          </div>
        )}
      </div>
    </div>
  )
}
