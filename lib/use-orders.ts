'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { type PendingOrder, type CheckoutFormData, type CartItem, type OrderStatus } from './mock-cards'
import { type DbOrder } from './database.types'

// --- 타입 변환 ---

function dbToOrder(row: DbOrder): PendingOrder {
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
    })),
  }
}

const ORDERS_KEY = ['orders'] as const

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
      return (data as DbOrder[]).map(dbToOrder)
    },
  })

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ORDERS_KEY }),
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
      itemUpdates: { itemId: string; price: number }[]
      newTotal: number
    }) => {
      for (const { itemId, price } of itemUpdates) {
        const { error } = await supabase.from('order_items').update({ price }).eq('id', itemId)
        if (error) throw error
      }
      const { error } = await supabase.from('orders').update({ total_price: newTotal }).eq('id', orderId)
      if (error) throw error
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

  const pendingOrders  = orders.filter(o => o.status === 'pending')
  const approvedOrders = orders.filter(o => o.status === 'approved')
  const paidOrders     = orders.filter(o => o.status === 'paid')

  return {
    orders,
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
      (orderId: string, itemUpdates: { itemId: string; price: number }[], newTotal: number) =>
        updateItemPricesMutation.mutateAsync({ orderId, itemUpdates, newTotal }),
      [updateItemPricesMutation]
    ),
    deleteOrder: useCallback(
      (orderId: string) => deleteMutation.mutate(orderId),
      [deleteMutation]
    ),
  }
}
