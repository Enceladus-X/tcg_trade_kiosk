const fallbackGames = {
  yugioh: {
    label: '유희왕',
    sets: ['전체', '블레이징 도미니언', '버스트 프로토콜'],
    rarities: ['전체', 'N', 'R', 'SR', 'UR', 'UL', 'SE', 'PSE'],
  },
  onepiece: {
    label: '원피스',
    sets: ['전체', 'OP-11', 'EB-02', '프로모'],
    rarities: ['전체', 'L', 'SR', 'SEC', 'SP', 'P', '★SR'],
  },
  digimon: {
    label: '디지몬',
    sets: ['전체', 'BT-20', 'EX-08'],
    rarities: ['전체', 'R', 'SR', 'SEC', 'P'],
  },
  rush: {
    label: '러시듀얼',
    sets: ['전체', '각성의 버스트', '오버러시 팩'],
    rarities: ['전체', 'R', 'SR', 'UR', 'ORR'],
  },
}

const fallbackCards = [
  {
    id: 'y1',
    game: 'yugioh',
    set: '블레이징 도미니언',
    name: '푸른 눈의 백룡',
    code: 'BLZD-KR001',
    color: 'linear-gradient(145deg, #2b5cff, #61e3ff 48%, #f7f1ff)',
    prices: { UR: 16000, PSE: 70000, UL: 4000 },
  },
  {
    id: 'y2',
    game: 'yugioh',
    set: '블레이징 도미니언',
    name: '신의밀고',
    code: 'BLZD-KR079',
    color: 'linear-gradient(145deg, #6d2ee8, #ff68b6 52%, #33204e)',
    prices: { SR: 3500, SE: 18000 },
  },
  {
    id: 'y3',
    game: 'yugioh',
    set: '버스트 프로토콜',
    name: '스카레드 하이퍼노바 드래곤',
    code: 'BLZD-KR038',
    color: 'linear-gradient(145deg, #5023a8, #e94b6a 50%, #07060a)',
    prices: { UL: 700, SE: 1500, PSE: 10000 },
  },
  {
    id: 'y4',
    game: 'yugioh',
    set: '버스트 프로토콜',
    name: '혼절감옥신 비도리움',
    code: 'BLZD-KR014',
    color: 'linear-gradient(145deg, #ff7a45, #5f2eea 50%, #151515)',
    prices: { UR: 1500, PSE: 12000 },
  },
  {
    id: 'o1',
    game: 'onepiece',
    set: 'OP-11',
    name: '몽키 D. 루피',
    code: 'OP11-001',
    color: 'linear-gradient(145deg, #ff554a, #ffd166 48%, #2a1b1b)',
    prices: { L: 9000, '★SR': 24000, P: 48000 },
  },
  {
    id: 'o2',
    game: 'onepiece',
    set: 'OP-11',
    name: '나미',
    code: 'OP11-032',
    color: 'linear-gradient(145deg, #ff8bbd, #69d2ff 50%, #fff1b8)',
    prices: { SR: 8500, SP: 36000 },
  },
  {
    id: 'o3',
    game: 'onepiece',
    set: 'EB-02',
    name: '포트거스 D. 에이스',
    code: 'EB02-005',
    color: 'linear-gradient(145deg, #111, #ff8133 46%, #ffdc73)',
    prices: { SEC: 32000, P: 62000 },
  },
  {
    id: 'd1',
    game: 'digimon',
    set: 'BT-20',
    name: '워그레이몬',
    code: 'BT20-021',
    color: 'linear-gradient(145deg, #f97316, #ffdf70 50%, #1d4ed8)',
    prices: { SR: 7200, SEC: 22000 },
  },
  {
    id: 'r1',
    game: 'rush',
    set: '각성의 버스트',
    name: '세븐즈로드 매지션',
    code: 'RD-B001',
    color: 'linear-gradient(145deg, #7c3aed, #f9a8d4 48%, #111827)',
    prices: { UR: 5500, ORR: 30000 },
  },
]

const DEFAULT_RUNTIME_CONFIG = {
  dataSource: 'snapshot',
  supabaseUrl: '',
  supabaseAnonKey: '',
  submitOrders: false,
  mileageRate: 1.1,
}

let runtimeConfig = { ...DEFAULT_RUNTIME_CONFIG }
let liveData = window.KIOSK_DATA ?? null
let dataModel = buildDataModel(liveData)
let games = dataModel.games
let cards = dataModel.cards
let initialGame = dataModel.initialGame

