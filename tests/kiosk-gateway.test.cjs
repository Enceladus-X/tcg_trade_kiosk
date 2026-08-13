const assert = require('node:assert/strict')
const test = require('node:test')
const { requestKioskGateway } = require('../electron/kiosk-gateway.cjs')

const validConfig = {
  gatewayUrl: 'https://marineford-buyback.pages.dev/api/kiosk-device',
  deviceToken: 'device-token-with-at-least-thirty-two-characters',
}

test('rejects an external HTTP gateway before sending the device token', async () => {
  await assert.rejects(
    requestKioskGateway({ ...validConfig, gatewayUrl: 'http://example.test/api/kiosk-device' }, { schemaVersion: 1 }),
    /HTTPS/,
  )
})

test('forwards only the expected device header and parses the gateway envelope', async () => {
  let captured
  const result = await requestKioskGateway(validConfig, { schemaVersion: 1, action: 'query', payload: {} }, {
    fetchImpl: async (url, init) => {
      captured = { url: String(url), headers: new Headers(init.headers), body: init.body }
      return new Response(JSON.stringify({ ok: true, data: { accepted: true } }), { status: 200 })
    },
  })

  assert.deepEqual(result, { ok: true, data: { accepted: true } })
  assert.equal(captured.url, validConfig.gatewayUrl)
  assert.equal(captured.headers.get('X-Marineford-Kiosk-Device'), validConfig.deviceToken)
  assert.equal(captured.headers.get('X-Marineford-Kiosk-Client'), 'desktop')
  assert.equal(captured.headers.get('Authorization'), null)
  assert.equal(captured.body, JSON.stringify({ schemaVersion: 1, action: 'query', payload: {} }))
})

test('aborts a stalled gateway request within the configured timeout', async () => {
  await assert.rejects(
    requestKioskGateway(validConfig, { schemaVersion: 1 }, {
      timeoutMs: 10,
      fetchImpl: (_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted by test')), { once: true })
      }),
    }),
    /timed out/,
  )
})

test('rejects a non-JSON upstream response without leaking the device token', async () => {
  await assert.rejects(
    requestKioskGateway(validConfig, { schemaVersion: 1 }, {
      fetchImpl: async () => new Response('<html>gateway error</html>', { status: 502 }),
    }),
    (error) => {
      assert.match(error.message, /invalid response/)
      assert.doesNotMatch(error.message, new RegExp(validConfig.deviceToken))
      return true
    },
  )
})
