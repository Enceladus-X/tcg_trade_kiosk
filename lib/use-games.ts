'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { DbGame } from './database.types'

export interface Game {
  id: string
  name: string
  sortOrder: number
  imageUrl: string | null
}

export const GAMES_KEY = ['games'] as const

function dbToGame(row: DbGame): Game {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    imageUrl: row.image_url ?? null,
  }
}

export function useGames() {
  const queryClient = useQueryClient()

  const { data: games = [] } = useQuery({
    queryKey: GAMES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data as DbGame[]).map(dbToGame)
    },
  })

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: GAMES_KEY }),
    [queryClient]
  )

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      if (games.some(g => g.name === name)) return
      const { error } = await supabase
        .from('games')
        .insert({ name, sort_order: games.length })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: async (gameId: string) => {
      const { error } = await supabase.from('games').delete().eq('id', gameId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const updateImageMutation = useMutation({
    mutationFn: async ({ gameId, imageUrl }: { gameId: string; imageUrl: string }) => {
      const { error } = await supabase
        .from('games')
        .update({ image_url: imageUrl })
        .eq('id', gameId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const assignTabMutation = useMutation({
    mutationFn: async ({ tabName, gameId }: { tabName: string; gameId: string | null }) => {
      const { error } = await supabase
        .from('tabs')
        .update({ game_id: gameId })
        .eq('name', tabName)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tabs'] }),
  })

  return {
    games,
    addGame: useCallback(
      (name: string) => addMutation.mutateAsync(name),
      [addMutation]
    ),
    removeGame: useCallback(
      (gameId: string) => removeMutation.mutate(gameId),
      [removeMutation]
    ),
    updateGameImage: useCallback(
      (gameId: string, imageUrl: string) => updateImageMutation.mutateAsync({ gameId, imageUrl }),
      [updateImageMutation]
    ),
    assignTabToGame: useCallback(
      (tabName: string, gameId: string | null) =>
        assignTabMutation.mutate({ tabName, gameId }),
      [assignTabMutation]
    ),
    isAdding: addMutation.isPending,
  }
}
