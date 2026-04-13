'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Minus, Plus, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Card } from '@/lib/mock-cards'
import { formatPrice, rarityColors } from '@/lib/mock-cards'
import { useCart } from '@/lib/use-cart'

interface CardModalProps {
  card: Card | null
  open: boolean
  onClose: () => void
}

const rarities = ['N', 'R', 'SR', 'UR', 'UL', 'SE', 'PSR'] as const

export function CardModal({ card, open, onClose }: CardModalProps) {
  const [selectedRarity, setSelectedRarity] = useState<string>('N')
  const [quantity, setQuantity] = useState(1)
  const { addItem } = useCart()

  if (!card) return null

  const selectedPrice = card.prices.find(p => p.rarity === selectedRarity)?.price ?? 0

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        cardId: card.id,
        cardName: card.name,
        cardCode: card.code,
        rarity: selectedRarity,
        price: selectedPrice,
      })
    }
    setQuantity(1)
    setSelectedRarity('N')
    onClose()
  }

  const handleClose = () => {
    setQuantity(1)
    setSelectedRarity('N')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left: Card Image */}
          <div className="md:w-1/2 bg-zinc-950 flex items-center justify-center p-8">
            <div className="relative w-48 h-72 rounded-lg overflow-hidden shadow-2xl">
              <Image
                src={card.imageUrl}
                alt={card.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>

          {/* Right: Selection Area */}
          <div className="md:w-1/2 p-6 flex flex-col">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold text-zinc-100">
                {card.name}
              </DialogTitle>
              <p className="text-sm text-zinc-500">{card.code}</p>
            </DialogHeader>

            {/* Rarity Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">
                레어리티 선택
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {rarities.map(rarity => {
                  const colors = rarityColors[rarity]
                  const price = card.prices.find(p => p.rarity === rarity)?.price ?? 0
                  const isSelected = selectedRarity === rarity

                  return (
                    <button
                      key={rarity}
                      onClick={() => setSelectedRarity(rarity)}
                      className={`
                        relative px-3 py-2 rounded-lg text-center transition-all
                        ${colors.bg} ${colors.text} border-2
                        ${isSelected ? 'border-white ring-2 ring-white/30 scale-105' : colors.border + ' hover:scale-102'}
                      `}
                    >
                      <div className="font-bold text-sm">{rarity}</div>
                      <div className="text-xs opacity-80">
                        {formatPrice(price)}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">수량</h3>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-10 w-10 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-2xl font-bold text-zinc-100 w-12 text-center">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-10 w-10 bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">선택 금액</span>
                <span className="text-2xl font-bold text-amber-400">
                  {formatPrice(selectedPrice * quantity)}
                </span>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-zinc-900 font-bold text-lg"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              장바구니에 추가
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
