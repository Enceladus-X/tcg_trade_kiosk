'use client'

import { ShoppingCart, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/use-cart'

interface FloatingActionsProps {
  onCartClick: () => void
  onAddClick: () => void
}

export function FloatingActions({ onCartClick, onAddClick }: FloatingActionsProps) {
  const { totalQuantity } = useCart()

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
      {/* Quick Add Button */}
      <Button
        onClick={onAddClick}
        size="icon"
        className="h-14 w-14 rounded-full bg-zinc-700 hover:bg-zinc-600 shadow-lg shadow-black/30 border border-zinc-600"
      >
        <Plus className="w-7 h-7" />
      </Button>

      {/* Cart Button with Badge */}
      <Button
        onClick={onCartClick}
        size="icon"
        className="h-16 w-16 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-900 shadow-lg shadow-amber-500/30 relative"
      >
        <ShoppingCart className="w-8 h-8" />
        
        {/* Notification Badge */}
        {totalQuantity > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[24px] h-6 px-1.5 flex items-center justify-center bg-red-500 text-white text-sm font-bold rounded-full animate-in zoom-in-50 duration-200">
            {totalQuantity > 99 ? '99+' : totalQuantity}
          </span>
        )}
      </Button>
    </div>
  )
}
