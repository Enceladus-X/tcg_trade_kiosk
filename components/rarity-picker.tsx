'use client'

import { getRarityColors } from '@/lib/mock-cards'

export const ALL_RARITIES = ['N', 'R', 'SR', 'UR', 'UL', 'SE', 'PSE'] as const
export type RarityKey = typeof ALL_RARITIES[number]

interface RarityPickerProps {
  enabledRarities: Record<string, boolean>
  prices: Record<string, number>
  onToggle: (rarity: string, enabled: boolean) => void
  onPriceChange: (rarity: string, price: number) => void
}

export function RarityPicker({ enabledRarities, prices, onToggle, onPriceChange }: RarityPickerProps) {
  const enabledList = ALL_RARITIES.filter(r => enabledRarities[r])

  return (
    <div className="space-y-3">
      {/* 레어도 칩 */}
      <div className="flex flex-wrap gap-2">
        {ALL_RARITIES.map(rarity => {
          const colors = getRarityColors(rarity)
          const enabled = !!enabledRarities[rarity]
          return (
            <button
              key={rarity}
              type="button"
              onClick={() => onToggle(rarity, !enabled)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-all active:scale-95 ${
                enabled
                  ? `${colors.bg} ${colors.text} ring-2 ring-white/20`
                  : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
              }`}
            >
              {rarity}
            </button>
          )
        })}
      </div>

      {/* 활성화된 레어도 가격 입력 */}
      {enabledList.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          {enabledList.map(rarity => {
            const colors = getRarityColors(rarity)
            return (
              <div key={rarity} className="flex items-center gap-3">
                <span className={`w-12 shrink-0 rounded px-2 py-1 text-center text-xs font-bold ${colors.bg} ${colors.text}`}>
                  {rarity}
                </span>
                <input
                  type="number"
                  value={prices[rarity] || ''}
                  onChange={(e) => onPriceChange(rarity, parseInt(e.target.value) || 0)}
                  placeholder="매입가"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-right text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                />
                <span className="shrink-0 text-sm text-zinc-500">원</span>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">레어도를 클릭하면 매입가 입력창이 나타납니다</p>
      )}
    </div>
  )
}
