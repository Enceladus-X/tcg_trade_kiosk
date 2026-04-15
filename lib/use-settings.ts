'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { DbStoreSettings } from './database.types'

export const SETTINGS_KEY = ['store_settings'] as const

const DEFAULT_SETTINGS: Omit<DbStoreSettings, 'id' | 'updated_at'> = {
  admin_password: '1234',
  mileage_rate: 1.2,
  global_rarities: ['N', 'R', 'SR', 'UR', 'UL', 'SE', 'PSE'],
}

export function useStoreSettings() {
  const queryClient = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
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

  return {
    settings,
    mileageRate: settings?.mileage_rate ?? DEFAULT_SETTINGS.mileage_rate,
    adminPassword: settings?.admin_password ?? DEFAULT_SETTINGS.admin_password,
    globalRarities: settings?.global_rarities ?? DEFAULT_SETTINGS.global_rarities,
    updateSettings: useCallback(
      (patch: Partial<Omit<DbStoreSettings, 'id' | 'updated_at'>>) =>
        updateMutation.mutateAsync(patch),
      [updateMutation]
    ),
    isUpdating: updateMutation.isPending,
  }
}
