'use client'

import { useState } from 'react'
import { Plus, ShoppingCart } from 'lucide-react'
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

  const handleCardClick = (card: CardWithStatus) => {
    setSelectedCard(card)
  }

  const handleCloseCardModal = () => {
    setSelectedCard(null)
  }

  const handleGlobalAdminClick = () => {
    setShowGlobalPinOverlay(true)
  }

  const handleGlobalPinSuccess = () => {
    setShowGlobalPinOverlay(false)
    setGlobalAdminModalOpen(true)
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      {/* Main Content - Full Width Card Grid */}
      <main className="flex-1 overflow-hidden">
        <FullWidthGrid 
          onCardClick={handleCardClick} 
          onGlobalAdminClick={handleGlobalAdminClick}
        />
      </main>

      {/* Floating Action Buttons - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-3">
        {/* Quick Add Button (opens admin) */}
        <button
          onClick={handleGlobalAdminClick}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 shadow-lg transition-all hover:bg-zinc-700 hover:text-white active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* Cart Button with Badge */}
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

      {/* 70% Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={handleCloseCardModal}
        />
      )}

      {/* Cart/Purchase List Modal with Checkout */}
      {cartModalOpen && (
        <CartListModal onClose={() => setCartModalOpen(false)} />
      )}

      {/* Global Admin PIN Overlay */}
      {showGlobalPinOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <PinAuthOverlay
            onSuccess={handleGlobalPinSuccess}
            onCancel={() => setShowGlobalPinOverlay(false)}
          />
        </div>
      )}

      {/* Global Admin Dashboard Modal */}
      {globalAdminModalOpen && (
        <GlobalAdminModal onClose={() => setGlobalAdminModalOpen(false)} />
      )}
    </div>
  )
}
