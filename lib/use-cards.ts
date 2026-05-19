'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { type CardWithStatus, type CardPrice } from './mock-cards'
import { type DbCard } from './database.types'

function isMissingCardRelationColumnsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string }
  return maybeError.code === '42703'
    && typeof maybeError.message === 'string'
    && (maybeError.message.includes('cards.game_id') || maybeError.message.includes('cards.tab_id'))
}

function canFallbackWithoutCardRelationColumns(card: { gameId?: string | null; tabId?: string | null }): boolean {
  return card.gameId == null || card.tabId != null
}

// --- 타입 변환 ---

function dbToCard(row: DbCard): CardWithStatus {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    category: row.category,
    gameId: row.game_id,
    tabId: row.tab_id,
    imageUrl: row.image_url,
    prices: row.prices,
    isStopped: row.is_stopped,
    enabledRarities: row.enabled_rarities,
  }
}

function cardToDb(card: Partial<CardWithStatus>): Partial<DbCard> {
  const db: Partial<DbCard> = {}
  if (card.name !== undefined)            db.name = card.name
  if (card.code !== undefined)            db.code = card.code
  if (card.category !== undefined)        db.category = card.category
  if (card.gameId !== undefined)          db.game_id = card.gameId
  if (card.tabId !== undefined)           db.tab_id = card.tabId
  if (card.imageUrl !== undefined)        db.image_url = card.imageUrl
  if (card.isStopped !== undefined)       db.is_stopped = card.isStopped
  if (card.prices !== undefined)          db.prices = card.prices
  if (card.enabledRarities !== undefined) db.enabled_rarities = card.enabledRarities
  return db
}

// --- 쿼리 키 ---

const CARDS_KEY = ['cards'] as const
const TABS_KEY  = ['tabs'] as const

// --- useCards ---

