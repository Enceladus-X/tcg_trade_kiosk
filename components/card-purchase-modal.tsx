'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import type { Card } from '@/lib/mock-cards'
import { formatPrice, rarityColors } from '@/lib/mock-cards'
import { useCart } from '@/lib/use-cart'

interface CardPurchaseModalProps {
  card: Card | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CardPurchaseModal({
  card,
  open,
  onOpenChange,
}: CardPurchaseModalProps) {
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const { addItem } = useCart()

  // Reset state when card changes
  useEffect(() => {
    if (card) {
      setSelectedRarity(null)
      setQuantity(1)
    }
  }, [card])

  if (!card) return null

  const selectedPrice = card.prices.find((p) => p.rarity === selectedRarity)?.price
  const totalPrice = selectedPrice ? selectedPrice * quantity : 0

  const handleAddToPurchase = () => {
    if (!selectedRarity || !selectedPrice) return

    // Add item multiple times based on quantity
    for (let i = 0; i < quantity; i++) {
      addItem({
        cardId: card.id,
        cardName: card.name,
        cardCode: card.code,
        rarity: selectedRarity,
        price: selectedPrice,
      })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{card.name} 매입</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row">
          {/* Left: Large Card Image */}
          <div className="flex items-center justify-center bg-zinc-900 p-8 md:w-1/2">
            <div className="relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-xl shadow-2xl">
              <img
                src={card.imageUrl}
                alt={card.name}
                className="h-full w-full object-cover"
              />
              {/* Holographic overlay effect */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
            </div>
          </div>

          {/* Right: Selection Panel */}
          <div className="flex flex-col p-6 md:w-1/2">
            {/* Card Info */}
            <div className="mb-6">
              <p className="mb-1 text-xs text-muted-foreground">{card.code}</p>
              <h2 className="text-2xl font-bold tracking-tight">{card.name}</h2>
            </div>

            {/* Rarity Selection */}
            <div className="mb-6">
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                레어도 선택
              </p>
              <div className="grid grid-cols-4 gap-2">
                {card.prices.map(({ rarity, price }) => {
                  const colors = rarityColors[rarity]
                  const isSelected = selectedRarity === rarity

                  return (
                    <button
                      key={rarity}
                      onClick={() => setSelectedRarity(rarity)}
                      className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all ${
                        isSelected
                          ? `${colors.bg} ${colors.border} ring-2 ring-primary ring-offset-2 ring-offset-background`
                          : `border-border bg-muted/50 hover:border-muted-foreground/50`
                      }`}
                    >
                      <span
                        className={`text-lg font-bold ${
                          isSelected ? colors.text : 'text-foreground'
                        }`}
                      >
                        {rarity}
                      </span>
                      <span
                        className={`text-xs ${
                          isSelected ? colors.text : 'text-muted-foreground'
                        }`}
                      >
                        {formatPrice(price)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="mb-6">
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                수량
              </p>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <span className="min-w-16 text-center text-3xl font-bold tabular-nums">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Price Summary */}
            <div className="mt-auto space-y-4">
              {selectedRarity && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      선택된 레어도
                    </span>
                    <Badge className={`${rarityColors[selectedRarity].bg} ${rarityColors[selectedRarity].text}`}>
                      {selectedRarity}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      합계 ({quantity}개)
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>
              )}

              <Button
                size="lg"
                className="h-14 w-full gap-2 text-lg"
                disabled={!selectedRarity}
                onClick={handleAddToPurchase}
              >
                <ShoppingCart className="h-5 w-5" />
                매입 추가
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
