'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ShoppingCart, X } from 'lucide-react'
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
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { totalQuantity } = useCart()

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus()
    } else {
      setSearchQuery('')
    }
  }, [searchOpen])

  const handleGlobalAdminClick = () => {
    setShowGlobalPinOverlay(true)
  }

  const handleGlobalPinSuccess = () => {
    setShowGlobalPinOverlay(false)
    setGlobalAdminModalOpen(true)
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <FullWidthGrid
          onCardClick={setSelectedCard}
          onGlobalAdminClick={handleGlobalAdminClick}
          searchQuery={searchQuery}
        />
      </main>

      {/* Floating Action Buttons - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-3">
        {/* Search Button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 shadow-lg transition-all hover:bg-zinc-700 hover:text-white active:scale-95"
        >
          <Search className="h-6 w-6" />
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

      {/* Search Overlay */}
      {searchOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          />
          <div className="fixed left-1/2 top-20 z-50 w-full max-w-xl -translate-x-1/2 px-4">
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-2xl">
              <Search className="h-5 w-5 shrink-0 text-zinc-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="카드 검색..."
                className="flex-1 bg-transparent text-lg text-white placeholder:text-zinc-600 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={() => setSearchOpen(false)}
                className="shrink-0 rounded-lg px-3 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                닫기
              </button>
            </div>
          </div>
        </>
      )}

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}

      {/* Cart Modal */}
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
