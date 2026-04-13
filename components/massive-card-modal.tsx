'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Minus, Plus, ShoppingCart, Check } from 'lucide-react'
import { type Card, formatPrice, rarityColors } from '@/lib/mock-cards'
import { useCart } from '@/lib/use-cart'

interface MassiveCardModalProps {
  card: Card | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const rarityLabels: Record<string, string> = {
  N: 'Normal',
  R: 'Rare',
  SR: 'Super Rare',
  UR: 'Ultra Rare',
  UL: 'Ultimate',
  SE: 'Secret',
  PSR: 'Prismatic',
}

export function MassiveCardModal({ card, open, onOpenChange }: MassiveCardModalProps) {
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [showSuccess, setShowSuccess] = useState(false)
  const { addItem } = useCart()

  if (!card) return null

  const selectedPrice = card.prices.find(p => p.rarity === selectedRarity)

  const handleAddToPurchase = () => {
    if (!selectedPrice) return

    for (let i = 0; i < quantity; i++) {
      addItem({
        cardId: card.id,
        cardName: card.name,
        cardCode: card.code,
        rarity: selectedRarity!,
        price: selectedPrice.price,
      })
    }

    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setSelectedRarity(null)
      setQuantity(1)
      onOpenChange(false)
    }, 800)
  }

  const handleClose = () => {
    setSelectedRarity(null)
    setQuantity(1)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="w-[90vw] max-w-none h-[85vh] max-h-none p-0 bg-zinc-900 border-zinc-700 overflow-hidden"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{card.name} 카드 선택</DialogTitle>
        
        <div className="flex h-full">
          {/* Left: Huge Card Image */}
          <div className="w-1/2 bg-zinc-950 flex items-center justify-center p-8 relative">
            <div className="relative w-full max-w-md aspect-[3/4] rounded-xl overflow-hidden shadow-2xl">
              <Image
                src={card.imageUrl}
                alt={card.name}
                fill
                className="object-cover"
                sizes="40vw"
                priority
              />
              {/* Holographic overlay effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />
            </div>
            
            {/* Card info overlay */}
            <div className="absolute bottom-8 left-8 right-8">
              <div className="bg-zinc-900/90 backdrop-blur-sm rounded-lg p-4">
                <h2 className="text-2xl font-bold text-white">{card.name}</h2>
                <p className="text-zinc-400 text-lg">{card.code}</p>
              </div>
            </div>
          </div>

          {/* Right: Selection Panel */}
          <div className="w-1/2 flex flex-col p-8 bg-zinc-900">
            {/* Rarity Selection */}
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-zinc-300 mb-6">레어도 선택</h3>
              <div className="grid grid-cols-2 gap-4">
                {card.prices.map(({ rarity, price }) => {
                  const colors = rarityColors[rarity]
                  const isSelected = selectedRarity === rarity
                  return (
                    <button
                      key={rarity}
                      onClick={() => setSelectedRarity(rarity)}
                      className={`
                        relative p-6 rounded-xl border-2 transition-all duration-200
                        flex flex-col items-start justify-between min-h-[120px]
                        ${isSelected 
                          ? `${colors.bg} ${colors.border} ring-2 ring-white/30 scale-[1.02]` 
                          : `bg-zinc-800 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-750`
                        }
                      `}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-2xl font-bold ${isSelected ? colors.text : 'text-white'}`}>
                          {rarity}
                        </span>
                        {isSelected && (
                          <Check className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <p className={`text-xs uppercase tracking-wide ${isSelected ? colors.text : 'text-zinc-500'}`}>
                          {rarityLabels[rarity]}
                        </p>
                        <p className={`text-xl font-semibold mt-1 ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                          {formatPrice(price)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quantity & Add Button */}
            <div className="mt-8 space-y-6">
              {/* Quantity Selector */}
              <div className="flex items-center justify-between bg-zinc-800 rounded-xl p-4">
                <span className="text-lg font-medium text-zinc-300">수량</span>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-14 w-14 rounded-xl border-zinc-600 bg-zinc-700 hover:bg-zinc-600"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="w-6 h-6" />
                  </Button>
                  <span className="text-4xl font-bold text-white w-16 text-center">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-14 w-14 rounded-xl border-zinc-600 bg-zinc-700 hover:bg-zinc-600"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="w-6 h-6" />
                  </Button>
                </div>
              </div>

              {/* Total Price Display */}
              {selectedPrice && (
                <div className="bg-zinc-800 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-lg text-zinc-400">총 매입가</span>
                  <span className="text-3xl font-bold text-amber-400">
                    {formatPrice(selectedPrice.price * quantity)}
                  </span>
                </div>
              )}

              {/* Add to Purchase Button */}
              <Button
                onClick={handleAddToPurchase}
                disabled={!selectedRarity || showSuccess}
                className={`
                  w-full h-20 text-2xl font-bold rounded-xl transition-all duration-200
                  ${showSuccess 
                    ? 'bg-emerald-600 hover:bg-emerald-600' 
                    : 'bg-amber-500 hover:bg-amber-400 text-zinc-900'
                  }
                `}
              >
                {showSuccess ? (
                  <span className="flex items-center gap-3">
                    <Check className="w-8 h-8" />
                    추가됨!
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <ShoppingCart className="w-8 h-8" />
                    매입 추가
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
