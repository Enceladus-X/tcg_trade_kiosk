'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Trash2, Minus, Plus, Receipt } from 'lucide-react'
import { useCart } from '@/lib/use-cart'
import { formatPrice, rarityColors } from '@/lib/mock-cards'

export function PurchaseList() {
  const { items, total, totalQuantity, updateQuantity, removeItem, clearCart } =
    useCart()

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      {/* Header - Compact */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">매입 목록</h2>
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={clearCart}
          >
            전체삭제
          </Button>
        )}
      </div>

      {/* Items - Scrollable with fixed height */}
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            매입할 카드를 선택하세요
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map((item) => {
              const colors = rarityColors[item.rarity]

              return (
                <div
                  key={`${item.cardId}-${item.rarity}`}
                  className="group relative px-2 py-1.5 hover:bg-muted/30"
                >
                  {/* Main row - ultra compact */}
                  <div className="flex items-start gap-2">
                    {/* Rarity badge */}
                    <span
                      className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.text}`}
                    >
                      {item.rarity}
                    </span>

                    {/* Card info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium leading-tight">
                        {item.cardName}
                      </p>
                      <p className="text-[10px] leading-tight text-muted-foreground">
                        {item.cardCode}
                      </p>
                    </div>

                    {/* Delete button - appears on hover */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeItem(item.cardId, item.rarity)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>

                  {/* Quantity and price row */}
                  <div className="mt-1 flex items-center justify-between pl-7">
                    {/* Quantity controls - minimal */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.cardId,
                            item.rarity,
                            item.quantity - 1
                          )
                        }
                        className="flex h-5 w-5 items-center justify-center rounded border border-border text-xs hover:bg-muted"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="min-w-6 text-center text-xs tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.cardId,
                            item.rarity,
                            item.quantity + 1
                          )
                        }
                        className="flex h-5 w-5 items-center justify-center rounded border border-border text-xs hover:bg-muted"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    {/* Price */}
                    <span className="text-xs font-medium tabular-nums">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer - Total and Confirm */}
      <div className="border-t border-border bg-muted/30 p-3">
        {/* Summary */}
        <div className="mb-3 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>총 수량</span>
            <span className="tabular-nums">{totalQuantity}개</span>
          </div>
          <Separator />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">총 매입가</span>
            <span className="text-xl font-bold text-primary tabular-nums">
              {formatPrice(total)}
            </span>
          </div>
        </div>

        {/* Confirm Button */}
        <Button
          className="h-12 w-full text-base font-semibold"
          disabled={items.length === 0}
        >
          매입 확정
        </Button>
      </div>
    </div>
  )
}
