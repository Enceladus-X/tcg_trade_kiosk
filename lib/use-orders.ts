'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { type PendingOrder, type CheckoutFormData, type CartItem, type OrderStatus, mockPendingOrders } from './mock-cards'

// External store for pending orders - designed for easy backend migration
type OrdersStore = {
  orders: PendingOrder[]
  listeners: Set<() => void>
}

const ordersStore: OrdersStore = {
  orders: [...mockPendingOrders], // Initialize with mock data
  listeners: new Set(),
}

function emitChange() {
  ordersStore.listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  ordersStore.listeners.add(listener)
  return () => ordersStore.listeners.delete(listener)
}

function getSnapshot(): PendingOrder[] {
  return ordersStore.orders
}

// Create a new order from cart items and customer data
function createOrder(items: CartItem[], customerData: CheckoutFormData): PendingOrder {
  const newOrder: PendingOrder = {
    id: `order-${Date.now()}`,
    createdAt: new Date().toISOString(),
    customerName: customerData.name,
    bankName: customerData.bankName,
    accountNumber: customerData.accountNumber,
    phoneLast4: customerData.phoneLast4,
    items: [...items],
    totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    status: 'pending',
  }
  
  ordersStore.orders = [newOrder, ...ordersStore.orders]
  emitChange()
  return newOrder
}

// Update order status (admin action)
function updateOrderStatus(orderId: string, status: OrderStatus) {
  ordersStore.orders = ordersStore.orders.map(order =>
    order.id === orderId ? { ...order, status } : order
  )
  emitChange()
}

// Delete order (admin action)
function deleteOrder(orderId: string) {
  ordersStore.orders = ordersStore.orders.filter(order => order.id !== orderId)
  emitChange()
}

// Hook to use orders state
export function useOrders() {
  const orders = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const pendingOrders = orders.filter(o => o.status === 'pending')
  const approvedOrders = orders.filter(o => o.status === 'approved')
  const paidOrders = orders.filter(o => o.status === 'paid')

  return {
    orders,
    pendingOrders,
    approvedOrders,
    paidOrders,
    pendingCount: pendingOrders.length,
    createOrder: useCallback(createOrder, []),
    updateOrderStatus: useCallback(updateOrderStatus, []),
    deleteOrder: useCallback(deleteOrder, []),
  }
}
