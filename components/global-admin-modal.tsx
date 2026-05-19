'use client'

import { useState, useCallback, useDeferredValue, useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  X, Clock, CheckCircle, DollarSign, Trash2, Phone, Building2, CreditCard,
  Plus, Minus, ChevronDown, ChevronUp, Layers, Search, Ban, Play, Copy, Check,
  Settings2, Coins, Pencil, ImagePlus, Loader2, BarChart2, TrendingUp, Scissors,
  MessageSquare, Table2, Download, Upload, Printer, FileText, Banknote,
} from 'lucide-react'
import { useOrders } from '@/lib/use-orders'
import { useCards, useTabs } from '@/lib/use-cards'
import { useStoreSettings } from '@/lib/use-settings'
import { useGames, type Game } from '@/lib/use-games'
import { useImageUpload } from '@/lib/use-image-upload'
import { CardDetailModal } from '@/components/card-detail-modal'
import { formatPrice, getRarityColors, type CardWithStatus, type OrderStatus, type CardPrice, type PaymentMethod, type OrderPaymentMethod } from '@/lib/mock-cards'
import { RarityPicker, ALL_RARITIES, type RarityKey } from '@/components/rarity-picker'
import { ImageUploadField } from '@/components/image-upload-field'

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

const ORDER_STATUS_FILTERS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all',      label: '전체' },
  { key: 'pending',  label: '대기중' },
  { key: 'approved', label: '승인됨' },
  { key: 'paid',     label: '지급완료' },
  { key: 'rejected', label: '거절됨' },
]

const buildEmptyEnabled = (rarities: readonly string[]) => Object.fromEntries(rarities.map(r => [r, false]))
const buildEmptyPrices = (rarities: readonly string[]) => Object.fromEntries(rarities.map(r => [r, 0]))

function parseCsvRow(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function deriveOrderPaymentMethod(items: { paymentMethod: PaymentMethod }[]): OrderPaymentMethod {
  const hasCash = items.some((item) => item.paymentMethod === 'cash')
  const hasMileage = items.some((item) => item.paymentMethod === 'mileage')
  if (hasCash && hasMileage) return 'mixed'
  if (hasMileage) return 'mileage'
  return 'cash'
}

function getAppliedItemTotal(price: number, quantity: number, paymentMethod: PaymentMethod, mileageRate: number | null) {
  const subtotal = price * quantity
  if (paymentMethod === 'mileage') {
    return Math.round(subtotal * (mileageRate ?? 1))
  }
  return subtotal
}

const GAME_CHART_COLORS = ['#f59e0b', '#22c55e', '#38bdf8', '#a78bfa', '#fb7185', '#facc15', '#14b8a6']

function formatChartDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getStartOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function getDayDiff(from: Date, to: Date) {
  const dayMs = 24 * 60 * 60 * 1000
  return Math.floor((getStartOfDay(to).getTime() - getStartOfDay(from).getTime()) / dayMs)
}

function getWeekStart(date: Date) {
  const next = getStartOfDay(date)
  const day = next.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + mondayOffset)
  return next
}

function getWeekKey(date: Date) {
  return getDateKey(getWeekStart(date))
}

function formatWeekLabel(date: Date) {
  return `${formatChartDate(getWeekStart(date))}\uC8FC`
}

function getMonthKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function formatMonthLabel(date: Date) {
  return `${date.getFullYear().toString().slice(2)}.${date.getMonth() + 1}`
}

