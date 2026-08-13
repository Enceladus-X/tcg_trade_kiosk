const MAX_GATEWAY_BODY_BYTES = 7 * 1024 * 1024
const DEFAULT_GATEWAY_TIMEOUT_MS = 15_000

function resolveGatewayEndpoint(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) throw new Error('Kiosk gateway is not configured.')

  let endpoint
  try {
    endpoint = new URL(rawUrl.trim())
  } catch {
    throw new Error('Kiosk gateway URL is invalid.')
  }

  const allowsLoopbackHttp = endpoint.protocol === 'http:' && endpoint.hostname === '127.0.0.1'
  if (endpoint.protocol !== 'https:' && !allowsLoopbackHttp) {
    throw new Error('Kiosk gateway must use HTTPS.')
  }
  return endpoint
}

async function requestKioskGateway(config, request, { fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_GATEWAY_TIMEOUT_MS } = {}) {
  if (!request || typeof request !== 'object') throw new Error('Invalid kiosk gateway request.')
  if (!config || typeof config !== 'object') throw new Error('Kiosk gateway is not configured.')
  const endpoint = resolveGatewayEndpoint(config.gatewayUrl)
  const deviceToken = typeof config.deviceToken === 'string' ? config.deviceToken.trim() : ''
  if (!deviceToken) throw new Error('Kiosk gateway is not configured.')
  if (typeof fetchImpl !== 'function') throw new Error('Kiosk gateway fetch is unavailable.')

  const body = JSON.stringify(request)
  if (Buffer.byteLength(body, 'utf8') > MAX_GATEWAY_BODY_BYTES) throw new Error('Kiosk gateway request is too large.')

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, Math.max(1, timeoutMs))

  try {
    const result = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Marineford-Kiosk-Device': deviceToken,
        'X-Marineford-Kiosk-Client': 'desktop',
      },
      body,
      signal: controller.signal,
    })
    const raw = await result.text()
    try {
      return JSON.parse(raw)
    } catch {
      throw new Error(`Kiosk gateway returned an invalid response (${result.status}).`)
    }
  } catch (error) {
    if (timedOut || (error && typeof error === 'object' && error.name === 'AbortError')) {
      throw new Error('Kiosk gateway request timed out.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

module.exports = {
  DEFAULT_GATEWAY_TIMEOUT_MS,
  MAX_GATEWAY_BODY_BYTES,
  requestKioskGateway,
  resolveGatewayEndpoint,
}
