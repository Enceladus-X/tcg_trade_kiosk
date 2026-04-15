'use client'

import { useEffect } from 'react'
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'

// Realtime 구독은 앱 전체에서 단 한 번만 등록해야 함
// use-cards / use-orders 훅은 여러 컴포넌트에서 호출되므로
// 훅 내부에서 구독하면 같은 채널명으로 중복 subscribe() 오류 발생
function RealtimeSubscriptions() {
  const qc = useQueryClient()

  useEffect(() => {
    const cardsChannel = supabase
      .channel('rt-cards')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, () => {
        qc.invalidateQueries({ queryKey: ['cards'] })
      })
      .subscribe()

    const tabsChannel = supabase
      .channel('rt-tabs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tabs' }, () => {
        qc.invalidateQueries({ queryKey: ['tabs'] })
      })
      .subscribe()

    const ordersChannel = supabase
      .channel('rt-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        qc.invalidateQueries({ queryKey: ['orders'] })
      })
      .subscribe()

    const settingsChannel = supabase
      .channel('rt-store-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, () => {
        qc.invalidateQueries({ queryKey: ['store_settings'] })
      })
      .subscribe()

    const gamesChannel = supabase
      .channel('rt-games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        qc.invalidateQueries({ queryKey: ['games'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(cardsChannel)
      supabase.removeChannel(tabsChannel)
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(settingsChannel)
      supabase.removeChannel(gamesChannel)
    }
  }, [qc])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeSubscriptions />
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
