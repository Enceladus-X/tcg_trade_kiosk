'use client'

import { useCallback, useMemo } from 'react'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { type PendingOrder, type CheckoutFormData, type CartItem, type OrderStatus, type PaymentMethod, type OrderPaymentMethod } from './mock-cards'
import { type DbOrder, type DbOrderItemAdjustment } from './database.types'

const LOCAL_ORDER_ITEM_NOTES_KEY = 'tcg-trade-kiosk.order-item-notes'
const LOCAL_ORDER_ITEM_PAYMENT_METHODS_KEY = 'tcg-trade-kiosk.order-item-payment-methods'

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

function readLocalOrderItemPaymentMethods(): Record<string, PaymentMethod> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LOCAL_ORDER_ITEM_PAYMENT_METHODS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, PaymentMethod> : {}
  } catch {
    return {}
  }
}

function writeLocalOrderItemPaymentMethods(paymentMethodsByItemId: Record<string, PaymentMethod>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_ORDER_ITEM_PAYMENT_METHODS_KEY, JSON.stringify(paymentMethodsByItemId))
}

function deriveOrderPaymentMethod(items: Pick<CartItem, 'paymentMethod'>[]): OrderPaymentMethod {
  const hasCash = items.some((item) => item.paymentMethod === 'cash')
  const hasMileage = items.some((item) => item.paymentMethod === 'mileage')
  if (hasCash && hasMileage) return 'mixed'
  if (hasMileage) return 'mileage'
  return 'cash'
}

function getPersistedOrderPaymentMethod(paymentMethod: OrderPaymentMethod): PaymentMethod {
  if (paymentMethod === 'mixed') return 'cash'
  return paymentMethod
}

function calculateOrderTotal(items: Pick<CartItem, 'price' | 'quantity' | 'paymentMethod'>[], mileageRate: number | null | undefined) {
  return items.reduce((sum, item) => {
    const subtotal = item.price * item.quantity
    if (item.paymentMethod === 'mileage') {
      return sum + Math.round(subtotal * (mileageRate ?? 1))
    }
    return sum + subtotal
  }, 0)
}

