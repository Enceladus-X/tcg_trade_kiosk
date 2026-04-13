'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { mockCards, searchCards, type Card } from '@/lib/mock-cards'
import { CardPurchaseModal } from './card-purchase-modal'

export function POSCardGrid() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const filteredCards = useMemo(
    () => searchCards(mockCards, searchQuery),
    [searchQuery]
  )

  const handleCardClick = (card: Card) => {
    setSelectedCard(card)
    setModalOpen(true)
  }

  return (
    <>
      <div className="flex flex-col gap-4 p-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="카드명 또는 코드로 검색..."
            className="h-10 pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground">
          {filteredCards.length}개의 카드
        </p>

        {/* Card Grid - Clean, minimal padding */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {filteredCards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-zinc-800 transition-all hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              {/* Card Image */}
              <img
                src={card.imageUrl}
                alt={card.name}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />

              {/* Subtle hover overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              {/* Card name on hover */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 translate-y-full p-1.5 transition-transform group-hover:translate-y-0">
                <p className="truncate text-center text-[10px] font-medium text-white">
                  {card.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Large Modal */}
      <CardPurchaseModal
        card={selectedCard}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}
