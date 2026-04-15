'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus, Trash2, ShoppingBag, Check, ArrowRight, ArrowLeft, Coins, Banknote } from 'lucide-react'
import { useCart } from '@/lib/use-cart'
import { useOrders } from '@/lib/use-orders'
import { useStoreSettings } from '@/lib/use-settings'
import { rarityColors, formatPrice, type CheckoutFormData } from '@/lib/mock-cards'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState, useMemo } from 'react'

interface CartListModalProps {
  onClose: () => void
}

export function CartListModal({ onClose }: CartListModalProps) {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart()
  const { createOrder } = useOrders()
  const { mileageRate } = useStoreSettings()

  const [step, setStep] = useState<'list' | 'checkout' | 'success'>('list')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mileage'>('cash')
  const [formData, setFormData] = useState<Omit<CheckoutFormData, 'paymentMethod'>>({
    name: '',
    bankName: '',
    accountNumber: '',
    phoneNumber: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({})

  const mileageTotal = useMemo(() => Math.round(total * mileageRate), [total, mileageRate])
  const effectiveTotal = paymentMethod === 'mileage' ? mileageTotal : total

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof typeof formData, string>> = {}
    const isMileage = paymentMethod === 'mileage'

    if (!formData.name.trim()) newErrors.name = '이름을 입력해주세요'
    if (!isMileage && !formData.bankName.trim()) newErrors.bankName = '은행명을 입력해주세요'
    if (!isMileage && !formData.accountNumber.trim()) newErrors.accountNumber = '계좌번호를 입력해주세요'
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = '전화번호를 입력해주세요'
    } else if (!/^\d{10,11}$/.test(formData.phoneNumber.replace(/-/g, ''))) {
      newErrors.phoneNumber = '올바른 전화번호를 입력해주세요 (예: 01012345678)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) return

    createOrder(items, { ...formData, paymentMethod }, paymentMethod === 'mileage' ? mileageRate : undefined)
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
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2">
      <motion.div
        className="flex h-[70vh] w-[70vw] max-w-2xl flex-col overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{    opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >

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

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-5">

                {/* Payment Method Toggle */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">지급 방식</label>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-700 bg-zinc-800 p-1">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all ${
                        paymentMethod === 'cash'
                          ? 'bg-amber-500 text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Banknote className="h-4 w-4" />
                      현금 지급
                    </button>
                    <button
                      onClick={() => setPaymentMethod('mileage')}
                      className={`flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all ${
                        paymentMethod === 'mileage'
                          ? 'bg-emerald-500 text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Coins className="h-4 w-4" />
                      마일리지 지급
                    </button>
                  </div>
                  {paymentMethod === 'mileage' && (
                    <p className="text-xs text-emerald-400">
                      마일리지 선택 시 x{mileageRate.toFixed(2)} 적용 ({formatPrice(mileageTotal)})
                    </p>
                  )}
                </div>

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

                {/* Bank Name + Account Number - 현금 결제만 표시, AnimatePresence */}
                <AnimatePresence initial={false}>
                  {paymentMethod === 'cash' && (
                    <motion.div
                      key="cash-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="space-y-5">
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
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Phone Number (full) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">전화번호</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value.replace(/[^0-9]/g, '').slice(0, 11) }))}
                    placeholder="예: 01012345678"
                    maxLength={11}
                    className={`w-full rounded-xl border bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none ${
                      errors.phoneNumber ? 'border-red-500' : 'border-zinc-700 focus:border-zinc-600'
                    }`}
                  />
                  {errors.phoneNumber && <p className="text-sm text-red-400">{errors.phoneNumber}</p>}
                </div>

                {/* Summary */}
                <div className="mt-6 rounded-xl bg-zinc-800/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">총 {items.length}종</span>
                    <span className="text-zinc-400">{items.reduce((sum, i) => sum + i.quantity, 0)}장</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">기본 매입가</span>
                    <span className="text-sm font-medium text-zinc-300">{formatPrice(total)}</span>
                  </div>
                  {paymentMethod === 'mileage' && (
                    <div className="flex justify-between border-t border-zinc-700 pt-2">
                      <span className="text-emerald-400">마일리지 지급액 (x{mileageRate.toFixed(2)})</span>
                      <span className="text-xl font-bold text-emerald-400">{formatPrice(mileageTotal)}</span>
                    </div>
                  )}
                  {paymentMethod === 'cash' && (
                    <div className="flex justify-between border-t border-zinc-700 pt-2">
                      <span className="text-zinc-400">현금 지급액</span>
                      <span className="text-xl font-bold text-amber-500">{formatPrice(total)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-800 p-6">
              <button
                onClick={handleSubmit}
                className={`flex h-14 w-full items-center justify-center gap-2 rounded-xl text-lg font-semibold text-black transition-all hover:opacity-90 active:scale-[0.98] ${
                  paymentMethod === 'mileage' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              >
                매입 요청 제출
              </button>
            </div>
          </>
        )}

        {/* Cart List */}
        {step === 'list' && (
          <>
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
                    const colors = rarityColors[item.rarity] ?? { bg: 'bg-zinc-700', text: 'text-zinc-200', border: 'border-zinc-600' }
                    return (
                      <div
                        key={`${item.cardId}-${item.rarity}`}
                        className="flex items-center gap-4 py-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex rounded px-2 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>
                              {item.rarity}
                            </span>
                            <span className="truncate text-sm font-medium text-white">
                              {item.cardName}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">{item.cardCode}</p>
                        </div>

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
      </motion.div>
      </div>
    </>
  )
}
