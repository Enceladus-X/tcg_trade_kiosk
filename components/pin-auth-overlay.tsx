'use client'

import { useState, useCallback, useEffect } from 'react'
import { Delete, Lock, Loader2 } from 'lucide-react'
import { useStoreSettings } from '@/lib/use-settings'
import {
  clearAdminPinFailures,
  getAdminPinLockout,
  registerAdminPinFailure,
  setAdminSession,
} from '@/lib/admin-session'

interface PinAuthOverlayProps {
  onSuccess: () => void
  onCancel: () => void
}

export function PinAuthOverlay({ onSuccess, onCancel }: PinAuthOverlayProps) {
  const { isLoading } = useStoreSettings()
  const disabled = isLoading
  // Legacy remote-PIN states are intentionally disabled. The administrator
  // credential now lives only in this device's Electron main-process config.
  const isError = false
  const usingLegacyFallback = false

  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [lockoutUntil, setLockoutUntil] = useState(() => getAdminPinLockout().lockedUntil)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)

  const lockoutActive = lockoutUntil > Date.now()
  const disabledByLockout = lockoutActive || lockoutSeconds > 0

  useEffect(() => {
    const update = () => {
      const next = getAdminPinLockout()
      setLockoutUntil(next.lockedUntil)
      setLockoutSeconds(Math.max(0, Math.ceil((next.lockedUntil - Date.now()) / 1000)))
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const verifyPin = useCallback(async (inputPin: string) => {
    const api = (window as any).electronAPI
    const authenticated = api?.verifyPin ? Boolean(await api.verifyPin(inputPin)) : false
    if (authenticated) {
      setAdminSession()
      clearAdminPinFailures()
    }
    return authenticated
  }, [])

  const handleNumberClick = useCallback(async (num: string) => {
    if (disabled || disabledByLockout || pin.length >= 4) return
    const newPin = pin + num
    setPin(newPin)
    setError(false)

    if (newPin.length === 4) {
      const correct = await verifyPin(newPin)

      if (correct) {
        onSuccess()
      } else {
        setError(true)
        const nextLockout = registerAdminPinFailure()
        setLockoutUntil(nextLockout.lockedUntil)
        setTimeout(() => {
          setPin('')
          setError(false)
        }, 500)
      }
    }
  }, [disabled, disabledByLockout, pin, onSuccess, verifyPin])

  const handleDelete = useCallback(() => {
    if (disabled || disabledByLockout) return
    setPin(prev => prev.slice(0, -1))
    setError(false)
  }, [disabled, disabledByLockout])

  const handleClear = useCallback(() => {
    if (disabled || disabledByLockout) return
    setPin('')
    setError(false)
  }, [disabled, disabledByLockout])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled || disabledByLockout) return
      if (e.key >= '0' && e.key <= '9') handleNumberClick(e.key)
      else if (e.key === 'Backspace') handleDelete()
      else if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [disabled, disabledByLockout, handleNumberClick, handleDelete, onCancel])

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="flex w-72 flex-col items-center gap-6 rounded-2xl bg-zinc-900 p-6">
        {/* Lock Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
          {isLoading
            ? <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            : <Lock className="h-8 w-8 text-zinc-400" />
          }
        </div>

        {/* Title */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white">Admin Access</h3>
          <p className="text-sm text-zinc-500">
            {isLoading && !isError ? '인증 정보 불러오는 중...' : lockoutSeconds > 0 ? `${Math.ceil(lockoutSeconds / 60)}분 후 다시 시도해 주세요.` : 'Enter 4-digit PIN'}
          </p>
          {isError && (
            <p className="mt-1 text-xs text-amber-400">오프라인 모드 - 로컬 PIN 설정 필요</p>
          )}
          {usingLegacyFallback && !isError && (
            <p className="mt-1 text-xs text-amber-400">보안 함수 배포 전 임시 인증 모드</p>
          )}
        </div>

        {/* PIN Dots */}
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full transition-all duration-150 ${
                error
                  ? 'animate-pulse bg-red-500'
                  : disabled
                    ? 'bg-zinc-700'
                    : pin.length > i
                      ? 'bg-amber-500'
                      : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className={`grid w-full grid-cols-3 gap-2 transition-opacity ${disabled ? 'pointer-events-none opacity-30' : ''}`}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              className="flex h-14 items-center justify-center rounded-xl bg-zinc-800 text-xl font-semibold text-white transition-all hover:bg-zinc-700 active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="flex h-14 items-center justify-center rounded-xl bg-zinc-800 text-sm font-medium text-zinc-400 transition-all hover:bg-zinc-700 active:scale-95"
          >
            Clear
          </button>
          <button
            onClick={() => handleNumberClick('0')}
            className="flex h-14 items-center justify-center rounded-xl bg-zinc-800 text-xl font-semibold text-white transition-all hover:bg-zinc-700 active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="flex h-14 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 transition-all hover:bg-zinc-700 active:scale-95"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
