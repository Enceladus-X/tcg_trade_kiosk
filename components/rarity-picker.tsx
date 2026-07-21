'use client'

import { getRarityColors } from '@/lib/mock-cards'

export const ALL_RARITIES = ['N', 'R', 'SR', 'UR', 'UL', 'SE', 'PSE'] as const
export type RarityKey = typeof ALL_RARITIES[number]

interface RarityPickerProps {
  rarities?: readonly string[]
  enabledRarities: Record<string, boolean>
  prices: Record<string, number>
  onToggle: (rarity: string, enabled: boolean) => void
  onPriceChange: (rarity: string, price: number) => void
}

export function RarityPicker({ rarities, enabledRarities, prices, onToggle, onPriceChange }: RarityPickerProps) {
  const rarityList = rarities && rarities.length > 0 ? [...rarities] : [...ALL_RARITIES]

  return (
    <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="mb-1 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        <span>레어도 / 매입 상태</span>
        <span>매입가</span>
      </div>
      <div className="space-y-2">
        {rarityList.map(rarity => {
          const colors = getRarityColors(rarity)
          const enabled = !!enabledRarities[rarity]
          return (
            <div key={rarity} className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${enabled ? 'border-zinc-700 bg-zinc-800/80' : 'border-zinc-800 bg-zinc-950/40'}`}>
              <span className={`w-14 shrink-0 rounded-md px-2 py-1 text-center text-xs font-black ${colors.bg} ${colors.text}`}>
                {rarity}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => onToggle(rarity, !enabled)}
                className={`flex h-8 w-24 shrink-0 items-center justify-between rounded-lg px-2.5 text-xs font-black transition-all active:scale-95 ${
                  enabled
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'bg-red-500/10 text-red-300/80 ring-1 ring-red-500/25'
                }`}
              >
                <span>{enabled ? '매입 ON' : '매입 OFF'}</span>
                <span className={`h-2 w-2 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-red-400/70'}`} />
              </button>
              <input
                type="number"
                value={prices[rarity] || ''}
                onChange={(e) => onPriceChange(rarity, parseInt(e.target.value) || 0)}
                placeholder="매입가"
                className={`min-w-0 flex-1 rounded-lg border bg-zinc-800 px-3 py-2 text-right text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none ${enabled ? 'border-zinc-700' : 'border-zinc-800 opacity-60'}`}
              />
              <span className="shrink-0 text-sm text-zinc-500">원</span>
            </div>
          )
        })}
      </div>
      <p className="px-1 text-[11px] text-zinc-600">OFF 상태에서도 가격은 보존되며 고객 화면에서만 숨겨집니다.</p>
    </div>
  )
}
