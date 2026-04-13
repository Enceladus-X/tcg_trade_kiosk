'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { type CardWithStatus, type CardPrice, mockCards } from './mock-cards'

// External store for cards - allows admin to edit cards
type CardsStore = {
  cards: CardWithStatus[]
  listeners: Set<() => void>
}

const cardsStore: CardsStore = {
  cards: [...mockCards],
  listeners: new Set(),
}

function emitChange() {
  cardsStore.listeners.forEach(listener => listener())
}

function subscribe(listener: () => void) {
  cardsStore.listeners.add(listener)
  return () => cardsStore.listeners.delete(listener)
}

function getSnapshot(): CardWithStatus[] {
  return cardsStore.cards
}

// Update a card's properties
function updateCard(cardId: string, updates: Partial<CardWithStatus>) {
  cardsStore.cards = cardsStore.cards.map(card => {
    if (card.id !== cardId) return card
    
    const updated = { ...card, ...updates }
    
    // Auto-calculate isStopped based on enabled rarities
    if (updates.enabledRarities) {
      const allDisabled = Object.values(updates.enabledRarities).every(v => !v)
      updated.isStopped = allDisabled
    }
    
    return updated
  })
  emitChange()
}

// Update card image
function updateCardImage(cardId: string, imageUrl: string) {
  updateCard(cardId, { imageUrl })
}

// Update card name
function updateCardName(cardId: string, name: string) {
  updateCard(cardId, { name })
}

// Toggle rarity enabled/disabled
function toggleRarity(cardId: string, rarity: string, enabled: boolean) {
  const card = cardsStore.cards.find(c => c.id === cardId)
  if (!card) return
  
  const newEnabledRarities = { ...card.enabledRarities, [rarity]: enabled }
  const allDisabled = Object.values(newEnabledRarities).every(v => !v)
  
  updateCard(cardId, { 
    enabledRarities: newEnabledRarities,
    isStopped: allDisabled 
  })
}

// Update rarity price
function updateRarityPrice(cardId: string, rarity: string, price: number) {
  const card = cardsStore.cards.find(c => c.id === cardId)
  if (!card) return
  
  const newPrices = card.prices.map(p =>
    p.rarity === rarity ? { ...p, price } : p
  )
  
  updateCard(cardId, { prices: newPrices })
}

// Add a new card
function addCard(card: Omit<CardWithStatus, 'id'>) {
  const newCard: CardWithStatus = {
    ...card,
    id: `card-${Date.now()}`,
  }
  cardsStore.cards = [newCard, ...cardsStore.cards]
  emitChange()
}

// Hook to use cards state
export function useCards() {
  const cards = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return {
    cards,
    updateCard: useCallback(updateCard, []),
    updateCardImage: useCallback(updateCardImage, []),
    updateCardName: useCallback(updateCardName, []),
    toggleRarity: useCallback(toggleRarity, []),
    updateRarityPrice: useCallback(updateRarityPrice, []),
    addCard: useCallback(addCard, []),
  }
}
