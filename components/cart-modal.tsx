'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Minus, Plus, Trash2, Receipt, CheckCircle } from 'lucide-react'
import { useCart } from '@/lib/use-cart'
import { formatPrice, rarityColors } from '@/lib/mock-cards'
import { useState } from 'react'

interface CartModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartModal({ open, onOpenChange }: CartModalProps) {
  const { items, total, totalQuantity, updateQuantity, removeItem, clearCart } = useCart()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleConfirmPurchase = () => {
    setShowConfirm(true)
    setTimeout(() => {
      clearCart()
      setShowConfirm(false)
      onOpenChange(false)
    }, 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[90vw] max-w-2xl h-[85vh] max-h-none p-0 bg-zinc-900 border-zinc-700 overflow-hidden flex flex-col"
        aria-describedby={undefined}
      >
        <DialogHeader className="px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Receipt className="w-7 h-7 text-amber-500" />
            매입 목록
            {totalQuantity > 0 && (
              <span className="bg-amber-500 text-zinc-900 text-sm font-bold px-3 py-1 rounded-full">
                {totalQuantity}개
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {showConfirm ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-16 h-16 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-white">매입 완료!</h3>
            <p className="text-zinc-400">총 {formatPrice(total)} 매입 처리되었습니다.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-500">
            <Receipt className="w-16 h-16 opacity-30" />
            <p className="text-lg">매입 목록이 비어있습니다</p>
            <p className="text-sm">카드를 선택하여 매입 목록에 추가하세요</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-6">
              <div className="py-4 space-y-3">
                {items.map((item) => {
                  const colors = rarityColors[item.rarity]
                  return (
                    <div
                      key={`${item.cardId}-${item.rarity}`}
                      className="bg-zinc-800 rounded-xl p-4 flex items-center gap-4"
                    >
                      {/* Card Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white truncate">{item.cardName}</h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors.bg} ${colors.text}`}>
                            {item.rarity}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500">{item.cardCode}</p>
                        <p className="text-amber-400 font-medium mt-1">{formatPrice(item.price)} / 장</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-lg border-zinc-600 bg-zinc-700 hover:bg-zinc-600"
                          onClick={() => updateQuantity(item.cardId, item.rarity, item.quantity - 1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="text-xl font-bold text-white w-10 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-lg border-zinc-600 bg-zinc-700 hover:bg-zinc-600"
                          onClick={() => updateQuantity(item.cardId, item.rarity, item.quantity + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Item Total */}
                      <div className="text-right min-w-[100px]">
                        <p className="text-lg font-bold text-white">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => removeItem(item.cardId, item.rarity)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            {/* Footer: Total & Confirm */}
            <div className="border-t border-zinc-800 p-6 space-y-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xl text-zinc-400">총 매입가</span>
                <span className="text-4xl font-bold text-amber-400">{formatPrice(total)}</span>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-14 text-lg border-zinc-600 hover:bg-zinc-800"
                  onClick={() => clearCart()}
                >
                  전체 삭제
                </Button>
                <Button
                  className="flex-1 h-14 text-lg bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold"
                  onClick={handleConfirmPurchase}
                >
                  매입 확정
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
