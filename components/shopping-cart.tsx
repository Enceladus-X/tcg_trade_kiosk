'use client'

import { Minus, Plus, Trash2, ShoppingCart, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCart } from '@/lib/use-cart'
import { formatPrice, rarityColors } from '@/lib/mock-cards'

export function ShoppingCartSidebar() {
  const { items, total, totalQuantity, updateQuantity, removeItem, clearCart } = useCart()

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-zinc-100">장바구니</h2>
          </div>
          {items.length > 0 && (
            <span className="px-2 py-1 bg-amber-500 text-zinc-900 text-xs font-bold rounded-full">
              {totalQuantity}
            </span>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-zinc-500">
            <ShoppingCart className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-center">장바구니가 비어있습니다</p>
            <p className="text-sm text-center mt-1">
              카드를 클릭하여 추가하세요
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {items.map(item => {
              const colors = rarityColors[item.rarity]

              return (
                <div
                  key={`${item.cardId}-${item.rarity}`}
                  className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-100 truncate text-sm">
                        {item.cardName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${colors.bg} ${colors.text}`}
                        >
                          {item.rarity}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {item.cardCode}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.cardId, item.rarity)}
                      className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          updateQuantity(item.cardId, item.rarity, item.quantity - 1)
                        }
                        className="h-7 w-7 bg-zinc-700 border-zinc-600 hover:bg-zinc-600"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-bold text-zinc-100 text-sm">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          updateQuantity(item.cardId, item.rarity, item.quantity + 1)
                        }
                        className="h-7 w-7 bg-zinc-700 border-zinc-600 hover:bg-zinc-600"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Item Total */}
                    <span className="font-bold text-amber-400 text-sm">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer - Total & Actions */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm">
        {items.length > 0 && (
          <Button
            variant="ghost"
            onClick={clearCart}
            className="w-full mb-3 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            전체 삭제
          </Button>
        )}

        {/* Total Display */}
        <div className="bg-zinc-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-zinc-400">총 수량</span>
            <span className="font-medium text-zinc-100">{totalQuantity}개</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">총 금액</span>
            <span className="text-2xl font-bold text-amber-400">
              {formatPrice(total)}
            </span>
          </div>
        </div>

        {/* Confirm Button */}
        <Button
          disabled={items.length === 0}
          className="w-full h-14 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-bold text-lg"
        >
          <CreditCard className="h-5 w-5 mr-2" />
          결제하기
        </Button>
      </div>
    </div>
  )
}
