import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,    // 30초: Realtime이 커버하므로 폴링 불필요
      gcTime: 1000 * 60 * 5,  // 5분 캐시 유지
      retry: 2,
    },
  },
})
