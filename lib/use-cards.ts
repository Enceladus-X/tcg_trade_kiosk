'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { type CardWithStatus, type CardPrice, mockCards } from './mock-cards'

// --- Cards Store ---
type CardsStore = {
  cards: CardWithStatus[]
  listeners: Set<() => void>
}

const cardsStore: CardsStore = {
  cards: [...mockCards],
  listeners: new Set(),
}

function emitCardsChange() {
  cardsStore.listeners.forEach(l => l())
}

function subscribeCards(listener: () => void) {
  cardsStore.listeners.add(listener)
  return () => cardsStore.listeners.delete(listener)
}

function getCardsSnapshot(): CardWithStatus[] {
  return cardsStore.cards
}

function updateCard(cardId: string, updates: Partial<CardWithStatus>) {
  cardsStore.cards = cardsStore.cards.map(card => {
    if (card.id !== cardId) return card
    const updated = { ...card, ...updates }
    if (updates.enabledRarities) {
      updated.isStopped = Object.values(updates.enabledRarities).every(v => !v)
    }
    return updated
  })
  emitCardsChange()
}

function updateCardImage(cardId: string, imageUrl: string) {
  updateCard(cardId, { imageUrl })
}

function updateCardName(cardId: string, name: string) {
  updateCard(cardId, { name })
}

function toggleRarity(cardId: string, rarity: string, enabled: boolean) {
  const card = cardsStore.cards.find(c => c.id === cardId)
  if (!card) return
  const newEnabledRarities = { ...card.enabledRarities, [rarity]: enabled }
  updateCard(cardId, {
    enabledRarities: newEnabledRarities,
    isStopped: Object.values(newEnabledRarities).every(v => !v),
  })
}

function updateRarityPrice(cardId: string, rarity: string, price: number) {
  const card = cardsStore.cards.find(c => c.id === cardId)
  if (!card) return
  const exists = card.prices.find(p => p.rarity === rarity)
  const newPrices = exists
    ? card.prices.map(p => p.rarity === rarity ? { ...p, price } : p)
    : [...card.prices, { rarity: rarity as CardPrice['rarity'], price }]
  updateCard(cardId, { prices: newPrices })
}

function addCard(card: Omit<CardWithStatus, 'id'>) {
  const newCard: CardWithStatus = { ...card, id: `card-${Date.now()}` }
  cardsStore.cards = [newCard, ...cardsStore.cards]
  emitCardsChange()
}

export function useCards() {
  const cards = useSyncExternalStore(subscribeCards, getCardsSnapshot, getCardsSnapshot)
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

// --- Tabs Store ---
type TabsStore = {
  tabs: string[]
  listeners: Set<() => void>
}

const tabsStore: TabsStore = {
  tabs: ['블레이징 도미니언', '버스트 프로토콜'],
  listeners: new Set(),
}

function emitTabsChange() {
  tabsStore.listeners.forEach(l => l())
}

function subscribeTabs(listener: () => void) {
  tabsStore.listeners.add(listener)
  return () => tabsStore.listeners.delete(listener)
}

function getTabsSnapshot(): string[] {
  return tabsStore.tabs
}

function addTab(name: string) {
  const trimmed = name.trim()
  if (!trimmed || tabsStore.tabs.includes(trimmed)) return
  tabsStore.tabs = [...tabsStore.tabs, trimmed]
  emitTabsChange()
}

function removeTab(name: string) {
  tabsStore.tabs = tabsStore.tabs.filter(t => t !== name)
  emitTabsChange()
}

export function useTabs() {
  const tabs = useSyncExternalStore(subscribeTabs, getTabsSnapshot, getTabsSnapshot)
  return {
    tabs,
    addTab: useCallback(addTab, []),
    removeTab: useCallback(removeTab, []),
  }
}
