import pkg from '@/package.json'

export const APP_VERSION = pkg.version
export const RELEASES_URL = 'https://github.com/Enceladus-X/tcg_trade_kiosk/releases/latest'
export const LATEST_RELEASE_API_URL = 'https://api.github.com/repos/Enceladus-X/tcg_trade_kiosk/releases/latest'

function normalizeVersion(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0))
}

export function isRemoteVersionNewer(currentVersion: string, remoteVersion: string): boolean {
  const current = normalizeVersion(currentVersion)
  const remote = normalizeVersion(remoteVersion)
  const maxLength = Math.max(current.length, remote.length)

  for (let index = 0; index < maxLength; index += 1) {
    const currentPart = current[index] ?? 0
    const remotePart = remote[index] ?? 0
    if (remotePart > currentPart) return true
    if (remotePart < currentPart) return false
  }

  return false
}