const state = {
  game: initialGame,
  set: '전체',
  rarity: '전체',
  search: '',
  selectedCard: null,
  selectedRarity: null,
  quantity: 1,
  cart: [],
  payout: 'cash',
  displayLimit: 24,
  sort: 'recent',
}

const money = new Intl.NumberFormat('ko-KR')
const $ = (selector) => document.querySelector(selector)
const $$ = (selector) => [...document.querySelectorAll(selector)]
const SAFE_IMAGE_PROTOCOLS = new Set(['http:', 'https:'])
const DEFAULT_CARD_BG = 'linear-gradient(145deg, #e8edf5, #cbd5e1)'
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

let activeOverlay = null
let previousFocus = null
let scrollRenderScheduled = false

function formatPrice(value) {
  return `${money.format(value)}원`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function safeUrl(value) {
  try {
    const url = new URL(String(value ?? ''), window.location.href)
    return SAFE_IMAGE_PROTOCOLS.has(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function cssString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\n\r\f]/g, '')
}

function cssUrl(url) {
  const safe = safeUrl(url)
  return safe ? `url("${cssString(safe)}")` : ''
}

function safeCssColor(value) {
  const color = String(value ?? '').trim()
  const isGradient = /^(linear-gradient|radial-gradient)\([^;"{}<>]*\)$/i.test(color)
  const isHex = /^#[0-9a-f]{3,8}$/i.test(color)
  return isGradient || isHex ? color : DEFAULT_CARD_BG
}

function debounce(callback, delay = 120) {
  let timer = 0
  return (...args) => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => callback(...args), delay)
  }
}

function normalizePrices(prices, enabledRarities = {}) {
  if (Array.isArray(prices)) {
    return prices.reduce((acc, item) => {
      const rarity = String(item?.rarity ?? '').trim()
      const price = Number(item?.price ?? 0)
      const enabled = enabledRarities?.[rarity] !== false
      if (rarity && Number.isFinite(price) && price > 0 && enabled) acc[rarity] = price
      return acc
    }, {})
  }

  if (prices && typeof prices === 'object') {
    return Object.entries(prices).reduce((acc, [rarity, price]) => {
      const normalizedRarity = String(rarity).trim()
      const normalizedPrice = Number(price)
      const enabled = enabledRarities?.[normalizedRarity] !== false
      if (normalizedRarity && Number.isFinite(normalizedPrice) && normalizedPrice > 0 && enabled) {
        acc[normalizedRarity] = normalizedPrice
      }
      return acc
    }, {})
  }

  return {}
}

function buildDataModel(sourceData) {
  if (!sourceData?.games?.length || !sourceData?.cards?.length) {
    return {
      games: fallbackGames,
      cards: fallbackCards,
      initialGame: Object.keys(fallbackGames)[0],
    }
  }

  const sourceTabs = sourceData.tabs ?? []
  const sourceCards = sourceData.cards
    .map((card, index) => ({
      ...card,
      game: card.game ?? card.gameId ?? card.game_id,
      tabId: card.tabId ?? card.tab_id ?? null,
      set: card.set || card.category || '기본',
      imageUrl: card.imageUrl ?? card.image_url ?? '',
      prices: normalizePrices(card.prices, card.enabledRarities ?? card.enabled_rarities),
      color: card.color || fallbackCards[index % fallbackCards.length].color,
    }))
    .filter((card) => card.game && Object.keys(card.prices).length > 0)

  const sourceGames = Object.fromEntries(sourceData.games.map((game) => {
    const gameId = game.id
    const gameTabs = sourceTabs
      .filter((tab) => (tab.gameId ?? tab.game_id) === gameId)
      .sort((a, b) => Number(a.sortOrder ?? a.sort_order ?? 0) - Number(b.sortOrder ?? b.sort_order ?? 0))
      .map((tab) => tab.name)
    const gameCards = sourceCards.filter((card) => card.game === gameId)
    const raritySet = new Set(gameCards.flatMap((card) => Object.keys(card.prices)))
    const rarityOrder = sourceData.rarityOrder ?? sourceData.rarity_order ?? []
    const orderedRarities = rarityOrder
      .filter((rarity) => raritySet.has(rarity))
      .concat([...raritySet].filter((rarity) => !rarityOrder.includes(rarity)).sort((a, b) => a.localeCompare(b, 'ko')))

    return [gameId, {
      label: game.name,
      imageUrl: game.imageUrl ?? game.image_url ?? '',
      sets: ['전체', ...gameTabs],
      rarities: ['전체', ...orderedRarities],
    }]
  }))

  const nextInitialGame = Object.keys(sourceGames).find((gameId) => sourceCards.some((card) => card.game === gameId)) ?? Object.keys(sourceGames)[0]
  return { games: sourceGames, cards: sourceCards, initialGame: nextInitialGame }
}

function applyDataSource(sourceData) {
  liveData = sourceData
  dataModel = buildDataModel(sourceData)
  games = dataModel.games
  cards = dataModel.cards
  initialGame = dataModel.initialGame

  if (!games[state.game] || !cards.some((card) => card.game === state.game)) {
    state.game = initialGame
  }
  if (!games[state.game]?.sets.includes(state.set)) state.set = '전체'
  if (!games[state.game]?.rarities.includes(state.rarity)) state.rarity = '전체'
  state.displayLimit = 24
}

function hasSupabaseConfig() {
  return Boolean(runtimeConfig.supabaseUrl && runtimeConfig.supabaseAnonKey)
}

function getSupabaseBaseUrl() {
  return String(runtimeConfig.supabaseUrl).replace(/\/+$/, '')
}

async function loadRuntimeConfig() {
  try {
    const response = await fetch('./runtime-config.json', { cache: 'no-store' })
    if (!response.ok) return { ...DEFAULT_RUNTIME_CONFIG }
    const config = await response.json()
    return { ...DEFAULT_RUNTIME_CONFIG, ...config }
  } catch {
    return { ...DEFAULT_RUNTIME_CONFIG }
  }
}

async function supabaseRequest(path, options = {}) {
  if (!hasSupabaseConfig()) throw new Error('Supabase runtime config is missing.')

  const response = await fetch(`${getSupabaseBaseUrl()}${path}`, {
    ...options,
    headers: {
      apikey: runtimeConfig.supabaseAnonKey,
      Authorization: `Bearer ${runtimeConfig.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(detail || `Supabase request failed: ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}

async function fetchSupabaseData() {
  const [remoteGames, remoteTabs, remoteCards, settingsRows] = await Promise.all([
    supabaseRequest('/rest/v1/web_games?select=id,name,image_url,sort_order&order=sort_order.asc'),
    supabaseRequest('/rest/v1/web_tabs?select=id,game_id,name,sort_order&order=sort_order.asc'),
    supabaseRequest('/rest/v1/web_cards?select=id,game_id,tab_id,category,name,code,image_url,prices&order=category.asc,name.asc'),
    supabaseRequest('/rest/v1/web_public_settings?select=mileage_rate,global_rarities&limit=1'),
  ])

  const settings = Array.isArray(settingsRows) ? settingsRows[0] : null
  if (settings?.mileage_rate) runtimeConfig.mileageRate = Number(settings.mileage_rate)

  return {
    generatedAt: new Date().toISOString(),
    games: remoteGames.map((game) => ({
      id: game.id,
      name: game.name,
      imageUrl: game.image_url,
      sortOrder: game.sort_order,
    })),
    tabs: remoteTabs.map((tab) => ({
      id: tab.id,
      gameId: tab.game_id,
      name: tab.name,
      sortOrder: tab.sort_order,
    })),
    cards: remoteCards.map((card) => ({
      id: card.id,
      game: card.game_id,
      tabId: card.tab_id,
      set: card.category,
      name: card.name,
      code: card.code,
      imageUrl: card.image_url,
      prices: card.prices,
    })),
    rarityOrder: settings?.global_rarities ?? [],
  }
}

async function initializeRuntime() {
  runtimeConfig = await loadRuntimeConfig()

  if (runtimeConfig.dataSource !== 'supabase' || !hasSupabaseConfig()) {
    setDataStatus('스냅샷 데이터', 'snapshot')
    return
  }

  setDataStatus('실시간 동기화 중', 'loading')

  try {
    const remoteData = await fetchSupabaseData()
    applyDataSource(remoteData)
    renderAll()
    setDataStatus('실시간 데이터', 'live')
  } catch (error) {
    console.error('[initializeRuntime]', error)
    setDataStatus('스냅샷으로 표시', 'error')
    showToast('실시간 데이터 연결 실패: 스냅샷으로 표시합니다.')
  }
}

function getCardMinPrice(card) {
  return Math.min(...Object.values(card.prices))
}

function hashString(value) {
  return [...String(value)].reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)
}

function getRarityTheme(rarity) {
  const normalized = String(rarity).trim().toUpperCase()
  const presets = {
    N: ['linear-gradient(135deg, #fff7cc, #ffe66d)', '#9a5b00', '#ffd43b'],
    R: ['linear-gradient(135deg, #dff6ff, #7dd3fc)', '#0369a1', '#38bdf8'],
    SR: ['linear-gradient(135deg, #f6d7ff, #c084fc)', '#7e22ce', '#d946ef'],
    UR: ['linear-gradient(135deg, #ffd0e6, #fb7185)', '#be123c', '#f43f5e'],
    UL: ['linear-gradient(135deg, #ddd6fe, #8b5cf6)', '#5b21b6', '#a78bfa'],
    SE: ['linear-gradient(135deg, #b8fff0, #2dd4bf)', '#0f766e', '#14b8a6'],
    PSE: ['linear-gradient(135deg, #bae6fd, #38bdf8)', '#075985', '#0ea5e9'],
    SP: ['linear-gradient(135deg, #cffafe, #22d3ee)', '#0e7490', '#06b6d4'],
    L: ['linear-gradient(135deg, #fecaca, #ef4444)', '#991b1b', '#f87171'],
    SEC: ['linear-gradient(135deg, #fef08a, #f59e0b)', '#92400e', '#fbbf24'],
    P: ['linear-gradient(135deg, #fdf2ff, #dffbff 28%, #fff7d1 54%, #e8ddff 78%, #ffffff)', '#4338ca', '#a78bfa'],
    GRM: ['linear-gradient(135deg, #fff7c2, #d4a421 48%, #1f1606)', '#5f3b00', '#f5c542'],
  }

  if (normalized.includes('★') || normalized === 'OFPSE') {
    return ['linear-gradient(135deg, #fdf2ff, #dffbff 28%, #fff7d1 54%, #e8ddff 78%, #ffffff)', '#4338ca', '#a78bfa']
  }

  if (presets[normalized]) return presets[normalized]

  const palette = [
    ['linear-gradient(135deg, #ecfeff, #67e8f9)', '#0e7490', '#67e8f9'],
    ['linear-gradient(135deg, #fef9c3, #fde047)', '#a16207', '#fde047'],
    ['linear-gradient(135deg, #dcfce7, #86efac)', '#15803d', '#86efac'],
    ['linear-gradient(135deg, #ffedd5, #fdba74)', '#c2410c', '#fdba74'],
    ['linear-gradient(135deg, #e0e7ff, #a5b4fc)', '#3730a3', '#a5b4fc'],
  ]
  return palette[Math.abs(hashString(normalized)) % palette.length]
}

function rarityStyle(rarity) {
  const [bg, text, border] = getRarityTheme(rarity)
  return `--rarity-bg: ${bg}; --rarity-text: ${text}; --rarity-border: ${border};`
}

function cardStyle(card) {
  const image = cssUrl(card.imageUrl)
  const imageLayer = image ? `--card-image: ${image};` : ''
  return `${imageLayer} --card-bg: ${safeCssColor(card.color)}`
}

function getCardSetLabel(card) {
  const tab = liveData?.tabs?.find((item) => item.id === card.tabId)
  return tab?.name ?? card.set
}

function getFilteredCards() {
  const filtered = cards.filter((card) => {
    if (card.game !== state.game) return false
    if (state.set !== '전체' && getCardSetLabel(card) !== state.set && card.set !== state.set) return false
    if (state.rarity !== '전체' && !card.prices[state.rarity]) return false
    if (!state.search.trim()) return true
    const query = state.search.trim().toLowerCase()
    return `${card.name} ${card.code} ${getCardSetLabel(card)}`.toLowerCase().includes(query)
  })

  return filtered.sort((a, b) => {
    if (state.sort === 'price-desc') return getCardMinPrice(b) - getCardMinPrice(a)
    if (state.sort === 'price-asc') return getCardMinPrice(a) - getCardMinPrice(b)
    if (state.sort === 'name') return a.name.localeCompare(b.name, 'ko')
    return 0
  })
}

function renderGameControls() {
  $('#gameStrip').innerHTML = Object.entries(games).map(([gameId, game]) => `
    <button class="game-logo ${gameId === state.game ? 'active' : ''}" type="button" data-game="${escapeHtml(gameId)}">
      ${safeUrl(game.imageUrl)
        ? `<img src="${escapeHtml(safeUrl(game.imageUrl))}" alt="${escapeHtml(game.label)}" loading="lazy" />`
        : `<span>${escapeHtml(game.label)}</span>`
      }
    </button>
  `).join('')

  $$('.game-logo').forEach((button) => {
    button.classList.toggle('active', button.dataset.game === state.game)
  })

  const game = games[state.game]
  $('#setSelect').innerHTML = game.sets.map((set) => `<option value="${escapeHtml(set)}">${escapeHtml(set)}</option>`).join('')
  $('#setSelect').value = state.set

  $('#rarityChips').innerHTML = game.rarities
    .map((rarity) => `<button type="button" class="${rarity === state.rarity ? 'active' : ''}" data-rarity="${escapeHtml(rarity)}" style="${escapeHtml(rarityStyle(rarity))}">${escapeHtml(rarity)}</button>`)
    .join('')
}

function renderSortControls() {
  $$('#sortButtons button').forEach((button) => {
    button.classList.toggle('active', button.dataset.sort === state.sort)
  })
  $('#sortSelect').value = state.sort
}

function renderCards() {
  const filtered = getFilteredCards()
  const visible = filtered.slice(0, state.displayLimit)
  $('#resultCount').textContent = `${filtered.length}장`
  renderSortControls()

  $('#cardGrid').innerHTML = visible.map((card) => `
    <button class="card-tile" type="button" data-card-id="${escapeHtml(card.id)}" style="${escapeHtml(cardStyle(card))}">
      <div class="card-image-frame">
        ${safeUrl(card.imageUrl)
          ? `<img src="${escapeHtml(safeUrl(card.imageUrl))}" alt="${escapeHtml(card.name)}" loading="lazy" />`
          : '<div class="card-image-fallback"></div>'
        }
      </div>
      <div class="card-info">
        <div>
          <strong>${escapeHtml(card.name)}</strong>
          <span class="card-code">${escapeHtml(card.code)}</span>
          <span class="card-set">${escapeHtml(getCardSetLabel(card))}</span>
        </div>
        <div class="price-ladder">
          ${Object.entries(card.prices).map(([rarity, price]) => `
            <span class="rarity-price" style="${escapeHtml(rarityStyle(rarity))}">
              <b>${escapeHtml(rarity)}</b>
              <em>${formatPrice(price)}</em>
            </span>
          `).join('')}
        </div>
      </div>
    </button>
  `).join('') || '<div class="empty-cart">조건에 맞는 카드가 없습니다.</div>'
}

function getCartTotal() {
  const base = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return state.payout === 'mileage' ? Math.round(base * getMileageRate()) : base
}

function getMileageRate() {
  const configuredRate = Number(runtimeConfig.mileageRate)
  return Number.isFinite(configuredRate) && configuredRate > 0 ? configuredRate : 1.1
}

function getCheckoutFieldValues() {
  return {
    name: $('#customerName')?.value.trim() ?? '',
    phone: $('#customerPhone')?.value.trim() ?? '',
    bank: $('#bankName')?.value.trim() ?? '',
    account: $('#accountNumber')?.value.trim() ?? '',
  }
}

function setCheckoutError(message, focusSelector) {
  const error = $('#checkoutError')
  if (!error) return

  error.textContent = message
  error.hidden = !message
  if (message && focusSelector) $(focusSelector)?.focus()
}

function validateCheckoutForm() {
  const fields = getCheckoutFieldValues()
  const phonePattern = /^[0-9\-\s]{9,14}$/
  const accountPattern = /^[0-9\-\s]{6,24}$/

  if (!fields.name) return ['이름을 입력해 주세요.', '#customerName']
  if (!phonePattern.test(fields.phone)) return ['연락처를 숫자와 하이픈으로 입력해 주세요.', '#customerPhone']
  if (state.payout === 'cash' && !fields.bank) return ['은행명을 입력해 주세요.', '#bankName']
  if (state.payout === 'cash' && !accountPattern.test(fields.account)) return ['계좌번호를 숫자와 하이픈으로 입력해 주세요.', '#accountNumber']
  return ['', '']
}

function createReceiptId() {
  const now = new Date()
  const stamp = [
    now.getFullYear().toString().slice(2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')
  return `MW-${stamp}`
}

function resetCheckoutForm() {
  $$('.form-grid input').forEach((input) => {
    input.value = ''
  })
  setCheckoutError('')
}

async function submitCheckoutOrder() {
  if (!runtimeConfig.submitOrders || !hasSupabaseConfig()) {
    const localId = createReceiptId()
    return { id: localId, quoteCode: localId, remote: false }
  }

  const fields = getCheckoutFieldValues()
  const payload = {
    customer_name: fields.name,
    phone_number: fields.phone,
    bank_name: state.payout === 'cash' ? fields.bank : '',
    account_number: state.payout === 'cash' ? fields.account : '',
    payout_method: state.payout,
    items: state.cart.map((item) => ({
      card_id: item.id,
      rarity: item.rarity,
      quantity: item.quantity,
      payment_method: state.payout,
    })),
  }

  const result = await supabaseRequest('/rest/v1/rpc/submit_web_buyback_order', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  const receipt = Array.isArray(result) ? result[0] : result

  return {
    id: receipt?.quote_code ?? receipt?.order_id ?? receipt?.id ?? createReceiptId(),
    orderId: receipt?.order_id ?? null,
    quoteCode: receipt?.quote_code ?? receipt?.id ?? null,
    status: receipt?.status ?? 'pending',
    remote: true,
  }
}

function setQuoteLookupResult(message, status = 'info') {
  const result = $('#quoteLookupResult')
  if (!result) return
  result.textContent = message
  result.dataset.status = status
  result.classList.toggle('show', Boolean(message))
}

async function lookupQuoteStatus() {
  const code = $('#quoteCodeInput')?.value.trim().toUpperCase() ?? ''
  const phoneLast4 = ($('#quotePhoneInput')?.value ?? '').replace(/\D/g, '')

  if (!code) {
    setQuoteLookupResult('접수번호를 입력해 주세요.', 'error')
    $('#quoteCodeInput')?.focus()
    return
  }

  if (phoneLast4.length !== 4) {
    setQuoteLookupResult('연락처 끝 4자리를 입력해 주세요.', 'error')
    $('#quotePhoneInput')?.focus()
    return
  }

  if (!hasSupabaseConfig()) {
    setQuoteLookupResult('실시간 조회는 Supabase 테스트 연결 후 사용할 수 있습니다.', 'error')
    return
  }

  setQuoteLookupResult('접수 상태를 확인하는 중입니다.')

  try {
    const rows = await supabaseRequest('/rest/v1/rpc/lookup_web_quote', {
      method: 'POST',
      body: JSON.stringify({
        input_quote_code: code,
        input_phone_last4: phoneLast4,
      }),
    })
    const quote = Array.isArray(rows) ? rows[0] : rows

    if (!quote) {
      setQuoteLookupResult('일치하는 사전 견적 접수를 찾지 못했습니다.', 'error')
      return
    }

    const statusLabel = {
      pending: '접수 대기',
      approved: '승인 완료',
      paid: '지급 완료',
      rejected: '거절 처리',
    }[quote.status] ?? quote.status
    const itemCount = Number(quote.item_count ?? 0)
    setQuoteLookupResult(
      `${quote.quote_code} · ${statusLabel} · ${itemCount}장 · 예상 ${formatPrice(Number(quote.total_price ?? 0))}`,
      'success'
    )
  } catch (error) {
    console.error('[lookupQuoteStatus]', error)
    setQuoteLookupResult('상태 조회에 실패했습니다. 접수번호를 확인하거나 잠시 후 다시 시도해 주세요.', 'error')
  }
}

function renderCart() {
  const totalQuantity = state.cart.reduce((sum, item) => sum + item.quantity, 0)
  $('#mobileCartButton').classList.toggle('has-items', state.cart.length > 0)
  $('#cartCount').textContent = `${state.cart.length}종 / ${totalQuantity}장`
  $('#cartTotal').textContent = formatPrice(getCartTotal())
  $('#mobileCartTotal').textContent = formatPrice(getCartTotal())
  $('#checkoutTotal').textContent = formatPrice(getCartTotal())
  $('#openCheckout').disabled = state.cart.length === 0

  $$('#globalPayout button').forEach((button) => {
    button.classList.toggle('active', button.dataset.method === state.payout)
  })

  if (state.cart.length === 0) {
    $('#cartItems').innerHTML = `
      <div class="empty-cart cart-empty-state">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 6.5 8.3 3h7.4L17 6.5h3v2h-1.1l-1.2 10.2a2 2 0 0 1-2 1.8H8.3a2 2 0 0 1-2-1.8L5.1 8.5H4v-2h3Zm3.4-1.5-.6 1.5h4.4L13.6 5h-3.2Zm-3.2 3.5 1.1 9.9h7.4l1.1-9.9H7.2Zm3.1 2.1v5.9h-1.8v-5.9h1.8Zm5.2 0v5.9h-1.8v-5.9h1.8Z" />
        </svg>
        <strong>견적 목록이 비어있습니다</strong>
        <span>카드를 선택하면 사전 견적에 담깁니다.</span>
      </div>
    `
    return
  }

  $('#cartItems').innerHTML = state.cart.map((item, index) => `
    <div class="cart-item">
      <div class="cart-thumb" style="${escapeHtml(cardStyle(item))}">
        ${safeUrl(item.imageUrl) ? `<img src="${escapeHtml(safeUrl(item.imageUrl))}" alt="" loading="lazy" />` : ''}
      </div>
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span><i class="cart-rarity" style="${escapeHtml(rarityStyle(item.rarity))}">${escapeHtml(item.rarity)}</i> x${item.quantity} · ${formatPrice(item.price)}</span>
      </div>
      <div>
        <b>${formatPrice(item.price * item.quantity)}</b>
        <button class="remove-item" type="button" data-index="${index}" aria-label="${escapeHtml(item.name)} 삭제">×</button>
      </div>
    </div>
  `).join('')
}

function renderAll() {
  renderGameControls()
  renderCards()
  renderCart()
}

function setDataStatus(message, status = 'snapshot') {
  const chip = $('#dataStatus')
  if (!chip) return
  chip.dataset.status = status
  const label = chip.querySelector('b') ?? chip
  label.textContent = message
}

function setCartOpen(open) {
  $('.cart-panel').classList.toggle('open', open)
  $('#mobileCartButton').setAttribute('aria-expanded', String(open))
}

function getFocusableElements(container) {
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)]
    .filter((element) => element.offsetParent !== null || element === document.activeElement)
}

function openOverlay(id, focusSelector) {
  const overlay = $(id)
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  activeOverlay = overlay
  overlay.classList.add('open')
  overlay.setAttribute('aria-hidden', 'false')
  document.body.classList.add('modal-open')

  window.requestAnimationFrame(() => {
    const target = focusSelector ? overlay.querySelector(focusSelector) : getFocusableElements(overlay)[0]
    target?.focus()
  })
}

function closeOverlay(id) {
  const overlay = $(id)
  overlay.classList.remove('open')
  overlay.setAttribute('aria-hidden', 'true')
  if (activeOverlay === overlay) activeOverlay = null
  if (!$('.overlay.open')) document.body.classList.remove('modal-open')
  previousFocus?.focus()
  previousFocus = null
}

function showToast(message) {
  const toast = $('#toast')
  toast.textContent = message
  toast.classList.add('show')
  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 1800)
}

function openDetail(cardId) {
  const card = cards.find((item) => item.id === cardId)
  if (!card) return

  state.selectedCard = card
  state.selectedRarity = Object.keys(card.prices)[0]
  state.quantity = 1

  $('#detailArt').style.setProperty('--card-bg', safeCssColor(card.color))
  $('#detailArt').innerHTML = safeUrl(card.imageUrl)
    ? `<img src="${escapeHtml(safeUrl(card.imageUrl))}" alt="${escapeHtml(card.name)}" />`
    : '<div class="card-image-fallback"></div>'
  $('#detailName').textContent = card.name
  $('#detailCode').textContent = card.code
  $('#detailSet').textContent = `${games[card.game].label} · ${getCardSetLabel(card)}`
  $('#quantityValue').textContent = state.quantity
  renderPriceOptions()
  openOverlay('#detailOverlay', '#addToCart')
}

function renderPriceOptions() {
  const card = state.selectedCard
  $('#priceOptions').innerHTML = Object.entries(card.prices).map(([rarity, price]) => `
    <button type="button" class="${rarity === state.selectedRarity ? 'active' : ''}" data-price-rarity="${escapeHtml(rarity)}" style="${escapeHtml(rarityStyle(rarity))}">
      <b>${escapeHtml(rarity)}</b>
      <span>${formatPrice(price)}</span>
    </button>
  `).join('')
}

function addSelectedToCart() {
  const card = state.selectedCard
  const rarity = state.selectedRarity
  if (!card || !rarity) return

  const existing = state.cart.find((item) => item.id === card.id && item.rarity === rarity)
  if (existing) {
    existing.quantity += state.quantity
  } else {
    state.cart.push({
      id: card.id,
      name: card.name,
      rarity,
      price: card.prices[rarity],
      quantity: state.quantity,
      color: card.color,
      imageUrl: card.imageUrl,
    })
  }

  renderCart()
  setCartOpen(true)
  closeOverlay('#detailOverlay')
  showToast('견적 목록에 추가했습니다.')
}

document.addEventListener('click', (event) => {
  const gameButton = event.target.closest('.game-logo')
  if (gameButton) {
    state.game = gameButton.dataset.game
    state.set = '전체'
    state.rarity = '전체'
    state.search = ''
    state.displayLimit = 24
    $('#searchInput').value = ''
    renderAll()
    return
  }

  const rarityButton = event.target.closest('[data-rarity]')
  if (rarityButton) {
    state.rarity = rarityButton.dataset.rarity
    state.displayLimit = 24
    renderAll()
    return
  }

  const cardTile = event.target.closest('.card-tile')
  if (cardTile) {
    openDetail(cardTile.dataset.cardId)
    return
  }

  const priceButton = event.target.closest('[data-price-rarity]')
  if (priceButton) {
    state.selectedRarity = priceButton.dataset.priceRarity
    renderPriceOptions()
    return
  }

  const removeButton = event.target.closest('.remove-item')
  if (removeButton) {
    state.cart.splice(Number(removeButton.dataset.index), 1)
    renderCart()
    return
  }

  const payoutButton = event.target.closest('#globalPayout button')
  if (payoutButton) {
    state.payout = payoutButton.dataset.method
    renderCart()
    return
  }

  const sortButton = event.target.closest('[data-sort]')
  if (sortButton) {
    state.sort = sortButton.dataset.sort
    state.displayLimit = 24
    renderCards()
  }
})

$('#setSelect').addEventListener('change', (event) => {
  state.set = event.target.value
  state.displayLimit = 24
  renderCards()
})

$('#closeDetail').addEventListener('click', () => closeOverlay('#detailOverlay'))
$('#closeCheckout').addEventListener('click', () => closeOverlay('#checkoutOverlay'))

const renderCardsFromSearch = debounce(() => {
  state.displayLimit = 24
  renderCards()
})

$('#searchInput').addEventListener('input', (event) => {
  state.search = event.target.value
  renderCardsFromSearch()
})

$('#searchButton').addEventListener('click', () => {
  state.search = $('#searchInput').value
  renderCards()
  $('#searchInput').focus()
})

$('#sortSelect').addEventListener('change', (event) => {
  state.sort = event.target.value
  state.displayLimit = 24
  renderCards()
})

$('#qtyMinus').addEventListener('click', () => {
  state.quantity = Math.max(1, state.quantity - 1)
  $('#quantityValue').textContent = state.quantity
})

$('#qtyPlus').addEventListener('click', () => {
  state.quantity += 1
  $('#quantityValue').textContent = state.quantity
})

$('#addToCart').addEventListener('click', addSelectedToCart)

$('#clearCart').addEventListener('click', () => {
  state.cart = []
  renderCart()
})

$('#openCheckout').addEventListener('click', () => {
  if (state.cart.length === 0) return
  setCheckoutError('')
  openOverlay('#checkoutOverlay', '#customerName')
})

$('#mobileCartButton').addEventListener('click', () => {
  setCartOpen(!$('.cart-panel').classList.contains('open'))
})

$('#quoteLookupForm').addEventListener('submit', (event) => {
  event.preventDefault()
  lookupQuoteStatus()
})

$('#openAdmin').addEventListener('click', () => openOverlay('#adminOverlay'))
$('#closeAdmin').addEventListener('click', () => closeOverlay('#adminOverlay'))

$('#submitCheckout').addEventListener('click', async () => {
  const [message, focusSelector] = validateCheckoutForm()
  if (message) {
    setCheckoutError(message, focusSelector)
    return
  }

  const submitButton = $('#submitCheckout')
  submitButton.disabled = true
  submitButton.textContent = '접수 중...'

  try {
    const receipt = await submitCheckoutOrder()
    closeOverlay('#checkoutOverlay')
    state.cart = []
    resetCheckoutForm()
    renderCart()
    if (receipt.quoteCode) {
      $('#quoteCodeInput').value = receipt.quoteCode
      setQuoteLookupResult(`${receipt.quoteCode} 사전 견적이 접수되었습니다. 매장 검수 후 최종 금액이 확정됩니다.`, 'success')
    }
    showToast(`사전 견적이 접수되었습니다. (${receipt.quoteCode ?? receipt.id})`)
  } catch (error) {
    console.error('[submitCheckout]', error)
    setCheckoutError('사전 견적 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.')
  } finally {
    submitButton.disabled = false
    submitButton.textContent = '사전 견적 접수'
  }
})

function handleInfiniteScroll() {
  const filteredCount = getFilteredCards().length
  if (state.displayLimit >= filteredCount) return

  const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 520
  if (!nearBottom) return

  state.displayLimit += 24
  renderCards()
}

window.addEventListener('scroll', () => {
  if (scrollRenderScheduled) return
  scrollRenderScheduled = true
  window.requestAnimationFrame(() => {
    scrollRenderScheduled = false
    handleInfiniteScroll()
  })
})

$$('.overlay').forEach((overlay) => {
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeOverlay(`#${overlay.id}`)
    }
  })
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const openOverlayElement = $$('.overlay.open').at(-1)
    if (openOverlayElement) closeOverlay(`#${openOverlayElement.id}`)
    return
  }

  if (event.key !== 'Tab' || !activeOverlay?.classList.contains('open')) return
  const focusable = getFocusableElements(activeOverlay)
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
})

renderAll()
initializeRuntime()
