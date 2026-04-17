'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { type PendingOrder, type CheckoutFormData, type CartItem, type OrderStatus } from './mock-cards'
import { type DbOrder, type DbOrderItemAdjustment } from './database.types'

const LOCAL_ORDER_ITEM_NOTES_KEY = 'tcg-trade-kiosk.order-item-notes'

function readLocalOrderItemNotes(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LOCAL_ORDER_ITEM_NOTES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {}
  } catch {
    return {}
  }
}

function writeLocalOrderItemNotes(notesByItemId: Record<string, string>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_ORDER_ITEM_NOTES_KEY, JSON.stringify(notesByItemId))
}

// --- 타입 변환 ---

function dbToOrder(row: DbOrder, localNotesByItemId: Record<string, string>): PendingOrder {
  return {
    id: row.id,
    createdAt: row.created_at,
    customerName: row.customer_name,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    phoneNumber: row.phone_number,
    totalPrice: row.total_price,
    status: row.status,
    paymentMethod: row.payment_method,
    mileageRate: row.mileage_rate,
    items: (row.order_items ?? []).map(item => ({
      itemId: item.id,
      cardId: item.card_id ?? '',
      cardName: item.card_name,
      cardCode: item.card_code,
      rarity: item.rarity,
      price: item.price,
      quantity: item.quantity,
      note: ('note' in item ? item.note : undefined) ?? localNotesByItemId[item.id] ?? null,
    })),
  }
}

function isMissingNoteColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string }
  return maybeError.code === 'PGRST204' && typeof maybeError.message === 'string' && maybeError.message.includes("'note' column")
}

const ORDERS_KEY = ['orders'] as const
const ORDER_ADJUSTMENTS_KEY = ['order-item-adjustments'] as const

export type OrderItemAdjustment = {
  id: string
  orderId: string
  itemId: string
  cardName: string
  rarity: string
  previousPrice: number
  nextPrice: number
  note: string | null
  changedAt: string
}

function dbToAdjustment(row: DbOrderItemAdjustment): OrderItemAdjustment {
  return {
    id: row.id,
    orderId: row.order_id,
    itemId: row.order_item_id,
    cardName: row.card_name,
    rarity: row.rarity,
    previousPrice: row.previous_price,
    nextPrice: row.next_price,
    note: row.note,
    changedAt: row.changed_at,
  }
}

function isMissingAdjustmentsTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string }
  return (
    maybeError.code === 'PGRST205' ||
    maybeError.code === '42P01' ||
    (typeof maybeError.message === 'string' && maybeError.message.includes('order_item_adjustments'))
  )
}

// --- useOrders ---

