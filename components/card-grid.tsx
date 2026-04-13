'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { mockCards, searchCards, type Card } from '@/lib/mock-cards'
import { CardModal } from './card-modal'

interface CardItemProps {
  card: Card
  onClick: () => void
}

function CardItem({ card, onClick }: CardItemProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <button
      onClick={onClick}
      className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-800/50 border border-zinc-700/50 transition-all duration-300 hover:scale-105 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
    >
      {/* Loading skeleton */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
      )}

      {/* Card Image */}
      <Image
        src={card.imageUrl}
        alt={card.name}
        fill
        className={`object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
        onLoad={() => setImageLoaded(true)}
      />

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-sm font-medium text-zinc-100 truncate">{card.name}</p>
          <p className="text-xs text-zinc-400">{card.code}</p>
        </div>
      </div>

      {/* Selection indicator */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-amber-500 rounded-xl transition-colors duration-300" />
    </button>
  )
}

export function CardGrid() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const filteredCards = useMemo(() => {
    return searchCards(mockCards, searchQuery)
  }, [searchQuery])

  const handleCardClick = (card: Card) => {
    setSelectedCard(card)
    setModalOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <Input
            type="text"
            placeholder="카드 이름 또는 코드로 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-amber-500/50"
          />
        </div>
        <p className="text-sm text-zinc-500 mt-2">
          {filteredCards.length}개 카드 검색됨
        </p>
      </div>

      {/* Card Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredCards.map(card => (
            <CardItem
              key={card.id}
              card={card}
              onClick={() => handleCardClick(card)}
            />
          ))}
        </div>

        {filteredCards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Search className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">검색 결과가 없습니다</p>
            <p className="text-sm">다른 검색어를 시도해보세요</p>
          </div>
        )}
      </div>

      {/* Card Modal */}
      <CardModal
        card={selectedCard}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
