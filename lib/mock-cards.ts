// Card data - source: 유희왕_매입스프레드_시트.xlsx

export interface CardPrice {
  rarity: 'N' | 'R' | 'SR' | 'UR' | 'UL' | 'SE' | 'PSE'
  price: number
}

export interface Card {
  id: string
  name: string
  code: string
  category: string
  imageUrl: string
  prices: CardPrice[]
}

export const cardCategories = [
  '전체',
  '블레이징 도미니언',
  '버스트 프로토콜',
  '기타',
] as const

export type CardCategory = typeof cardCategories[number]

export interface CartItem {
  itemId?: string
  cardId: string
  cardName: string
  cardCode: string
  rarity: string
  price: number
  quantity: number
}

export interface CardWithStatus extends Card {
  isStopped: boolean
  enabledRarities: Record<string, boolean>
}

export type OrderStatus = 'pending' | 'approved' | 'paid' | 'rejected'

export interface PendingOrder {
  id: string
  createdAt: string
  customerName: string
  bankName: string
  accountNumber: string
  phoneNumber: string
  items: CartItem[]
  totalPrice: number
  status: OrderStatus
  paymentMethod: 'cash' | 'mileage'
  mileageRate: number | null
}

export interface CheckoutFormData {
  name: string
  bankName: string
  accountNumber: string
  phoneNumber: string
  paymentMethod: 'cash' | 'mileage'
}

export const rarityColors: Record<string, { bg: string; text: string; border: string }> = {
  N:   { bg: 'bg-zinc-700',    text: 'text-zinc-200',   border: 'border-zinc-600' },
  R:   { bg: 'bg-blue-900',    text: 'text-blue-200',   border: 'border-blue-700' },
  SR:  { bg: 'bg-amber-900',   text: 'text-amber-200',  border: 'border-amber-700' },
  UR:  { bg: 'bg-rose-900',    text: 'text-rose-200',   border: 'border-rose-700' },
  UL:  { bg: 'bg-purple-900',  text: 'text-purple-200', border: 'border-purple-700' },
  SE:  { bg: 'bg-emerald-900', text: 'text-emerald-200',border: 'border-emerald-700' },
  PSE: { bg: 'bg-sky-900',     text: 'text-sky-200',    border: 'border-sky-700' },
}

// 미등록 레어도에 대한 결정적 색상 할당 (동일 문자열 → 항상 같은 색)
const EXTRA_RARITY_COLORS = [
  { bg: 'bg-pink-900',   text: 'text-pink-200',   border: 'border-pink-700'   },
  { bg: 'bg-teal-900',   text: 'text-teal-200',   border: 'border-teal-700'   },
  { bg: 'bg-orange-900', text: 'text-orange-200',  border: 'border-orange-700' },
  { bg: 'bg-indigo-900', text: 'text-indigo-200',  border: 'border-indigo-700' },
  { bg: 'bg-lime-900',   text: 'text-lime-200',    border: 'border-lime-700'   },
  { bg: 'bg-cyan-900',   text: 'text-cyan-200',    border: 'border-cyan-700'   },
]

function strHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function getRarityColors(rarity: string) {
  return rarityColors[rarity] ?? EXTRA_RARITY_COLORS[strHash(rarity) % EXTRA_RARITY_COLORS.length]
}

function makePrices(raw: Partial<Record<CardPrice['rarity'], number>>): CardPrice[] {
  return (Object.entries(raw) as [CardPrice['rarity'], number][])
    .filter(([, price]) => price > 0)
    .map(([rarity, price]) => ({ rarity, price }))
}

function makeEnabledRarities(prices: CardPrice[]): Record<string, boolean> {
  const all: CardPrice['rarity'][] = ['N', 'R', 'SR', 'UR', 'UL', 'SE', 'PSE']
  const priced = new Set(prices.map(p => p.rarity))
  return Object.fromEntries(all.map(r => [r, priced.has(r)]))
}

function makeCard(
  code: string,
  name: string,
  category: string,
  raw: Partial<Record<CardPrice['rarity'], number>>,
): CardWithStatus {
  const prices = makePrices(raw)
  const isStopped = prices.length === 0
  return {
    id: code,
    name,
    code,
    category,
    imageUrl: `/cards/${code}.png`,
    prices,
    isStopped,
    enabledRarities: makeEnabledRarities(prices),
  }
}

