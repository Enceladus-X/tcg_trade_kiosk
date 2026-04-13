// Mock card data for the prototype
// In production, this would come from a database

export interface CardPrice {
  rarity: 'N' | 'R' | 'SR' | 'UR' | 'UL' | 'SE' | 'PSR'
  price: number
}

export interface Card {
  id: string
  name: string
  code: string
  category: string // 확장팩/세트 이름
  imageUrl: string
  prices: CardPrice[]
}

// Available categories (expansion sets)
export const cardCategories = [
  '전체',
  '버스트 프로토콜',
  '레전더리 컬렉션',
  '다크 리벨리온',
  '스타라이트 스테이지',
  '크로스 오버',
  '프리미엄 팩',
  '기타',
] as const

export type CardCategory = typeof cardCategories[number]

export interface CartItem {
  cardId: string
  cardName: string
  cardCode: string
  rarity: string
  price: number
  quantity: number
}

// Extended Card with enabled/disabled state for "매입 중지"
export interface CardWithStatus extends Card {
  isStopped: boolean // true if ALL rarities are disabled (매입 중지)
  enabledRarities: Record<string, boolean> // per-rarity toggle
}

// Pending Order for admin dashboard - designed for easy DB mapping
export type OrderStatus = 'pending' | 'approved' | 'paid' | 'rejected'

export interface PendingOrder {
  id: string
  createdAt: string // ISO timestamp
  customerName: string
  bankName: string
  accountNumber: string
  phoneLast4: string
  items: CartItem[]
  totalPrice: number
  status: OrderStatus
}

// Customer checkout form data
export interface CheckoutFormData {
  name: string
  bankName: string
  accountNumber: string
  phoneLast4: string
}

// Rarity color mapping for visual distinction
export const rarityColors: Record<string, { bg: string; text: string; border: string }> = {
  N: { bg: 'bg-zinc-700', text: 'text-zinc-200', border: 'border-zinc-600' },
  R: { bg: 'bg-blue-900', text: 'text-blue-200', border: 'border-blue-700' },
  SR: { bg: 'bg-amber-900', text: 'text-amber-200', border: 'border-amber-700' },
  UR: { bg: 'bg-rose-900', text: 'text-rose-200', border: 'border-rose-700' },
  UL: { bg: 'bg-purple-900', text: 'text-purple-200', border: 'border-purple-700' },
  SE: { bg: 'bg-emerald-900', text: 'text-emerald-200', border: 'border-emerald-700' },
  PSR: { bg: 'bg-sky-900', text: 'text-sky-200', border: 'border-sky-700' },
}

// Generate mock card data
const cardNames = [
  '푸른 눈의 백룡', '어둠의 마술사', '레드 아이즈 블랙 드래곤',
  '엑조디아', '오실리스의 천공룡', '오벨리스크의 거신병',
  '라의 익신룡', '블랙 매지션 걸', '쿠리보', '검은 숲의 마녀',
  '그래비티 바인드', '마법 실린더', '성스러운 방어막', '거울의 힘',
  '사이버 드래곤', '스타더스트 드래곤', '정크 워리어', '싱크론 워리어',
  '네오스', '포션 오브 매드니스', '강제 전이', '심판의 번개',
  '어둠의 계약서', '패왕 흑룡', '팬텀 나이츠', '드래군 오브 레드 아이즈',
  '액세스코드 토커', '보렐로드 드래곤', '크리스탈윙 싱크로 드래곤',
  '엘드리치', '드라이트론 메테오니스', '티어라멘츠 키토칼로스',
  '스프라이트 엘프', '미라제스 오브 나이트메어', '천룡 성배',
  '증식의 G', '무한포영', '재의 벚꽃', '팬텀 포스',
  '성창의 용기사', '플런더 패트롤', '신성 글로리아스 라이트',
]

const generatePrices = (): CardPrice[] => {
  const rarities: CardPrice['rarity'][] = ['N', 'R', 'SR', 'UR', 'UL', 'SE', 'PSR']
  return rarities.map(rarity => ({
    rarity,
    price: Math.floor(Math.random() * 50000) * 100 + 100, // 100 ~ 5,000,000원
  }))
}

// Generate cards with some randomly stopped (매입 중지)
export const mockCards: CardWithStatus[] = Array.from({ length: 200 }, (_, i) => {
  const isStopped = i % 15 === 0 // Every 15th card is stopped
  const enabledRarities: Record<string, boolean> = {}
  const rarities = ['N', 'R', 'SR', 'UR', 'UL', 'SE', 'PSR']
  rarities.forEach(r => {
    enabledRarities[r] = isStopped ? false : Math.random() > 0.2 // 80% chance enabled if not stopped
  })
  
  // Assign random category (excluding '전체')
  const categoryOptions = cardCategories.filter(c => c !== '전체')
  const randomCategory = categoryOptions[i % categoryOptions.length]
  
  return {
    id: `card-${i + 1}`,
    name: cardNames[i % cardNames.length],
    code: `CARD-${String(i + 1).padStart(4, '0')}`,
    category: randomCategory,
    imageUrl: `https://picsum.photos/seed/${i + 1}/80/120`,
    prices: generatePrices(),
    isStopped,
    enabledRarities,
  }
})

// Mock pending orders for admin dashboard
export const mockPendingOrders: PendingOrder[] = [
  {
    id: 'order-001',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    customerName: '김철수',
    bankName: '카카오뱅크',
    accountNumber: '3333-01-1234567',
    phoneLast4: '1234',
    items: [
      { cardId: 'card-1', cardName: '푸른 눈의 백룡', cardCode: 'CARD-0001', rarity: 'UR', price: 150000, quantity: 2 },
      { cardId: 'card-3', cardName: '레드 아이즈 블랙 드래곤', cardCode: 'CARD-0003', rarity: 'SR', price: 50000, quantity: 1 },
    ],
    totalPrice: 350000,
    status: 'pending',
  },
  {
    id: 'order-002',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    customerName: '박영희',
    bankName: '신한은행',
    accountNumber: '110-123-456789',
    phoneLast4: '5678',
    items: [
      { cardId: 'card-5', cardName: '오실리스의 천공룡', cardCode: 'CARD-0005', rarity: 'PSR', price: 500000, quantity: 1 },
    ],
    totalPrice: 500000,
    status: 'pending',
  },
  {
    id: 'order-003',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    customerName: '이민준',
    bankName: '국민은행',
    accountNumber: '123456-12-123456',
    phoneLast4: '9012',
    items: [
      { cardId: 'card-10', cardName: '검은 숲의 마녀', cardCode: 'CARD-0010', rarity: 'R', price: 5000, quantity: 5 },
    ],
    totalPrice: 25000,
    status: 'approved',
  },
]

// Search and filter utilities
export function searchCards(cards: CardWithStatus[], query: string): CardWithStatus[] {
  if (!query.trim()) return cards
  const lowerQuery = query.toLowerCase()
  return cards.filter(
    card =>
      card.name.toLowerCase().includes(lowerQuery) ||
      card.code.toLowerCase().includes(lowerQuery)
  )
}

// Format Korean Won
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(price) + '원'
}
