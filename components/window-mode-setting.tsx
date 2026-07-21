'use client'

import { useEffect, useState } from 'react'
import { Maximize2, Monitor, Loader2 } from 'lucide-react'

type WindowMode = 'kiosk' | 'windowed'

export function WindowModeSetting() {
  const [mode, setMode] = useState<WindowMode>('kiosk')
  const [isChanging, setIsChanging] = useState(false)
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.getWindowMode

  useEffect(() => {
    if (!window.electronAPI?.getWindowMode) return
    window.electronAPI.getWindowMode().then(setMode).catch(() => undefined)
  }, [])

  async function changeMode(nextMode: WindowMode) {
    if (!window.electronAPI?.setWindowMode || nextMode === mode) return
    setIsChanging(true)
    try {
      setMode(await window.electronAPI.setWindowMode(nextMode))
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
        <Monitor className="h-4 w-4 text-sky-400" />화면 모드
      </label>
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-1.5">
        <button
          type="button"
          onClick={() => changeMode('kiosk')}
          disabled={!isElectron || isChanging}
          className={`flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors ${mode === 'kiosk' ? 'bg-sky-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'} disabled:opacity-50`}
        >
          {isChanging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Maximize2 className="h-4 w-4" />}
          전체화면
        </button>
        <button
          type="button"
          onClick={() => changeMode('windowed')}
          disabled={!isElectron || isChanging}
          className={`flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors ${mode === 'windowed' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'} disabled:opacity-50`}
        >
          <Monitor className="h-4 w-4" />
          창모드
        </button>
      </div>
      <p className="text-xs text-zinc-600">
        {isElectron ? '선택한 모드는 다음 실행에도 유지됩니다.' : '웹 미리보기에서는 화면 모드를 변경할 수 없습니다.'}
      </p>
    </div>
  )
}
