'use client'

import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { FullWidthGrid } from '@/components/full-width-grid'
import { CardDetailModal } from '@/components/card-detail-modal'
import { CartListModal } from '@/components/cart-list-modal'
import { GlobalAdminModal } from '@/components/global-admin-modal'
import { PinAuthOverlay } from '@/components/pin-auth-overlay'
import { useCart } from '@/lib/use-cart'
import { type CardWithStatus } from '@/lib/mock-cards'

export default function POSPage() {
  const [selectedCard, setSelectedCard] = useState<CardWithStatus | null>(null)
  const [cartModalOpen, setCartModalOpen] = useState(false)
  const [globalAdminModalOpen, setGlobalAdminModalOpen] = useState(false)
  const [showGlobalPinOverlay, setShowGlobalPinOverlay] = useState(false)
  const { totalQuantity } = useCart()

  const handleGlobalPinSuccess = () => {
    setShowGlobalPinOverlay(false)
    setGlobalAdminModalOpen(true)
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      <main className="flex-1 overflow-hidden">
        <FullWidthGrid
          onCardClick={setSelectedCard}
          onGlobalAdminClick={() => setShowGlobalPinOverlay(true)}
        />
      </main>

      {/* 장바구니 플로팅 버튼 */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setCartModalOpen(true)}
          className="relative flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-black shadow-lg transition-all hover:bg-amber-400 active:scale-95"
        >
          <ShoppingCart className="h-7 w-7" />
          {totalQuantity > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {totalQuantity > 99 ? '99+' : totalQuantity}
            </span>
          )}
        </button>
      </div>

      {selectedCard && (
        <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}

      {cartModalOpen && (
        <CartListModal onClose={() => setCartModalOpen(false)} />
      )}

      {showGlobalPinOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <PinAuthOverlay
            onSuccess={handleGlobalPinSuccess}
            onCancel={() => setShowGlobalPinOverlay(false)}
          />
        </div>
      )}

      {globalAdminModalOpen && (
        <GlobalAdminModal onClose={() => setGlobalAdminModalOpen(false)} />
      )}
    </div>
  )
}
