'use client'

import { useState } from 'react'
import { ArrowLeft, Plus, Layers, Trash2, X } from 'lucide-react'
import { useTabs } from '@/lib/use-cards'

interface AdminSettingsModalProps {
  onClose: () => void
}

type AdminView = 'menu' | 'tabs'

export function AdminSettingsModal({ onClose }: AdminSettingsModalProps) {
  const [view, setView] = useState<AdminView>('menu')
  const { tabs, addTab, removeTab } = useTabs()
  const [newTabName, setNewTabName] = useState('')

  const handleAddTab = () => {
    const trimmed = newTabName.trim()
    if (!trimmed) return
    addTab(trimmed)
    setNewTabName('')
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed left-1/2 top-1/2 z-50 flex h-[70vh] w-[70vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl">

        {/* Header */}
        <div className="shrink-0 flex items-center gap-4 border-b border-zinc-800 px-6 py-4">
          {view !== 'menu' && (
            <button
              onClick={() => setView('menu')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-lg font-semibold text-white">
            {view === 'menu' ? '관리자 설정' : '탭 관리'}
          </h2>
          <button
            onClick={onClose}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {view === 'menu' && (
            <div className="grid gap-3 p-6">
              <button
                onClick={() => setView('tabs')}
                className="flex items-center gap-4 rounded-xl bg-zinc-800 p-4 text-left transition-all hover:bg-zinc-700 active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-700">
                  <Layers className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-white">탭 관리</p>
                  <p className="text-sm text-zinc-500">확장팩 탭 추가 / 삭제</p>
                </div>
              </button>
            </div>
          )}

          {view === 'tabs' && (
            <div className="space-y-4 p-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTab()}
                  placeholder="새 확장팩명 (예: 버스트 오브 데스티니)"
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
                />
                <button
                  onClick={handleAddTab}
                  disabled={!newTabName.trim()}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2">
                {tabs.length === 0 && (
                  <p className="py-8 text-center text-sm text-zinc-500">등록된 탭이 없습니다</p>
                )}
                {tabs.map((tab) => (
                  <div
                    key={tab}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-800/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Layers className="h-4 w-4 text-zinc-500" />
                      <span className="font-medium text-white">{tab}</span>
                    </div>
                    <button
                      onClick={() => removeTab(tab)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-zinc-600">
                * 탭 삭제 시 해당 탭의 카드는 숨겨집니다. 탭을 다시 추가하면 복원됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
