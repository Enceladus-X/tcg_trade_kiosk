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
    i => i.cardId === item.cardId && i.rarity === item.rarity
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

function updateQuantity(cardId: string, rarity: string, quantity: number) {
  if (quantity <= 0) {
    // Remove item if quantity is 0 or less
    cartStore.items = cartStore.items.filter(
      i => !(i.cardId === cardId && i.rarity === rarity)
    )
  } else {
    cartStore.items = cartStore.items.map(i =>
      i.cardId === cardId && i.rarity === rarity ? { ...i, quantity } : i
    )
  }
  emitChange()
}

function removeItem(cardId: string, rarity: string) {
  cartStore.items = cartStore.items.filter(
    i => !(i.cardId === cardId && i.rarity === rarity)
  )
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
    removeItem: useCallback(removeItem, []),
    clearCart: useCallback(clearCart, []),
  }
}
