'use client'

import { useEffect, useState } from 'react'
import { useIsFetching } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Settings, ShoppingCart, Search, Wifi, WifiOff, RefreshCw, X } from 'lucide-react'
import { FullWidthGrid } from '@/components/full-width-grid'
import { CardDetailModal } from '@/components/card-detail-modal'
import { CartListModal } from '@/components/cart-list-modal'
import { GlobalAdminModal } from '@/components/global-admin-modal'
import { PinAuthOverlay } from '@/components/pin-auth-overlay'
import { useCart } from '@/lib/use-cart'
import { type CardWithStatus } from '@/lib/mock-cards'
import { useStoreSettings } from '@/lib/use-settings'

export default function POSPage() {
  const [selectedCard, setSelectedCard] = useState<CardWithStatus | null>(null)
  const [cartModalOpen, setCartModalOpen] = useState(false)
  const [globalAdminModalOpen, setGlobalAdminModalOpen] = useState(false)
  const [showGlobalPinOverlay, setShowGlobalPinOverlay] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const { totalQuantity } = useCart()
  const { lastUpdatedAt } = useStoreSettings()
  const isFetching = useIsFetching() > 0

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setIsOnline(window.navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const handleGlobalPinSuccess = () => {
    setShowGlobalPinOverlay(false)
    setGlobalAdminModalOpen(true)
  }

  const handleSearchToggle = () => {
    if (searchOpen) setSearchQuery('')
    setSearchOpen((value) => !value)
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      <main className="flex-1 overflow-hidden">
        <FullWidthGrid
          onCardClick={setSelectedCard}
          searchOpen={searchOpen}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
      </main>

      <div className="pointer-events-none fixed left-6 top-4 z-30">
        <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-[0_10px_26px_rgba(0,0,0,0.35)] backdrop-blur-md ${
          !isOnline
            ? 'border-red-500/40 bg-red-500/15 text-red-200'
            : isFetching
            ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
            : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
        }`}>
          {!isOnline ? (
            <WifiOff className="h-4 w-4" />
          ) : isFetching ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Wifi className="h-4 w-4" />
          )}
          <span>
            {!isOnline ? '오프라인' : isFetching ? '동기화 중' : '동기화 정상'}
          </span>
          {lastUpdatedAt && (
            <span className="text-[11px] opacity-80">
              {new Date(lastUpdatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 left-6 z-30">
        <button
          onClick={() => setShowGlobalPinOverlay(true)}
          aria-label="환경설정"
          data-testid="settings-button"
          className="flex h-20 w-20 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/95 text-zinc-300 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all hover:bg-zinc-800 hover:text-white active:scale-95"
          title="환경설정"
        >
          <Settings className="h-9 w-9" />
        </button>
      </div>

      <div className="fixed bottom-28 right-6 z-30">
        <button
          onClick={handleSearchToggle}
          aria-label="카드 검색"
          data-testid="search-button"
          className={`flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 shadow-[0_18px_42px_rgba(0,0,0,0.48)] backdrop-blur-md transition-all active:scale-95 ${
            searchOpen
              ? 'border-cyan-300 bg-cyan-400 text-zinc-950 hover:bg-cyan-300'
              : 'border-cyan-500/80 bg-cyan-500/18 text-cyan-200 hover:border-cyan-300 hover:bg-cyan-400/28 hover:text-white'
          }`}
          title="카드 검색"
        >
          {searchOpen ? <X className="h-7 w-7" /> : <Search className="h-7 w-7" />}
        </button>
      </div>

      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setCartModalOpen(true)}
          aria-label="장바구니 열기"
          data-cart-button="true"
          data-testid="cart-button"
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-amber-500 text-black shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition-all hover:bg-amber-400 active:scale-95"
        >
          <ShoppingCart className="h-9 w-9" />
          {totalQuantity > 0 && (
            <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {totalQuantity > 99 ? '99+' : totalQuantity}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {selectedCard && (
          <CardDetailModal key="card-detail" card={selectedCard} onClose={() => setSelectedCard(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cartModalOpen && (
          <CartListModal key="cart" onClose={() => setCartModalOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGlobalPinOverlay && (
          <motion.div
            key="pin"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <PinAuthOverlay
              onSuccess={handleGlobalPinSuccess}
              onCancel={() => setShowGlobalPinOverlay(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {globalAdminModalOpen && (
          <GlobalAdminModal key="admin" onClose={() => setGlobalAdminModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
