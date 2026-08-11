// Supabase DB 행 타입 — 컬럼명은 snake_case, JS 인터페이스는 camelCase
// 이 파일만 수정하면 스키마 변경이 나머지 코드에 자동 전파됨

import type { CardPrice, DeclaredCardCondition, OrderStatus, OrderPaymentMethod, PaymentMethod } from './mock-cards'

export type DbCard = {
  id: string
  name: string
  code: string
  category: string
  game_id: string | null
  tab_id: string | null
  image_url: string
  is_stopped: boolean
  prices: CardPrice[]                    // jsonb
  enabled_rarities: Record<string, boolean>  // jsonb
  created_at: string
}

export type DbGame = {
  id: string
  name: string
  sort_order: number
  image_url: string | null
  created_at: string
}

export type DbTab = {
  id: string
  name: string
  sort_order: number
  game_id: string | null
}

export type DbOrder = {
  id: string
  created_at: string
  client_request_id?: string | null
  customer_name: string
  bank_name: string
  account_number: string
  phone_number: string
  total_price: number
  status: OrderStatus
  payment_method: OrderPaymentMethod
  mileage_rate: number | null
  channel?: string | null
  web_quote_code?: string | null
  quote_expires_at?: string | null
  order_items?: DbOrderItem[]
}

export type DbStoreSettings = {
  id: number
  admin_password: string
  mileage_rate: number
  global_rarities: string[]
  feature_flags?: StoreFeatureFlags | null
  updated_at: string
}

export type StoreFeatureFlags = {
  public_buyback_enabled: boolean
  shipping_buyback_enabled: boolean
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
  payment_method?: PaymentMethod | null
  note: string | null
  declared_condition?: DeclaredCardCondition | null
  declared_defects?: string[] | null
}

export type DbOrderItemAdjustment = {
  id: string
  order_id: string
  order_item_id: string
  card_name: string
  rarity: string
  previous_price: number
  next_price: number
  note: string | null
  changed_at: string
}
