'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { DbStoreSettings, StoreFeatureFlags } from './database.types'

export const SETTINGS_KEY = ['store_settings'] as const

const DEFAULT_SETTINGS: Omit<DbStoreSettings, 'id' | 'updated_at'> = {
  admin_password: '',
  mileage_rate: 1.2,
  global_rarities: ['N', 'R', 'SR', 'UR', 'UL', 'SE', 'PSE'],
  feature_flags: {
    public_buyback_enabled: true,
    shipping_buyback_enabled: false,
  },
}

const DEFAULT_FEATURE_FLAGS: StoreFeatureFlags = {
  public_buyback_enabled: true,
  shipping_buyback_enabled: false,
}

// 배율 <-> % 변환 유틸
export function rateToPercent(rate: number): number {
  return Math.round((rate - 1) * 100)
}
export function percentToRate(percent: number): number {
  return 1 + percent / 100
}

export function useStoreSettings() {
  const queryClient = useQueryClient()

  const { data: settings, isLoading, isError } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('id,mileage_rate,global_rarities,feature_flags,updated_at')
        .eq('id', 1)
        .single()
      if (error) throw error
      return data as DbStoreSettings
    },
    staleTime: 60_000,
  })

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<Omit<DbStoreSettings, 'id' | 'updated_at'>>) => {
      const { error } = await supabase
        .from('store_settings')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', 1)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  })

  const currentRarities = settings?.global_rarities ?? DEFAULT_SETTINGS.global_rarities
  const featureFlags: StoreFeatureFlags = {
    ...DEFAULT_FEATURE_FLAGS,
    ...(settings?.feature_flags ?? {}),
  }

  const updateSettings = useCallback(
    (patch: Partial<Omit<DbStoreSettings, 'id' | 'updated_at'>>) =>
      updateMutation.mutateAsync(patch),
    [updateMutation]
  )

  const addRarity = useCallback(
    (rarity: string) => {
      const trimmed = rarity.trim().toUpperCase()
      if (!trimmed || currentRarities.includes(trimmed)) return Promise.resolve()
      return updateMutation.mutateAsync({
        global_rarities: [...currentRarities, trimmed],
      })
    },
    [updateMutation, currentRarities]
  )

  const removeRarity = useCallback(
    (rarity: string) => {
      return updateMutation.mutateAsync({
        global_rarities: currentRarities.filter(r => r !== rarity),
      })
    },
    [updateMutation, currentRarities]
  )

  const setMileagePercent = useCallback(
    (percent: number) => {
      return updateMutation.mutateAsync({ mileage_rate: percentToRate(percent) })
    },
    [updateMutation]
  )

  return {
    settings,
    isLoading,
    isError,
    lastUpdatedAt: settings?.updated_at ?? null,
    mileageRate: settings?.mileage_rate ?? DEFAULT_SETTINGS.mileage_rate,
    mileagePercent: rateToPercent(settings?.mileage_rate ?? DEFAULT_SETTINGS.mileage_rate),
    globalRarities: currentRarities,
    featureFlags,
    updateSettings,
    addRarity,
    removeRarity,
    setMileagePercent,
    isUpdating: updateMutation.isPending,
  }
}
