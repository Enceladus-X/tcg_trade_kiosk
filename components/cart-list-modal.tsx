'use client'

import { Minus, Plus, Trash2, ShoppingBag, Check, ArrowRight, ArrowLeft } from 'lucide-react'
import { useCart } from '@/lib/use-cart'
import { useOrders } from '@/lib/use-orders'
import { rarityColors, formatPrice, type CheckoutFormData } from '@/lib/mock-cards'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState } from 'react'

interface CartListModalProps {
  onClose: () => void
}

export function CartListModal({ onClose }: CartListModalProps) {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart()
  const { createOrder } = useOrders()
  const [step, setStep] = useState<'list' | 'checkout' | 'success'>('list')
  const [formData, setFormData] = useState<CheckoutFormData>({
    name: '',
    bankName: '',
    accountNumber: '',
    phoneLast4: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CheckoutFormData, string>> = {}
    
    if (!formData.name.trim()) newErrors.name = '이름을 입력해주세요'
    if (!formData.bankName.trim()) newErrors.bankName = '은행명을 입력해주세요'
    if (!formData.accountNumber.trim()) newErrors.accountNumber = '계좌번호를 입력해주세요'
    if (!formData.phoneLast4.trim()) {
      newErrors.phoneLast4 = '전화번호 뒷자리를 입력해주세요'
    } else if (!/^\d{4}$/.test(formData.phoneLast4)) {
      newErrors.phoneLast4 = '4자리 숫자를 입력해주세요'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) return
    
    createOrder(items, formData)
    setStep('success')
    
    setTimeout(() => {
      clearCart()
      onClose()
    }, 1500)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={step === 'success' ? undefined : onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 flex h-[70vh] w-[70vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl">
        
        {/* Success State */}
        {step === 'success' && (
          <div className="flex h-full flex-col items-center justify-center p-8">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-600/20">
              <Check className="h-12 w-12 text-emerald-500" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-white">매입 요청 완료</h2>
            <p className="mt-2 text-center text-zinc-400">
              매입 요청이 접수되었습니다.<br />
              관리자 확인 후 입금이 진행됩니다.
            </p>
          </div>
        )}

        {/* Checkout Form */}
        {step === 'checkout' && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-4">
              <button
                onClick={() => setStep('list')}
                className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-white">정보 입력</h2>
                <p className="text-sm text-zinc-500">입금 받으실 계좌 정보를 입력해주세요</p>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-5">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">이름</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="예: 홍길동"
                    className={`w-full rounded-xl border bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none ${
                      errors.name ? 'border-red-500' : 'border-zinc-700 focus:border-zinc-600'
                    }`}
                  />
                  {errors.name && <p className="text-sm text-red-400">{errors.name}</p>}
                </div>

                {/* Bank Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">은행명</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                    placeholder="예: 카카오뱅크"
                    className={`w-full rounded-xl border bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none ${
                      errors.bankName ? 'border-red-500' : 'border-zinc-700 focus:border-zinc-600'
                    }`}
                  />
                  {errors.bankName && <p className="text-sm text-red-400">{errors.bankName}</p>}
                </div>

                {/* Account Number */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">계좌번호</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="예: 3333-01-1234567"
                    className={`w-full rounded-xl border bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none ${
                      errors.accountNumber ? 'border-red-500' : 'border-zinc-700 focus:border-zinc-600'
                    }`}
                  />
                  {errors.accountNumber && <p className="text-sm text-red-400">{errors.accountNumber}</p>}
                </div>

                {/* Phone Last 4 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">전화번호 뒷자리 (4자리)</label>
                  <input
                    type="text"
                    value={formData.phoneLast4}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneLast4: e.target.value.slice(0, 4) }))}
                    placeholder="예: 1234"
                    maxLength={4}
                    className={`w-full rounded-xl border bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none ${
                      errors.phoneLast4 ? 'border-red-500' : 'border-zinc-700 focus:border-zinc-600'
                    }`}
                  />
                  {errors.phoneLast4 && <p className="text-sm text-red-400">{errors.phoneLast4}</p>}
                </div>

                {/* Summary */}
                <div className="mt-6 rounded-xl bg-zinc-800/50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">총 {items.length}종</span>
                    <span className="text-zinc-400">{items.reduce((sum, i) => sum + i.quantity, 0)}장</span>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <span className="text-zinc-400">매입 금액</span>
                    <span className="text-xl font-bold text-amber-500">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="border-t border-zinc-800 p-6">
              <button
                onClick={handleSubmit}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-lg font-semibold text-black transition-all hover:bg-amber-400 active:scale-[0.98]"
              >
                매입 요청 제출
              </button>
            </div>
          </>
        )}

        {/* Cart List */}
        {step === 'list' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                  <ShoppingBag className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">매입 목록</h2>
                  <p className="text-sm text-zinc-500">
                    {items.length}종 {items.reduce((sum, i) => sum + i.quantity, 0)}장
                  </p>
                </div>
              </div>
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-sm text-zinc-500 transition-colors hover:text-red-400"
                >
                  전체 삭제
                </button>
              )}
            </div>

            {/* Items List */}
            <ScrollArea className="flex-1">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800">
                    <ShoppingBag className="h-10 w-10 text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-zinc-400">매입 목록이 비어있습니다</p>
                    <p className="text-sm text-zinc-600">카드를 클릭하여 추가하세요</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800 p-4">
                  {items.map((item) => {
                    const colors = rarityColors[item.rarity]
                    return (
                      <div
                        key={`${item.cardId}-${item.rarity}`}
                        className="flex items-center gap-4 py-4"
                      >
                        {/* Card Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex rounded px-2 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}
                            >
                              {item.rarity}
                            </span>
                            <span className="truncate text-sm font-medium text-white">
                              {item.cardName}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">{item.cardCode}</p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.cardId, item.rarity, item.quantity - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.cardId, item.rarity, item.quantity + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="w-28 text-right">
                          <p className="font-semibold text-white">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-zinc-500">
                              {formatPrice(item.price)} 개당
                            </p>
                          )}
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeItem(item.cardId, item.rarity)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-red-500/20 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-zinc-800 p-6">
                <div className="mb-4 flex items-baseline justify-between">
                  <span className="text-lg text-zinc-400">총 매입가</span>
                  <span className="text-3xl font-bold text-amber-500">
                    {formatPrice(total)}
                  </span>
                </div>
                <button
                  onClick={() => setStep('checkout')}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-lg font-semibold text-black transition-all hover:bg-amber-400 active:scale-[0.98]"
                >
                  판매 확정
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
