'use client'

import { useState, useCallback, useEffect } from 'react'
import { Delete, Lock, Loader2 } from 'lucide-react'
import { useStoreSettings } from '@/lib/use-settings'

interface PinAuthOverlayProps {
  onSuccess: () => void
  onCancel: () => void
}

export function PinAuthOverlay({ onSuccess, onCancel }: PinAuthOverlayProps) {
  const { adminPassword, isLoading, isError } = useStoreSettings()

  // isError시 폴백: DB 연결 실패해도 무한 로딩 없이 기본 PIN 사용
  const correctPin = isError ? '1234' : (adminPassword ?? '1234')
  // 로딩 완료 전까지 입력 비활성화
  const disabled = isLoading && !isError

  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const handleNumberClick = useCallback(async (num: string) => {
    if (disabled || pin.length >= 4) return
    const newPin = pin + num
    setPin(newPin)
    setError(false)

    if (newPin.length === 4) {
      let correct = false
      const api = (window as any).electronAPI
      if (api?.verifyPin) {
        correct = await api.verifyPin(newPin)
      } else {
        correct = newPin === correctPin
      }

      if (correct) {
        onSuccess()
      } else {
        setError(true)
        setTimeout(() => {
          setPin('')
          setError(false)
        }, 500)
      }
    }
  }, [disabled, pin, correctPin, onSuccess])

  const handleDelete = useCallback(() => {
    if (disabled) return
    setPin(prev => prev.slice(0, -1))
    setError(false)
  }, [disabled])

  const handleClear = useCallback(() => {
    if (disabled) return
    setPin('')
    setError(false)
  }, [disabled])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled) return
      if (e.key >= '0' && e.key <= '9') handleNumberClick(e.key)
      else if (e.key === 'Backspace') handleDelete()
      else if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [disabled, handleNumberClick, handleDelete, onCancel])

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
          {isLoading && !isError
            ? <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            : <Lock className="h-8 w-8 text-zinc-400" />
          }
        </div>

        {/* Title */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white">Admin Access</h3>
          <p className="text-sm text-zinc-500">
            {isLoading && !isError ? '인증 정보 불러오는 중...' : 'Enter 4-digit PIN'}
          </p>
          {isError && (
            <p className="mt-1 text-xs text-amber-400">오프라인 모드 - 기본 PIN 사용</p>
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