export function createClientRequestId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) return window.crypto.randomUUID()
  return `order-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

// --- 타입 변환 ---

function dbToOrder(
  row: DbOrder,
  localNotesByItemId: Record<string, string>,
  localPaymentMethodsByItemId: Record<string, PaymentMethod>
): PendingOrder {
  const items = (row.order_items ?? []).map(item => ({
    itemId: item.id,
    cardId: item.card_id ?? '',
    cardName: item.card_name,
    cardCode: item.card_code,
    rarity: item.rarity,
    price: item.price,
    quantity: item.quantity,
    paymentMethod: ('payment_method' in item ? item.payment_method : undefined) ?? localPaymentMethodsByItemId[item.id] ?? (row.payment_method === 'mileage' ? 'mileage' : 'cash'),
    note: ('note' in item ? item.note : undefined) ?? localNotesByItemId[item.id] ?? null,
    declaredCondition: item.declared_condition ?? 'unspecified',
    declaredDefects: item.declared_defects ?? [],
  }))

  return {
    id: row.id,
    createdAt: row.created_at,
    channel: row.channel ?? 'kiosk',
    webQuoteCode: row.web_quote_code ?? null,
    quoteExpiresAt: row.quote_expires_at ?? null,
    customerName: row.customer_name,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    phoneNumber: row.phone_number,
    totalPrice: row.total_price,
    status: row.status,
    paymentMethod: deriveOrderPaymentMethod(items),
    mileageRate: row.mileage_rate,
    items,
  }
}

function isMissingNoteColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string }
  return maybeError.code === 'PGRST204' && typeof maybeError.message === 'string' && maybeError.message.includes("'note' column")
}

function isMissingPaymentMethodColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string }
  return maybeError.code === 'PGRST204' && typeof maybeError.message === 'string' && maybeError.message.includes("'payment_method' column")
}

function isMissingDeclarationColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string }
  return maybeError.code === 'PGRST204' && typeof maybeError.message === 'string' && (
    maybeError.message.includes("'declared_condition' column") ||
    maybeError.message.includes("'declared_defects' column")
  )
}

function isMissingClientRequestIdColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string }
  return maybeError.code === 'PGRST204' && typeof maybeError.message === 'string' && maybeError.message.includes("'client_request_id' column")
}

function isDuplicateClientRequestError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string; details?: string }
  const message = [maybeError.message, maybeError.details].filter(Boolean).join(' ')
  return maybeError.code === '23505' && message.includes('client_request_id')
}

const ORDERS_KEY = ['orders'] as const
const ORDER_ADJUSTMENTS_KEY = ['order-item-adjustments'] as const
const ORDER_HISTORY_PAGE_SIZE = 100

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

  const {
    data: orderHistory,
    fetchNextPage: fetchNextOrderPage,
    hasNextPage: hasMoreOrderPages = false,
    isFetchingNextPage: isFetchingNextOrderPage = false,
  } = useInfiniteQuery({
    queryKey: ORDERS_KEY,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = typeof pageParam === 'number' ? pageParam : 0
      const { data, error, count } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })
        .range(offset, offset + ORDER_HISTORY_PAGE_SIZE - 1, { count: 'exact' })
      if (error) throw error
      const localNotesByItemId = readLocalOrderItemNotes()
      const localPaymentMethodsByItemId = readLocalOrderItemPaymentMethods()
      return {
        orders: (data as DbOrder[]).map((row) => dbToOrder(row, localNotesByItemId, localPaymentMethodsByItemId)),
        offset,
        total: count,
      }
    },
    getNextPageParam: (lastPage, pages) => {
      const loadedCount = pages.reduce((sum, page) => sum + page.orders.length, 0)
      if (lastPage.orders.length === 0 || (lastPage.total !== undefined && loadedCount >= lastPage.total)) return undefined
      return lastPage.offset + lastPage.orders.length
    },
  })

  const orders = useMemo(
    () => orderHistory?.pages.flatMap((page) => page.orders) ?? [],
    [orderHistory],
  )
  const totalOrderCount = orderHistory?.pages.at(0)?.total ?? orders.length
  const orderIds = useMemo(() => orders.map((order) => order.id), [orders])

  const { data: priceAdjustmentsByOrderId = {} } = useQuery({
    queryKey: [...ORDER_ADJUSTMENTS_KEY, orderIds],
    enabled: orderIds.length > 0,
    queryFn: async () => {
      const rows = await Promise.all(
        Array.from({ length: Math.ceil(orderIds.length / 500) }, (_, index) => orderIds.slice(index * 500, (index + 1) * 500))
          .map(async (orderIdBatch) => {
            const { data, error } = await supabase
              .from('order_item_adjustments')
              .select('*')
              .in('order_id', orderIdBatch)
              .order('changed_at', { ascending: false })

            if (error) {
              if (isMissingAdjustmentsTableError(error)) return [] as DbOrderItemAdjustment[]
              throw error
            }
            return data as DbOrderItemAdjustment[]
          }),
      )

      return rows.flat().reduce<Record<string, OrderItemAdjustment[]>>((acc, row) => {
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
      requestId,
    }: {
      items: CartItem[]
      customerData: CheckoutFormData
      mileageRate?: number
      requestId?: string
    }) => {
      if (items.length === 0) throw new Error('매입할 카드가 없습니다.')
      if (items.some((item) => item.quantity < 1 || item.quantity > 999 || item.price < 0)) {
        throw new Error('카드 수량 또는 가격이 올바르지 않습니다.')
      }

      const clientRequestId = requestId ?? createClientRequestId()
      const orderPaymentMethod = deriveOrderPaymentMethod(items)
      const persistedOrderPaymentMethod = getPersistedOrderPaymentMethod(orderPaymentMethod)
      const hasCashItems = items.some((item) => item.paymentMethod === 'cash')
      const hasMileageItems = items.some((item) => item.paymentMethod === 'mileage')
      const finalTotal = calculateOrderTotal(items, hasMileageItems ? mileageRate : null)

      // 마일리지 결제는 은행/계좌 정보 불필요 → 빈 문자열로 저장
      // (orders.bank_name / account_number 가 NOT NULL 이므로 '' 사용)
      const bankName = hasCashItems ? customerData.bankName.trim() : ''
      const accountNumber = hasCashItems ? customerData.accountNumber.replace(/\D/g, '') : ''
      const customerName = customerData.name.trim()
      const phoneNumber = customerData.phoneNumber.replace(/\D/g, '')
      if (!customerName || phoneNumber.length < 10 || (hasCashItems && (!bankName || accountNumber.length < 6))) {
        throw new Error('고객 정보가 완전하지 않습니다.')
      }

      // 1단계: orders 행 삽입
      const { data: transactionalOrder, error: transactionalOrderError } = await supabase.rpc('submit_kiosk_counter_order_v1', {
        input_customer_name: customerName,
        input_bank_name: bankName,
        input_account_number: accountNumber,
        input_phone_number: phoneNumber,
        input_mileage_rate: hasMileageItems ? (mileageRate ?? null) : null,
        input_client_request_id: clientRequestId,
        input_items: items.map((item) => ({
          card_id: item.cardId || null,
          card_name: item.cardName,
          card_code: item.cardCode,
          rarity: item.rarity,
          price: item.price,
          quantity: item.quantity,
          payment_method: item.paymentMethod,
          note: item.note ?? null,
        })),
      })
      if (!transactionalOrderError && transactionalOrder) return transactionalOrder
      if (transactionalOrderError?.code !== 'PGRST202') throw transactionalOrderError ?? new Error('주문을 저장하지 못했습니다.')

      const orderPayload = {
        customer_name: customerName,
        bank_name: bankName,
        account_number: accountNumber,
        phone_number: phoneNumber,
        total_price: finalTotal,
        status: 'pending' as const,
        payment_method: persistedOrderPaymentMethod,
        mileage_rate: hasMileageItems ? (mileageRate ?? null) : null,
        client_request_id: clientRequestId,
      }

      let { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single()

      if (orderError && isMissingClientRequestIdColumnError(orderError)) {
        const { client_request_id: _clientRequestId, ...legacyOrderPayload } = orderPayload
        ;({ data: order, error: orderError } = await supabase
          .from('orders')
          .insert(legacyOrderPayload)
          .select()
          .single())
      }

      if (orderError && isDuplicateClientRequestError(orderError)) {
        const { data: existingOrder, error: existingOrderError } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('client_request_id', clientRequestId)
          .single()
        if (!existingOrderError && existingOrder) return existingOrder
      }
      if (orderError) throw orderError

      // 2단계: order_items 일괄 삽입
      // card_name/card_code는 스냅샷 — 카드 삭제 후에도 주문 기록 보존
      const itemPayload = items.map(item => ({
        order_id: order.id,
        card_id: item.cardId || null,
        card_name: item.cardName,
        card_code: item.cardCode,
        rarity: item.rarity,
        price: item.price,
        quantity: item.quantity,
        payment_method: item.paymentMethod,
        note: item.note ?? null,
      }))

      const localPaymentMethodsByItemId = readLocalOrderItemPaymentMethods()

      let { data: insertedItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(itemPayload)
        .select('id')

      if (itemsError && isMissingPaymentMethodColumnError(itemsError)) {
        ;({ data: insertedItems, error: itemsError } = await supabase
          .from('order_items')
          .insert(itemPayload.map(({ payment_method, ...rest }) => rest))
          .select('id'))
      }
      if (itemsError) {
        // Do not leave an orphan pending order when the second insert fails.
        await supabase.from('orders').delete().eq('id', order.id)
        throw itemsError
      }

      if (Array.isArray(insertedItems)) {
        insertedItems.forEach((insertedItem, index) => {
          if (insertedItem?.id) {
            localPaymentMethodsByItemId[insertedItem.id] = items[index].paymentMethod
          }
        })
        writeLocalOrderItemPaymentMethods(localPaymentMethodsByItemId)
      }

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
      orderPaymentMethod,
      mileageRate,
    }: {
      orderId: string
      itemUpdates: { itemId: string; price: number; quantity?: number; note?: string | null; paymentMethod?: PaymentMethod }[]
      newTotal: number
      orderPaymentMethod: OrderPaymentMethod
      mileageRate: number | null
    }) => {
      const localNotesByItemId = readLocalOrderItemNotes()
      const localPaymentMethodsByItemId = readLocalOrderItemPaymentMethods()
      for (const { itemId, price, quantity, note, paymentMethod } of itemUpdates) {
        const patch: { price: number; quantity?: number; note?: string | null; payment_method?: PaymentMethod } = { price }
        if (quantity !== undefined) patch.quantity = quantity
        if (note !== undefined) patch.note = note
        if (paymentMethod !== undefined) patch.payment_method = paymentMethod

        let { error } = await supabase.from('order_items').update(patch).eq('id', itemId)
        if (error && ((note !== undefined && isMissingNoteColumnError(error)) || (paymentMethod !== undefined && isMissingPaymentMethodColumnError(error)))) {
          const fallbackPatch: { price: number; quantity?: number; note?: string | null } = { price }
          if (quantity !== undefined) fallbackPatch.quantity = quantity
          if (note !== undefined && !isMissingNoteColumnError(error)) fallbackPatch.note = note
          ;({ error } = await supabase.from('order_items').update(fallbackPatch).eq('id', itemId))
        }
        if (error) throw error

        if (note !== undefined) {
          if (note === null || note === '') delete localNotesByItemId[itemId]
          else localNotesByItemId[itemId] = note
        }
        if (paymentMethod !== undefined) {
          localPaymentMethodsByItemId[itemId] = paymentMethod
        }
      }
      const persistedOrderPaymentMethod = getPersistedOrderPaymentMethod(orderPaymentMethod)
      const { error } = await supabase
        .from('orders')
        .update({ total_price: newTotal, payment_method: persistedOrderPaymentMethod, mileage_rate: mileageRate })
        .eq('id', orderId)
      if (error) throw error
      writeLocalOrderItemNotes(localNotesByItemId)
      writeLocalOrderItemPaymentMethods(localPaymentMethodsByItemId)
    },
    onSuccess: invalidate,
  })

  const splitOrderItemsMutation = useMutation({
    mutationFn: async ({
      orderId,
      splits,
      newTotal,
      orderPaymentMethod,
      mileageRate,
    }: {
      orderId: string
      splits: {
        sourceItem: CartItem
        splitQuantity: number
        price: number
        note?: string | null
        paymentMethod: PaymentMethod
      }[]
      newTotal: number
      orderPaymentMethod: OrderPaymentMethod
      mileageRate: number | null
    }) => {
      const localNotesByItemId = readLocalOrderItemNotes()
      const localPaymentMethodsByItemId = readLocalOrderItemPaymentMethods()
      const insertedItems: { sourceItemId: string; insertedItemId: string }[] = []

      for (const split of splits) {
        if (!split.sourceItem.itemId) continue

        const splitQuantity = Math.max(1, Math.min(split.splitQuantity, split.sourceItem.quantity - 1))
        const remainingQuantity = split.sourceItem.quantity - splitQuantity
        if (remainingQuantity < 1) continue

        const { error: updateError } = await supabase
          .from('order_items')
          .update({ quantity: remainingQuantity })
          .eq('id', split.sourceItem.itemId)
        if (updateError) throw updateError

        const payload = {
          order_id: orderId,
          card_id: split.sourceItem.cardId || null,
          card_name: split.sourceItem.cardName,
          card_code: split.sourceItem.cardCode,
          rarity: split.sourceItem.rarity,
          price: split.price,
          quantity: splitQuantity,
          payment_method: split.paymentMethod,
          note: split.note ?? null,
          declared_condition: split.sourceItem.declaredCondition ?? 'unspecified',
          declared_defects: split.sourceItem.declaredDefects ?? [],
        }

        let { data: insertedItem, error: insertError } = await supabase
          .from('order_items')
          .insert(payload)
          .select('id')
          .single()

        if (insertError && isMissingDeclarationColumnError(insertError)) {
          const { declared_condition: _declaredCondition, declared_defects: _declaredDefects, ...legacyPayload } = payload
          ;({ data: insertedItem, error: insertError } = await supabase
            .from('order_items')
            .insert(legacyPayload)
            .select('id')
            .single())
        }

        if (insertError && (isMissingNoteColumnError(insertError) || isMissingPaymentMethodColumnError(insertError))) {
          const fallbackPayload: Omit<typeof payload, 'payment_method' | 'note' | 'declared_condition' | 'declared_defects'> & { note?: string | null } = {
            order_id: payload.order_id,
            card_id: payload.card_id,
            card_name: payload.card_name,
            card_code: payload.card_code,
            rarity: payload.rarity,
            price: payload.price,
            quantity: payload.quantity,
          }
          if (!isMissingNoteColumnError(insertError)) fallbackPayload.note = payload.note
          ;({ data: insertedItem, error: insertError } = await supabase
            .from('order_items')
            .insert(fallbackPayload)
            .select('id')
            .single())
        }
        if (insertError) throw insertError

        const insertedItemId = insertedItem?.id
        if (insertedItemId) {
          insertedItems.push({ sourceItemId: split.sourceItem.itemId, insertedItemId })
          if (split.note) localNotesByItemId[insertedItemId] = split.note
          localPaymentMethodsByItemId[insertedItemId] = split.paymentMethod
        }
      }

      const persistedOrderPaymentMethod = getPersistedOrderPaymentMethod(orderPaymentMethod)
      const { error: orderError } = await supabase
        .from('orders')
        .update({ total_price: newTotal, payment_method: persistedOrderPaymentMethod, mileage_rate: mileageRate })
        .eq('id', orderId)
      if (orderError) throw orderError

      writeLocalOrderItemNotes(localNotesByItemId)
      writeLocalOrderItemPaymentMethods(localPaymentMethodsByItemId)
      return insertedItems
    },
    onSuccess: invalidate,
  })

  const unitizeOrderItemsMutation = useMutation({
    mutationFn: async ({ orderId, items }: { orderId: string; items: CartItem[] }) => {
      const localNotesByItemId = readLocalOrderItemNotes()
      const localPaymentMethodsByItemId = readLocalOrderItemPaymentMethods()
      let createdCount = 0

      for (const item of items) {
        if (!item.itemId || item.quantity <= 1) continue

        const payload = Array.from({ length: item.quantity - 1 }, () => ({
          order_id: orderId,
          card_id: item.cardId || null,
          card_name: item.cardName,
          card_code: item.cardCode,
          rarity: item.rarity,
          price: item.price,
          quantity: 1,
          payment_method: item.paymentMethod,
          note: item.note ?? null,
          declared_condition: item.declaredCondition ?? 'unspecified',
          declared_defects: item.declaredDefects ?? [],
        }))

        let { data: insertedItems, error: insertError } = await supabase
          .from('order_items')
          .insert(payload)
          .select('id')

        if (insertError && isMissingDeclarationColumnError(insertError)) {
          const legacyPayload = payload.map(({ declared_condition: _condition, declared_defects: _defects, ...rest }) => rest)
          ;({ data: insertedItems, error: insertError } = await supabase
            .from('order_items')
            .insert(legacyPayload)
            .select('id'))
        }

        if (insertError && (isMissingNoteColumnError(insertError) || isMissingPaymentMethodColumnError(insertError))) {
          const minimalPayload = payload.map(({ payment_method: _paymentMethod, note: _note, declared_condition: _condition, declared_defects: _defects, ...rest }) => rest)
          ;({ data: insertedItems, error: insertError } = await supabase
            .from('order_items')
            .insert(minimalPayload)
            .select('id'))
        }
        if (insertError) throw insertError

        const insertedIds = (insertedItems ?? [])
          .map((insertedItem: { id?: unknown }) => insertedItem?.id)
          .filter((id: unknown): id is string => typeof id === 'string' && Boolean(id))

        const { error: updateError } = await supabase
          .from('order_items')
          .update({ quantity: 1 })
          .eq('id', item.itemId)
        if (updateError) {
          if (insertedIds.length > 0) {
            await supabase.from('order_items').delete().in('id', insertedIds)
          }
          throw updateError
        }

        for (const insertedItem of insertedItems ?? []) {
          if (!insertedItem?.id) continue
          if (item.note) localNotesByItemId[insertedItem.id] = item.note
          localPaymentMethodsByItemId[insertedItem.id] = item.paymentMethod
          createdCount += 1
        }
      }

      writeLocalOrderItemNotes(localNotesByItemId)
      writeLocalOrderItemPaymentMethods(localPaymentMethodsByItemId)
      return createdCount
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

  const deleteOrderItemMutation = useMutation({
    mutationFn: async ({
      orderId,
      itemId,
      newTotal,
      orderPaymentMethod,
      mileageRate,
      deleteOrder,
    }: {
      orderId: string
      itemId: string
      newTotal: number
      orderPaymentMethod: OrderPaymentMethod
      mileageRate: number | null
      deleteOrder: boolean
    }) => {
      const localNotesByItemId = readLocalOrderItemNotes()
      const localPaymentMethodsByItemId = readLocalOrderItemPaymentMethods()
      const { error: itemError } = await supabase.from('order_items').delete().eq('id', itemId)
      if (itemError) throw itemError

      delete localNotesByItemId[itemId]
      delete localPaymentMethodsByItemId[itemId]
      writeLocalOrderItemNotes(localNotesByItemId)
      writeLocalOrderItemPaymentMethods(localPaymentMethodsByItemId)

      if (deleteOrder) {
        const { error: orderDeleteError } = await supabase.from('orders').delete().eq('id', orderId)
        if (orderDeleteError) throw orderDeleteError
        return
      }

      const persistedOrderPaymentMethod = getPersistedOrderPaymentMethod(orderPaymentMethod)
      const { error: orderError } = await supabase
        .from('orders')
        .update({ total_price: newTotal, payment_method: persistedOrderPaymentMethod, mileage_rate: mileageRate })
        .eq('id', orderId)
      if (orderError) throw orderError
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

  const cancelPriceAdjustmentsMutation = useMutation({
    mutationFn: async ({
      orderId,
      itemUpdates,
      itemDeletes,
      newTotal,
      orderPaymentMethod,
      mileageRate,
    }: {
      orderId: string
      itemUpdates: { itemId: string; price: number; quantity: number; note?: string | null; paymentMethod: PaymentMethod }[]
      itemDeletes: string[]
      newTotal: number
      orderPaymentMethod: OrderPaymentMethod
      mileageRate: number | null
    }) => {
      const localNotesByItemId = readLocalOrderItemNotes()
      const localPaymentMethodsByItemId = readLocalOrderItemPaymentMethods()

      for (const update of itemUpdates) {
        const patch: { price: number; quantity: number; note?: string | null; payment_method?: PaymentMethod } = {
          price: update.price,
          quantity: update.quantity,
          note: update.note ?? null,
          payment_method: update.paymentMethod,
        }

        let { error } = await supabase.from('order_items').update(patch).eq('id', update.itemId)
        if (error && (isMissingNoteColumnError(error) || isMissingPaymentMethodColumnError(error))) {
          const fallbackPatch: { price: number; quantity: number; note?: string | null } = {
            price: update.price,
            quantity: update.quantity,
          }
          if (!isMissingNoteColumnError(error)) fallbackPatch.note = patch.note
          ;({ error } = await supabase.from('order_items').update(fallbackPatch).eq('id', update.itemId))
        }
        if (error) throw error

        delete localNotesByItemId[update.itemId]
        localPaymentMethodsByItemId[update.itemId] = update.paymentMethod
      }

      for (const itemId of itemDeletes) {
        const { error } = await supabase.from('order_items').delete().eq('id', itemId)
        if (error) throw error
        delete localNotesByItemId[itemId]
        delete localPaymentMethodsByItemId[itemId]
      }

      const persistedOrderPaymentMethod = getPersistedOrderPaymentMethod(orderPaymentMethod)
      const { error: orderError } = await supabase
        .from('orders')
        .update({ total_price: newTotal, payment_method: persistedOrderPaymentMethod, mileage_rate: mileageRate })
        .eq('id', orderId)
      if (orderError) throw orderError

      const { error: adjustmentError } = await supabase
        .from('order_item_adjustments')
        .delete()
        .eq('order_id', orderId)
      if (adjustmentError && !isMissingAdjustmentsTableError(adjustmentError)) throw adjustmentError

      writeLocalOrderItemNotes(localNotesByItemId)
      writeLocalOrderItemPaymentMethods(localPaymentMethodsByItemId)
    },
    onSuccess: () => {
      invalidate()
      invalidateAdjustments()
    },
  })

  const pendingOrders  = orders.filter(o => o.status === 'pending')
  const approvedOrders = orders.filter(o => o.status === 'approved')
  const paidOrders     = orders.filter(o => o.status === 'paid')

  return {
    orders,
    totalOrderCount,
    hasMoreOrderPages,
    isFetchingNextOrderPage,
    fetchNextOrderPage,
    priceAdjustmentsByOrderId,
    pendingOrders,
    approvedOrders,
    paidOrders,
    pendingCount: pendingOrders.length,
    createOrder: useCallback(
      (items: CartItem[], customerData: CheckoutFormData, mileageRate?: number, requestId?: string) =>
        createMutation.mutateAsync({ items, customerData, mileageRate, requestId }),
      [createMutation]
    ),
    updateOrderStatus: useCallback(
      (orderId: string, status: OrderStatus) =>
        updateStatusMutation.mutate({ orderId, status }),
      [updateStatusMutation]
    ),
    updateItemPrices: useCallback(
      (
        orderId: string,
        itemUpdates: { itemId: string; price: number; quantity?: number; note?: string | null; paymentMethod?: PaymentMethod }[],
        newTotal: number,
        orderPaymentMethod: OrderPaymentMethod,
        mileageRate: number | null
      ) =>
        updateItemPricesMutation.mutateAsync({ orderId, itemUpdates, newTotal, orderPaymentMethod, mileageRate }),
      [updateItemPricesMutation]
    ),
    splitOrderItems: useCallback(
      (
        orderId: string,
        splits: {
          sourceItem: CartItem
          splitQuantity: number
          price: number
          note?: string | null
          paymentMethod: PaymentMethod
        }[],
        newTotal: number,
        orderPaymentMethod: OrderPaymentMethod,
        mileageRate: number | null
      ) =>
        splitOrderItemsMutation.mutateAsync({ orderId, splits, newTotal, orderPaymentMethod, mileageRate }),
      [splitOrderItemsMutation]
    ),
    unitizeOrderItems: useCallback(
      (orderId: string, items: CartItem[]) =>
        unitizeOrderItemsMutation.mutateAsync({ orderId, items }),
      [unitizeOrderItemsMutation]
    ),
    createPriceAdjustments: useCallback(
      (entries: Omit<OrderItemAdjustment, 'id' | 'changedAt'>[]) =>
        createAdjustmentsMutation.mutateAsync(entries),
      [createAdjustmentsMutation]
    ),
    cancelPriceAdjustments: useCallback(
      (
        orderId: string,
        itemUpdates: { itemId: string; price: number; quantity: number; note?: string | null; paymentMethod: PaymentMethod }[],
        itemDeletes: string[],
        newTotal: number,
        orderPaymentMethod: OrderPaymentMethod,
        mileageRate: number | null
      ) =>
        cancelPriceAdjustmentsMutation.mutateAsync({ orderId, itemUpdates, itemDeletes, newTotal, orderPaymentMethod, mileageRate }),
      [cancelPriceAdjustmentsMutation]
    ),
    deleteOrder: useCallback(
      (orderId: string) => deleteMutation.mutate(orderId),
      [deleteMutation]
    ),
    deleteOrderItem: useCallback(
      (
        orderId: string,
        itemId: string,
        newTotal: number,
        orderPaymentMethod: OrderPaymentMethod,
        mileageRate: number | null,
        deleteOrder: boolean
      ) =>
        deleteOrderItemMutation.mutateAsync({ orderId, itemId, newTotal, orderPaymentMethod, mileageRate, deleteOrder }),
      [deleteOrderItemMutation]
    ),
  }
}