// 블레이징 도미니언 (BLZD) - 유희왕_매입스프레드_시트.xlsx 기준
// 컬럼 매핑: C=N, D=R, E=SR, F=UR, G=UL, H=SE, I=PSE
export const mockCards: CardWithStatus[] = [
  makeCard('BLZD-KR002', '파워 바이스드래곤',            '블레이징 도미니언', { SR: 700,   SE: 2500              }),
  makeCard('BLZD-KR014', '엘펜노츠 레기나',              '블레이징 도미니언', { SR: 500,   SE: 2500,  PSE: 30000 }),
  makeCard('BLZD-KR016', '페어리테일－매치리르',          '블레이징 도미니언', {            SE: 1000,  PSE: 10000 }),
  makeCard('BLZD-KR018', '헤카톤케일 마키브엘',           '블레이징 도미니언', {            SE: 1000              }),
  makeCard('BLZD-KR020', '에니아크래프트－AtilE.SPIA',   '블레이징 도미니언', {            SE: 800               }),
  makeCard('BLZD-KR021', '킬러튠 로터리',                '블레이징 도미니언', { SR: 500,   SE: 4000,  PSE: 25000 }),
  makeCard('BLZD-KR024', '피드라울리스＝하르모니아',      '블레이징 도미니언', { UL: 30000, SE: 40000, PSE: 80000 }),
  makeCard('BLZD-KR027', '혈수용희 드라세레아',           '블레이징 도미니언', {            SE: 1500,  PSE: 10000 }),
  makeCard('BLZD-KR010', '혼절감옥신 비도리움',           '블레이징 도미니언', { UR: 1500,             PSE: 12000 }),
  makeCard('BLZD-KR015', '크라운클랜 플레어',             '블레이징 도미니언', {            SE: 400,   PSE: 4500  }),
  makeCard('BLZD-KR015B','크라운클랜 화이트페이스',        '블레이징 도미니언', {                                  }),
  makeCard('BLZD-KR030', '레지나 데몬',                   '블레이징 도미니언', {            SE: 500               }),
  makeCard('BLZD-KR033', '페어리테일을 엮는 자',          '블레이징 도미니언', {            SE: 1800              }),
  makeCard('BLZD-KR034', '페어리테일을 이야기하는 자',    '블레이징 도미니언', {            SE: 1000,  PSE: 7000  }),
  makeCard('BLZD-KR036', '더 크림즌 킹',                  '블레이징 도미니언', { UR: 500,   SE: 2000,  PSE: 15000 }),
  makeCard('BLZD-KR038', '스카레드 하이퍼노바 드래곤',    '블레이징 도미니언', { UL: 700,   SE: 1500,  PSE: 10000 }),
  makeCard('BLZD-KR042', '킬러튠 B2B',                    '블레이징 도미니언', { UR: 800,   SE: 4000,  PSE: 25000 }),
  makeCard('BLZD-KR043', '초노급포탑열차 구스타프 로켓', '블레이징 도미니언', { UR: 500,              PSE: 6000  }),
  makeCard('BLZD-KR047', '페어리테일－위캣',              '블레이징 도미니언', {            SE: 2000              }),
  makeCard('BLZD-KR048', '헤루비담 이리스필',             '블레이징 도미니언', {            SE: 1000              }),
  makeCard('BLZD-KR050', '사화요란의 령사',               '블레이징 도미니언', { UL: 4000,  SE: 7000,  PSE: 4000  }),
  makeCard('BLZD-KR069', '초일융합',                      '블레이징 도미니언', { UR: 1000,             PSE: 9000  }),
  makeCard('BLZD-KR077', '도미나스 스파크',               '블레이징 도미니언', { UL: 16000, SE: 22000, PSE: 80000 }),
  makeCard('BLZD-KR079', '신의밀고',                      '블레이징 도미니언', { SR: 3500,  SE: 18000             }),
]

export const mockPendingOrders: PendingOrder[] = []

export function searchCards(cards: CardWithStatus[], query: string): CardWithStatus[] {
  if (!query.trim()) return cards
  const lowerQuery = query.toLowerCase()
  return cards.filter(
    card =>
      card.name.toLowerCase().includes(lowerQuery) ||
      card.code.toLowerCase().includes(lowerQuery)
  )
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(price) + '원'
}
