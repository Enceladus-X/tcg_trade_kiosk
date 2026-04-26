'use client'

import { useCallback, useSyncExternalStore } from 'react'
import type { CartItem } from './mock-cards'

// Simple external store for cart state (no Redux needed)
type CartStore = {
  items: CartItem[]
  listeners: Set<() => void>
}

const cartStore: CartStore = {
  items: [],
  listeners: new Set(),
}

function emitChange() {
  cartStore.listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  cartStore.listeners.add(listener)
  return () => cartStore.listeners.delete(listener)
}

function getSnapshot(): CartItem[] {
  return cartStore.items
}

// Cart actions
function addItem(item: Omit<CartItem, 'quantity'>) {
  const existingIndex = cartStore.items.findIndex(
    i => i.cardId === item.cardId && i.rarity === item.rarity && i.paymentMethod === item.paymentMethod
  )

  if (existingIndex >= 0) {
    // Increment quantity if same card + rarity exists
    cartStore.items = cartStore.items.map((i, idx) =>
      idx === existingIndex ? { ...i, quantity: i.quantity + 1 } : i
    )
  } else {
    // Add new item
    cartStore.items = [...cartStore.items, { ...item, quantity: 1 }]
  }
  emitChange()
}

function updateQuantity(cardId: string, rarity: string, paymentMethod: CartItem['paymentMethod'], quantity: number) {
  if (quantity <= 0) {
    // Remove item if quantity is 0 or less
    cartStore.items = cartStore.items.filter(
      i => !(i.cardId === cardId && i.rarity === rarity && i.paymentMethod === paymentMethod)
    )
  } else {
    cartStore.items = cartStore.items.map(i =>
      i.cardId === cardId && i.rarity === rarity && i.paymentMethod === paymentMethod ? { ...i, quantity } : i
    )
  }
  emitChange()
}

function updatePaymentMethod(cardId: string, rarity: string, paymentMethod: CartItem['paymentMethod'], nextPaymentMethod: CartItem['paymentMethod']) {
  if (paymentMethod === nextPaymentMethod) return

  const sourceIndex = cartStore.items.findIndex(
    i => i.cardId === cardId && i.rarity === rarity && i.paymentMethod === paymentMethod
  )
  const sourceItem = sourceIndex >= 0 ? cartStore.items[sourceIndex] : undefined
  if (!sourceItem) return

  const targetIndex = cartStore.items.findIndex(
    i => i.cardId === cardId && i.rarity === rarity && i.paymentMethod === nextPaymentMethod
  )

  if (targetIndex >= 0) {
    cartStore.items = cartStore.items
      .filter((_, idx) => idx !== sourceIndex)
      .map((item, idx) => {
        const normalizedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex
        return idx === normalizedTargetIndex
          ? { ...item, quantity: item.quantity + sourceItem.quantity }
          : item
      })
  } else {
    cartStore.items = cartStore.items.map((item, idx) =>
      idx === sourceIndex ? { ...sourceItem, paymentMethod: nextPaymentMethod } : item
    )
  }

  emitChange()
}

function removeItem(cardId: string, rarity: string, paymentMethod: CartItem['paymentMethod']) {
  cartStore.items = cartStore.items.filter(
    i => !(i.cardId === cardId && i.rarity === rarity && i.paymentMethod === paymentMethod)
  )
  emitChange()
}

function setAllPaymentMethods(nextPaymentMethod: CartItem['paymentMethod']) {
  const nextItems: CartItem[] = []

  for (const item of cartStore.items) {
    const existingIndex = nextItems.findIndex(
      i => i.cardId === item.cardId && i.rarity === item.rarity && i.paymentMethod === nextPaymentMethod
    )

    if (existingIndex >= 0) {
      nextItems[existingIndex] = {
        ...nextItems[existingIndex],
        quantity: nextItems[existingIndex].quantity + item.quantity,
      }
    } else {
      nextItems.push({ ...item, paymentMethod: nextPaymentMethod })
    }
  }

  cartStore.items = nextItems
  emitChange()
}

function clearCart() {
  cartStore.items = []
  emitChange()
}

// Hook to use cart state
export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  return {
    items,
    total,
    totalQuantity,
    addItem: useCallback(addItem, []),
    updateQuantity: useCallback(updateQuantity, []),
    updatePaymentMethod: useCallback(updatePaymentMethod, []),
    setAllPaymentMethods: useCallback(setAllPaymentMethods, []),
    removeItem: useCallback(removeItem, []),
    clearCart: useCallback(clearCart, []),
  }
}
