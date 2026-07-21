'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { Settings, Minus, Plus, Check, X, Save, ShoppingCart, Trash2 } from 'lucide-react'
import { type CardWithStatus, type CardPrice, getRarityColors, formatPrice } from '@/lib/mock-cards'
import { useCart } from '@/lib/use-cart'
import { useCards, useTabs } from '@/lib/use-cards'
import { useGames } from '@/lib/use-games'
import { useStoreSettings } from '@/lib/use-settings'
import { PinAuthOverlay } from './pin-auth-overlay'
import { RarityPicker, ALL_RARITIES, type RarityKey } from '@/components/rarity-picker'
import { ImageUploadField } from '@/components/image-upload-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CardDetailModalProps {
  card: CardWithStatus
  onClose: () => void
  initialEditMode?: boolean
}

export function CardDetailModal({ card, onClose, initialEditMode = false }: CardDetailModalProps) {
  const { globalRarities } = useStoreSettings()
  const { tabObjects } = useTabs()
  const { games } = useGames()
  const availableEditRarities: readonly string[] = globalRarities.length > 0 ? globalRarities : ALL_RARITIES
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [showPinOverlay, setShowPinOverlay] = useState(false)
  const [added, setAdded] = useState(false)
  const [editMode, setEditMode] = useState(initialEditMode)
  
  // Edit mode state - 모든 레어도 포함
  const [editName, setEditName] = useState(card.name)
  const [editImageUrl, setEditImageUrl] = useState(card.imageUrl)
  const [editGameId, setEditGameId] = useState<string | null>(card.gameId ?? null)
  const [editTabId, setEditTabId] = useState<string | null>(card.tabId ?? null)
  const [editEnabledRarities, setEditEnabledRarities] = useState<Record<string, boolean>>(() => {
    const base = Object.fromEntries(availableEditRarities.map(r => [r, false]))
    return { ...base, ...card.enabledRarities }
  })
  const [editPrices, setEditPrices] = useState<Record<string, number>>(() => {
    const base = Object.fromEntries(availableEditRarities.map(r => [r, 0]))
    card.prices.forEach(p => { base[p.rarity] = p.price })
    return base
  })

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [cartFlyAnim, setCartFlyAnim] = useState<{
    startX: number
    startY: number
    deltaX: number
    deltaY: number
  } | null>(null)

  const { addItem } = useCart()
  const { updateCardAsync, deleteCard } = useCards()

  const fallbackTab = useMemo(
    () => tabObjects.find((tab) => tab.name === card.category) ?? null,
    [card.category, tabObjects]
  )

  const availableTabsForGame = useMemo(() => {
    if (!editGameId) return tabObjects
    return tabObjects.filter((tab) => tab.game_id === editGameId)
  }, [editGameId, tabObjects])

  useEffect(() => {
    setEditEnabledRarities((prev) => {
      const base = Object.fromEntries(availableEditRarities.map(r => [r, false]))
      for (const rarity of availableEditRarities) {
        if (rarity in prev) base[rarity] = prev[rarity]
      }
      return { ...base, ...card.enabledRarities }
    })

    setEditPrices((prev) => {
      const base = Object.fromEntries(availableEditRarities.map(r => [r, 0]))
      for (const rarity of availableEditRarities) {
        if (rarity in prev) base[rarity] = prev[rarity]
      }
      card.prices.forEach(p => { base[p.rarity] = p.price })
      return base
    })
  }, [availableEditRarities, card.enabledRarities, card.prices])

  useEffect(() => {
    setEditName(card.name)
    setEditImageUrl(card.imageUrl)
    setEditGameId(card.gameId ?? fallbackTab?.game_id ?? null)
    setEditTabId(card.tabId ?? fallbackTab?.id ?? null)
  }, [card.gameId, card.imageUrl, card.name, card.tabId, fallbackTab])

  useEffect(() => {
    if (availableTabsForGame.length === 0) {
      setEditTabId(null)
      return
    }

    const isCurrentTabVisible = editTabId
      ? availableTabsForGame.some((tab) => tab.id === editTabId)
      : false

    if (!isCurrentTabVisible && editGameId) {
      setEditTabId(availableTabsForGame[0].id)
    }
  }, [availableTabsForGame, editGameId, editTabId])

  // Filter to only show enabled rarities for purchase
  const availableRarities = card.prices.filter(p => card.enabledRarities[p.rarity] && p.price > 0)
  const selectedPrice = card.prices.find(p => p.rarity === selectedRarity)?.price || 0
  const totalPrice = selectedPrice * quantity

  const handleAddToCart = useCallback(() => {
    if (!selectedRarity || !selectedPrice) return

    const addButton = document.querySelector('[data-add-to-cart-button="true"]') as HTMLElement | null
    const cartButton = document.querySelector('[data-cart-button="true"]') as HTMLElement | null
    if (addButton && cartButton) {
      const addRect = addButton.getBoundingClientRect()
      const cartRect = cartButton.getBoundingClientRect()
      const startX = addRect.left + addRect.width / 2 - 24
      const startY = addRect.top + addRect.height / 2 - 24
      const targetX = cartRect.left + cartRect.width / 2 - 24
      const targetY = cartRect.top + cartRect.height / 2 - 24
      setCartFlyAnim({
        startX,
        startY,
        deltaX: targetX - startX,
        deltaY: targetY - startY,
      })
    }

    for (let i = 0; i < quantity; i++) {
      addItem({
        cardId: card.id,
        cardName: card.name,
        cardCode: card.code,
        rarity: selectedRarity,
        price: selectedPrice,
        paymentMethod: 'cash',
      })
    }

    setAdded(true)
    setTimeout(() => {
      onClose()
    }, 420)
  }, [selectedRarity, selectedPrice, quantity, card, addItem, onClose])

  const handlePinSuccess = useCallback(() => {
    setShowPinOverlay(false)
    setEditMode(true)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    // 가격은 보존하고, enabledRarities로 레어도별 매입 가능 여부를 분리한다.
    const newPrices = availableEditRarities
      .filter(r => (editPrices[r] || 0) > 0)
      .map(r => ({ rarity: r as RarityKey, price: editPrices[r] }))
    const newEnabledRarities = Object.fromEntries(
      availableEditRarities.map(r => [r, editEnabledRarities[r] && (editPrices[r] || 0) > 0])
    )
    const hasEnabledPrice = Object.values(newEnabledRarities).some(Boolean)
    const selectedTab = tabObjects.find((tab) => tab.id === editTabId) ?? null

    setSaveError(null)
    try {
      await updateCardAsync(card.id, {
        name: editName,
        category: selectedTab?.name ?? card.category,
        gameId: editGameId,
        tabId: selectedTab?.id ?? null,
        imageUrl: editImageUrl,
        enabledRarities: newEnabledRarities,
        prices: newPrices as CardPrice[],
        isStopped: !hasEnabledPrice,
      })
      setEditMode(false)
      onClose()
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : '카드 저장 중 오류가 발생했습니다. 다시 시도해 주세요.'
      )
    }
  }, [availableEditRarities, card.category, card.id, editGameId, editImageUrl, editName, editEnabledRarities, editPrices, editTabId, onClose, tabObjects, updateCardAsync])

  const handleCancelEdit = useCallback(() => {
    if (initialEditMode) {
      onClose()
      return
    }
    setEditMode(false)
    setSaveError(null)
    setEditName(card.name)
    setEditImageUrl(card.imageUrl)
    setEditGameId(card.gameId ?? fallbackTab?.game_id ?? null)
    setEditTabId(card.tabId ?? fallbackTab?.id ?? null)
    const baseEnabled = Object.fromEntries(availableEditRarities.map(r => [r, false]))
    setEditEnabledRarities({ ...baseEnabled, ...card.enabledRarities })
    const basePrices = Object.fromEntries(availableEditRarities.map(r => [r, 0]))
    card.prices.forEach(p => { basePrices[p.rarity] = p.price })
    setEditPrices(basePrices)
  }, [availableEditRarities, card, fallbackTab, initialEditMode, onClose])

  return (
    <>
      <AnimatePresence>
        {cartFlyAnim && (
          <motion.div
            key="cart-fly"
            className="pointer-events-none fixed z-[70] flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-black shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
            style={{ left: cartFlyAnim.startX, top: cartFlyAnim.startY }}
            initial={{ opacity: 0.95, scale: 1 }}
            animate={{
              x: cartFlyAnim.deltaX,
              y: cartFlyAnim.deltaY,
              scale: 0.42,
              opacity: 0.2,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            onAnimationComplete={() => setCartFlyAnim(null)}
          >
            <ShoppingCart className="h-6 w-6" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop - click to close */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={editMode ? undefined : onClose}
      />

      {/* Modal - 70vw x 70vh */}
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2">
      <motion.div
        className="flex h-[70vh] w-[70vw] overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{    opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {/* Settings Icon - Top Right (only in normal mode) */}
        {!editMode && (
          <button
            onClick={() => setShowPinOverlay(true)}
            aria-label="카드 관리자 설정"
            data-testid="card-admin-button"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 transition-all hover:bg-zinc-700 hover:text-white"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}

        {/* Left Side - Card Image */}
        <div className="flex w-1/2 items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 p-8">
          <div className="relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl bg-zinc-800 shadow-xl">
            {editMode ? (
              // 편집 모드: 일반 img 태그 사용 (next/image 캐시 문제 회피)
              <img
                src={editImageUrl || '/placeholder-card.svg'}
                alt={card.name}
                className="absolute inset-0 h-full w-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-card.svg' }}
              />
            ) : (
              <Image
                src={card.imageUrl || '/placeholder-card.svg'}
                alt={card.name}
                fill
                className={`object-contain ${card.isStopped ? 'grayscale brightness-50' : ''}`}
                sizes="(max-width: 768px) 50vw, 35vw"
                onError={() => {}}
              />
            )}
            {/* Holographic overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5" />
            
            {/* Stopped badge */}
            {card.isStopped && !editMode && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="rounded-lg bg-red-600 px-4 py-2 text-lg font-bold text-white shadow-lg">
                  매입 중지
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Selection or Edit Mode */}
        <div className="flex w-1/2 flex-col">
          {editMode ? (
            /* Edit Mode UI */
            <>
              {/* Edit Header - Sticky */}
              <div className="flex items-center justify-between border-b border-zinc-800 px-8 py-4">
                <h2 className="text-xl font-bold text-white">카드 정보 수정</h2>
                <div className="flex gap-2">
                  {confirmDelete ? (
                    <>
                      <span className="flex items-center text-sm text-zinc-400">정말 삭제할까요?</span>
                      <button
                        onClick={() => { deleteCard(card.id); onClose() }}
                        className="flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-white hover:bg-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                        삭제
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-4 text-zinc-400 hover:bg-zinc-800"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="flex h-10 items-center gap-2 rounded-lg border border-red-900 px-4 text-red-400 hover:bg-red-900/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 px-4 text-zinc-400 hover:bg-zinc-800"
                      >
                        <X className="h-4 w-4" />
                        취소
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-white hover:bg-emerald-500"
                      >
                        <Save className="h-4 w-4" />
                        저장
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Scrollable Edit Content */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className="space-y-6">
                  {saveError && (
                    <p className="rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-200">
                      {saveError}
                    </p>
                  )}
                  {/* Card Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">카드명</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-zinc-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">게임</label>
                      <Select
                        value={editGameId ?? '__all__'}
                        onValueChange={(value) => setEditGameId(value === '__all__' ? null : value)}
                      >
                        <SelectTrigger className="h-12 w-full rounded-xl border-zinc-700 bg-zinc-800 text-white">
                          <SelectValue placeholder="게임 선택" />
                        </SelectTrigger>
                        <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
                          <SelectItem value="__all__">전체 게임</SelectItem>
                          {games.map((game) => (
                            <SelectItem key={game.id} value={game.id}>
                              {game.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">탭</label>
                      <Select
                        value={editTabId ?? '__none__'}
                        onValueChange={(value) => setEditTabId(value === '__none__' ? null : value)}
                      >
                        <SelectTrigger className="h-12 w-full rounded-xl border-zinc-700 bg-zinc-800 text-white">
                          <SelectValue placeholder="탭 선택" />
                        </SelectTrigger>
                        <SelectContent className="border-zinc-700 bg-zinc-900 text-white">
                          <SelectItem value="__none__">탭 미지정</SelectItem>
                          {availableTabsForGame.map((tab) => (
                            <SelectItem key={tab.id} value={tab.id}>
                              {tab.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {editGameId && availableTabsForGame.length === 0 && (
                    <p className="text-xs text-amber-400">
                      선택한 게임에 연결된 탭이 없습니다. 먼저 게임/탭 관리에서 탭을 연결해 주세요.
                    </p>
                  )}
                  
                  {/* Image URL */}
                  <ImageUploadField
                    currentUrl={editImageUrl}
                    onUpload={(url) => setEditImageUrl(url)}
                    showPreview={false}
                  />
                  
                  {/* Rarity Prices */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">레어도별 매입가</label>
                    <RarityPicker
                      rarities={availableEditRarities}
                      enabledRarities={editEnabledRarities}
                      prices={editPrices}
                      onToggle={(rarity, enabled) =>
                        setEditEnabledRarities(prev => ({ ...prev, [rarity]: enabled }))
                      }
                      onPriceChange={(rarity, price) =>
                        setEditPrices(prev => ({ ...prev, [rarity]: price }))
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Normal Purchase Mode */
            <>
              {/* Card Info Header */}
              <div className="border-b border-zinc-800 px-8 py-4">
                <p className="text-sm font-medium text-zinc-500">{card.code}</p>
                <h2 className="mt-1 text-2xl font-bold text-white">{card.name}</h2>
              </div>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8">
                {card.isStopped ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-red-600/20 p-6">
                      <X className="h-12 w-12 text-red-500" />
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-white">매입이 중지된 카드입니다</h3>
                    <p className="mt-2 text-zinc-400">현재 이 카드는 매입을 받지 않습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Rarity Selection */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-zinc-400">레어도 선택</p>
                      <div className="grid grid-cols-4 gap-3">
                        {availableRarities.map(({ rarity, price }) => {
                          const colors = getRarityColors(rarity)
                          const isSelected = selectedRarity === rarity
                          return (
                            <button
                              key={rarity}
                              onClick={() => {
                                setSelectedRarity(rarity)
                                setQuantity(1)
                              }}
                              aria-label={`${rarity} 레어도 선택`}
                              data-testid={`card-detail-rarity-${rarity}`}
                              className={`flex h-20 flex-col items-center justify-center rounded-xl border-2 transition-all active:scale-95 ${
                                isSelected
                                  ? `${colors.bg} ${colors.border} ring-2 ring-white/30`
                                  : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                              }`}
                            >
                              <span className={`text-lg font-bold ${isSelected ? colors.text : 'text-white'}`}>
                                {rarity}
                              </span>
                              <span className="mt-1 text-xs text-zinc-400">
                                {formatPrice(price)}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-zinc-400">수량</p>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                          className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800 text-white transition-all hover:bg-zinc-700 active:scale-95 disabled:opacity-50"
                        >
                          <Minus className="h-6 w-6" />
                        </button>
                        <span className="w-16 text-center text-3xl font-bold text-white">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(q => q + 1)}
                          className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800 text-white transition-all hover:bg-zinc-700 active:scale-95"
                        >
                          <Plus className="h-6 w-6" />
                        </button>
                      </div>
                    </div>

                    {/* Total Price */}
                    {selectedRarity && (
                      <div className="flex items-baseline justify-between rounded-xl bg-zinc-800/50 p-4">
                        <span className="text-zinc-400">합계</span>
                        <span className="text-3xl font-bold text-amber-500">
                          {formatPrice(totalPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Sticky Add Button */}
              {!card.isStopped && (
                <div className="border-t border-zinc-800 bg-zinc-900 p-4">
                  <button
                    data-add-to-cart-button="true"
                    onClick={handleAddToCart}
                    disabled={!selectedRarity || added}
                    aria-label="매입 추가"
                    data-testid="add-to-cart-button"
                    className={`flex h-14 w-full items-center justify-center gap-3 rounded-xl text-lg font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed ${
                      added
                        ? 'bg-emerald-600 text-white'
                        : selectedRarity
                          ? 'bg-amber-500 text-black hover:bg-amber-400'
                          : 'bg-zinc-700 text-zinc-500'
                    }`}
                  >
                    {added ? (
                      <>
                        <Check className="h-6 w-6" />
                        추가됨
                      </>
                    ) : (
                      '매입 추가'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* PIN Auth Overlay */}
        {showPinOverlay && (
          <PinAuthOverlay
            onSuccess={handlePinSuccess}
            onCancel={() => setShowPinOverlay(false)}
          />
        )}
      </motion.div>
      </div>
    </>
  )
}