function PaymentMethodToggle({
  value,
  onChange,
  compact = false,
}: {
  value: PaymentMethod
  onChange: (value: PaymentMethod) => void
  compact?: boolean
}) {
  const wrapperClass = compact
    ? 'grid grid-cols-2 gap-1 rounded-lg border border-zinc-700 bg-zinc-800 p-1'
    : 'grid grid-cols-2 gap-1 rounded-xl border border-zinc-700 bg-zinc-800/90 p-1'

  const buttonClass = compact
    ? 'flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors'
    : 'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors'

  return (
    <div className={wrapperClass}>
      <button
        type="button"
        onClick={() => onChange('cash')}
        className={`${buttonClass} ${value === 'cash' ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'}`}
      >
        <Banknote className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        현금
      </button>
      <button
        type="button"
        onClick={() => onChange('mileage')}
        className={`${buttonClass} ${value === 'mileage' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
      >
        <Coins className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        마일리지
      </button>
    </div>
  )
}

function OrderGameBadges({ games }: { games: { name: string; imageUrl: string | null; count: number }[] }) {
  const visibleGames = games.slice(0, 2)
  const isSplit = visibleGames.length === 2

  return (
    <div className="grid h-12 w-[104px] shrink-0 overflow-hidden rounded-2xl border border-zinc-700/80 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_6px_18px_rgba(0,0,0,0.24)]">
      {visibleGames.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-2 text-center text-[11px] font-black text-zinc-500">
          미분류
        </div>
      ) : (
        <div className={`grid h-full w-full ${isSplit ? 'grid-cols-2 gap-0' : 'grid-cols-1'}`}>
          {visibleGames.map((game, index) => {
            const normalizedGameName = game.name.replace(/\s/g, '').toLowerCase()
            const isYuGiOh = normalizedGameName.includes('유희왕') || normalizedGameName.includes('yugioh')
            const isOnePiece = normalizedGameName.includes('원피스') || normalizedGameName.includes('onepiece')
            const splitLogoLeft = index === 0 ? 0 : isOnePiece ? -8 : -28

            return (
              <div
                key={game.name}
                className={`relative flex min-w-0 items-center overflow-hidden border border-white/10 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ${
                  isSplit
                    ? index === 0
                      ? 'rounded-l-xl rounded-r-none border-r-0'
                      : 'rounded-l-none rounded-r-xl'
                    : 'rounded-xl'
                }`}
                title={`${game.name} ${game.count}장`}
              >
                {game.imageUrl ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-white via-zinc-50 to-zinc-200" aria-hidden="true" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 px-1 text-center text-[10px] font-black leading-tight text-black">
                    {game.name}
                  </span>
                )}
                {game.imageUrl && (
                  <img
                    src={game.imageUrl}
                    alt={game.name}
                    className="absolute top-1/2 object-contain object-center drop-shadow-[0_1px_0_rgba(255,255,255,0.7)]"
                    style={{
                      height: isYuGiOh ? '76%' : '88%',
                      width: isSplit ? 96 : '86%',
                      left: isSplit ? splitLogoLeft : '7%',
                      transform: `translateY(${isYuGiOh ? '-56%' : '-50%'})`,
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

type AdminTab = 'orders' | 'add-card' | 'cards' | 'game-tabs' | 'stats' | 'settings'

export function GlobalAdminModal({ onClose }: GlobalAdminModalProps) {
  const {
    orders,
    priceAdjustmentsByOrderId,
    updateOrderStatus,
    updateItemPrices,
    splitOrderItems,
    createPriceAdjustments,
    cancelPriceAdjustments,
    deleteOrder,
    deleteOrderItem,
  } = useOrders()
  const { cards, addCard, setCardStopped, toggleRarity, updateCardAsync } = useCards()
  const { tabs, tabObjects, addTab, removeTab, isAddingTab, addTabError } = useTabs()
  const { games, addGame, removeGame, updateGameImage, assignTabToGame, isAdding: isAddingGame } = useGames()
  const { mileageRate, mileagePercent, globalRarities, setMileagePercent, addRarity, removeRarity, updateSettings, isUpdating } = useStoreSettings()
  const availableRarities: readonly string[] = globalRarities.length > 0 ? globalRarities : ALL_RARITIES
  const cardById = useMemo(() => new Map(cards.map(card => [card.id, card])), [cards])
  const cardImageById = useMemo(() => new Map(cards.map(card => [card.id, card.imageUrl])), [cards])
  const gameById = useMemo(() => new Map(games.map(game => [game.id, game])), [games])
  const tabByIdForOrder = useMemo(() => new Map(tabObjects.map(tab => [tab.id, tab])), [tabObjects])
  const tabByNameForOrder = useMemo(() => new Map(tabObjects.map(tab => [tab.name, tab])), [tabObjects])
  const getOrderGameBadges = useCallback((order: (typeof orders)[number]) => {
    const counts = new Map<string, { name: string; imageUrl: string | null; count: number }>()

    for (const item of order.items) {
      const card = item.cardId ? cardById.get(item.cardId) : undefined
      const tab = card?.tabId ? tabByIdForOrder.get(card.tabId) : tabByNameForOrder.get(card?.category ?? '')
      const gameId = card?.gameId ?? tab?.game_id ?? null
      const game = gameId ? gameById.get(gameId) : undefined
      const key = game?.id ?? gameId ?? 'unclassified'
      const previous = counts.get(key)

      if (previous) {
        previous.count += item.quantity
      } else {
        counts.set(key, {
          name: game?.name ?? '미분류',
          imageUrl: game?.imageUrl ?? null,
          count: item.quantity,
        })
      }
    }

    return [...counts.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'))
      .slice(0, 2)
  }, [cardById, gameById, tabByIdForOrder, tabByNameForOrder])

  const [activeTab, setActiveTab] = useState<AdminTab>('orders')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null)
  const [rejectConfirmOrderId, setRejectConfirmOrderId] = useState<string | null>(null)
  const [orderSearch, setOrderSearch] = useState('')
  const deferredOrderSearch = useDeferredValue(orderSearch)

  // 매입 요청 필터
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all')

  // 가격/메모 조정 상태
  const [adjustedPrices, setAdjustedPrices] = useState<Record<string, Record<string, string>>>({})
  const [adjustedNotes,  setAdjustedNotes]  = useState<Record<string, Record<string, string | null | undefined>>>({})
  const [adjustedQuantities, setAdjustedQuantities] = useState<Record<string, Record<string, string>>>({})
  const [savingOrderId,  setSavingOrderId]  = useState<string | null>(null)
  const [cancelingAdjustmentOrderId, setCancelingAdjustmentOrderId] = useState<string | null>(null)
  const [deletingItemKey, setDeletingItemKey] = useState<string | null>(null)
  const [adjustedOrderIds, setAdjustedOrderIds] = useState<Set<string>>(new Set())
  const [saveErrorByOrderId, setSaveErrorByOrderId] = useState<Record<string, string>>({})
  const [editingItem, setEditingItem] = useState<{ orderId: string; itemId: string; variant: 'base' | 'split' } | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [editingQuantity, setEditingQuantity] = useState('1')
  const [editingPct,   setEditingPct]   = useState('')
  const [editingNote,  setEditingNote]  = useState('')
  const editingPriceDraftRef = useRef('')
  const editingPctDraftRef = useRef('')
  const editingQuantityDraftRef = useRef('1')
  const editingNoteDraftRef = useRef('')
  const editingPriceInputRef = useRef<HTMLInputElement>(null)
  const editingPctInputRef = useRef<HTMLInputElement>(null)
  const editingQuantityInputRef = useRef<HTMLInputElement>(null)
  const [adjustedPaymentMethods, setAdjustedPaymentMethods] = useState<Record<string, Record<string, PaymentMethod>>>({})
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod>('cash')
  const [pendingItemSplits, setPendingItemSplits] = useState<Record<string, Record<string, {
    quantity: number
    price: number
    note: string | null
    paymentMethod: PaymentMethod
  }>>>({})

  // 설정 탭
  const [editMileagePercent, setEditMileagePercent] = useState<string>('')
  const [newRarityInput, setNewRarityInput] = useState('')
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  // 통계
  const [statsRange, setStatsRange] = useState<'today' | 'week' | 'month' | 'all'>('today')
  const [topCardsLimit, setTopCardsLimit] = useState<10 | 20 | 50 | 'all'>(10)

  // 카드 관리 — 일괄 편집
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [bulkEditTab,  setBulkEditTab]  = useState<string>('')
  // Record<cardId, Record<rarity, priceString>>
  const [bulkEdits, setBulkEdits] = useState<Record<string, Record<string, string>>>({})
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkSaved,  setBulkSaved]  = useState(false)
  const [bulkImportError, setBulkImportError] = useState<string | null>(null)
  const [bulkImportSuccess, setBulkImportSuccess] = useState<string | null>(null)
  const bulkImportInputRef = useRef<HTMLInputElement>(null)
  const statsCaptureRef = useRef<HTMLDivElement>(null)

  const copyCustomerInfo = useCallback((order: (typeof orders)[number]) => {
    const text = [order.customerName, order.bankName, order.accountNumber]
      .filter(Boolean).join(' ')
    navigator.clipboard.writeText(text).then(() => {
      setCopiedOrderId(order.id)
      setTimeout(() => setCopiedOrderId(null), 2000)
    })
  }, [orders])

  // 카드 추가 폼
  const [newCardName, setNewCardName]         = useState('')
  const [newCardCode, setNewCardCode]         = useState('')
  const [newCardImageUrl, setNewCardImageUrl] = useState('')
  const [newCardCategory, setNewCardCategory] = useState<string>(tabs[0] ?? '')
  const [newCardCategoryMenuOpen, setNewCardCategoryMenuOpen] = useState(false)
  const [newCardEnabled, setNewCardEnabled]   = useState<Record<string, boolean>>(() => buildEmptyEnabled(availableRarities))
  const [newCardPrices, setNewCardPrices]     = useState<Record<string, number>>(() => buildEmptyPrices(availableRarities))
  const newCardCategoryMenuRef = useRef<HTMLDivElement>(null)

  const [cardSearch, setCardSearch]   = useState('')
  const [adminEditCard, setAdminEditCard] = useState<CardWithStatus | null>(null)
  const [newGameName, setNewGameName] = useState('')
  const [newTabName,  setNewTabName]  = useState('')

  useEffect(() => {
    if (!newCardCategoryMenuOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (newCardCategoryMenuRef.current && !newCardCategoryMenuRef.current.contains(event.target as Node)) {
        setNewCardCategoryMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [newCardCategoryMenuOpen])

  useEffect(() => {
    if (!tabs.length) {
      setNewCardCategory('')
      return
    }
    if (!newCardCategory || !tabs.includes(newCardCategory)) {
      setNewCardCategory(tabs[0])
    }
  }, [newCardCategory, tabs])

  useEffect(() => {
    setNewCardEnabled((prev) => {
      const next = buildEmptyEnabled(availableRarities)
      for (const rarity of availableRarities) {
        if (rarity in prev) next[rarity] = prev[rarity]
      }
      return next
    })
    setNewCardPrices((prev) => {
      const next = buildEmptyPrices(availableRarities)
      for (const rarity of availableRarities) {
        if (rarity in prev) next[rarity] = prev[rarity]
      }
      return next
    })
  }, [availableRarities])

  const handleAddCard = () => {
    if (!newCardName.trim() || !newCardCode.trim()) return
    const selectedTab = tabObjects.find((tab) => tab.name === newCardCategory) ?? null
    const prices = availableRarities
      .filter(r => newCardEnabled[r] && (newCardPrices[r] || 0) > 0)
      .map(r => ({ rarity: r as RarityKey, price: newCardPrices[r] }))
    const enabledRarities = Object.fromEntries(
      availableRarities.map(r => [r, newCardEnabled[r] && (newCardPrices[r] || 0) > 0])
    )
    addCard({
      name: newCardName.trim(), code: newCardCode.trim(),
      category: selectedTab?.name ?? newCardCategory ?? tabs[0] ?? '미지정',
      gameId: selectedTab?.game_id ?? null,
      tabId: selectedTab?.id ?? null,
      imageUrl: newCardImageUrl.trim() || '/placeholder-card.svg',
      prices, enabledRarities, isStopped: prices.length === 0,
    })
    setNewCardName(''); setNewCardCode(''); setNewCardImageUrl('')
    setNewCardEnabled(buildEmptyEnabled(availableRarities)); setNewCardPrices(buildEmptyPrices(availableRarities))
    setActiveTab('orders')
  }

  // ---- 인라인 가격 편집 ----

  const openEditItem = (
    orderId: string,
    itemId: string,
    originalPrice: number,
    originalQuantity: number,
    currentNote: string | null | undefined,
    currentPaymentMethod: PaymentMethod,
    variant: 'base' | 'split' = 'base'
  ) => {
    setEditingItem({ orderId, itemId, variant })
    const pendingSplit = pendingItemSplits[orderId]?.[itemId]
    const saved = adjustedPrices[orderId]?.[itemId]
    const price = variant === 'split' && pendingSplit ? pendingSplit.price : saved ? parseFloat(saved) : originalPrice
    const note = variant === 'split' && pendingSplit ? pendingSplit.note ?? '' : adjustedNotes[orderId]?.[itemId] ?? currentNote ?? ''
    const quantity = String(variant === 'split' && pendingSplit ? pendingSplit.quantity : 1)
    setEditingValue(String(price))
    setEditingQuantity(quantity)
    setEditingPct('')
    setEditingNote(note)
    editingPriceDraftRef.current = String(price)
    editingPctDraftRef.current = ''
    editingQuantityDraftRef.current = quantity
    editingNoteDraftRef.current = note
    setEditingPaymentMethod(variant === 'split' && pendingSplit ? pendingSplit.paymentMethod : adjustedPaymentMethods[orderId]?.[itemId] ?? currentPaymentMethod)
  }

  const handleDirectChange = (val: string, originalPrice: number) => {
    editingPriceDraftRef.current = val
    const parsed = parseFloat(val)
    if (!isNaN(parsed) && originalPrice > 0) {
      const pct = Math.round((1 - parsed / originalPrice) * 100)
      const nextPct = pct > 0 ? String(pct) : ''
      editingPctDraftRef.current = nextPct
      if (editingPctInputRef.current) editingPctInputRef.current.value = nextPct
    } else {
      editingPctDraftRef.current = ''
      if (editingPctInputRef.current) editingPctInputRef.current.value = ''
    }
  }

  const handlePctChange = (val: string, originalPrice: number) => {
    editingPctDraftRef.current = val
    const pct = parseFloat(val)
    if (!isNaN(pct) && pct >= 0 && pct < 100) {
      const nextPrice = String(Math.round(originalPrice * (1 - pct / 100)))
      editingPriceDraftRef.current = nextPrice
      if (editingPriceInputRef.current) editingPriceInputRef.current.value = nextPrice
    }
  }

  const parseAdjustedPrice = (value: string | undefined, fallback: number) => {
    if (value === undefined || value.trim() === '') return fallback
    const parsed = parseFloat(value)
    return Number.isNaN(parsed) ? fallback : parsed
  }

  const parseAdjustedQuantity = (value: string | undefined, fallback: number) => {
    if (value === undefined || value.trim() === '') return fallback
    const parsed = parseInt(value, 10)
    return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed
  }

  const confirmEditItem = (order: (typeof orders)[number], itemId: string) => {
    const originalItem = order.items.find((item) => item.itemId === itemId)
    if (!originalItem) return
    const price = parseFloat(editingPriceDraftRef.current || editingValue)
    const selectedQuantity = Math.max(1, Math.min(parseInt(editingQuantityDraftRef.current || editingQuantity, 10) || 1, originalItem.quantity))
    const nextNote = editingNoteDraftRef.current.trim() === '' ? null : editingNoteDraftRef.current.trim()
    const priceChanged = !Number.isNaN(price) && price >= 0 && price !== originalItem.price
    const noteChanged = nextNote !== (originalItem.note ?? null)
    const paymentMethodChanged = editingPaymentMethod !== originalItem.paymentMethod
    const isSplitEdit = editingItem?.orderId === order.id && editingItem?.itemId === itemId && editingItem.variant === 'split'
    const shouldSplit = originalItem.quantity > 1 && selectedQuantity < originalItem.quantity && (isSplitEdit || priceChanged || noteChanged || paymentMethodChanged)

    if (shouldSplit) {
      setPendingItemSplits(prev => {
        const next = { ...(prev[order.id] ?? {}) }
        next[itemId] = {
          quantity: selectedQuantity,
          price: Number.isNaN(price) || price < 0 ? originalItem.price : price,
          note: nextNote,
          paymentMethod: editingPaymentMethod,
        }
        return { ...prev, [order.id]: next }
      })
      setAdjustedPrices(prev => {
        const next = { ...(prev[order.id] ?? {}) }
        delete next[itemId]
        return { ...prev, [order.id]: next }
      })
      setAdjustedQuantities(prev => {
        const next = { ...(prev[order.id] ?? {}) }
        delete next[itemId]
        return { ...prev, [order.id]: next }
      })
      setAdjustedNotes(prev => {
        const next = { ...(prev[order.id] ?? {}) }
        delete next[itemId]
        return { ...prev, [order.id]: next }
      })
      setAdjustedPaymentMethods(prev => {
        const next = { ...(prev[order.id] ?? {}) }
        delete next[itemId]
        return { ...prev, [order.id]: next }
      })
      setEditingItem(null); setEditingValue(''); setEditingQuantity('1'); setEditingPct(''); setEditingNote(''); editingPriceDraftRef.current = ''; editingPctDraftRef.current = ''; editingQuantityDraftRef.current = '1'; editingNoteDraftRef.current = ''; setEditingPaymentMethod('cash')
      return
    }

    setPendingItemSplits(prev => {
      if (!prev[order.id]?.[itemId]) return prev
      const nextForOrder = { ...(prev[order.id] ?? {}) }
      delete nextForOrder[itemId]
      return { ...prev, [order.id]: nextForOrder }
    })

    if (!isNaN(price) && price >= 0) {
      setAdjustedPrices(prev => {
        const next = { ...(prev[order.id] ?? {}) }
        next[itemId] = String(price)
        return { ...prev, [order.id]: next }
      })
    }
    setAdjustedNotes(prev => {
      const next = { ...(prev[order.id] ?? {}) }
      next[itemId] = nextNote
      return { ...prev, [order.id]: next }
    })
    setAdjustedPaymentMethods(prev => {
      const next = { ...(prev[order.id] ?? {}) }
      next[itemId] = editingPaymentMethod
      return { ...prev, [order.id]: next }
    })
    setEditingItem(null); setEditingValue(''); setEditingQuantity('1'); setEditingPct(''); setEditingNote(''); editingPriceDraftRef.current = ''; editingPctDraftRef.current = ''; editingQuantityDraftRef.current = '1'; editingNoteDraftRef.current = ''; setEditingPaymentMethod('cash')
  }

  const setOrderItemPaymentMethod = (orderId: string, itemId: string, paymentMethod: PaymentMethod) => {
    setAdjustedPaymentMethods(prev => {
      const next = { ...(prev[orderId] ?? {}) }
      next[itemId] = paymentMethod
      return { ...prev, [orderId]: next }
    })
  }

  const setPendingSplitPaymentMethod = (orderId: string, itemId: string, paymentMethod: PaymentMethod) => {
    setPendingItemSplits(prev => {
      const current = prev[orderId]?.[itemId]
      if (!current) return prev
      return {
        ...prev,
        [orderId]: {
          ...(prev[orderId] ?? {}),
          [itemId]: { ...current, paymentMethod },
        },
      }
    })
  }

  const cancelPendingSplit = (orderId: string, itemId: string) => {
    setPendingItemSplits(prev => {
      const nextForOrder = { ...(prev[orderId] ?? {}) }
      delete nextForOrder[itemId]
      return { ...prev, [orderId]: nextForOrder }
    })
    setEditingItem(current => current?.orderId === orderId && current.itemId === itemId ? null : current)
  }

  const setAllOrderPaymentMethods = (order: (typeof orders)[number], paymentMethod: PaymentMethod) => {
    setAdjustedPaymentMethods(prev => ({
      ...prev,
      [order.id]: Object.fromEntries(order.items.map(item => [item.itemId!, paymentMethod])),
    }))
    setPendingItemSplits(prev => {
      const current = prev[order.id]
      if (!current) return prev
      return {
        ...prev,
        [order.id]: Object.fromEntries(
          Object.entries(current).map(([itemId, split]) => [itemId, { ...split, paymentMethod }])
        ),
      }
    })
  }

  // ---- 가격/메모 DB 저장 ----

  const handleSavePrices = async (order: (typeof orders)[number]) => {
    const priceMap = adjustedPrices[order.id] ?? {}
    const noteMap  = adjustedNotes[order.id]  ?? {}
    const paymentMethodMap = adjustedPaymentMethods[order.id] ?? {}
    const splitMap = pendingItemSplits[order.id] ?? {}
    const appliedMileageRate = order.mileageRate ?? mileageRate
    setSavingOrderId(order.id)
    setSaveErrorByOrderId((prev) => {
      if (!prev[order.id]) return prev
      const next = { ...prev }
      delete next[order.id]
      return next
    })
    try {
      const splitEntries = order.items
        .map((item) => {
          const split = item.itemId ? splitMap[item.itemId] : undefined
          if (!split || !item.itemId || split.quantity >= item.quantity) return null
          return { sourceItem: item, splitQuantity: split.quantity, price: split.price, note: split.note, paymentMethod: split.paymentMethod }
        })
        .filter((entry) => entry !== null)
      const splitSourceIds = new Set(splitEntries.map((entry) => entry.sourceItem.itemId!))
      const itemUpdates = order.items
        .filter((item) => !splitSourceIds.has(item.itemId!))
        .map((item) => ({
          itemId: item.itemId!,
          price: parseAdjustedPrice(priceMap[item.itemId!], item.price),
          quantity: parseAdjustedQuantity(adjustedQuantities[order.id]?.[item.itemId!], item.quantity),
          paymentMethod: paymentMethodMap[item.itemId!] ?? item.paymentMethod,
          note: noteMap[item.itemId!] !== undefined ? (noteMap[item.itemId!] ?? null) : item.note,
        }))
        .filter((u) => {
          const originalItem = order.items.find((item) => item.itemId === u.itemId)
          if (!originalItem) return false
          const priceChanged = u.price !== originalItem.price
          const quantityChanged = u.quantity !== originalItem.quantity
          const paymentMethodChanged = u.paymentMethod !== originalItem.paymentMethod
          const noteChanged  = u.note  !== originalItem.note
          return priceChanged || quantityChanged || paymentMethodChanged || noteChanged
        })
      const nextItems = order.items.flatMap((item) => {
        const split = item.itemId ? splitMap[item.itemId] : undefined
        if (split && item.itemId && split.quantity < item.quantity) {
          return [
            { ...item, quantity: item.quantity - split.quantity },
            { ...item, price: split.price, quantity: split.quantity, paymentMethod: split.paymentMethod, note: split.note },
          ]
        }
        return [{
          ...item,
          price: parseAdjustedPrice(priceMap[item.itemId!], item.price),
          quantity: parseAdjustedQuantity(adjustedQuantities[order.id]?.[item.itemId!], item.quantity),
          paymentMethod: paymentMethodMap[item.itemId!] ?? item.paymentMethod,
        }]
      })
      const newTotal = nextItems.reduce((sum, item) => {
        return sum + getAppliedItemTotal(item.price, item.quantity, item.paymentMethod, appliedMileageRate)
      }, 0)
      const nextOrderPaymentMethod = deriveOrderPaymentMethod(nextItems)
      let splitResults: { sourceItemId: string; insertedItemId: string }[] = []
      if (splitEntries.length > 0) {
        splitResults = await splitOrderItems(order.id, splitEntries, newTotal, nextOrderPaymentMethod, nextOrderPaymentMethod === 'cash' ? null : appliedMileageRate)
      }
      if (itemUpdates.length > 0 || splitEntries.length === 0) {
        await updateItemPrices(order.id, itemUpdates, newTotal, nextOrderPaymentMethod, nextOrderPaymentMethod === 'cash' ? null : appliedMileageRate)
      }
      const adjustmentEntries = itemUpdates
        .map((update) => {
          const item = order.items.find((current) => current.itemId === update.itemId)
          if (!item || item.price === update.price) return null
          return {
            orderId: order.id,
            itemId: update.itemId,
            cardName: item.cardName,
            rarity: item.rarity,
            previousPrice: item.price,
            nextPrice: update.price,
            note: update.note ?? null,
          }
        })
        .filter((entry) => entry !== null)
      const splitAdjustmentEntries = splitEntries
        .map((split) => {
          const inserted = splitResults.find((result) => result.sourceItemId === split.sourceItem.itemId)
          if (!inserted || split.sourceItem.price === split.price) return null
          return {
            orderId: order.id,
            itemId: inserted.insertedItemId,
            cardName: split.sourceItem.cardName,
            rarity: split.sourceItem.rarity,
            previousPrice: split.sourceItem.price,
            nextPrice: split.price,
            note: split.note ?? null,
          }
        })
        .filter((entry) => entry !== null)
      if (adjustmentEntries.length > 0 || splitAdjustmentEntries.length > 0) {
        await createPriceAdjustments([...adjustmentEntries, ...splitAdjustmentEntries])
      }
      setPendingItemSplits(prev => {
        if (!prev[order.id]) return prev
        const next = { ...prev }
        delete next[order.id]
        return next
      })
      setAdjustedOrderIds(prev => new Set([...prev, order.id]))
    } catch (error) {
      console.error('[handleSavePrices]', error)
      const message =
        error instanceof Error
          ? error.message
          : '매매가 저장 중 오류가 발생했습니다. 다시 시도해 주세요.'
      setSaveErrorByOrderId((prev) => ({ ...prev, [order.id]: message }))
    } finally {
      setSavingOrderId(null)
    }
  }

  const handleCancelPriceAdjustments = async (
    order: (typeof orders)[number],
    entries: (typeof priceAdjustmentsByOrderId)[string]
  ) => {
    if (entries.length === 0) return

    const appliedMileageRate = order.mileageRate ?? mileageRate
    const oldestAdjustmentByItemId = new Map<string, (typeof entries)[number]>()
    const sortedEntries = [...entries].sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())

    for (const entry of sortedEntries) {
      if (!oldestAdjustmentByItemId.has(entry.itemId)) {
        oldestAdjustmentByItemId.set(entry.itemId, entry)
      }
    }

    const itemUpdates = new Map<string, {
      itemId: string
      price: number
      quantity: number
      note: string | null
      paymentMethod: PaymentMethod
    }>()
    const itemDeletes = new Set<string>()

    for (const [itemId, entry] of oldestAdjustmentByItemId) {
      const item = order.items.find((current) => current.itemId === itemId)
      if (!item?.itemId) continue

      const mergeTarget = order.items.find((candidate) => {
        if (!candidate.itemId || candidate.itemId === itemId || itemDeletes.has(candidate.itemId)) return false
        return (
          candidate.cardId === item.cardId &&
          candidate.rarity === item.rarity &&
          candidate.price === entry.previousPrice &&
          (candidate.note ?? null) === null
        )
      })

      if (mergeTarget?.itemId) {
        const existingTargetUpdate = itemUpdates.get(mergeTarget.itemId)
        itemUpdates.set(mergeTarget.itemId, {
          itemId: mergeTarget.itemId,
          price: mergeTarget.price,
          quantity: (existingTargetUpdate?.quantity ?? mergeTarget.quantity) + item.quantity,
          note: existingTargetUpdate?.note ?? mergeTarget.note ?? null,
          paymentMethod: existingTargetUpdate?.paymentMethod ?? mergeTarget.paymentMethod,
        })
        itemDeletes.add(itemId)
        continue
      }

      itemUpdates.set(itemId, {
        itemId,
        price: entry.previousPrice,
        quantity: item.quantity,
        note: null,
        paymentMethod: item.paymentMethod,
      })
    }

    const restoredItems = order.items
      .filter((item) => !item.itemId || !itemDeletes.has(item.itemId))
      .map((item) => {
        const update = item.itemId ? itemUpdates.get(item.itemId) : undefined
        return update
          ? { ...item, price: update.price, quantity: update.quantity, note: update.note, paymentMethod: update.paymentMethod }
          : item
      })

    const newTotal = restoredItems.reduce((sum, item) => {
      return sum + getAppliedItemTotal(item.price, item.quantity, item.paymentMethod, appliedMileageRate)
    }, 0)
    const nextOrderPaymentMethod = deriveOrderPaymentMethod(restoredItems)

    setCancelingAdjustmentOrderId(order.id)
    setSaveErrorByOrderId((prev) => {
      if (!prev[order.id]) return prev
      const next = { ...prev }
      delete next[order.id]
      return next
    })

    try {
      await cancelPriceAdjustments(
        order.id,
        [...itemUpdates.values()],
        [...itemDeletes],
        newTotal,
        nextOrderPaymentMethod,
        nextOrderPaymentMethod === 'cash' ? null : appliedMileageRate
      )
      setAdjustedOrderIds((prev) => {
        if (!prev.has(order.id)) return prev
        const next = new Set(prev)
        next.delete(order.id)
        return next
      })
      setAdjustedPrices((prev) => {
        if (!prev[order.id]) return prev
        const next = { ...prev }
        delete next[order.id]
        return next
      })
      setAdjustedQuantities((prev) => {
        if (!prev[order.id]) return prev
        const next = { ...prev }
        delete next[order.id]
        return next
      })
      setAdjustedNotes((prev) => {
        if (!prev[order.id]) return prev
        const next = { ...prev }
        delete next[order.id]
        return next
      })
      setPendingItemSplits((prev) => {
        if (!prev[order.id]) return prev
        const next = { ...prev }
        delete next[order.id]
        return next
      })
    } catch (error) {
      console.error('[handleCancelPriceAdjustments]', error)
      const message =
        error instanceof Error
          ? error.message
          : '가격 조정 취소 중 오류가 발생했습니다. 다시 시도해 주세요.'
      setSaveErrorByOrderId((prev) => ({ ...prev, [order.id]: message }))
    } finally {
      setCancelingAdjustmentOrderId(null)
    }
  }

  const handleDeleteItem = async (order: (typeof orders)[number], idx: number) => {
    const target = order.items[idx]
    if (!target?.itemId) return

    const remainingItems = order.items.filter((_, itemIdx) => itemIdx !== idx)
    const deleteWholeOrder = remainingItems.length === 0
    const appliedMileageRate = order.mileageRate ?? mileageRate
    const nextItems = remainingItems.map((item) => ({
      ...item,
      price: parseAdjustedPrice(adjustedPrices[order.id]?.[item.itemId!], item.price),
      quantity: parseAdjustedQuantity(adjustedQuantities[order.id]?.[item.itemId!], item.quantity),
      paymentMethod: adjustedPaymentMethods[order.id]?.[item.itemId!] ?? item.paymentMethod,
    }))
    const newTotal = nextItems.reduce((sum, item) => {
      return sum + getAppliedItemTotal(item.price, item.quantity, item.paymentMethod, appliedMileageRate)
    }, 0)
    const nextOrderPaymentMethod = deriveOrderPaymentMethod(nextItems)

    setDeletingItemKey(target.itemId)
    try {
      await deleteOrderItem(
        order.id,
        target.itemId,
        newTotal,
        nextOrderPaymentMethod,
        nextOrderPaymentMethod === 'cash' ? null : appliedMileageRate,
        deleteWholeOrder
      )
      setAdjustedPrices((prev) => {
        const next = { ...(prev[order.id] ?? {}) }
        delete next[target.itemId!]
        return { ...prev, [order.id]: next }
      })
      setAdjustedQuantities((prev) => {
        const next = { ...(prev[order.id] ?? {}) }
        delete next[target.itemId!]
        return { ...prev, [order.id]: next }
      })
      setAdjustedNotes((prev) => {
        const next = { ...(prev[order.id] ?? {}) }
        delete next[target.itemId!]
        return { ...prev, [order.id]: next }
      })
      setAdjustedPaymentMethods((prev) => {
        const next = { ...(prev[order.id] ?? {}) }
        delete next[target.itemId!]
        return { ...prev, [order.id]: next }
      })
      setPendingItemSplits((prev) => {
        const next = { ...(prev[order.id] ?? {}) }
        delete next[target.itemId!]
        return { ...prev, [order.id]: next }
      })
      if (deleteWholeOrder) {
        setExpandedOrder((current) => (current === order.id ? null : current))
      }
    } finally {
      setDeletingItemKey(null)
      setEditingItem(null)
    }
  }

  // ---- 카드 일괄 가격 저장 ----

  const handleBulkSave = async () => {
    if (Object.keys(bulkEdits).length === 0) return
    setBulkSaving(true)
    try {
      const promises = Object.entries(bulkEdits)
        .filter(([cardId]) => {
          const card = cards.find(c => c.id === cardId)
          if (!card) return false
          return Object.entries(bulkEdits[cardId]).some(([rarity, val]) => {
            const price = parseFloat(val)
            const existing = card.prices.find(p => p.rarity === rarity)
            return existing?.price !== (isNaN(price) ? 0 : price)
          })
        })
        .map(([cardId]) => {
          const card = cards.find(c => c.id === cardId)!
          const changes = bulkEdits[cardId]
          let newPrices = [...card.prices]
          for (const [rarity, val] of Object.entries(changes)) {
            const price = parseFloat(val)
            if (isNaN(price) || price <= 0) {
              newPrices = newPrices.filter(p => p.rarity !== rarity)
            } else {
              const idx = newPrices.findIndex(p => p.rarity === rarity)
              if (idx >= 0) {
                newPrices[idx] = { ...newPrices[idx], price }
              } else {
                newPrices.push({ rarity: rarity as RarityKey, price })
              }
            }
          }
          const enabledRarities = Object.fromEntries(newPrices.map(p => [p.rarity, p.price > 0]))
          return updateCardAsync(cardId, { prices: newPrices, enabledRarities, isStopped: newPrices.length === 0 })
        })
      await Promise.all(promises)
      setBulkEdits({})
      setBulkSaved(true); setTimeout(() => setBulkSaved(false), 2000)
    } finally {
      setBulkSaving(false)
    }
  }

  const handleBulkExportCsv = () => {
    if (bulkTabCards.length === 0) return

    const escapeCsv = (value: string | number) => {
      const text = String(value ?? '')
      return `"${text.replace(/"/g, '""')}"`
    }

    const header = ['카드명', '코드', ...bulkRarities]
    const rows = bulkTabCards.map((card) => {
      const priceColumns = bulkRarities.map((rarity) => {
        const edited = bulkEdits[card.id]?.[rarity]
        if (edited !== undefined) return edited
        const existing = card.prices.find((price) => price.rarity === rarity)
        return existing ? String(existing.price) : ''
      })
      return [card.name, card.code, ...priceColumns]
    })

    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tcg_prices_${effectiveBulkTab || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleBulkImportClick = () => {
    bulkImportInputRef.current?.click()
  }

  const handleBulkImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setBulkImportError(null)
    setBulkImportSuccess(null)

    try {
      const text = await file.text()
      const rows = text
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map(parseCsvRow)

      if (rows.length < 2) throw new Error('가져올 데이터가 없습니다.')

      const header = rows[0]
      const rarityIndexes = bulkRarities
        .map((rarity) => ({ rarity, index: header.findIndex((cell) => cell.trim().toUpperCase() === rarity.toUpperCase()) }))
        .filter((entry) => entry.index >= 0)

      if (rarityIndexes.length === 0) throw new Error('CSV 헤더에서 레어도 컬럼을 찾지 못했습니다.')

      const nextEdits: Record<string, Record<string, string>> = {}
      let matchedRows = 0

      for (const row of rows.slice(1)) {
        const code = row[1]?.trim()
        const name = row[0]?.trim()
        const card = bulkTabCards.find((item) => (code && item.code === code) || (!code && name && item.name === name))
        if (!card) continue

        const cardEdits: Record<string, string> = {}
        for (const { rarity, index } of rarityIndexes) {
          cardEdits[rarity] = row[index]?.trim() ?? ''
        }
        nextEdits[card.id] = cardEdits
        matchedRows += 1
      }

      if (matchedRows === 0) throw new Error('현재 탭의 카드와 일치하는 행이 없습니다.')

      setBulkEdits(nextEdits)
      setBulkImportSuccess(`${matchedRows}개 카드 가격을 불러왔습니다.`)
      setTimeout(() => setBulkImportSuccess(null), 2500)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'CSV 불러오기에 실패했습니다.'
      setBulkImportError(message)
    } finally {
      if (bulkImportInputRef.current) bulkImportInputRef.current.value = ''
    }
  }

  const handlePrintOrder = (order: (typeof orders)[number], mode: 'estimate' | 'receipt') => {
    if (typeof window === 'undefined') return
    const printWindow = window.open('', '_blank', 'width=720,height=900')
    if (!printWindow) return

    const title = mode === 'estimate' ? '매입 견적서' : '매입 지급 확인서'
    const statusLabel = mode === 'estimate' ? '견적' : '지급'
    const cashItems = order.items.filter((item) => item.paymentMethod === 'cash')
    const mileageItems = order.items.filter((item) => item.paymentMethod === 'mileage')
    const cashTotal = cashItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const mileageBaseTotal = mileageItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const mileageAppliedTotal = order.mileageRate
      ? mileageItems.reduce((sum, item) => sum + Math.round(item.price * item.quantity * order.mileageRate!), 0)
      : null
    const mileagePercent = order.mileageRate ? Math.round((order.mileageRate - 1) * 100) : null
    const paymentMethodLabel =
      order.paymentMethod === 'mixed'
        ? '현금 + 마일리지'
        : order.paymentMethod === 'mileage'
          ? '마일리지'
          : '현금'
    const itemRows = order.items.map((item) => `
      <tr>
        <td>${item.cardName}</td>
        <td>${item.rarity}</td>
        <td>${item.quantity}</td>
        <td>${formatPrice(item.price)}</td>
        <td>${item.paymentMethod === 'mileage' ? '마일리지' : '현금'}</td>
        <td>${item.note ?? ''}</td>
      </tr>
    `).join('')

    const html = `
      <!doctype html>
      <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          h1 { margin: 0 0 8px; font-size: 28px; }
          .meta { margin-bottom: 20px; color: #444; }
          .box { border: 1px solid #ddd; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border-bottom: 1px solid #e5e5e5; padding: 10px 8px; text-align: left; font-size: 14px; }
          th { background: #f7f7f7; }
          .total { font-size: 24px; font-weight: 700; text-align: right; margin-top: 16px; }
          .footer { margin-top: 28px; color: #555; font-size: 13px; }
        </style>
      </head>
      <body>
        <h1>마린포드 ${title}</h1>
        <div class="meta">${statusLabel} 일시: ${formatDate(order.createdAt)}</div>
        <div class="box">
          <div>고객명: ${order.customerName}</div>
          <div>연락처: ${order.phoneNumber}</div>
          <div>계좌: ${order.bankName} ${order.accountNumber}</div>
          <div>결제수단: ${order.paymentMethod === 'mileage' ? '마일리지' : '현금'}</div>
          ${order.paymentMethod === 'mileage' && order.mileageRate
            ? `<div>마일리지 배율: x${order.mileageRate.toFixed(2)} (+${mileagePercent}%)</div>
               <div>마일리지 적용 지급액: ${formatPrice(mileageAppliedTotal ?? order.totalPrice)}</div>`
            : ''
          }
        </div>
        <table>
          <thead>
            <tr>
              <th>카드명</th>
              <th>레어도</th>
              <th>수량</th>
              <th>매입가</th>
              <th>조정 사유</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div class="total">총 ${formatPrice(order.totalPrice)}</div>
        <div class="footer">마린포드 TCG Kiosk</div>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const filteredCards = cardSearch.trim()
    ? cards.filter(c => c.name.includes(cardSearch) || c.code.includes(cardSearch))
    : cards

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter
    if (!matchesStatus) return false
    if (!deferredOrderSearch.trim()) return true

    const query = deferredOrderSearch.trim().toLowerCase()
    return [
      order.customerName,
      order.phoneNumber,
      order.accountNumber,
      order.bankName,
      ...order.items.flatMap((item) => [item.cardName, item.cardCode, item.note ?? '']),
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query))
  }), [deferredOrderSearch, orderStatusFilter, orders])

  // 통계
  const today = new Date()
  const todayStr = today.toDateString()
  const weekStart = new Date(today)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(today.getDate() - 6)
  const monthStart = new Date(today)
  monthStart.setHours(0, 0, 0, 0)
  monthStart.setDate(today.getDate() - 29)
  const statsOrders = statsRange === 'today'
    ? orders.filter(o => new Date(o.createdAt).toDateString() === todayStr)
    : statsRange === 'week'
    ? orders.filter(o => new Date(o.createdAt) >= weekStart)
    : statsRange === 'month'
    ? orders.filter(o => new Date(o.createdAt) >= monthStart)
    : orders
  const statsTotal      = statsOrders.reduce((sum, o) => sum + o.totalPrice, 0)
  const statsPaidTotal  = statsOrders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.totalPrice, 0)
  const statsCashCount  = statsOrders.filter(o => deriveOrderPaymentMethod(o.items) === 'cash').length
  const statsMileageCount = statsOrders.filter(o => deriveOrderPaymentMethod(o.items) === 'mileage').length
  const statsMixedCount = statsOrders.filter(o => deriveOrderPaymentMethod(o.items) === 'mixed').length
  const statsItemCount = statsOrders
    .filter(o => o.status !== 'rejected')
    .reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)

  const topCardsMap = new Map<string, { cardName: string; rarity: string; count: number; totalPrice: number }>()
  for (const order of statsOrders.filter(o => o.status !== 'rejected')) {
    for (const item of order.items) {
      const key = `${item.cardName}|${item.rarity}`
      const e = topCardsMap.get(key)
      if (e) { e.count += item.quantity; e.totalPrice += item.price * item.quantity }
      else topCardsMap.set(key, { cardName: item.cardName, rarity: item.rarity, count: item.quantity, totalPrice: item.price * item.quantity })
    }
  }
  const allStatsCards = [...topCardsMap.values()].sort((a, b) => b.count - a.count)
  const topCards = topCardsLimit === 'all' ? allStatsCards : allStatsCards.slice(0, topCardsLimit)
  const topCardsTitle = topCardsLimit === 'all' ? '인기 매입 카드 전체' : `인기 매입 카드 TOP ${topCardsLimit}`

  // 일괄 편집 — 현재 탭 카드 + 레어도 컬럼
  const statsAnalytics = useMemo(() => {
    const cardById = new Map(cards.map(card => [card.id, card]))
    const gameById = new Map(games.map(game => [game.id, game]))
    const tabById = new Map(tabObjects.map(tab => [tab.id, tab]))
    const tabByName = new Map(tabObjects.map(tab => [tab.name, tab]))
    const gameTotals = new Map<string, { name: string; total: number; count: number; color: string }>()
    const today = new Date()
    const addAmountToBucket = (
      bucket: { total: number; count: number } | undefined,
      order: (typeof orders)[number]
    ) => {
      if (!bucket || order.status === 'rejected') return
      for (const item of order.items) {
        bucket.total += getAppliedItemTotal(item.price, item.quantity, item.paymentMethod, order.mileageRate ?? mileageRate)
        bucket.count += item.quantity
      }
    }
    const weeklyBuckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - index))
      return { key: getDateKey(date), label: formatChartDate(date), total: 0, count: 0 }
    })
    const weeklyByKey = new Map(weeklyBuckets.map(bucket => [bucket.key, bucket]))

    for (const order of statsOrders) {
      if (order.status === 'rejected') continue
      const weeklyBucket = weeklyByKey.get(getDateKey(new Date(order.createdAt)))

      for (const item of order.items) {
        const amount = getAppliedItemTotal(item.price, item.quantity, item.paymentMethod, order.mileageRate ?? mileageRate)
        const card = item.cardId ? cardById.get(item.cardId) : undefined
        const tab = card?.tabId ? tabById.get(card.tabId) : tabByName.get(card?.category ?? '')
        const gameId = card?.gameId ?? tab?.game_id ?? null
        const name = gameId ? gameById.get(gameId)?.name ?? '미분류' : '미분류'
        const previous = gameTotals.get(name)

        if (previous) {
          previous.total += amount
          previous.count += item.quantity
        } else {
          gameTotals.set(name, {
            name,
            total: amount,
            count: item.quantity,
            color: GAME_CHART_COLORS[gameTotals.size % GAME_CHART_COLORS.length],
          })
        }

        if (weeklyBucket) {
          weeklyBucket.total += amount
          weeklyBucket.count += item.quantity
        }
      }
    }

    return {
      byGame: [...gameTotals.values()].sort((a, b) => b.total - a.total),
      weekly: weeklyBuckets,
      monthly: (() => {
        const monthlyBuckets = Array.from({ length: 30 }, (_, index) => {
          const date = new Date(today)
          date.setDate(today.getDate() - (29 - index))
          return { key: getDateKey(date), label: formatChartDate(date), total: 0, count: 0 }
        })
        const monthlyByKey = new Map(monthlyBuckets.map(bucket => [bucket.key, bucket]))

        for (const order of orders) {
          if (order.status === 'rejected') continue
          const bucket = monthlyByKey.get(getDateKey(new Date(order.createdAt)))
          if (!bucket) continue

          for (const item of order.items) {
            bucket.total += getAppliedItemTotal(item.price, item.quantity, item.paymentMethod, order.mileageRate ?? mileageRate)
            bucket.count += item.quantity
          }
        }

        return monthlyBuckets
      })(),
      allTrend: (() => {
        const trendOrders = orders
          .filter(order => order.status !== 'rejected')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

        if (trendOrders.length === 0) {
          return {
            data: [] as { key: string; label: string; total: number; count: number }[],
            title: '\uC804\uCCB4 \uAE30\uAC04 \uCD94\uC774',
            emptyText: '\uC804\uCCB4 \uAE30\uAC04 \uAC70\uB798 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4',
            note: '',
            interval: 0,
          }
        }

        const firstDate = getStartOfDay(new Date(trendOrders[0].createdAt))
        const spanDays = getDayDiff(firstDate, today) + 1

        if (spanDays <= 30) {
          const buckets = Array.from({ length: spanDays }, (_, index) => {
            const date = new Date(firstDate)
            date.setDate(firstDate.getDate() + index)
            return { key: getDateKey(date), label: formatChartDate(date), total: 0, count: 0 }
          })
          const byKey = new Map(buckets.map(bucket => [bucket.key, bucket]))
          for (const order of trendOrders) addAmountToBucket(byKey.get(getDateKey(new Date(order.createdAt))), order)
          return {
            data: buckets,
            title: '\uC804\uCCB4 \uAE30\uAC04 \uC77C\uBCC4 \uCD94\uC774',
            emptyText: '\uC804\uCCB4 \uAE30\uAC04 \uAC70\uB798 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4',
            note: '\uC804\uCCB4 \uB370\uC774\uD130\uAC00 30\uC77C \uC774\uD558\uB77C \uC77C\uBCC4\uB85C \uD45C\uC2DC\uD569\uB2C8\uB2E4',
            interval: Math.max(Math.ceil(buckets.length / 7) - 1, 0),
          }
        }

        if (spanDays <= 90) {
          const buckets: { key: string; label: string; total: number; count: number }[] = []
          const cursor = getWeekStart(firstDate)
          const endKey = getWeekKey(today)
          while (getWeekKey(cursor) <= endKey) {
            buckets.push({ key: getWeekKey(cursor), label: formatWeekLabel(cursor), total: 0, count: 0 })
            cursor.setDate(cursor.getDate() + 7)
          }
          const byKey = new Map(buckets.map(bucket => [bucket.key, bucket]))
          for (const order of trendOrders) addAmountToBucket(byKey.get(getWeekKey(new Date(order.createdAt))), order)
          return {
            data: buckets,
            title: '\uC804\uCCB4 \uAE30\uAC04 \uC8FC\uBCC4 \uCD94\uC774',
            emptyText: '\uC804\uCCB4 \uAE30\uAC04 \uAC70\uB798 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4',
            note: '\uC804\uCCB4 \uB370\uC774\uD130\uAC00 30\uC77C\uC744 \uB118\uC5B4 \uC8FC\uBCC4\uB85C \uBB36\uC5B4 \uD45C\uC2DC\uD569\uB2C8\uB2E4',
            interval: Math.max(Math.ceil(buckets.length / 8) - 1, 0),
          }
        }

        const monthBuckets: { key: string; label: string; total: number; count: number }[] = []
        const cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1)
        const endMonthKey = getMonthKey(today)
        while (getMonthKey(cursor) <= endMonthKey) {
          monthBuckets.push({ key: getMonthKey(cursor), label: formatMonthLabel(cursor), total: 0, count: 0 })
          cursor.setMonth(cursor.getMonth() + 1)
        }
        const byMonthKey = new Map(monthBuckets.map(bucket => [bucket.key, bucket]))
        for (const order of trendOrders) addAmountToBucket(byMonthKey.get(getMonthKey(new Date(order.createdAt))), order)
        return {
          data: monthBuckets,
          title: '\uC804\uCCB4 \uAE30\uAC04 \uC6D4\uBCC4 \uCD94\uC774',
          emptyText: '\uC804\uCCB4 \uAE30\uAC04 \uAC70\uB798 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4',
          note: '\uC804\uCCB4 \uB370\uC774\uD130\uAC00 90\uC77C\uC744 \uB118\uC5B4 \uC6D4\uBCC4\uB85C \uBB36\uC5B4 \uD45C\uC2DC\uD569\uB2C8\uB2E4',
          interval: Math.max(Math.ceil(monthBuckets.length / 8) - 1, 0),
        }
      })(),
      maxWeeklyTotal: Math.max(...weeklyBuckets.map(bucket => bucket.total), 1),
    }
  }, [cards, games, mileageRate, orders, statsOrders, tabObjects])

  const statsRangeLabels: Record<typeof statsRange, string> = {
    today: '\uC624\uB298',
    week: '7\uC77C',
    month: '30\uC77C',
    all: '\uC804\uCCB4',
  }
  const trendChart = statsRange === 'week'
    ? {
        data: statsAnalytics.weekly,
        title: '\uCD5C\uADFC 7\uC77C \uCD94\uC774',
        emptyText: '\uCD5C\uADFC 7\uC77C \uAC70\uB798 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4',
        note: '',
        interval: 0,
      }
    : statsRange === 'month'
    ? {
        data: statsAnalytics.monthly,
        title: '\uCD5C\uADFC 30\uC77C \uCD94\uC774',
        emptyText: '\uCD5C\uADFC 30\uC77C \uAC70\uB798 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4',
        note: '',
        interval: 4,
      }
    : statsAnalytics.allTrend

  const downloadStatsCsv = useCallback(() => {
    const rows = [
      ['section', 'name', 'count', 'total'],
      ...statsAnalytics.byGame.map(item => ['game', item.name, String(item.count), String(item.total)]),
      ...statsAnalytics.weekly.map(item => ['weekly', item.label, String(item.count), String(item.total)]),
      ...statsAnalytics.monthly.map(item => ['monthly', item.label, String(item.count), String(item.total)]),
      ...statsAnalytics.allTrend.data.map(item => ['all-trend', item.label, String(item.count), String(item.total)]),
      ...allStatsCards.map(item => ['card', `${item.cardName} ${item.rarity}`, String(item.count), String(item.totalPrice)]),
    ]
    const csv = rows
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `marinford-stats-${statsRange}-${getDateKey(new Date())}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [allStatsCards, statsAnalytics.allTrend.data, statsAnalytics.byGame, statsAnalytics.monthly, statsAnalytics.weekly, statsRange])

  const downloadStatsImage = useCallback(async () => {
    const target = statsCaptureRef.current
    if (!target) return
    const htmlToImage = await import('html-to-image')
    const dataUrl = await htmlToImage.toPng(target, {
      cacheBust: true,
      backgroundColor: '#09090b',
      pixelRatio: 2,
    })
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `marinford-stats-${statsRange}-${getDateKey(new Date())}.png`
    link.click()
  }, [statsRange])

  const effectiveBulkTab = bulkEditTab || tabs[0] || ''
  const bulkTabCards = cards.filter(c => c.category === effectiveBulkTab)
  const bulkRarities = globalRarities.length > 0 ? globalRarities : ALL_RARITIES
  const bulkChangedCount = Object.keys(bulkEdits).length

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
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
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
                activeTab === key ? 'border-b-2 border-amber-500 text-amber-500' : 'text-zinc-500 hover:text-zinc-300'
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

              {/* 상태 필터 */}
              <div className="mb-5 flex flex-wrap gap-2">
                {ORDER_STATUS_FILTERS.map(({ key, label }) => {
                  const count = key === 'all' ? orders.length : orders.filter(o => o.status === key).length
                  return (
                    <button
                      key={key}
                      onClick={() => setOrderStatusFilter(key)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        orderStatusFilter === key
                          ? 'bg-zinc-700 text-white'
                          : 'bg-zinc-800/60 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {label}
                      <span className={`rounded-full px-1.5 py-0.5 text-xs ${orderStatusFilter === key ? 'bg-zinc-600 text-zinc-200' : 'bg-zinc-700 text-zinc-500'}`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="mb-5 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="고객명, 연락처, 계좌번호, 카드명으로 검색..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                />
              </div>

              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                    <Clock className="h-8 w-8 text-zinc-600" />
                  </div>
                  <p className="mt-4 text-lg font-medium text-zinc-400">매입 요청이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => {
                    const status = statusConfig[order.status]
                    const isExpanded = expandedOrder === order.id
                    const priceArr = adjustedPrices[order.id]
                    const noteArr  = adjustedNotes[order.id]
                    const quantityArr = adjustedQuantities[order.id]
                    const paymentMethodArr = adjustedPaymentMethods[order.id]
                    const saveError = saveErrorByOrderId[order.id]
                    const pricesChanged = priceArr
                      ? order.items.some((item) => {
                          const v = priceArr[item.itemId!]
                          return v !== undefined && v !== '' && parseFloat(v) !== item.price
                        })
                      : false
                    const quantitiesChanged = quantityArr
                      ? order.items.some((item) => {
                          const v = quantityArr[item.itemId!]
                          return v !== undefined && v !== '' && parseAdjustedQuantity(v, item.quantity) !== item.quantity
                        })
                      : false
                    const notesChanged = noteArr
                      ? order.items.some((item) => noteArr[item.itemId!] !== undefined && noteArr[item.itemId!] !== item.note)
                      : false
                    const paymentMethodsChanged = paymentMethodArr
                      ? order.items.some((item) => paymentMethodArr[item.itemId!] !== undefined && paymentMethodArr[item.itemId!] !== item.paymentMethod)
                      : false
                    const splitArr = pendingItemSplits[order.id]
                    const splitsChanged = splitArr ? Object.keys(splitArr).length > 0 : false
                    const hasChanges = pricesChanged || quantitiesChanged || notesChanged || paymentMethodsChanged || splitsChanged
                    const orderAuditEntries = priceAdjustmentsByOrderId[order.id] ?? []
                    const isAdjusted = adjustedOrderIds.has(order.id) || orderAuditEntries.length > 0
                    const orderGameBadges = getOrderGameBadges(order)
                    const effectiveOrderPaymentMethod = deriveOrderPaymentMethod(
                      order.items.map((item) => ({
                        paymentMethod: paymentMethodArr?.[item.itemId!] ?? item.paymentMethod,
                      }))
                    )

                    return (
                      <div key={order.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800/50">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedOrder(null); setEditingItem(null)
                            } else {
                              setExpandedOrder(order.id)
                              setAdjustedPrices(prev => ({
                                ...prev, [order.id]: Object.fromEntries(order.items.map(i => [i.itemId!, String(i.price)])),
                              }))
                              setAdjustedQuantities(prev => ({
                                ...prev, [order.id]: Object.fromEntries(order.items.map(i => [i.itemId!, String(i.quantity)])),
                              }))
                              setAdjustedNotes(prev => ({
                                ...prev, [order.id]: Object.fromEntries(order.items.map(i => [i.itemId!, i.note ?? undefined])),
                              }))
                              setAdjustedPaymentMethods(prev => ({
                                ...prev, [order.id]: Object.fromEntries(order.items.map(i => [i.itemId!, i.paymentMethod])),
                              }))
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              if (isExpanded) {
                                setExpandedOrder(null); setEditingItem(null)
                              } else {
                                setExpandedOrder(order.id)
                                setAdjustedPrices(prev => ({
                                  ...prev, [order.id]: Object.fromEntries(order.items.map(i => [i.itemId!, String(i.price)])),
                                }))
                                setAdjustedQuantities(prev => ({
                                  ...prev, [order.id]: Object.fromEntries(order.items.map(i => [i.itemId!, String(i.quantity)])),
                                }))
                                setAdjustedNotes(prev => ({
                                  ...prev, [order.id]: Object.fromEntries(order.items.map(i => [i.itemId!, i.note ?? undefined])),
                                }))
                                setAdjustedPaymentMethods(prev => ({
                                  ...prev, [order.id]: Object.fromEntries(order.items.map(i => [i.itemId!, i.paymentMethod])),
                                }))
                              }
                            }
                          }}
                          className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-zinc-800"
                        >
                          <div className="flex items-center gap-4">
                            <OrderGameBadges games={orderGameBadges} />
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-white">{order.customerName}</span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                                  {status.icon}{status.label}
                                </span>
                                {isAdjusted && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-medium text-sky-400">
                                    <Scissors className="h-3 w-3" />가격조정됨
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{order.bankName}</span>
                                <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" />{order.accountNumber}</span>
                                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{order.phoneNumber}</span>
                                {effectiveOrderPaymentMethod === 'mileage' && (
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
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePrintOrder(order, 'estimate') }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-700 text-zinc-400 transition-colors hover:bg-zinc-600 hover:text-white"
                              title="견적서 출력"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePrintOrder(order, 'receipt') }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-700 text-zinc-400 transition-colors hover:bg-zinc-600 hover:text-white"
                              title="영수증 출력"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${effectiveOrderPaymentMethod === 'mileage' ? 'text-emerald-400' : effectiveOrderPaymentMethod === 'mixed' ? 'text-violet-300' : 'text-amber-500'}`}>
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
                              <p className="text-xs font-medium text-zinc-500">매입 품목</p>
                              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                                <span className="text-xs font-semibold text-zinc-400">정산 방식 일괄 변경</span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setAllOrderPaymentMethods(order, 'cash')
                                    }}
                                    className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/25"
                                  >
                                    <Banknote className="h-3.5 w-3.5" />
                                    전체 현금
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setAllOrderPaymentMethods(order, 'mileage')
                                    }}
                                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/25"
                                  >
                                    <Coins className="h-3.5 w-3.5" />
                                    전체 마일리지
                                  </button>
                                </div>
                              </div>
                              {order.items.map((item, idx) => {
                                const colors = getRarityColors(item.rarity)
                                const cardImg = item.cardId ? cardImageById.get(item.cardId) : undefined
                                const savedPrice = item.itemId ? priceArr?.[item.itemId] : undefined
                                const savedQuantity = item.itemId ? quantityArr?.[item.itemId] : undefined
                                const savedPaymentMethod = item.itemId ? paymentMethodArr?.[item.itemId] : undefined
                                const pendingSplit = item.itemId ? splitArr?.[item.itemId] : undefined
                                const remainingQuantity = pendingSplit ? Math.max(1, item.quantity - pendingSplit.quantity) : item.quantity
                                const displayPrice = pendingSplit ? item.price : savedPrice !== undefined ? (parseFloat(savedPrice) || item.price) : item.price
                                const displayQuantity = pendingSplit ? remainingQuantity : savedQuantity !== undefined ? parseAdjustedQuantity(savedQuantity, item.quantity) : item.quantity
                                const displayPaymentMethod = savedPaymentMethod ?? item.paymentMethod
                                const displayNote  = item.itemId && noteArr?.[item.itemId] !== undefined ? noteArr[item.itemId] : item.note
                                const isPriceChanged = savedPrice !== undefined && parseFloat(savedPrice) !== item.price
                                const isQuantityChanged = pendingSplit ? true : savedQuantity !== undefined && parseAdjustedQuantity(savedQuantity, item.quantity) !== item.quantity
                                const isPaymentMethodChanged = savedPaymentMethod !== undefined && savedPaymentMethod !== item.paymentMethod
                                const hasAdjustmentHistory = item.itemId ? orderAuditEntries.some(entry => entry.itemId === item.itemId) : false
                                const isAdjustedVisual = hasAdjustmentHistory || isPriceChanged || isPaymentMethodChanged || Boolean(displayNote)
                                const isPriceAdjustedVisual = hasAdjustmentHistory || isPriceChanged || Boolean(displayNote)
                                const isItemEditing = editingItem?.orderId === order.id && editingItem?.itemId === item.itemId && editingItem.variant === 'base'
                                const isSplitEditing = editingItem?.orderId === order.id && editingItem?.itemId === item.itemId && editingItem.variant === 'split'

                                return (
                                  <div
                                    key={item.itemId ?? `${item.cardId}-${item.rarity}-${idx}`}
                                    className={`overflow-hidden rounded-lg border transition-colors ${
                                      isAdjustedVisual
                                        ? 'border-sky-500/35 bg-sky-500/10 shadow-[inset_3px_0_0_rgba(14,165,233,0.9)]'
                                        : 'border-transparent bg-zinc-900'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 p-2">
                                      <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-zinc-800">
                                        {cardImg ? (
                                          <img src={cardImg} alt={item.cardName} className="h-full w-full object-contain"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                        ) : <div className="h-full w-full" />}
                                      </div>
                                      <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>{item.rarity}</span>
                                      <div className="min-w-0 flex-1">
                                        <span className="block truncate text-sm text-white">{item.cardName}</span>
                                        <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${displayPaymentMethod === 'mileage' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                                          {displayPaymentMethod === 'mileage' ? <Coins className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                                          {displayPaymentMethod === 'mileage' ? '마일리지' : '현금'}
                                        </span>
                                        {isPriceAdjustedVisual && (
                                          <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/15 px-2 py-0.5 text-[11px] font-bold text-sky-200">
                                            <Scissors className="h-3 w-3" />
                                            가격조정됨
                                          </span>
                                        )}
                                        {displayNote && (
                                          <span className="flex items-center gap-1 text-xs text-sky-400/70">
                                            <MessageSquare className="h-3 w-3" />{displayNote}
                                          </span>
                                        )}
                                      </div>
                                      {item.itemId && (
                                        <div className="w-[156px] shrink-0">
                                          <PaymentMethodToggle
                                            value={displayPaymentMethod}
                                            onChange={(nextValue) => setOrderItemPaymentMethod(order.id, item.itemId!, nextValue)}
                                            compact
                                          />
                                        </div>
                                      )}
                                      <span className={`shrink-0 text-xs ${isQuantityChanged ? 'text-sky-400' : 'text-zinc-500'}`}>x{displayQuantity}</span>
                                      <div className="flex shrink-0 items-center gap-1.5">
                                        {isPriceChanged && (
                                          <span className="text-xs text-zinc-600 line-through">{formatPrice(item.price)}</span>
                                        )}
                                        {isQuantityChanged && (
                                          <span className="text-xs text-zinc-600 line-through">
                                            {formatPrice(item.price * item.quantity)}
                                          </span>
                                        )}
                                        <span className={`text-sm font-medium ${isPriceChanged || isQuantityChanged || isPaymentMethodChanged ? 'text-sky-400' : 'text-zinc-300'}`}>
                                          {formatPrice(getAppliedItemTotal(displayPrice, displayQuantity, displayPaymentMethod, order.mileageRate ?? mileageRate))}
                                        </span>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (isItemEditing) setEditingItem(null)
                                          else if (item.itemId) openEditItem(order.id, item.itemId, item.price, item.quantity, item.note, item.paymentMethod, 'base')
                                        }}
                                        className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                          isItemEditing ? 'bg-zinc-600 text-zinc-300' : 'bg-zinc-700/60 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                                        }`}
                                      >
                                        <Scissors className="h-3 w-3" />
                                        {isItemEditing ? '닫기' : '수정'}
                                      </button>
                                    </div>

                                    {/* 인라인 편집 패널 */}
                                    {pendingSplit && (
                                      <div className="mx-2 mb-2 flex items-center gap-2 rounded-xl border border-sky-500/35 bg-sky-500/10 p-2 ring-1 ring-sky-400/10">
                                        <div className="flex h-10 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-950/70">
                                          <Scissors className="h-4 w-4 text-sky-300" />
                                        </div>
                                        <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>{item.rarity}</span>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="truncate text-sm font-semibold text-sky-100">{item.cardName}</span>
                                            <span className="shrink-0 rounded-full bg-sky-400/15 px-2 py-0.5 text-[11px] font-bold text-sky-200">감가 분리 예정</span>
                                          </div>
                                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                                            <span>원래 장당 {formatPrice(item.price)}</span>
                                            <span>→</span>
                                            <span className="font-bold text-sky-300">조정 장당 {formatPrice(pendingSplit.price)}</span>
                                            {pendingSplit.note && <span className="truncate text-zinc-400">사유: {pendingSplit.note}</span>}
                                          </div>
                                        </div>
                                        <span className="shrink-0 text-xs font-bold text-sky-300">x{pendingSplit.quantity}</span>
                                        <div className="w-[156px] shrink-0">
                                          <PaymentMethodToggle
                                            value={pendingSplit.paymentMethod}
                                            onChange={(nextValue) => item.itemId && setPendingSplitPaymentMethod(order.id, item.itemId, nextValue)}
                                            compact
                                          />
                                        </div>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${pendingSplit.paymentMethod === 'mileage' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                                          {pendingSplit.paymentMethod === 'mileage' ? '마일리지' : '현금'}
                                        </span>
                                        <span className="shrink-0 text-sm font-black text-sky-300">
                                          {formatPrice(getAppliedItemTotal(pendingSplit.price, pendingSplit.quantity, pendingSplit.paymentMethod, order.mileageRate ?? mileageRate))}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (isSplitEditing) setEditingItem(null)
                                            else if (item.itemId) openEditItem(order.id, item.itemId, item.price, item.quantity, item.note, item.paymentMethod, 'split')
                                          }}
                                          className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                            isSplitEditing ? 'bg-sky-500/25 text-sky-200' : 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
                                          }`}
                                        >
                                          <Scissors className="h-3 w-3" />
                                          {isSplitEditing ? '닫기' : '수정'}
                                        </button>
                                        {item.itemId && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); cancelPendingSplit(order.id, item.itemId!) }}
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 text-zinc-500 hover:bg-red-500/20 hover:text-red-300"
                                            title="분리 취소"
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    {(isItemEditing || isSplitEditing) && (
                                      <div className={`border-t px-2 pb-3 pt-2.5 space-y-2 ${isSplitEditing ? 'border-sky-500/25 bg-sky-500/5' : 'border-zinc-800'}`}>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs text-zinc-500 shrink-0">직접</span>
                                            <input
                                              type="number" min="0" step="100"
                                              key={`${editingItem?.orderId}-${editingItem?.itemId}-${editingItem?.variant}-price`}
                                              ref={editingPriceInputRef}
                                              defaultValue={editingValue}
                                              onChange={(e) => handleDirectChange(e.target.value, item.price)}
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-24 rounded-lg border border-sky-500/60 bg-zinc-800 px-2 py-1.5 text-right text-sm font-medium text-sky-300 focus:border-sky-400 focus:outline-none"
                                            />
                                            <span className="text-xs text-zinc-500 shrink-0">원</span>
                                          </div>
                                          <span className="text-zinc-700">/</span>
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs text-zinc-500 shrink-0">감가</span>
                                            <input
                                              type="number" min="0" max="99" step="5"
                                              key={`${editingItem?.orderId}-${editingItem?.itemId}-${editingItem?.variant}-pct`}
                                              ref={editingPctInputRef}
                                              defaultValue={editingPct}
                                              placeholder="0"
                                              onChange={(e) => handlePctChange(e.target.value, item.price)}
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-16 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-right text-sm font-medium text-zinc-300 focus:border-sky-400 focus:outline-none"
                                            />
                                            <span className="text-xs text-zinc-500 shrink-0">%</span>
                                          </div>
                                          <span className="text-zinc-700">/</span>
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs text-zinc-500 shrink-0">수정 장수</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                const nextQuantity = String(Math.max(1, (parseInt(editingQuantityDraftRef.current, 10) || 1) - 1))
                                                editingQuantityDraftRef.current = nextQuantity
                                                if (editingQuantityInputRef.current) editingQuantityInputRef.current.value = nextQuantity
                                              }}
                                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                            >
                                              <Minus className="h-3 w-3" />
                                            </button>
                                            <input
                                              type="number" min="1" max={item.quantity} step="1"
                                              key={`${editingItem?.orderId}-${editingItem?.itemId}-${editingItem?.variant}-quantity`}
                                              ref={editingQuantityInputRef}
                                              defaultValue={editingQuantity}
                                              onChange={(e) => {
                                                const nextQuantity = String(Math.min(item.quantity, Math.max(1, parseInt(e.target.value || '1', 10) || 1)))
                                                editingQuantityDraftRef.current = nextQuantity
                                                e.target.value = nextQuantity
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              className="w-14 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-center text-sm font-medium text-zinc-300 focus:border-sky-400 focus:outline-none"
                                            />
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                const nextQuantity = String(Math.min(item.quantity, (parseInt(editingQuantityDraftRef.current, 10) || 1) + 1))
                                                editingQuantityDraftRef.current = nextQuantity
                                                if (editingQuantityInputRef.current) editingQuantityInputRef.current.value = nextQuantity
                                              }}
                                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                            >
                                              <Plus className="h-3 w-3" />
                                            </button>
                                          </div>
                                          <div className="min-w-[168px]">
                                            <PaymentMethodToggle
                                              value={editingPaymentMethod}
                                              onChange={setEditingPaymentMethod}
                                              compact
                                            />
                                          </div>
                                          <div className="flex gap-1 ml-auto">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                if (isSplitEditing && item.itemId) cancelPendingSplit(order.id, item.itemId)
                                                else handleDeleteItem(order, idx)
                                              }}
                                              disabled={!isSplitEditing && deletingItemKey === item.itemId}
                                              className="flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/25 disabled:opacity-50"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                              {isSplitEditing ? '분리 취소' : '삭제'}
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); item.itemId && confirmEditItem(order, item.itemId) }}
                                              className="flex items-center gap-1 rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/30"
                                            >
                                              <Check className="h-3 w-3" />확인
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setEditingItem(null) }}
                                              className="flex items-center gap-1 rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-600"
                                            >
                                              <X className="h-3 w-3" />취소
                                            </button>
                                          </div>
                                        </div>
                                        {/* 메모 입력 */}
                                        <div className="flex items-center gap-2">
                                          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                                          <input
                                            type="text"
                                            key={`${editingItem?.orderId}-${editingItem?.itemId}-${editingItem?.variant}-note`}
                                            defaultValue={editingNote}
                                            onChange={(e) => { editingNoteDraftRef.current = e.target.value }}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder="감가 사유 메모 (선택)"
                                            maxLength={100}
                                            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            {/* 저장 버튼 */}
                            {hasChanges && (
                              <div className="mb-3">
                                {saveError && (
                                  <p className="mb-2 rounded-lg bg-red-950/60 px-3 py-2 text-xs text-red-300">
                                    {saveError}
                                  </p>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSavePrices(order) }}
                                  disabled={savingOrderId === order.id}
                                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500/20 py-2 text-sm font-medium text-sky-400 transition-colors hover:bg-sky-500/30 disabled:opacity-50"
                                >
                                  {savingOrderId === order.id
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Scissors className="h-4 w-4" />
                                  }
                                  조정 내용 저장
                                </button>
                              </div>
                            )}

                            {saveError && !hasChanges && (
                              <p className="mb-3 rounded-lg bg-red-950/60 px-3 py-2 text-xs text-red-300">
                                {saveError}
                              </p>
                            )}

                            {orderAuditEntries.length > 0 && (
                              <div className="mb-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
                                    <Scissors className="h-3.5 w-3.5 text-sky-400" />
                                    가격 조정 이력
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCancelPriceAdjustments(order, orderAuditEntries)
                                    }}
                                    disabled={cancelingAdjustmentOrderId === order.id}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-200 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {cancelingAdjustmentOrderId === order.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <X className="h-3 w-3" />
                                    )}
                                    가격 조정 취소
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  {orderAuditEntries.slice(0, 6).map((entry) => (
                                    <div key={entry.id} className="rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <span className="font-medium text-white">{entry.cardName}</span>
                                          <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{entry.rarity}</span>
                                        </div>
                                        <span className="shrink-0 text-zinc-500">{formatDate(entry.changedAt)}</span>
                                      </div>
                                      <div className="mt-1 flex flex-wrap items-center gap-2 text-zinc-400">
                                        <span>{formatPrice(entry.previousPrice)}</span>
                                        <span className="text-zinc-600">→</span>
                                        <span className="font-semibold text-sky-400">{formatPrice(entry.nextPrice)}</span>
                                        {entry.note && <span className="text-zinc-500">| {entry.note}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2">
                              {order.status === 'pending' && rejectConfirmOrderId !== order.id && (
                                <>
                                  <button onClick={() => { setRejectConfirmOrderId(null); updateOrderStatus(order.id, 'approved') }} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500">
                                    <CheckCircle className="h-4 w-4" />승인
                                  </button>
                                  <button onClick={() => setRejectConfirmOrderId(order.id)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600/20 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/30">
                                    <X className="h-4 w-4" />거절
                                  </button>
                                </>
                              )}
                              {order.status === 'pending' && rejectConfirmOrderId === order.id && (
                                <div className="flex flex-1 gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-1.5">
                                  <button onClick={() => { updateOrderStatus(order.id, 'rejected'); setRejectConfirmOrderId(null) }} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-500">
                                    <X className="h-4 w-4" />거절 확인
                                  </button>
                                  <button onClick={() => setRejectConfirmOrderId(null)} className="flex flex-1 items-center justify-center rounded-md bg-zinc-800 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white">
                                    취소
                                  </button>
                                </div>
                              )}
                              {order.status === 'approved' && (
                                <button onClick={() => updateOrderStatus(order.id, 'paid')} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500">
                                  <DollarSign className="h-4 w-4" />지급 완료 처리
                                </button>
                              )}
                              {order.status === 'rejected' && (
                                <button onClick={() => updateOrderStatus(order.id, 'pending')} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500/15 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/25">
                                  <Play className="h-4 w-4" />거절 취소
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
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-400">확장팩 탭 *</label>
                  <div className="relative" ref={newCardCategoryMenuRef}>
                    <button
                      type="button"
                      onClick={() => setNewCardCategoryMenuOpen((open) => !open)}
                      className="flex w-full items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-800/90 px-4 py-3 text-left shadow-[0_12px_30px_rgba(0,0,0,0.22)] transition-colors hover:border-amber-400/60"
                    >
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Expansion Set</p>
                        <p className="mt-1 text-sm font-semibold text-white">{newCardCategory || '확장팩 탭을 선택하세요'}</p>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-amber-300 transition-transform ${newCardCategoryMenuOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <AnimatePresence>
                      {newCardCategoryMenuOpen && tabs.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.16, ease: 'easeOut' }}
                          className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
                        >
                          {tabs.map((tab, index) => {
                            const isSelected = newCardCategory === tab
                            return (
                              <motion.button
                                key={tab}
                                type="button"
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.02, duration: 0.12 }}
                                onClick={() => {
                                  setNewCardCategory(tab)
                                  setNewCardCategoryMenuOpen(false)
                                }}
                                className={`block w-full px-4 py-3 text-left text-sm font-semibold transition-colors ${
                                  isSelected ? 'bg-amber-500 text-black' : 'text-zinc-200 hover:bg-zinc-800'
                                }`}
                              >
                                {tab}
                              </motion.button>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">카드명 *</label>
                  <input type="text" value={newCardName} onChange={(e) => setNewCardName(e.target.value)}
                    placeholder="예: 푸른 눈의 백룡"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">카드 코드 *</label>
                  <input type="text" value={newCardCode} onChange={(e) => setNewCardCode(e.target.value)}
                    placeholder="예: BLZD-KR001"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none" />
                </div>
                <ImageUploadField currentUrl={newCardImageUrl} onUpload={(url) => setNewCardImageUrl(url)} showPreview={!!newCardImageUrl} />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">레어도별 매입가</label>
                  <RarityPicker
                    rarities={availableRarities}
                    enabledRarities={newCardEnabled} prices={newCardPrices}
                    onToggle={(rarity, enabled) => setNewCardEnabled(prev => ({ ...prev, [rarity]: enabled }))}
                    onPriceChange={(rarity, price) => setNewCardPrices(prev => ({ ...prev, [rarity]: price }))}
                  />
                </div>
                <button onClick={handleAddCard} disabled={!newCardName.trim() || !newCardCode.trim()}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-lg font-semibold text-black transition-all hover:bg-amber-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                  <Plus className="h-5 w-5" />카드 추가
                </button>
              </div>
            </div>
          )}

          {/* ── 카드 관리 ── */}
          {activeTab === 'cards' && (
            <div className="p-6">
              {/* 헤더: 검색 + 모드 토글 */}
              <div className="mb-4 flex items-center gap-3">
                {!bulkEditMode && (
                  <div className="flex flex-1 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2">
                    <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                    <input type="text" value={cardSearch} onChange={(e) => setCardSearch(e.target.value)}
                      placeholder="카드명 또는 코드 검색..."
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none" />
                  </div>
                )}
                <button
                  onClick={() => { setBulkEditMode(v => !v); setBulkEdits({}) }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                    bulkEditMode
                      ? 'border-violet-500/50 bg-violet-500/20 text-violet-400'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Table2 className="h-4 w-4" />
                  {bulkEditMode ? '일반 보기' : '일괄 편집'}
                </button>
              </div>
              {!bulkEditMode && (
                <p className="mb-3 text-xs text-zinc-500">
                  레어도 칩을 클릭하면 해당 가격만 매입 중지/재개할 수 있습니다.
                </p>
              )}

              {/* 일반 보기 */}
              {!bulkEditMode && (
                <div className="space-y-2">
                  {filteredCards.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">카드가 없습니다</p>}
                  {filteredCards.map((card) => (
                    <div key={card.id} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/70">
                      <div className="h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-zinc-700">
                        <img src={card.imageUrl} alt={card.name} className="h-full w-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-card.svg' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">{card.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span className="text-xs text-zinc-500">{card.code}</span>
                          {card.prices.map(({ rarity }) => {
                            const colors = getRarityColors(rarity)
                            const enabled = card.enabledRarities[rarity]
                            return (
                              <button
                                key={rarity}
                                type="button"
                                onClick={() => toggleRarity(card.id, rarity, !enabled)}
                                title={enabled ? `${rarity} 매입 중지` : `${rarity} 매입 재개`}
                                className={`rounded px-1.5 py-0.5 text-xs font-bold transition-all active:scale-95 ${
                                  enabled
                                    ? `${colors.bg} ${colors.text} hover:ring-2 hover:ring-red-400/40`
                                    : 'bg-zinc-700 text-zinc-500 line-through hover:bg-emerald-500/15 hover:text-emerald-300'
                                }`}
                              >
                                {rarity}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <button onClick={() => setAdminEditCard(card)}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-zinc-700/60 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white">
                        <Pencil className="h-3.5 w-3.5" />수정
                      </button>
                      <button onClick={() => setCardStopped(card.id, !card.isStopped)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          card.isStopped ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}>
                        {card.isStopped ? <><Play className="h-3.5 w-3.5" />재개</> : <><Ban className="h-3.5 w-3.5" />중지</>}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 일괄 편집 */}
              {bulkEditMode && (
                <div className="space-y-4">
                  {/* 탭 선택 */}
                  <div className="flex flex-wrap gap-2">
                    {tabs.map(tab => (
                      <button key={tab} onClick={() => { setBulkEditTab(tab); setBulkEdits({}) }}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          (effectiveBulkTab === tab) ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}>
                        {tab}
                        <span className="ml-1.5 text-xs text-zinc-600">{cards.filter(c => c.category === tab).length}</span>
                      </button>
                    ))}
                  </div>

                  <input
                    ref={bulkImportInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleBulkImportFile}
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleBulkImportClick}
                      className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/12 px-4 py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-500/20"
                    >
                      <Upload className="h-4 w-4" />
                      CSV 가져오기
                    </button>
                    <button
                      onClick={handleBulkExportCsv}
                      className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/12 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
                    >
                      <Download className="h-4 w-4" />
                      CSV 내보내기
                    </button>
                  </div>

                  {bulkImportError && (
                    <p className="rounded-lg bg-red-950/60 px-3 py-2 text-xs text-red-300">{bulkImportError}</p>
                  )}
                  {bulkImportSuccess && (
                    <p className="rounded-lg bg-emerald-950/60 px-3 py-2 text-xs text-emerald-300">{bulkImportSuccess}</p>
                  )}

                  {bulkTabCards.length === 0 ? (
                    <p className="py-8 text-center text-sm text-zinc-500">이 탭에 카드가 없습니다</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-xl border border-zinc-800">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-800/60">
                              <th className="sticky left-0 z-10 bg-zinc-800/90 px-4 py-2.5 text-left text-xs font-semibold text-zinc-400">카드명</th>
                              {bulkRarities.map(r => {
                                const colors = getRarityColors(r)
                                return (
                                  <th key={r} className="px-3 py-2.5 text-center text-xs font-semibold">
                                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>{r}</span>
                                  </th>
                                )
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {bulkTabCards.map((card) => (
                              <tr key={card.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                                <td className="sticky left-0 z-10 max-w-[160px] bg-zinc-900 px-4 py-2">
                                  <p className="truncate font-medium text-white">{card.name}</p>
                                  <p className="truncate text-xs text-zinc-600">{card.code}</p>
                                </td>
                                {bulkRarities.map(r => {
                                  const existing = card.prices.find(p => p.rarity === r)
                                  const editVal = bulkEdits[card.id]?.[r]
                                  const displayVal = editVal !== undefined ? editVal : (existing ? String(existing.price) : '')
                                  const isChanged = editVal !== undefined && editVal !== (existing ? String(existing.price) : '')
                                  return (
                                    <td key={r} className="px-2 py-2 text-center">
                                      <input
                                        type="number"
                                        min="0"
                                        step="100"
                                        value={displayVal}
                                        placeholder="-"
                                        onChange={(e) => setBulkEdits(prev => ({
                                          ...prev,
                                          [card.id]: { ...(prev[card.id] ?? {}), [r]: e.target.value },
                                        }))}
                                        className={`w-20 rounded-lg border bg-zinc-800/80 px-2 py-1 text-center text-xs focus:outline-none ${
                                          isChanged
                                            ? 'border-violet-500/60 text-violet-300 focus:border-violet-400'
                                            : 'border-zinc-700 text-zinc-300 focus:border-zinc-600'
                                        } placeholder:text-zinc-700`}
                                      />
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* 저장 버튼 */}
                      <button
                        onClick={handleBulkSave}
                        disabled={bulkChangedCount === 0 || bulkSaving}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
                      >
                        {bulkSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : bulkSaved ? (
                          <><Check className="h-4 w-4" /> 저장됨</>
                        ) : (
                          <><Table2 className="h-4 w-4" /> 변경된 {bulkChangedCount}개 카드 저장</>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── 게임/탭 관리 ── */}
          {activeTab === 'game-tabs' && (
            <div className="p-6">
              <div className="mx-auto max-w-lg space-y-8">
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <Layers className="h-4 w-4 text-zinc-400" />확장팩 탭 관리
                  </h3>
                  <div className="flex gap-2">
                    <input type="text" value={newTabName} onChange={(e) => setNewTabName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && newTabName.trim()) {
                          try { await addTab(newTabName.trim()); setNewTabName('') }
                          catch (err) { console.error('[탭 추가 실패]', err) }
                        }
                      }}
                      placeholder="새 확장팩명 (예: 버스트 오브 데스티니)"
                      className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none" />
                    <button
                      onClick={async () => {
                        if (newTabName.trim()) {
                          try { await addTab(newTabName.trim()); setNewTabName('') }
                          catch (err) { console.error('[탭 추가 실패]', err) }
                        }
                      }}
                      disabled={!newTabName.trim() || isAddingTab}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black transition-colors hover:bg-amber-400 disabled:opacity-50">
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  {addTabError && (
                    <p className="rounded-lg bg-red-900/40 px-3 py-2 text-xs text-red-400">오류: {(addTabError as Error).message}</p>
                  )}
                  <div className="space-y-2">
                    {tabs.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">등록된 탭이 없습니다</p>}
                    {tabs.map((tab) => (
                      <div key={tab} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-800/50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Layers className="h-4 w-4 text-zinc-500" />
                          <span className="font-medium text-white">{tab}</span>
                          <span className="text-xs text-zinc-500">{cards.filter(c => c.category === tab).length}장</span>
                        </div>
                        <button onClick={() => removeTab(tab)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/20 hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-600">* 탭 삭제 시 해당 탭의 카드는 숨겨집니다. 탭을 다시 추가하면 복원됩니다.</p>
                </div>

                <div className="border-t border-zinc-800" />

                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <TrendingUp className="h-4 w-4 text-zinc-400" />게임 대분류 관리
                  </h3>
                  <div className="flex gap-2">
                    <input type="text" value={newGameName} onChange={(e) => setNewGameName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && newGameName.trim()) { await addGame(newGameName.trim()); setNewGameName('') }
                      }}
                      placeholder="예: 유희왕, 포켓몬카드"
                      className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none" />
                    <button onClick={async () => { if (!newGameName.trim()) return; await addGame(newGameName.trim()); setNewGameName('') }}
                      disabled={isAddingGame || !newGameName.trim()}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black transition-colors hover:bg-amber-400 disabled:opacity-50">
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  {games.length === 0 ? (
                    <p className="py-4 text-center text-sm text-zinc-500">등록된 게임이 없습니다</p>
                  ) : (
                    <div className="space-y-2">
                      {games.map((game) => (
                        <div key={game.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/50 px-4 py-3">
                          <GameImageUploadButton game={game} onUpload={(url) => updateGameImage(game.id, url)} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white">{game.name}</p>
                            <p className="text-xs text-zinc-500">{tabObjects.filter(t => t.game_id === game.id).length}개 탭 연결됨</p>
                          </div>
                          <button onClick={() => removeGame(game.id)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/20 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                              <select value={tab.game_id ?? ''} onChange={(e) => assignTabToGame(tab.name, e.target.value || null)}
                                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                                <option value="">미배정</option>
                                {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
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

          {/* Stats */}
          {activeTab === 'stats' && (
            <div className="p-6">
              <div ref={statsCaptureRef} className="space-y-5 rounded-2xl bg-zinc-900 p-1">
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
                    {(['today', 'week', 'month', 'all'] as const).map((range) => (
                      <button key={range} onClick={() => setStatsRange(range)}
                        className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                          statsRange === range ? 'bg-amber-500 text-black' : 'text-zinc-500 hover:text-zinc-300'
                        }`}>
                        {statsRangeLabels[range]}
                      </button>
                    ))}
                  </div>
                  <button onClick={downloadStatsImage} className="flex h-10 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-sm font-semibold text-zinc-200 transition-colors hover:border-amber-500 hover:text-white">
                    <Download className="h-4 w-4" />
                    {'\uC774\uBBF8\uC9C0 \uC800\uC7A5'}
                  </button>
                  <button onClick={downloadStatsCsv} className="flex h-10 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-sm font-semibold text-zinc-200 transition-colors hover:border-sky-500 hover:text-white">
                    <Table2 className="h-4 w-4" />
                    {'\uD45C \uC800\uC7A5'}
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <p className="text-xs text-zinc-500">{'\uC694\uCCAD \uCD1D\uC561'}</p>
                    <p className="mt-1 text-2xl font-black text-white">{formatPrice(statsTotal)}</p>
                    <p className="mt-0.5 text-xs text-zinc-600">{statsOrders.length}{'\uAC74'}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <p className="text-xs text-zinc-500">{'\uC9C0\uAE09 \uC644\uB8CC'}</p>
                    <p className="mt-1 text-2xl font-black text-emerald-300">{formatPrice(statsPaidTotal)}</p>
                    <p className="mt-0.5 text-xs text-zinc-600">{statsOrders.filter(o => o.status === 'paid').length}{'\uAC74'}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <p className="text-xs text-zinc-500">{'\uD604\uAE08 / \uB9C8\uC77C\uB9AC\uC9C0'}</p>
                    <p className="mt-1 text-2xl font-black text-amber-300">{statsCashCount}<span className="text-sm text-zinc-500"> / </span><span className="text-emerald-300">{statsMileageCount}</span></p>
                    <p className="mt-0.5 text-xs text-zinc-600">{'\uD63C\uD569'} {statsMixedCount}{'\uAC74'}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <p className="text-xs text-zinc-500">{'\uC9D1\uACC4 \uB9E4\uC218'}</p>
                    <p className="mt-1 text-2xl font-black text-sky-300">{statsItemCount}{'\uC7A5'}</p>
                    <p className="mt-0.5 text-xs text-zinc-600">{'\uAC70\uC808 \uC81C\uC678'}</p>
                  </div>
                </div>

                <div className={`grid gap-4 ${statsRange === 'today' ? 'grid-cols-1' : 'grid-cols-[1.08fr_0.92fr]'}`}>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                        <BarChart2 className="h-4 w-4 text-amber-300" />
                        {'\uAC8C\uC784\uBCC4 \uB9E4\uC785 \uBE44\uC911'}
                      </h3>
                      <span className="text-xs text-zinc-500">{'\uC801\uC6A9 \uC9C0\uAE09\uC561 \uAE30\uC900'}</span>
                    </div>
                    {statsAnalytics.byGame.length === 0 ? (
                      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500">{'\uC544\uC9C1 \uD45C\uC2DC\uD560 \uB9E4\uC785 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4'}</div>
                    ) : (
                      <div className="grid grid-cols-[220px_1fr] items-center gap-5">
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={statsAnalytics.byGame} dataKey="total" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3} stroke="#09090b" strokeWidth={3}>
                                {statsAnalytics.byGame.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                              </Pie>
                              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, color: '#fff' }} formatter={(value) => formatPrice(Number(value))} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-3">
                          {statsAnalytics.byGame.slice(0, 7).map((game) => {
                            const total = statsAnalytics.byGame.reduce((sum, item) => sum + item.total, 0) || 1
                            const percent = Math.round((game.total / total) * 100)
                            return (
                              <div key={game.name} className="space-y-1.5">
                                <div className="flex items-center justify-between gap-3 text-sm">
                                  <div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: game.color }} /><span className="truncate font-semibold text-zinc-200">{game.name}</span></div>
                                  <span className="shrink-0 font-bold text-white">{percent}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-zinc-800"><motion.div className="h-full rounded-full" style={{ backgroundColor: game.color }} initial={{ width: 0 }} animate={{ width: percent + '%' }} transition={{ duration: 0.5, ease: 'easeOut' }} /></div>
                                <div className="flex justify-between text-xs text-zinc-500"><span>{game.count}{'\uC7A5'}</span><span>{formatPrice(game.total)}</span></div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {statsRange !== 'today' && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                      <div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-bold text-white"><TrendingUp className="h-4 w-4 text-sky-300" />{trendChart.title}</h3><span className="text-xs text-zinc-500">{'\uB9E4\uC785\uC561 / \uB9E4\uC218'}</span></div>
                      {trendChart.note && <p className="mb-3 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">{trendChart.note}</p>}
                      {trendChart.data.length === 0 || trendChart.data.every(day => day.total === 0) ? (
                        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500">{trendChart.emptyText}</div>
                      ) : (
                        <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={trendChart.data} margin={{ top: 12, right: 8, left: 2, bottom: 0 }}><XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} interval={trendChart.interval} /><YAxis width={44} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => Math.round(Number(value) / 10000) + '\uB9CC'} /><Tooltip cursor={{ fill: 'rgba(250,204,21,0.08)' }} contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, color: '#fff' }} formatter={(value, name) => name === 'total' ? formatPrice(Number(value)) : String(value) + '\uC7A5'} labelFormatter={(label) => String(label)} /><Bar dataKey="total" radius={[8, 8, 3, 3]} fill="#f59e0b" /></BarChart></ResponsiveContainer></div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                      <TrendingUp className="h-4 w-4 text-violet-300" />
                      {topCardsTitle}
                      <span className="text-xs font-normal text-zinc-600">{'\uAC70\uC808 \uC81C\uC678'}</span>
                    </h3>
                    <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
                      {([10, 20, 50, 'all'] as const).map((limit) => (
                        <button
                          key={String(limit)}
                          type="button"
                          onClick={() => setTopCardsLimit(limit)}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                            topCardsLimit === limit
                              ? 'bg-violet-500 text-white'
                              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          {limit === 'all' ? '전체' : `TOP ${limit}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  {topCards.length === 0 ? <p className="py-6 text-center text-sm text-zinc-500">{'\uD45C\uC2DC\uD560 \uCE74\uB4DC \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4'}</p> : (
                    <div className="grid grid-cols-2 gap-2">
                      {topCards.map((item, rank) => {
                        const colors = getRarityColors(item.rarity)
                        return <div key={[item.cardName, item.rarity].join('|')} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-2.5"><span className={['w-6 shrink-0 text-center text-sm font-bold', rank < 3 ? 'text-amber-400' : 'text-zinc-600'].join(' ')}>{rank + 1}</span><span className={['shrink-0 rounded px-2 py-0.5 text-xs font-bold', colors.bg, colors.text].join(' ')}>{item.rarity}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{item.cardName}</span><div className="flex shrink-0 flex-col items-end"><span className="text-sm font-bold text-zinc-200">{item.count}{'\uC7A5'}</span><span className="text-xs text-zinc-500">{formatPrice(item.totalPrice)}</span></div></div>
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
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <Settings2 className="h-4 w-4 text-zinc-400" />관리자 비밀번호 변경
                  </label>
                  <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null) }}
                    placeholder="새 비밀번호 (4자 이상)"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none" />
                  <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null) }}
                    placeholder="새 비밀번호 확인"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none" />
                  {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
                  <button
                    onClick={async () => {
                      if (newPassword.length < 4) { setPasswordError('비밀번호는 4자 이상이어야 합니다'); return }
                      if (newPassword !== confirmPassword) { setPasswordError('비밀번호가 일치하지 않습니다'); return }
                      await updateSettings({ admin_password: newPassword })
                      setNewPassword(''); setConfirmPassword(''); setPasswordError(null)
                      setPasswordSaved(true); setTimeout(() => setPasswordSaved(false), 2000)
                    }}
                    disabled={isUpdating || !newPassword || !confirmPassword}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-700 font-semibold text-white transition-all hover:bg-zinc-600 disabled:opacity-40">
                    {passwordSaved ? <><Check className="h-4 w-4 text-emerald-400" /> 변경 완료</> : '비밀번호 변경 저장'}
                  </button>
                </div>
                <div className="border-t border-zinc-800" />
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <Coins className="h-4 w-4 text-emerald-400" />마일리지 지급 추가율
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input type="number" min="0" max="200" step="5"
                        placeholder={String(mileagePercent)} value={editMileagePercent}
                        onChange={(e) => setEditMileagePercent(e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-3 pl-4 pr-10 text-right text-xl font-bold text-white focus:border-emerald-500 focus:outline-none" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold text-zinc-400">%</span>
                    </div>
                    <button
                      onClick={async () => {
                        const val = editMileagePercent !== '' ? Number(editMileagePercent) : mileagePercent
                        await setMileagePercent(val); setEditMileagePercent('')
                        setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2000)
                      }}
                      disabled={isUpdating || editMileagePercent === ''}
                      className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-40">
                      {settingsSaved ? <Check className="h-4 w-4" /> : '적용'}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    현재: <span className="font-bold text-emerald-400">+{mileagePercent}%</span>
                    &nbsp;— 매입가 10,000원 → 마일리지 {(10000 * (1 + mileagePercent / 100)).toLocaleString('ko-KR')}원
                  </p>
                </div>
                <div className="border-t border-zinc-800" />
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <Settings2 className="h-4 w-4 text-amber-400" />활성 레어도 관리
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
                              <button onClick={() => removeRarity(rarity)} disabled={isUpdating}
                                className={`flex h-5 w-5 items-center justify-center rounded-md transition-colors hover:bg-black/30 disabled:opacity-40 ${colors.text}`}>
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newRarityInput}
                      onChange={(e) => setNewRarityInput(e.target.value.toUpperCase().slice(0, 5))}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && newRarityInput.trim()) { await addRarity(newRarityInput); setNewRarityInput('') }
                      }}
                      placeholder="새 레어도 (예: GR)" maxLength={5}
                      className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-bold uppercase text-white placeholder:font-normal placeholder:normal-case placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none" />
                    <button
                      onClick={async () => { if (!newRarityInput.trim()) return; await addRarity(newRarityInput); setNewRarityInput('') }}
                      disabled={isUpdating || !newRarityInput.trim() || globalRarities.includes(newRarityInput.trim())}
                      className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-black transition-all hover:bg-amber-400 disabled:opacity-40">
                      <Plus className="h-4 w-4" />추가
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

      {adminEditCard && (
        <CardDetailModal card={adminEditCard} onClose={() => setAdminEditCard(null)} initialEditMode={true} />
      )}
    </>
  )
}
