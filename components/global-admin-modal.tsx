'use client'

import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  X, Clock, CheckCircle, DollarSign, Trash2, Phone, Building2, CreditCard, User,
  Plus, ChevronDown, ChevronUp, Layers, Search, Ban, Play, Copy, Check,
  Settings2, Coins, Pencil, ImagePlus, Loader2, BarChart2, TrendingUp,
} from 'lucide-react'
import { useOrders } from '@/lib/use-orders'
import { useCards, useTabs } from '@/lib/use-cards'
import { useStoreSettings } from '@/lib/use-settings'
import { useGames, type Game } from '@/lib/use-games'
import { useImageUpload } from '@/lib/use-image-upload'
import { CardDetailModal } from '@/components/card-detail-modal'
import { formatPrice, getRarityColors, type CardWithStatus, type OrderStatus } from '@/lib/mock-cards'
import { RarityPicker, ALL_RARITIES, type RarityKey } from '@/components/rarity-picker'
import { ImageUploadField } from '@/components/image-upload-field'

// 게임 이미지 업로드 버튼
function GameImageUploadButton({ game, onUpload }: { game: Game; onUpload: (url: string) => void }) {
  const { upload, isUploading } = useImageUpload({ bucket: 'game-images', prefix: 'games' })
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { publicUrl } = await upload(file)
      onUpload(publicUrl)
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        title="게임 이미지 업로드"
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-600 transition-colors hover:border-violet-500 disabled:opacity-40"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        ) : game.imageUrl ? (
          <img src={game.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-4 w-4 text-zinc-500 hover:text-violet-400" />
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </>
  )
}

interface GlobalAdminModalProps {
  onClose: () => void
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: '대기중',   color: 'bg-yellow-500/20 text-yellow-400',   icon: <Clock className="h-4 w-4" /> },
  approved: { label: '승인됨',   color: 'bg-blue-500/20 text-blue-400',       icon: <CheckCircle className="h-4 w-4" /> },
  paid:     { label: '지급완료', color: 'bg-emerald-500/20 text-emerald-400', icon: <DollarSign className="h-4 w-4" /> },
  rejected: { label: '거절됨',   color: 'bg-red-500/20 text-red-400',         icon: <X className="h-4 w-4" /> },
}

const emptyEnabled = Object.fromEntries(ALL_RARITIES.map(r => [r, false]))
const emptyPrices  = Object.fromEntries(ALL_RARITIES.map(r => [r, 0]))

type AdminTab = 'orders' | 'add-card' | 'cards' | 'game-tabs' | 'stats' | 'settings'

