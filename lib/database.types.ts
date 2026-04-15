// Supabase DB 행 타입 — 컬럼명은 snake_case, JS 인터페이스는 camelCase
// 이 파일만 수정하면 스키마 변경이 나머지 코드에 자동 전파됨

import type { CardPrice, OrderStatus } from './mock-cards'

export type DbCard = {
  id: string
  name: string
  code: string
  category: string
  image_url: string
  is_stopped: boolean
  prices: CardPrice[]                    // jsonb
  enabled_rarities: Record<string, boolean>  // jsonb
  created_at: string
}

export type DbTab = {
  id: string
  name: string
  sort_order: number
}

export type DbOrder = {
  id: string
  created_at: string
  customer_name: string
  bank_name: string
  account_number: string
  phone_last4: string
  total_price: number
  status: OrderStatus
  order_items?: DbOrderItem[]
}

export type DbOrderItem = {
  id: string
  order_id: string
  card_id: string | null
  card_name: string
  card_code: string
  rarity: string
  price: number
  quantity: number
}
