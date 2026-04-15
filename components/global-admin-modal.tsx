'use client'

import { useState, useCallback } from 'react'
import { X, Clock, CheckCircle, DollarSign, Trash2, Phone, Building2, CreditCard, User, Plus, ChevronDown, ChevronUp, Layers, Search, Ban, Play, Copy, Check, Settings2, Coins } from 'lucide-react'
import { useOrders } from '@/lib/use-orders'
import { useCards, useTabs } from '@/lib/use-cards'
import { useStoreSettings } from '@/lib/use-settings'
import { formatPrice, rarityColors, type OrderStatus } from '@/lib/mock-cards'
import { RarityPicker, ALL_RARITIES, type RarityKey } from '@/components/rarity-picker'
import { ImageUploadField } from '@/components/image-upload-field'

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

type AdminTab = 'orders' | 'add-card' | 'cards' | 'tabs' | 'settings'

export function GlobalAdminModal({ onClose }: GlobalAdminModalProps) {
  const { orders, updateOrderStatus, deleteOrder } = useOrders()
  const { cards, addCard, setCardStopped } = useCards()
  const { tabs, addTab, removeTab, isAddingTab, addTabError } = useTabs()
  const { mileageRate, globalRarities, updateSettings, isUpdating } = useStoreSettings()

  const [activeTab, setActiveTab] = useState<AdminTab>('orders')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null)

  // 설정 탭 로컬 상태
  const [editMileageRate, setEditMileageRate] = useState<string>('')
  const [editRarities, setEditRarities] = useState<string[]>([])
  const [settingsSaved, setSettingsSaved] = useState(false)

  const copyCustomerInfo = useCallback((order: (typeof orders)[number]) => {
    const text = `${order.customerName} / ${order.bankName} / ${order.accountNumber} / ${order.phoneNumber}`
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

  // 카드 관리 검색
  const [cardSearch, setCardSearch] = useState('')

  // 탭 관리 입력
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const filteredCards = cardSearch.trim()
    ? cards.filter(c => c.name.includes(cardSearch) || c.code.includes(cardSearch))
    : cards

  const tabConfig: { key: AdminTab; label: string }[] = [
    { key: 'orders',   label: '매입 요청' },
    { key: 'add-card', label: '카드 추가' },
    { key: 'cards',    label: '카드 관리' },
    { key: 'tabs',     label: '탭 관리' },
    { key: 'settings', label: '설정' },
  ]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed left-1/2 top-1/2 z-50 flex h-[85vh] w-[90vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl">

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
                    return (
                      <div key={order.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800/50">
                        <button
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
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
                        </button>

                        {isExpanded && (
                          <div className="border-t border-zinc-700 p-4">
                            <div className="mb-4 space-y-2">
                              <p className="text-xs font-medium text-zinc-500">매입 품목</p>
                              {order.items.map((item, idx) => {
                                const colors = rarityColors[item.rarity] ?? { bg: 'bg-zinc-700', text: 'text-zinc-200', border: 'border-zinc-600' }
                                return (
                                  <div key={idx} className="flex items-center justify-between rounded-lg bg-zinc-900 p-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>{item.rarity}</span>
                                      <span className="text-sm text-white">{item.cardName}</span>
                                      <span className="text-xs text-zinc-500">x{item.quantity}</span>
                                    </div>
                                    <span className="text-sm font-medium text-zinc-300">{formatPrice(item.price * item.quantity)}</span>
                                  </div>
                                )
                              })}
                            </div>
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
              {/* 검색 */}
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
                    className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3"
                  >
                    {/* 썸네일 */}
                    <div className="h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-zinc-700">
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="h-full w-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-card.svg' }}
                      />
                    </div>

                    {/* 정보 */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{card.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span className="text-xs text-zinc-500">{card.code}</span>
                        {card.prices.map(({ rarity }) => {
                          const colors = rarityColors[rarity]
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

                    {/* 매입 중지 / 재개 토글 */}
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

          {/* ── 설정 ── */}
          {activeTab === 'settings' && (
            <div className="p-6">
              <div className="mx-auto max-w-lg space-y-6">

                {/* 마일리지 비율 */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                    <Coins className="h-4 w-4" />
                    마일리지 지급 비율
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      step="0.05"
                      min="1"
                      max="3"
                      defaultValue={mileageRate}
                      onChange={(e) => setEditMileageRate(e.target.value)}
                      className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                    />
                    <span className="shrink-0 text-sm text-zinc-400">배수</span>
                  </div>
                  <p className="text-xs text-zinc-600">
                    현재: x{mileageRate.toFixed(2)} — 매입가의 {((mileageRate - 1) * 100).toFixed(0)}% 추가 지급
                  </p>
                </div>

                {/* 활성 레어도 */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                    <Settings2 className="h-4 w-4" />
                    전역 활성 레어도
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_RARITIES.map(rarity => {
                      const isActive = (editRarities.length > 0 ? editRarities : globalRarities).includes(rarity)
                      const colors = rarityColors[rarity]
                      return (
                        <button
                          key={rarity}
                          type="button"
                          onClick={() => {
                            const current = editRarities.length > 0 ? editRarities : [...globalRarities]
                            setEditRarities(
                              isActive ? current.filter(r => r !== rarity) : [...current, rarity]
                            )
                          }}
                          className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-all active:scale-95 ${
                            isActive
                              ? `${colors.bg} ${colors.text} ring-2 ring-white/20`
                              : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                          }`}
                        >
                          {rarity}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-zinc-600">키오스크 필터 및 카드 추가 시 표시되는 레어도를 제어합니다</p>
                </div>

                {/* 저장 */}
                <button
                  onClick={async () => {
                    const rate = editMileageRate ? parseFloat(editMileageRate) : mileageRate
                    const rarities = editRarities.length > 0 ? editRarities : globalRarities
                    await updateSettings({ mileage_rate: rate, global_rarities: rarities })
                    setEditMileageRate('')
                    setEditRarities([])
                    setSettingsSaved(true)
                    setTimeout(() => setSettingsSaved(false), 2000)
                  }}
                  disabled={isUpdating}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-semibold text-black transition-all hover:bg-amber-400 disabled:opacity-50"
                >
                  {settingsSaved
                    ? <><Check className="h-4 w-4" />저장 완료</>
                    : isUpdating ? '저장 중...' : '설정 저장'
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── 탭 관리 ── */}
          {activeTab === 'tabs' && (
            <div className="p-6">
              <div className="mx-auto max-w-lg space-y-4">
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

                {/* Supabase 연결 오류 표시 */}
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
            </div>
          )}

        </div>
      </div>
    </>
  )
}