export function GlobalAdminModal({ onClose }: GlobalAdminModalProps) {
  const { orders, updateOrderStatus, updateItemPrices, deleteOrder } = useOrders()
  const { cards, addCard, setCardStopped } = useCards()
  const { tabs, tabObjects, addTab, removeTab, isAddingTab, addTabError } = useTabs()
  const { games, addGame, removeGame, updateGameImage, assignTabToGame, isAdding: isAddingGame } = useGames()
  const { mileagePercent, globalRarities, setMileagePercent, addRarity, removeRarity, updateSettings, isUpdating } = useStoreSettings()

  const [activeTab, setActiveTab] = useState<AdminTab>('orders')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null)

  // 가격 조정 상태: Record<orderId, string[]> — 인덱스별 가격 문자열
  const [adjustedPrices, setAdjustedPrices] = useState<Record<string, string[]>>({})
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null)

  // 설정 탭 로컬 상태
  const [editMileagePercent, setEditMileagePercent] = useState<string>('')
  const [newRarityInput, setNewRarityInput] = useState('')
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  // 고객 정보 복사
  const copyCustomerInfo = useCallback((order: (typeof orders)[number]) => {
    const text = [order.customerName, order.bankName, order.accountNumber, order.phoneNumber]
      .filter(Boolean)
      .join(' ')
    navigator.clipboard.writeText(text).then(() => {
      setCopiedOrderId(order.id)
      setTimeout(() => setCopiedOrderId(null), 2000)
    })
  }, [orders])

  // 카드 추가 폼 상태
  const [newCardName, setNewCardName]     = useState('')
  const [newCardCode, setNewCardCode]     = useState('')
  const [newCardImageUrl, setNewCardImageUrl] = useState('')
  const [newCardCategory, setNewCardCategory] = useState<string>(tabs[0] ?? '')
  const [newCardEnabled, setNewCardEnabled]   = useState<Record<string, boolean>>({ ...emptyEnabled })
  const [newCardPrices, setNewCardPrices]     = useState<Record<string, number>>({ ...emptyPrices })

  // 카드 관리 검색 + 수정 모달
  const [cardSearch, setCardSearch] = useState('')
  const [adminEditCard, setAdminEditCard] = useState<CardWithStatus | null>(null)

  // 게임/탭 관리 입력
  const [newGameName, setNewGameName] = useState('')
  const [newTabName, setNewTabName] = useState('')

  // 카드 추가 실행
  const handleAddCard = () => {
    if (!newCardName.trim() || !newCardCode.trim()) return
    const prices = ALL_RARITIES
      .filter(r => newCardEnabled[r] && (newCardPrices[r] || 0) > 0)
      .map(r => ({ rarity: r as RarityKey, price: newCardPrices[r] }))
    const enabledRarities = Object.fromEntries(
      ALL_RARITIES.map(r => [r, newCardEnabled[r] && (newCardPrices[r] || 0) > 0])
    )
    addCard({
      name: newCardName.trim(),
      code: newCardCode.trim(),
      category: newCardCategory || (tabs[0] ?? '기타'),
      imageUrl: newCardImageUrl.trim() || '/placeholder-card.svg',
      prices,
      enabledRarities,
      isStopped: prices.length === 0,
    })
    setNewCardName('')
    setNewCardCode('')
    setNewCardImageUrl('')
    setNewCardEnabled({ ...emptyEnabled })
    setNewCardPrices({ ...emptyPrices })
    setActiveTab('orders')
  }

  // 가격 조정 저장
  const handleSavePrices = async (order: (typeof orders)[number]) => {
    const priceArr = adjustedPrices[order.id]
    if (!priceArr) return
    setSavingOrderId(order.id)
    try {
      const itemUpdates = order.items
        .map((item, idx) => ({ itemId: item.itemId!, price: parseFloat(priceArr[idx]) || item.price }))
        .filter((u, idx) => String(u.price) !== String(order.items[idx].price))
      const newBaseTotal = order.items.reduce((sum, item, idx) => {
        const p = parseFloat(priceArr[idx]) || item.price
        return sum + p * item.quantity
      }, 0)
      const newTotal = order.mileageRate
        ? Math.round(newBaseTotal * order.mileageRate)
        : newBaseTotal
      await updateItemPrices(order.id, itemUpdates, newTotal)
    } finally {
      setSavingOrderId(null)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const filteredCards = cardSearch.trim()
    ? cards.filter(c => c.name.includes(cardSearch) || c.code.includes(cardSearch))
    : cards

  // 통계 계산
  const todayStr = new Date().toDateString()
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === todayStr)
  const todayTotal = todayOrders.reduce((sum, o) => sum + o.totalPrice, 0)
  const todayPaidTotal = todayOrders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.totalPrice, 0)
  const todayCashCount = todayOrders.filter(o => o.paymentMethod === 'cash').length
  const todayMileageCount = todayOrders.filter(o => o.paymentMethod === 'mileage').length

  const topCardsMap = new Map<string, { cardName: string; rarity: string; count: number; totalPrice: number }>()
  for (const order of orders.filter(o => o.status !== 'rejected')) {
    for (const item of order.items) {
      const key = `${item.cardName}|${item.rarity}`
      const existing = topCardsMap.get(key)
      if (existing) {
        existing.count += item.quantity
        existing.totalPrice += item.price * item.quantity
      } else {
        topCardsMap.set(key, { cardName: item.cardName, rarity: item.rarity, count: item.quantity, totalPrice: item.price * item.quantity })
      }
    }
  }
  const topCards = [...topCardsMap.values()].sort((a, b) => b.count - a.count).slice(0, 10)

  const tabConfig: { key: AdminTab; label: string }[] = [
    { key: 'orders',    label: '매입 요청' },
    { key: 'add-card',  label: '카드 추가' },
    { key: 'cards',     label: '카드 관리' },
    { key: 'game-tabs', label: '게임/탭' },
    { key: 'stats',     label: '통계' },
    { key: 'settings',  label: '설정' },
  ]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2">
      <motion.div
        className="flex h-[85vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{    opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-xl font-bold text-white">관리자 대시보드</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="shrink-0 flex border-b border-zinc-800">
          {tabConfig.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-b-2 border-amber-500 text-amber-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">

          {/* ── 매입 요청 ── */}
          {activeTab === 'orders' && (
            <div className="p-6">
              {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                    <Clock className="h-8 w-8 text-zinc-600" />
                  </div>
                  <p className="mt-4 text-lg font-medium text-zinc-400">매입 요청이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const status = statusConfig[order.status]
                    const isExpanded = expandedOrder === order.id
                    const priceArr = adjustedPrices[order.id]
                    const pricesChanged = priceArr
                      ? order.items.some((item, idx) => {
                          const v = priceArr[idx]
                          return v !== undefined && v !== '' && parseFloat(v) !== item.price
                        })
                      : false

                    return (
                      <div key={order.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800/50">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedOrder(null)
                            } else {
                              setExpandedOrder(order.id)
                              setAdjustedPrices(prev => ({
                                ...prev,
                                [order.id]: order.items.map(item => String(item.price)),
                              }))
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              if (isExpanded) {
                                setExpandedOrder(null)
                              } else {
                                setExpandedOrder(order.id)
                                setAdjustedPrices(prev => ({
                                  ...prev,
                                  [order.id]: order.items.map(item => String(item.price)),
                                }))
                              }
                            }
                          }}
                          className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-zinc-800"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700">
                              <User className="h-5 w-5 text-zinc-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">{order.customerName}</span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                                  {status.icon}{status.label}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{order.bankName}</span>
                                <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" />{order.accountNumber}</span>
                                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{order.phoneNumber}</span>
                                {order.paymentMethod === 'mileage' && (
                                  <span className="flex items-center gap-1 text-emerald-400"><Coins className="h-3 w-3" />마일리지</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); copyCustomerInfo(order) }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-700 text-zinc-400 transition-colors hover:bg-zinc-600 hover:text-white"
                              title="고객 정보 복사"
                            >
                              {copiedOrderId === order.id
                                ? <Check className="h-4 w-4 text-emerald-400" />
                                : <Copy className="h-4 w-4" />
                              }
                            </button>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${order.paymentMethod === 'mileage' ? 'text-emerald-400' : 'text-amber-500'}`}>
                                {formatPrice(order.totalPrice)}
                              </p>
                              <p className="text-xs text-zinc-500">{formatDate(order.createdAt)}</p>
                            </div>
                            {isExpanded ? <ChevronUp className="h-5 w-5 text-zinc-500" /> : <ChevronDown className="h-5 w-5 text-zinc-500" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-zinc-700 p-4">
                            <div className="mb-4 space-y-2">
                              <p className="text-xs font-medium text-zinc-500">매입 품목 (가격 수정 가능)</p>
                              {order.items.map((item, idx) => {
                                const colors = getRarityColors(item.rarity)
                                const cardImg = item.cardId
                                  ? cards.find(c => c.id === item.cardId)?.imageUrl
                                  : undefined
                                const currentVal = priceArr?.[idx] ?? String(item.price)
                                return (
                                  <div key={idx} className="flex items-center gap-2 rounded-lg bg-zinc-900 p-2">
                                    {/* 카드 썸네일 */}
                                    <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-zinc-800">
                                      {cardImg ? (
                                        <img
                                          src={cardImg}
                                          alt={item.cardName}
                                          className="h-full w-full object-contain"
                                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                        />
                                      ) : (
                                        <div className="h-full w-full" />
                                      )}
                                    </div>
                                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>{item.rarity}</span>
                                    <span className="min-w-0 flex-1 truncate text-sm text-white">{item.cardName}</span>
                                    <span className="shrink-0 text-xs text-zinc-500">x{item.quantity}</span>
                                    {/* 가격 수정 입력 */}
                                    <div className="flex shrink-0 items-center gap-1">
                                      <input
                                        type="number"
                                        min="0"
                                        step="100"
                                        value={currentVal}
                                        onChange={(e) => setAdjustedPrices(prev => {
                                          const arr = [...(prev[order.id] ?? order.items.map(i => String(i.price)))]
                                          arr[idx] = e.target.value
                                          return { ...prev, [order.id]: arr }
                                        })}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`w-24 rounded-lg border bg-zinc-800 px-2 py-1 text-right text-sm font-medium focus:outline-none ${
                                          parseFloat(currentVal) !== item.price
                                            ? 'border-amber-500 text-amber-400'
                                            : 'border-zinc-700 text-zinc-300'
                                        }`}
                                      />
                                      <span className="text-xs text-zinc-600">원</span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {/* 저장 버튼 */}
                            {pricesChanged && (
                              <div className="mb-3">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSavePrices(order) }}
                                  disabled={savingOrderId === order.id}
                                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/20 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/30 disabled:opacity-50"
                                >
                                  {savingOrderId === order.id
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Check className="h-4 w-4" />
                                  }
                                  조정 가격 저장
                                </button>
                              </div>
                            )}

                            <div className="flex gap-2">
                              {order.status === 'pending' && (
                                <>
                                  <button onClick={() => updateOrderStatus(order.id, 'approved')} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500">
                                    <CheckCircle className="h-4 w-4" />승인
                                  </button>
                                  <button onClick={() => updateOrderStatus(order.id, 'rejected')} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600/20 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/30">
                                    <X className="h-4 w-4" />거절
                                  </button>
                                </>
                              )}
                              {order.status === 'approved' && (
                                <button onClick={() => updateOrderStatus(order.id, 'paid')} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500">
                                  <DollarSign className="h-4 w-4" />지급 완료 처리
                                </button>
                              )}
                              <button onClick={() => deleteOrder(order.id)} className="flex items-center justify-center rounded-lg bg-zinc-700 px-4 py-2 text-zinc-400 transition-colors hover:bg-zinc-600 hover:text-white">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 카드 추가 ── */}
          {activeTab === 'add-card' && (
            <div className="p-6">
              <div className="mx-auto max-w-xl space-y-5">

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">확장팩 탭 *</label>
                  <select
                    value={newCardCategory}
                    onChange={(e) => setNewCardCategory(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-zinc-600 focus:outline-none"
                  >
                    {tabs.map(tab => <option key={tab} value={tab}>{tab}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">카드명 *</label>
                  <input
                    type="text"
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                    placeholder="예: 푸른 눈의 백룡"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">카드 코드 *</label>
                  <input
                    type="text"
                    value={newCardCode}
                    onChange={(e) => setNewCardCode(e.target.value)}
                    placeholder="예: BLZD-KR001"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                  />
                </div>

                <ImageUploadField
                  currentUrl={newCardImageUrl}
                  onUpload={(url) => setNewCardImageUrl(url)}
                  showPreview={!!newCardImageUrl}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">레어도별 매입가</label>
                  <RarityPicker
                    enabledRarities={newCardEnabled}
                    prices={newCardPrices}
                    onToggle={(rarity, enabled) =>
                      setNewCardEnabled(prev => ({ ...prev, [rarity]: enabled }))
                    }
                    onPriceChange={(rarity, price) =>
                      setNewCardPrices(prev => ({ ...prev, [rarity]: price }))
                    }
                  />
                </div>

                <button
                  onClick={handleAddCard}
                  disabled={!newCardName.trim() || !newCardCode.trim()}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-lg font-semibold text-black transition-all hover:bg-amber-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-5 w-5" />
                  카드 추가
                </button>
              </div>
            </div>
          )}

          {/* ── 카드 관리 ── */}
          {activeTab === 'cards' && (
            <div className="p-6">
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2">
                <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                <input
                  type="text"
                  value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                  placeholder="카드명 또는 코드 검색..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                {filteredCards.length === 0 && (
                  <p className="py-8 text-center text-sm text-zinc-500">카드가 없습니다</p>
                )}
                {filteredCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/70"
                  >
                    <div className="h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-zinc-700">
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="h-full w-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-card.svg' }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{card.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span className="text-xs text-zinc-500">{card.code}</span>
                        {card.prices.map(({ rarity }) => {
                          const colors = getRarityColors(rarity)
                          const enabled = card.enabledRarities[rarity]
                          return (
                            <span
                              key={rarity}
                              className={`rounded px-1.5 py-0.5 text-xs font-bold ${enabled ? `${colors.bg} ${colors.text}` : 'bg-zinc-700 text-zinc-500'}`}
                            >
                              {rarity}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => setAdminEditCard(card)}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-zinc-700/60 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      수정
                    </button>
                    <button
                      onClick={() => setCardStopped(card.id, !card.isStopped)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        card.isStopped
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {card.isStopped
                        ? <><Play className="h-3.5 w-3.5" />재개</>
                        : <><Ban className="h-3.5 w-3.5" />중지</>
                      }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 게임/탭 관리 ── */}
          {activeTab === 'game-tabs' && (
            <div className="p-6">
              <div className="mx-auto max-w-lg space-y-8">

                {/* ---- 탭(확장팩) 관리 ---- */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <Layers className="h-4 w-4 text-zinc-400" />
                    확장팩 탭 관리
                  </h3>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTabName}
                      onChange={(e) => setNewTabName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && newTabName.trim()) {
                          try {
                            await addTab(newTabName.trim())
                            setNewTabName('')
                          } catch (err) {
                            console.error('[탭 추가 실패]', err)
                          }
                        }
                      }}
                      placeholder="새 확장팩명 (예: 버스트 오브 데스티니)"
                      className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      onClick={async () => {
                        if (newTabName.trim()) {
                          try {
                            await addTab(newTabName.trim())
                            setNewTabName('')
                          } catch (err) {
                            console.error('[탭 추가 실패]', err)
                          }
                        }
                      }}
                      disabled={!newTabName.trim() || isAddingTab}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  {addTabError && (
                    <p className="rounded-lg bg-red-900/40 px-3 py-2 text-xs text-red-400">
                      오류: {(addTabError as Error).message}
                    </p>
                  )}

                  <div className="space-y-2">
                    {tabs.length === 0 && (
                      <p className="py-8 text-center text-sm text-zinc-500">등록된 탭이 없습니다</p>
                    )}
                    {tabs.map((tab) => (
                      <div
                        key={tab}
                        className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-800/50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <Layers className="h-4 w-4 text-zinc-500" />
                          <span className="font-medium text-white">{tab}</span>
                          <span className="text-xs text-zinc-500">
                            {cards.filter(c => c.category === tab).length}장
                          </span>
                        </div>
                        <button
                          onClick={() => removeTab(tab)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-zinc-600">
                    * 탭 삭제 시 해당 탭의 카드는 숨겨집니다. 탭을 다시 추가하면 복원됩니다.
                  </p>
                </div>

                <div className="border-t border-zinc-800" />

                {/* ---- 게임 대분류 관리 ---- */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <TrendingUp className="h-4 w-4 text-zinc-400" />
                    게임 대분류 관리
                  </h3>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGameName}
                      onChange={(e) => setNewGameName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && newGameName.trim()) {
                          await addGame(newGameName.trim())
                          setNewGameName('')
                        }
                      }}
                      placeholder="예: 유희왕, 포켓몬카드"
                      className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      onClick={async () => {
                        if (!newGameName.trim()) return
                        await addGame(newGameName.trim())
                        setNewGameName('')
                      }}
                      disabled={isAddingGame || !newGameName.trim()}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  {games.length === 0 ? (
                    <p className="py-4 text-center text-sm text-zinc-500">등록된 게임이 없습니다</p>
                  ) : (
                    <div className="space-y-2">
                      {games.map((game) => (
                        <div key={game.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/50 px-4 py-3">
                          <GameImageUploadButton
                            game={game}
                            onUpload={(url) => updateGameImage(game.id, url)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white">{game.name}</p>
                            <p className="text-xs text-zinc-500">
                              {tabObjects.filter(t => t.game_id === game.id).length}개 탭 연결됨
                            </p>
                          </div>
                          <button
                            onClick={() => removeGame(game.id)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 탭-게임 배정 */}
                  {games.length > 0 && tabs.length > 0 && (
                    <>
                      <div className="border-t border-zinc-800" />
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-300">탭 → 게임 배정</label>
                        <p className="text-xs text-zinc-600">각 탭(소분류)을 게임 대분류에 배정하세요</p>
                        <div className="space-y-2">
                          {tabObjects.map((tab) => (
                            <div key={tab.name} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-2.5">
                              <span className="flex-1 text-sm font-medium text-white">{tab.name}</span>
                              <select
                                value={tab.game_id ?? ''}
                                onChange={(e) => assignTabToGame(tab.name, e.target.value || null)}
                                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                              >
                                <option value="">미배정</option>
                                {games.map(g => (
                                  <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ── 통계 ── */}
          {activeTab === 'stats' && (
            <div className="p-6">
              <div className="mx-auto max-w-lg space-y-6">

                {/* 오늘 요약 */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <BarChart2 className="h-4 w-4 text-amber-400" />
                    오늘 매입 현황
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                      <p className="text-xs text-zinc-500">오늘 요청 총액</p>
                      <p className="mt-1 text-2xl font-bold text-white">{formatPrice(todayTotal)}</p>
                      <p className="mt-0.5 text-xs text-zinc-600">{todayOrders.length}건</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                      <p className="text-xs text-zinc-500">오늘 지급 완료</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-400">{formatPrice(todayPaidTotal)}</p>
                      <p className="mt-0.5 text-xs text-zinc-600">{todayOrders.filter(o => o.status === 'paid').length}건</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                      <p className="text-xs text-zinc-500">현금 매입</p>
                      <p className="mt-1 text-2xl font-bold text-amber-400">{todayCashCount}건</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                      <p className="text-xs text-zinc-500">마일리지 매입</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-400">{todayMileageCount}건</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-800" />

                {/* 인기 카드 */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <TrendingUp className="h-4 w-4 text-violet-400" />
                    인기 매입 카드 TOP 10
                    <span className="text-xs font-normal text-zinc-600">(전체 기간, 거절 제외)</span>
                  </h3>
                  {topCards.length === 0 ? (
                    <p className="py-4 text-center text-sm text-zinc-500">데이터 없음</p>
                  ) : (
                    <div className="space-y-2">
                      {topCards.map((item, rank) => {
                        const colors = getRarityColors(item.rarity)
                        return (
                          <div key={`${item.cardName}|${item.rarity}`} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-2.5">
                            <span className={`w-6 shrink-0 text-center text-sm font-bold ${rank < 3 ? 'text-amber-400' : 'text-zinc-600'}`}>
                              {rank + 1}
                            </span>
                            <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>{item.rarity}</span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{item.cardName}</span>
                            <div className="flex shrink-0 flex-col items-end text-right">
                              <span className="text-sm font-bold text-zinc-200">{item.count}장</span>
                              <span className="text-xs text-zinc-500">{formatPrice(item.totalPrice)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ── 설정 ── */}
          {activeTab === 'settings' && (
            <div className="p-6">
              <div className="mx-auto max-w-lg space-y-8">

                {/* 관리자 비밀번호 변경 */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <Settings2 className="h-4 w-4 text-zinc-400" />
                    관리자 비밀번호 변경
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null) }}
                    placeholder="새 비밀번호 (4자 이상)"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null) }}
                    placeholder="새 비밀번호 확인"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                  />
                  {passwordError && (
                    <p className="text-sm text-red-400">{passwordError}</p>
                  )}
                  <button
                    onClick={async () => {
                      if (newPassword.length < 4) { setPasswordError('비밀번호는 4자 이상이어야 합니다'); return }
                      if (newPassword !== confirmPassword) { setPasswordError('비밀번호가 일치하지 않습니다'); return }
                      await updateSettings({ admin_password: newPassword })
                      setNewPassword('')
                      setConfirmPassword('')
                      setPasswordError(null)
                      setPasswordSaved(true)
                      setTimeout(() => setPasswordSaved(false), 2000)
                    }}
                    disabled={isUpdating || !newPassword || !confirmPassword}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-700 font-semibold text-white transition-all hover:bg-zinc-600 disabled:opacity-40"
                  >
                    {passwordSaved ? <><Check className="h-4 w-4 text-emerald-400" /> 변경 완료</> : '비밀번호 변경 저장'}
                  </button>
                </div>

                <div className="border-t border-zinc-800" />

                {/* 마일리지 지급 비율 */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <Coins className="h-4 w-4 text-emerald-400" />
                    마일리지 지급 추가율
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max="200"
                        step="5"
                        placeholder={String(mileagePercent)}
                        value={editMileagePercent}
                        onChange={(e) => setEditMileagePercent(e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-3 pl-4 pr-10 text-right text-xl font-bold text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold text-zinc-400">%</span>
                    </div>
                    <button
                      onClick={async () => {
                        const val = editMileagePercent !== '' ? Number(editMileagePercent) : mileagePercent
                        await setMileagePercent(val)
                        setEditMileagePercent('')
                        setSettingsSaved(true)
                        setTimeout(() => setSettingsSaved(false), 2000)
                      }}
                      disabled={isUpdating || editMileagePercent === ''}
                      className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-40"
                    >
                      {settingsSaved ? <Check className="h-4 w-4" /> : '적용'}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    현재: <span className="font-bold text-emerald-400">+{mileagePercent}%</span>
                    &nbsp;— 매입가 10,000원 → 마일리지 {(10000 * (1 + mileagePercent / 100)).toLocaleString('ko-KR')}원
                  </p>
                </div>

                <div className="border-t border-zinc-800" />

                {/* 동적 레어도 관리 */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <Settings2 className="h-4 w-4 text-amber-400" />
                    활성 레어도 관리
                  </label>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-3">
                    {globalRarities.length === 0 ? (
                      <p className="py-2 text-center text-sm text-zinc-500">등록된 레어도 없음</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {globalRarities.map(rarity => {
                          const colors = getRarityColors(rarity) ?? { bg: 'bg-zinc-700', text: 'text-zinc-200', border: 'border-zinc-600' }
                          return (
                            <div key={rarity} className={`flex items-center gap-1 rounded-lg pl-2.5 pr-1 py-1 ${colors.bg}`}>
                              <span className={`text-sm font-black ${colors.text}`}>{rarity}</span>
                              <button
                                onClick={() => removeRarity(rarity)}
                                disabled={isUpdating}
                                className={`flex h-5 w-5 items-center justify-center rounded-md transition-colors hover:bg-black/30 disabled:opacity-40 ${colors.text}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRarityInput}
                      onChange={(e) => setNewRarityInput(e.target.value.toUpperCase().slice(0, 5))}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && newRarityInput.trim()) {
                          await addRarity(newRarityInput)
                          setNewRarityInput('')
                        }
                      }}
                      placeholder="새 레어도 (예: GR)"
                      maxLength={5}
                      className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-bold uppercase text-white placeholder:font-normal placeholder:normal-case placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      onClick={async () => {
                        if (!newRarityInput.trim()) return
                        await addRarity(newRarityInput)
                        setNewRarityInput('')
                      }}
                      disabled={isUpdating || !newRarityInput.trim() || globalRarities.includes(newRarityInput.trim())}
                      className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-black transition-all hover:bg-amber-400 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                      추가
                    </button>
                  </div>
                  <p className="text-xs text-zinc-600">최대 5자. 키오스크 필터와 카드 편집 화면에 즉시 반영됩니다.</p>
                </div>

              </div>
            </div>
          )}

        </div>
      </motion.div>
      </div>

      {/* 카드 수정 모달 */}
      {adminEditCard && (
        <CardDetailModal
          card={adminEditCard}
          onClose={() => setAdminEditCard(null)}
          initialEditMode={true}
        />
      )}
    </>
  )
}
