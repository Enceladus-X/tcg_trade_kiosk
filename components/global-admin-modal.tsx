'use client'

import { useState } from 'react'
import { X, Clock, CheckCircle, DollarSign, Trash2, Phone, Building2, CreditCard, User, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { useOrders } from '@/lib/use-orders'
import { useCards } from '@/lib/use-cards'
import { formatPrice, rarityColors, type OrderStatus, type CardWithStatus } from '@/lib/mock-cards'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'

interface GlobalAdminModalProps {
  onClose: () => void
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '대기중', color: 'bg-yellow-500/20 text-yellow-400', icon: <Clock className="h-4 w-4" /> },
  approved: { label: '승인됨', color: 'bg-blue-500/20 text-blue-400', icon: <CheckCircle className="h-4 w-4" /> },
  paid: { label: '지급완료', color: 'bg-emerald-500/20 text-emerald-400', icon: <DollarSign className="h-4 w-4" /> },
  rejected: { label: '거절됨', color: 'bg-red-500/20 text-red-400', icon: <X className="h-4 w-4" /> },
}

export function GlobalAdminModal({ onClose }: GlobalAdminModalProps) {
  const { orders, updateOrderStatus, deleteOrder } = useOrders()
  const { addCard } = useCards()
  const [activeTab, setActiveTab] = useState<'orders' | 'add-card'>('orders')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  
  // New card form state
  const [newCardName, setNewCardName] = useState('')
  const [newCardCode, setNewCardCode] = useState('')
  const [newCardImageUrl, setNewCardImageUrl] = useState('')
  const [newCardPrices, setNewCardPrices] = useState<Record<string, { enabled: boolean; price: number }>>({
    N: { enabled: true, price: 100 },
    R: { enabled: true, price: 500 },
    SR: { enabled: true, price: 2000 },
    UR: { enabled: true, price: 10000 },
    UL: { enabled: false, price: 50000 },
    SE: { enabled: false, price: 30000 },
    PSR: { enabled: false, price: 100000 },
  })

  const handleAddCard = () => {
    if (!newCardName.trim() || !newCardCode.trim()) return
    
    const enabledRarities: Record<string, boolean> = {}
    const prices = Object.entries(newCardPrices).map(([rarity, { enabled, price }]) => {
      enabledRarities[rarity] = enabled
      return { rarity: rarity as 'N' | 'R' | 'SR' | 'UR' | 'UL' | 'SE' | 'PSR', price }
    })
    
    const allDisabled = Object.values(enabledRarities).every(v => !v)
    
    addCard({
      name: newCardName,
      code: newCardCode,
      imageUrl: newCardImageUrl || `https://picsum.photos/seed/${Date.now()}/80/120`,
      prices,
      enabledRarities,
      isStopped: allDisabled,
    })
    
    // Reset form
    setNewCardName('')
    setNewCardCode('')
    setNewCardImageUrl('')
    setNewCardPrices({
      N: { enabled: true, price: 100 },
      R: { enabled: true, price: 500 },
      SR: { enabled: true, price: 2000 },
      UR: { enabled: true, price: 10000 },
      UL: { enabled: false, price: 50000 },
      SE: { enabled: false, price: 30000 },
      PSR: { enabled: false, price: 100000 },
    })
    
    // Switch to orders tab to confirm
    setActiveTab('orders')
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 flex h-[80vh] w-[85vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-xl font-bold text-white">관리자 대시보드</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'orders'
                ? 'border-b-2 border-amber-500 text-amber-500'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            매입 요청 관리
          </button>
          <button
            onClick={() => setActiveTab('add-card')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'add-card'
                ? 'border-b-2 border-amber-500 text-amber-500'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Plus className="mr-1 inline h-4 w-4" />
            카드 추가
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
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
                      <div
                        key={order.id}
                        className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800/50"
                      >
                        {/* Order Header - Clickable */}
                        <button
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                          className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-zinc-800"
                        >
                          <div className="flex items-center gap-4">
                            {/* Customer Info */}
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700">
                              <User className="h-5 w-5 text-zinc-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">{order.customerName}</span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                                  {status.icon}
                                  {status.label}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {order.bankName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3" />
                                  {order.accountNumber}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  ****{order.phoneLast4}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-bold text-amber-500">{formatPrice(order.totalPrice)}</p>
                              <p className="text-xs text-zinc-500">{formatDate(order.createdAt)}</p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-zinc-500" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-zinc-500" />
                            )}
                          </div>
                        </button>
                        
                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="border-t border-zinc-700 p-4">
                            {/* Items List */}
                            <div className="mb-4 space-y-2">
                              <p className="text-xs font-medium text-zinc-500">매입 품목</p>
                              {order.items.map((item, idx) => {
                                const colors = rarityColors[item.rarity]
                                return (
                                  <div key={idx} className="flex items-center justify-between rounded-lg bg-zinc-900 p-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>
                                        {item.rarity}
                                      </span>
                                      <span className="text-sm text-white">{item.cardName}</span>
                                      <span className="text-xs text-zinc-500">x{item.quantity}</span>
                                    </div>
                                    <span className="text-sm font-medium text-zinc-300">
                                      {formatPrice(item.price * item.quantity)}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              {order.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'approved')}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    승인
                                  </button>
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'rejected')}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600/20 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/30"
                                  >
                                    <X className="h-4 w-4" />
                                    거절
                                  </button>
                                </>
                              )}
                              {order.status === 'approved' && (
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'paid')}
                                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
                                >
                                  <DollarSign className="h-4 w-4" />
                                  지급 완료 처리
                                </button>
                              )}
                              <button
                                onClick={() => deleteOrder(order.id)}
                                className="flex items-center justify-center rounded-lg bg-zinc-700 px-4 py-2 text-zinc-400 transition-colors hover:bg-zinc-600 hover:text-white"
                              >
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

          {activeTab === 'add-card' && (
            <div className="p-6">
              <div className="mx-auto max-w-xl space-y-6">
                {/* Card Name */}
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

                {/* Card Code */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">카드 코드 *</label>
                  <input
                    type="text"
                    value={newCardCode}
                    onChange={(e) => setNewCardCode(e.target.value)}
                    placeholder="예: CARD-0001"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                  />
                </div>

                {/* Image URL */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">이미지 URL (선택)</label>
                  <input
                    type="text"
                    value={newCardImageUrl}
                    onChange={(e) => setNewCardImageUrl(e.target.value)}
                    placeholder="https://example.com/card-image.jpg"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                  />
                </div>

                {/* Rarity Prices */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">레어도별 매입가</label>
                  <div className="space-y-3">
                    {Object.entries(newCardPrices).map(([rarity, { enabled, price }]) => {
                      const colors = rarityColors[rarity]
                      return (
                        <div
                          key={rarity}
                          className={`flex items-center gap-4 rounded-xl border p-3 transition-colors ${
                            enabled ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-800 bg-zinc-900/50'
                          }`}
                        >
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) =>
                              setNewCardPrices(prev => ({
                                ...prev,
                                [rarity]: { ...prev[rarity], enabled: checked }
                              }))
                            }
                          />
                          <span className={`w-12 rounded px-2 py-1 text-center text-sm font-bold ${colors.bg} ${colors.text}`}>
                            {rarity}
                          </span>
                          <input
                            type="number"
                            value={price}
                            onChange={(e) =>
                              setNewCardPrices(prev => ({
                                ...prev,
                                [rarity]: { ...prev[rarity], price: parseInt(e.target.value) || 0 }
                              }))
                            }
                            disabled={!enabled}
                            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-right text-white disabled:opacity-50"
                          />
                          <span className="text-sm text-zinc-500">원</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Add Button */}
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
        </ScrollArea>
      </div>
    </>
  )
}
