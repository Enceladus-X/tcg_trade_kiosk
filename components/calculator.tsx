'use client'

import { Minus, Plus, Trash2, Receipt } from 'lucide-react'
import { useCart } from '@/lib/use-cart'
import { formatPrice, rarityColors } from '@/lib/mock-cards'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Calculator() {
  const { items, total, totalQuantity, updateQuantity, removeItem, clearCart } = useCart()

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-foreground" />
          <h2 className="font-bold text-lg text-foreground">매입 계산기</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalQuantity > 0 ? `${totalQuantity}개 항목` : '카드를 선택하세요'}
        </p>
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Receipt className="w-12 h-12 mb-2 opacity-30" />
            <p className="text-sm">좌측 리스트에서 레어도 버튼을</p>
            <p className="text-sm">클릭하여 추가하세요</p>
          </div>
        ) : (
          items.map(item => {
            const colors = rarityColors[item.rarity]
            return (
              <div
                key={`${item.cardId}-${item.rarity}`}
                className="p-3 rounded-lg bg-muted/50 border border-border"
              >
                {/* Card info row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {item.cardName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {item.cardCode}
                      </span>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-bold',
                          colors.bg,
                          colors.text
                        )}
                      >
                        {item.rarity}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.cardId, item.rarity)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Quantity and price row */}
                <div className="flex items-center justify-between">
                  {/* Quantity controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        updateQuantity(item.cardId, item.rarity, item.quantity - 1)
                      }
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium text-foreground">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        updateQuantity(item.cardId, item.rarity, item.quantity + 1)
                      }
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Subtotal */}
                  <p className="font-medium text-sm text-foreground">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Total footer */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">총 매입가</span>
          <span className="text-2xl font-bold text-foreground">
            {formatPrice(total)}
          </span>
        </div>
        {items.length > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={clearCart}
          >
            초기화
          </Button>
        )}
      </div>
    </div>
  )
}
