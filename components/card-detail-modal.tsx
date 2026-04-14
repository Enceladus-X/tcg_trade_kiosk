'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Settings, Minus, Plus, Check, X, Save } from 'lucide-react'
import { type CardWithStatus, type CardPrice, rarityColors, formatPrice } from '@/lib/mock-cards'
import { useCart } from '@/lib/use-cart'
import { useCards } from '@/lib/use-cards'
import { PinAuthOverlay } from './pin-auth-overlay'
import { RarityPicker, ALL_RARITIES, type RarityKey } from '@/components/rarity-picker'

interface CardDetailModalProps {
  card: CardWithStatus
  onClose: () => void
}

export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [showPinOverlay, setShowPinOverlay] = useState(false)
  const [added, setAdded] = useState(false)
  const [editMode, setEditMode] = useState(false)
  
  // Edit mode state - 모든 레어도 포함
  const [editName, setEditName] = useState(card.name)
  const [editImageUrl, setEditImageUrl] = useState(card.imageUrl)
  const [editEnabledRarities, setEditEnabledRarities] = useState<Record<string, boolean>>(() => {
    const base = Object.fromEntries(ALL_RARITIES.map(r => [r, false]))
    return { ...base, ...card.enabledRarities }
  })
  const [editPrices, setEditPrices] = useState<Record<string, number>>(() => {
    const base = Object.fromEntries(ALL_RARITIES.map(r => [r, 0]))
    card.prices.forEach(p => { base[p.rarity] = p.price })
    return base
  })

  const { addItem } = useCart()
  const { updateCard } = useCards()

  // Filter to only show enabled rarities for purchase
  const availableRarities = card.prices.filter(p => card.enabledRarities[p.rarity] && p.price > 0)
  const selectedPrice = card.prices.find(p => p.rarity === selectedRarity)?.price || 0
  const totalPrice = selectedPrice * quantity

  const handleAddToCart = useCallback(() => {
    if (!selectedRarity || !selectedPrice) return

    for (let i = 0; i < quantity; i++) {
      addItem({
        cardId: card.id,
        cardName: card.name,
        cardCode: card.code,
        rarity: selectedRarity,
        price: selectedPrice,
      })
    }

    setAdded(true)
    setTimeout(() => {
      onClose()
    }, 400)
  }, [selectedRarity, selectedPrice, quantity, card, addItem, onClose])

  const handlePinSuccess = useCallback(() => {
    setShowPinOverlay(false)
    setEditMode(true)
  }, [])

  const handleSaveEdit = useCallback(() => {
    const newPrices = ALL_RARITIES
      .filter(r => editEnabledRarities[r])
      .map(r => ({ rarity: r as RarityKey, price: editPrices[r] || 0 }))

    updateCard(card.id, {
      name: editName,
      imageUrl: editImageUrl,
      enabledRarities: { ...editEnabledRarities },
      prices: newPrices as CardPrice[],
      isStopped: newPrices.length === 0,
    })
    setEditMode(false)
    onClose()
  }, [card.id, editName, editImageUrl, editEnabledRarities, editPrices, updateCard, onClose])

  const handleCancelEdit = useCallback(() => {
    setEditMode(false)
    setEditName(card.name)
    setEditImageUrl(card.imageUrl)
    const baseEnabled = Object.fromEntries(ALL_RARITIES.map(r => [r, false]))
    setEditEnabledRarities({ ...baseEnabled, ...card.enabledRarities })
    const basePrices = Object.fromEntries(ALL_RARITIES.map(r => [r, 0]))
    card.prices.forEach(p => { basePrices[p.rarity] = p.price })
    setEditPrices(basePrices)
  }, [card])

  return (
    <>
      {/* Backdrop - click to close */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={editMode ? undefined : onClose}
      />

      {/* Modal - 70vw x 70vh */}
      <div className="fixed left-1/2 top-1/2 z-50 flex h-[70vh] w-[70vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl">
        {/* Settings Icon - Top Right (only in normal mode) */}
        {!editMode && (
          <button
            onClick={() => setShowPinOverlay(true)}
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
                </div>
              </div>
              
              {/* Scrollable Edit Content */}
              <div className="flex-1 overflow-y-auto p-8">
                <div className="space-y-6">
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
                  
                  {/* Image URL */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">이미지 URL</label>
                    <input
                      type="text"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-zinc-600 focus:outline-none"
                    />
                  </div>
                  
                  {/* Rarity Prices */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">레어도별 매입가</label>
                    <RarityPicker
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
                          const colors = rarityColors[rarity]
                          const isSelected = selectedRarity === rarity
                          return (
                            <button
                              key={rarity}
                              onClick={() => {
                                setSelectedRarity(rarity)
                                setQuantity(1)
                              }}
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
                    onClick={handleAddToCart}
                    disabled={!selectedRarity || added}
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
      </div>
    </>
  )
}
