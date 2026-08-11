const ADMIN_SESSION_KEY = 'tcg-trade-kiosk.admin-session'
const ADMIN_LOCKOUT_KEY = 'tcg-trade-kiosk.admin-pin-lockout'

export const ADMIN_SESSION_IDLE_MS = 30 * 60 * 1000
export const ADMIN_SESSION_MAX_MS = 8 * 60 * 60 * 1000
export const ADMIN_PIN_MAX_ATTEMPTS = 5
export const ADMIN_PIN_LOCKOUT_MS = 15 * 60 * 1000

type AdminSession = {
  issuedAt: number
  lastActivityAt: number
  expiresAt: number
}

type PinLockout = {
  failedAttempts: number
  lockedUntil: number
}

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) as T : null
  } catch {
    return null
  }
}

function remove(storage: Storage, key: string) {
  try {
    storage.removeItem(key)
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function setAdminSession(ttlSeconds = ADMIN_SESSION_MAX_MS / 1000) {
  if (typeof window === 'undefined') return
  const now = Date.now()
  const expiresAt = Math.min(now + Math.max(60, ttlSeconds) * 1000, now + ADMIN_SESSION_MAX_MS)
  try {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
      issuedAt: now,
      lastActivityAt: now,
      expiresAt,
    } satisfies AdminSession))
  } catch {
    // The overlay still protects the current page if sessionStorage is disabled.
  }
}

export function hasValidAdminSession() {
  if (typeof window === 'undefined') return false
  const session = readJson<AdminSession>(window.sessionStorage, ADMIN_SESSION_KEY)
  if (!session) return false
  const now = Date.now()
  const valid = session.expiresAt > now && session.lastActivityAt + ADMIN_SESSION_IDLE_MS > now
  if (!valid) remove(window.sessionStorage, ADMIN_SESSION_KEY)
  return valid
}

export function touchAdminSession() {
  if (typeof window === 'undefined' || !hasValidAdminSession()) return false
  const session = readJson<AdminSession>(window.sessionStorage, ADMIN_SESSION_KEY)
  if (!session) return false
  try {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
      ...session,
      lastActivityAt: Date.now(),
    } satisfies AdminSession))
    return true
  } catch {
    return false
  }
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return
  remove(window.sessionStorage, ADMIN_SESSION_KEY)
}

export function getAdminPinLockout() {
  if (typeof window === 'undefined') return { failedAttempts: 0, lockedUntil: 0 } satisfies PinLockout
  const lockout = readJson<PinLockout>(window.localStorage, ADMIN_LOCKOUT_KEY)
  if (!lockout || lockout.lockedUntil <= Date.now()) {
    if (lockout) remove(window.localStorage, ADMIN_LOCKOUT_KEY)
    return { failedAttempts: 0, lockedUntil: 0 } satisfies PinLockout
  }
  return lockout
}

export function registerAdminPinFailure() {
  if (typeof window === 'undefined') return { failedAttempts: 0, lockedUntil: 0 } satisfies PinLockout
  const current = getAdminPinLockout()
  const failedAttempts = current.failedAttempts + 1
  const lockedUntil = failedAttempts >= ADMIN_PIN_MAX_ATTEMPTS
    ? Date.now() + ADMIN_PIN_LOCKOUT_MS
    : 0
  const next = { failedAttempts, lockedUntil } satisfies PinLockout
  try {
    window.localStorage.setItem(ADMIN_LOCKOUT_KEY, JSON.stringify(next))
  } catch {
    // Server-side verification remains the source of truth after migration.
  }
  return next
}

export function clearAdminPinFailures() {
  if (typeof window === 'undefined') return
  remove(window.localStorage, ADMIN_LOCKOUT_KEY)
}
