'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Banknote, Check, Coins, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useCart } from '@/lib/use-cart'
import { useOrders } from '@/lib/use-orders'
import { useStoreSettings } from '@/lib/use-settings'
import { formatPrice, getRarityColors, type CheckoutFormData, type PaymentMethod } from '@/lib/mock-cards'

interface CartListModalProps {
  onClose: () => void
}

function PaymentToggle({
  value,
  onChange,
}: {
  value: PaymentMethod
  onChange: (value: PaymentMethod) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border border-zinc-700 bg-zinc-800 p-1">
      <button
        type="button"
        onClick={() => onChange('cash')}
        className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
          value === 'cash'
            ? 'bg-amber-500 text-black'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        <Banknote className="h-3.5 w-3.5" />
        현금
      </button>
      <button
        type="button"
        onClick={() => onChange('mileage')}
        className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
          value === 'mileage'
            ? 'bg-emerald-500 text-black'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        <Coins className="h-3.5 w-3.5" />
        마일리지
      </button>
    </div>
  )
}

export function CartListModal({ onClose }: CartListModalProps) {
  const { items, updateQuantity, updatePaymentMethod, setAllPaymentMethods, removeItem, clearCart } = useCart()
  const { createOrder } = useOrders()
  const { mileageRate } = useStoreSettings()

  const [step, setStep] = useState<'list' | 'checkout' | 'success'>('list')
  const [formData, setFormData] = useState<CheckoutFormData>({
    name: '',
    bankName: '',
    accountNumber: '',
    phoneNumber: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const cashTotal = useMemo(
    () => items.filter((item) => item.paymentMethod === 'cash').reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  )
  const mileageBaseTotal = useMemo(
    () => items.filter((item) => item.paymentMethod === 'mileage').reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  )
  const mileageTotal = useMemo(
    () =>
      items
        .filter((item) => item.paymentMethod === 'mileage')
        .reduce((sum, item) => sum + Math.round(item.price * item.quantity * mileageRate), 0),
    [items, mileageRate]
  )
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  const hasCashItems = cashTotal > 0
  const hasMileageItems = mileageBaseTotal > 0
  const effectiveTotal = cashTotal + mileageTotal

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof CheckoutFormData, string>> = {}
    if (!formData.name.trim()) nextErrors.name = '이름을 입력해 주세요.'
    if (hasCashItems && !formData.bankName.trim()) nextErrors.bankName = '은행명을 입력해 주세요.'
    if (hasCashItems && !formData.accountNumber.trim()) nextErrors.accountNumber = '계좌번호를 입력해 주세요.'
    if (!formData.phoneNumber.trim()) {
      nextErrors.phoneNumber = '전화번호를 입력해 주세요.'
    } else if (!/^\d{10,11}$/.test(formData.phoneNumber.replace(/-/g, ''))) {
      nextErrors.phoneNumber = '전화번호 형식을 확인해 주세요.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    setSubmitError(null)
    try {
      await createOrder(items, formData, hasMileageItems ? mileageRate : undefined)
      setStep('success')
      setTimeout(() => {
        clearCart()
        onClose()
      }, 1500)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '매입 요청 중 오류가 발생했습니다. 다시 시도해 주세요.'
      setSubmitError(message)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={step === 'success' ? undefined : onClose} />

      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="flex h-[78vh] w-[70vw] max-w-2xl flex-col overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {step === 'success' && (
            <div className="flex h-full flex-col items-center justify-center p-8">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-600/20">
                <Check className="h-12 w-12 text-emerald-500" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-white">매입 요청 완료</h2>
              <p className="mt-2 text-center text-zinc-400">
                매입 요청이 접수되었습니다.
                <br />
                관리자 확인 후 지급이 진행됩니다.
              </p>
            </div>
          )}

          {step === 'checkout' && (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 px-6 py-4">
                <button
                  onClick={() => setStep('list')}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-white">정보 입력</h2>
                  <p className="text-sm text-zinc-500">지급에 필요한 고객 정보를 입력해 주세요.</p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className="space-y-5">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-4">
                    <p className="text-sm font-medium text-zinc-300">품목별 지급 방식 요약</p>
                    <div className="mt-3 grid gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-amber-400">
                          <Banknote className="h-4 w-4" />
                          현금 지급
                        </span>
                        <span className="font-semibold text-amber-300">{formatPrice(cashTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-emerald-400">
                          <Coins className="h-4 w-4" />
                          마일리지 지급
                        </span>
                        <span className="font-semibold text-emerald-300">{formatPrice(mileageTotal)}</span>
                      </div>
                      {hasMileageItems && (
                        <p className="text-xs text-zinc-500">마일리지 품목에는 x{mileageRate.toFixed(2)} 배율이 적용됩니다.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">이름</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="예: 홍길동"
                      className={`w-full rounded-xl border bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none ${
                        errors.name ? 'border-red-500' : 'border-zinc-700 focus:border-zinc-600'
                      }`}
                    />
                    {errors.name && <p className="text-sm text-red-400">{errors.name}</p>}
                  </div>

                  {hasCashItems && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">은행명</label>
                        <input
                          type="text"
                          value={formData.bankName}
                          onChange={(event) => setFormData((prev) => ({ ...prev, bankName: event.target.value }))}
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
                          onChange={(event) => setFormData((prev) => ({ ...prev, accountNumber: event.target.value }))}
                          placeholder="예: 3333-01-1234567"
                          className={`w-full rounded-xl border bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none ${
                            errors.accountNumber ? 'border-red-500' : 'border-zinc-700 focus:border-zinc-600'
                          }`}
                        />
                        {errors.accountNumber && <p className="text-sm text-red-400">{errors.accountNumber}</p>}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">전화번호</label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          phoneNumber: event.target.value.replace(/[^0-9]/g, '').slice(0, 11),
                        }))
                      }
                      placeholder="예: 01012345678"
                      maxLength={11}
                      className={`w-full rounded-xl border bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none ${
                        errors.phoneNumber ? 'border-red-500' : 'border-zinc-700 focus:border-zinc-600'
                      }`}
                    />
                    {errors.phoneNumber && <p className="text-sm text-red-400">{errors.phoneNumber}</p>}
                  </div>

                  <div className="rounded-xl bg-zinc-800/50 p-4">
                    <div className="flex justify-between text-sm text-zinc-400">
                      <span>총 {items.length}종</span>
                      <span>{totalQuantity}장</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-zinc-700 pt-3">
                      <span className="text-lg text-zinc-400">총 지급액</span>
                      <span className="text-3xl font-bold text-white">{formatPrice(effectiveTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-zinc-800 p-6">
                {submitError && (
                  <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {submitError}
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-lg font-semibold text-black transition-all hover:bg-amber-400 active:scale-[0.98]"
                >
                  매입 요청 제출
                </button>
              </div>
            </>
          )}

          {step === 'list' && (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                    <ShoppingBag className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">매입 목록</h2>
                    <p className="text-sm text-zinc-500">
                      {items.length}종 / {totalQuantity}장
                    </p>
                  </div>
                </div>
                {items.length > 0 && (
                  <button onClick={clearCart} className="text-sm text-zinc-500 transition-colors hover:text-red-400">
                    전체 삭제
                  </button>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800">
                      <ShoppingBag className="h-10 w-10 text-zinc-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-zinc-400">매입 목록이 비어 있습니다</p>
                      <p className="text-sm text-zinc-600">카드를 눌러 장바구니에 담아 주세요.</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
                      <span className="text-xs font-semibold text-zinc-400">정산 방식 일괄 변경</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setAllPaymentMethods('cash')}
                          className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/25"
                        >
                          <Banknote className="h-3.5 w-3.5" />
                          전체 현금
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllPaymentMethods('mileage')}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/25"
                        >
                          <Coins className="h-3.5 w-3.5" />
                          전체 마일리지
                        </button>
                      </div>
                    </div>
                    {items.map((item) => {
                      const colors = getRarityColors(item.rarity)
                      const itemTotal = item.paymentMethod === 'mileage'
                        ? Math.round(item.price * item.quantity * mileageRate)
                        : item.price * item.quantity

                      return (
                        <div key={`${item.cardId}-${item.rarity}-${item.paymentMethod}`} className="flex items-center gap-4 py-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex rounded px-2 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>
                                {item.rarity}
                              </span>
                              <span className="truncate text-sm font-medium text-white">{item.cardName}</span>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">{item.cardCode}</p>
                            <div className="mt-2 max-w-[220px]">
                              <PaymentToggle
                                value={item.paymentMethod}
                                onChange={(nextValue) => updatePaymentMethod(item.cardId, item.rarity, item.paymentMethod, nextValue)}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.cardId, item.rarity, item.paymentMethod, item.quantity - 1)}
                              aria-label={item.quantity === 1 ? `${item.cardName} 삭제` : `${item.cardName} 수량 감소`}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                item.quantity === 1
                                  ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25 hover:text-red-200'
                                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                              }`}
                            >
                              {item.quantity === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                            </button>
                            <span className="w-8 text-center text-sm font-semibold text-white">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.cardId, item.rarity, item.paymentMethod, item.quantity + 1)}
                              aria-label={`${item.cardName} 수량 증가`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="w-32 text-right">
                            <p className={`font-semibold ${item.paymentMethod === 'mileage' ? 'text-emerald-300' : 'text-white'}`}>
                              {formatPrice(itemTotal)}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {item.paymentMethod === 'mileage' ? `마일리지 x${mileageRate.toFixed(2)}` : '현금'}
                            </p>
                          </div>

                          <button
                            onClick={() => removeItem(item.cardId, item.rarity, item.paymentMethod)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-red-500/20 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="shrink-0 border-t border-zinc-800 p-6">
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">현금 지급</span>
                      <span className="font-medium text-amber-300">{formatPrice(cashTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">마일리지 지급</span>
                      <span className="font-medium text-emerald-300">{formatPrice(mileageTotal)}</span>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-zinc-700 pt-3">
                      <span className="text-lg text-zinc-400">총 지급액</span>
                      <span className="text-3xl font-bold text-white">{formatPrice(effectiveTotal)}</span>
                    </div>
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