export function useCards() {
  const queryClient = useQueryClient()

  const { data: cards = [] } = useQuery({
    queryKey: CARDS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as DbCard[]).map(dbToCard)
    },
  })

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: CARDS_KEY }),
    [queryClient]
  )

  // 단일 필드 업데이트 (이미지, 이름 등 공통 처리)
  const updateMutation = useMutation({
    mutationFn: async ({ cardId, updates }: { cardId: string; updates: Partial<CardWithStatus> }) => {
      let { error } = await supabase
        .from('cards')
        .update(cardToDb(updates))
        .eq('id', cardId)
      if (error && isMissingCardRelationColumnsError(error)) {
        if (!canFallbackWithoutCardRelationColumns(updates)) {
          throw new Error('현재 운영 DB에 cards.game_id / cards.tab_id 컬럼이 없어 탭 없는 게임 배정을 저장할 수 없습니다. Supabase SQL 업데이트가 필요합니다.')
        }
        const { gameId: _gameId, tabId: _tabId, ...fallbackUpdates } = updates
        ;({ error } = await supabase
          .from('cards')
          .update(cardToDb(fallbackUpdates))
          .eq('id', cardId))
      }
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const addMutation = useMutation({
    mutationFn: async (card: Omit<CardWithStatus, 'id'>) => {
      let { error } = await supabase.from('cards').insert({
        name: card.name,
        code: card.code,
        category: card.category,
        game_id: card.gameId ?? null,
        tab_id: card.tabId ?? null,
        image_url: card.imageUrl,
        is_stopped: card.isStopped,
        prices: card.prices,
        enabled_rarities: card.enabledRarities,
      })
      if (error && isMissingCardRelationColumnsError(error)) {
        if (!canFallbackWithoutCardRelationColumns(card)) {
          throw new Error('현재 운영 DB에 cards.game_id / cards.tab_id 컬럼이 없어 탭 없는 게임 배정을 저장할 수 없습니다. Supabase SQL 업데이트가 필요합니다.')
        }
        ;({ error } = await supabase.from('cards').insert({
          name: card.name,
          code: card.code,
          category: card.category,
          image_url: card.imageUrl,
          is_stopped: card.isStopped,
          prices: card.prices,
          enabled_rarities: card.enabledRarities,
        }))
      }
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase.from('cards').delete().eq('id', cardId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  // 캐시에서 현재 카드 상태를 읽어 연산 후 업데이트하는 헬퍼
  function getCard(cardId: string): CardWithStatus | undefined {
    const cached = queryClient.getQueryData<CardWithStatus[]>(CARDS_KEY)
    return cached?.find(c => c.id === cardId)
  }

  const updateCard = useCallback(
    (cardId: string, updates: Partial<CardWithStatus>) =>
      updateMutation.mutate({ cardId, updates }),
    [updateMutation]
  )

  const updateCardAsync = useCallback(
    (cardId: string, updates: Partial<CardWithStatus>) =>
      updateMutation.mutateAsync({ cardId, updates }),
    [updateMutation]
  )

  const updateCardImage = useCallback(
    (cardId: string, imageUrl: string) =>
      updateMutation.mutate({ cardId, updates: { imageUrl } }),
    [updateMutation]
  )

  const updateCardName = useCallback(
    (cardId: string, name: string) =>
      updateMutation.mutate({ cardId, updates: { name } }),
    [updateMutation]
  )

  const toggleRarity = useCallback(
    (cardId: string, rarity: string, enabled: boolean) => {
      const card = getCard(cardId)
      if (!card) return
      const newEnabledRarities = { ...card.enabledRarities, [rarity]: enabled }
      updateMutation.mutate({
        cardId,
        updates: {
          enabledRarities: newEnabledRarities,
          isStopped: Object.values(newEnabledRarities).every(v => !v),
        },
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateMutation]
  )

  const updateRarityPrice = useCallback(
    (cardId: string, rarity: string, price: number) => {
      const card = getCard(cardId)
      if (!card) return
      const exists = card.prices.find(p => p.rarity === rarity)
      const newPrices = exists
        ? card.prices.map(p => p.rarity === rarity ? { ...p, price } : p)
        : [...card.prices, { rarity: rarity as CardPrice['rarity'], price }]
      updateMutation.mutate({ cardId, updates: { prices: newPrices } })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateMutation]
  )

  const setCardStopped = useCallback(
    (cardId: string, stopped: boolean) => {
      const card = getCard(cardId)
      if (!card) return
      if (stopped) {
        const disabledRarities = Object.fromEntries(
          card.prices.map(p => [p.rarity, false])
        )
        updateMutation.mutate({ cardId, updates: { isStopped: true, enabledRarities: disabledRarities } })
      } else {
        const enabledRarities = Object.fromEntries(card.prices.map(p => [p.rarity, true]))
        updateMutation.mutate({ cardId, updates: { isStopped: false, enabledRarities } })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateMutation]
  )

  return {
    cards,
    updateCard,
    updateCardAsync,
    updateCardImage,
    updateCardName,
    toggleRarity,
    updateRarityPrice,
    addCard: useCallback((card: Omit<CardWithStatus, 'id'>) => addMutation.mutate(card), [addMutation]),
    deleteCard: useCallback((cardId: string) => deleteMutation.mutate(cardId), [deleteMutation]),
    setCardStopped,
  }
}

// --- useTabs ---

export function useTabs() {
  const queryClient = useQueryClient()

  const { data: tabObjects = [] } = useQuery({
    queryKey: TABS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tabs')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as import('./database.types').DbTab[]
    },
  })

  const tabs = tabObjects.map(t => t.name)

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: TABS_KEY }),
    [queryClient]
  )

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      if (tabs.includes(name)) return
      const { error } = await supabase
        .from('tabs')
        .insert({ name, sort_order: tabs.length })
      if (error) throw error
    },
    onSuccess: invalidate,
    onError: (e) => console.error('[addTab]', e),
  })

  const removeMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('tabs').delete().eq('name', name)
      if (error) throw error
    },
    onSuccess: invalidate,
    onError: (e) => console.error('[removeTab]', e),
  })

  return {
    tabs,
    tabObjects,
    addTab: useCallback((name: string) => addMutation.mutateAsync(name), [addMutation]),
    removeTab: useCallback((name: string) => removeMutation.mutate(name), [removeMutation]),
    isAddingTab: addMutation.isPending,
    addTabError: addMutation.error,
  }
}