export function useOrders() {
  const queryClient = useQueryClient()

  const { data: orders = [] } = useQuery({
    queryKey: ORDERS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      const localNotesByItemId = readLocalOrderItemNotes()
      return (data as DbOrder[]).map((row) => dbToOrder(row, localNotesByItemId))
    },
  })

  const { data: priceAdjustmentsByOrderId = {} } = useQuery({
    queryKey: ORDER_ADJUSTMENTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_item_adjustments')
        .select('*')
        .order('changed_at', { ascending: false })

      if (error) {
        if (isMissingAdjustmentsTableError(error)) return {}
        throw error
      }

      return (data as DbOrderItemAdjustment[]).reduce<Record<string, OrderItemAdjustment[]>>((acc, row) => {
        const mapped = dbToAdjustment(row)
        acc[mapped.orderId] = [...(acc[mapped.orderId] ?? []), mapped]
        return acc
      }, {})
    },
    staleTime: 30_000,
  })

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ORDERS_KEY }),
    [queryClient]
  )

  const invalidateAdjustments = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ORDER_ADJUSTMENTS_KEY }),
    [queryClient]
  )

  const createMutation = useMutation({
    mutationFn: async ({
      items,
      customerData,
      mileageRate,
    }: {
      items: CartItem[]
      customerData: CheckoutFormData
      mileageRate?: number
    }) => {
      const baseTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const isMileage = customerData.paymentMethod === 'mileage'
      const finalTotal = isMileage && mileageRate ? Math.round(baseTotal * mileageRate) : baseTotal

      // 마일리지 결제는 은행/계좌 정보 불필요 → 빈 문자열로 저장
      // (orders.bank_name / account_number 가 NOT NULL 이므로 '' 사용)
      const bankName = isMileage ? '' : customerData.bankName
      const accountNumber = isMileage ? '' : customerData.accountNumber

      // 1단계: orders 행 삽입
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: customerData.name,
          bank_name: bankName,
          account_number: accountNumber,
          phone_number: customerData.phoneNumber,
          total_price: finalTotal,
          status: 'pending',
          payment_method: customerData.paymentMethod,
          mileage_rate: isMileage ? (mileageRate ?? null) : null,
        })
        .select()
        .single()
      if (orderError) throw orderError

      // 2단계: order_items 일괄 삽입
      // card_name/card_code는 스냅샷 — 카드 삭제 후에도 주문 기록 보존
      const { error: itemsError } = await supabase.from('order_items').insert(
        items.map(item => ({
          order_id: order.id,
          card_id: item.cardId || null,
          card_name: item.cardName,
          card_code: item.cardCode,
          rarity: item.rarity,
          price: item.price,
          quantity: item.quantity,
          note: item.note ?? null,
        }))
      )
      if (itemsError) throw itemsError

      return order
    },
    onSuccess: invalidate,
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const updateItemPricesMutation = useMutation({
    mutationFn: async ({
      orderId,
      itemUpdates,
      newTotal,
    }: {
      orderId: string
      itemUpdates: { itemId: string; price: number; note?: string | null }[]
      newTotal: number
    }) => {
      const localNotesByItemId = readLocalOrderItemNotes()
      for (const { itemId, price, note } of itemUpdates) {
        const patch: { price: number; note?: string | null } = { price }
        if (note !== undefined) patch.note = note

        let { error } = await supabase.from('order_items').update(patch).eq('id', itemId)
        if (error && note !== undefined && isMissingNoteColumnError(error)) {
          ;({ error } = await supabase.from('order_items').update({ price }).eq('id', itemId))
        }
        if (error) throw error

        if (note !== undefined) {
          if (note === null || note === '') delete localNotesByItemId[itemId]
          else localNotesByItemId[itemId] = note
        }
      }
      const { error } = await supabase.from('orders').update({ total_price: newTotal }).eq('id', orderId)
      if (error) throw error
      writeLocalOrderItemNotes(localNotesByItemId)
    },
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // order_items는 ON DELETE CASCADE로 자동 삭제
      const { error } = await supabase.from('orders').delete().eq('id', orderId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const createAdjustmentsMutation = useMutation({
    mutationFn: async (entries: Omit<OrderItemAdjustment, 'id' | 'changedAt'>[]) => {
      if (entries.length === 0) return
      const payload = entries.map((entry) => ({
        order_id: entry.orderId,
        order_item_id: entry.itemId,
        card_name: entry.cardName,
        rarity: entry.rarity,
        previous_price: entry.previousPrice,
        next_price: entry.nextPrice,
        note: entry.note,
      }))
      const { error } = await supabase.from('order_item_adjustments').insert(payload)
      if (error) {
        if (isMissingAdjustmentsTableError(error)) return
        throw error
      }
    },
    onSuccess: invalidateAdjustments,
  })

  const pendingOrders  = orders.filter(o => o.status === 'pending')
  const approvedOrders = orders.filter(o => o.status === 'approved')
  const paidOrders     = orders.filter(o => o.status === 'paid')

  return {
    orders,
    priceAdjustmentsByOrderId,
    pendingOrders,
    approvedOrders,
    paidOrders,
    pendingCount: pendingOrders.length,
    createOrder: useCallback(
      (items: CartItem[], customerData: CheckoutFormData, mileageRate?: number) =>
        createMutation.mutateAsync({ items, customerData, mileageRate }),
      [createMutation]
    ),
    updateOrderStatus: useCallback(
      (orderId: string, status: OrderStatus) =>
        updateStatusMutation.mutate({ orderId, status }),
      [updateStatusMutation]
    ),
    updateItemPrices: useCallback(
      (orderId: string, itemUpdates: { itemId: string; price: number; note?: string | null }[], newTotal: number) =>
        updateItemPricesMutation.mutateAsync({ orderId, itemUpdates, newTotal }),
      [updateItemPricesMutation]
    ),
    createPriceAdjustments: useCallback(
      (entries: Omit<OrderItemAdjustment, 'id' | 'changedAt'>[]) =>
        createAdjustmentsMutation.mutateAsync(entries),
      [createAdjustmentsMutation]
    ),
    deleteOrder: useCallback(
      (orderId: string) => deleteMutation.mutate(orderId),
      [deleteMutation]
    ),
  }
}
