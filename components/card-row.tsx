'use client'

import Image from 'next/image'
import { memo, useState } from 'react'
import type { Card } from '@/lib/mock-cards'
import { rarityColors, formatPrice } from '@/lib/mock-cards'
import { useCart } from '@/lib/use-cart'
import { cn } from '@/lib/utils'

interface CardRowProps {
  card: Card
}

// Memoized to prevent unnecessary re-renders in virtual list
export const CardRow = memo(function CardRow({ card }: CardRowProps) {
  const { addItem } = useCart()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [clickedRarity, setClickedRarity] = useState<string | null>(null)

  const handlePriceClick = (rarity: string, price: number) => {
    addItem({
      cardId: card.id,
      cardName: card.name,
      cardCode: card.code,
      rarity,
      price,
    })

    // Visual feedback
    setClickedRarity(rarity)
    setTimeout(() => setClickedRarity(null), 150)
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors">
      {/* Card thumbnail with lazy loading */}
      <div className="relative w-14 h-20 flex-shrink-0 bg-muted rounded overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-muted" />
        )}
        <Image
          src={card.imageUrl}
          alt={card.name}
          fill
          sizes="56px"
          className={cn(
            'object-cover transition-opacity duration-200',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />
      </div>

      {/* Card info */}
      <div className="flex-shrink-0 w-40">
        <p className="font-medium text-sm text-foreground truncate">{card.name}</p>
        <p className="text-xs text-muted-foreground">{card.code}</p>
      </div>

      {/* Rarity price buttons */}
      <div className="flex-1 flex items-center gap-2 flex-wrap">
        {card.prices.map(({ rarity, price }) => {
          const colors = rarityColors[rarity]
          const isClicked = clickedRarity === rarity

          return (
            <button
              key={rarity}
              onClick={() => handlePriceClick(rarity, price)}
              className={cn(
                'flex flex-col items-center px-3 py-1.5 rounded border transition-all',
                'hover:scale-105 hover:shadow-lg active:scale-95',
                colors.bg,
                colors.text,
                colors.border,
                isClicked && 'ring-2 ring-white ring-offset-1 ring-offset-background'
              )}
            >
              <span className="text-[10px] font-bold">{rarity}</span>
              <span className="text-xs font-medium">{formatPrice(price)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
})
