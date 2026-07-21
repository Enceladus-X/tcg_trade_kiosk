'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Sparkles } from 'lucide-react'
import { APP_VERSION, isRemoteVersionNewer, LATEST_RELEASE_API_URL, RELEASES_URL } from '@/lib/app-version'

type LatestReleaseState = {
  latestVersion: string | null
  updateAvailable: boolean
}

interface VersionChipProps {
  previewLatestVersion?: string | null
}

export function VersionChip({ previewLatestVersion = null }: VersionChipProps) {
  const [releaseState, setReleaseState] = useState<LatestReleaseState>({
    latestVersion: previewLatestVersion,
    updateAvailable: previewLatestVersion ? isRemoteVersionNewer(APP_VERSION, previewLatestVersion) : false,
  })

  useEffect(() => {
    if (previewLatestVersion) {
      setReleaseState({
        latestVersion: previewLatestVersion,
        updateAvailable: isRemoteVersionNewer(APP_VERSION, previewLatestVersion),
      })
      return
    }

    let cancelled = false

    async function checkLatestRelease() {
      try {
        const response = await fetch(LATEST_RELEASE_API_URL, {
          headers: {
            Accept: 'application/vnd.github+json',
          },
          cache: 'no-store',
        })
        if (!response.ok) return

        const data = (await response.json()) as { tag_name?: string }
        const latestVersion = data.tag_name?.replace(/^v/i, '') ?? null
        if (!latestVersion || cancelled) return

        setReleaseState({
          latestVersion,
          updateAvailable: isRemoteVersionNewer(APP_VERSION, latestVersion),
        })
      } catch {
        // Ignore network/version-check failures in kiosk mode.
      }
    }

    void checkLatestRelease()

    return () => {
      cancelled = true
    }
  }, [previewLatestVersion])

  const openReleasePage = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.openExternal) {
      await window.electronAPI.openExternal(RELEASES_URL)
      return
    }

    if (typeof window !== 'undefined') {
      window.open(RELEASES_URL, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          void openReleasePage()
        }}
        className="rounded-full border border-zinc-700/80 bg-zinc-950/85 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-zinc-300 shadow-[0_8px_18px_rgba(0,0,0,0.28)] backdrop-blur-md transition-colors hover:border-zinc-500 hover:text-white"
      >
        {`v${APP_VERSION}`}
      </button>

      {releaseState.updateAvailable && releaseState.latestVersion && (
        <button
          type="button"
          onClick={() => {
            void openReleasePage()
          }}
          className="flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold text-amber-200 shadow-[0_8px_18px_rgba(0,0,0,0.28)] backdrop-blur-md transition-colors hover:bg-amber-500/25"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{`새 버전 v${releaseState.latestVersion}`}</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
