'use client'

import { Gamepad2 } from 'lucide-react'
import type { Game } from '@/lib/use-games'

interface GameNavBarProps {
  games: Game[]
  selectedGameId: string | null
  onSelect: (gameId: string) => void
}

export function GameNavBar({ games, selectedGameId, onSelect }: GameNavBarProps) {
  if (games.length === 0) return null

  return (
    <div
      className="shrink-0 flex items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-950 px-4 py-3"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
    >
      {games.map((game) => {
        const isSelected = selectedGameId === game.id
        return (
          <button
            key={game.id}
            onClick={() => onSelect(game.id)}
            className={`shrink-0 flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all active:scale-95 ${
              isSelected ? 'bg-violet-500/10' : 'hover:bg-zinc-800/80'
            }`}
          >
            {/* 이미지 박스 */}
            <div
              className={`h-16 w-16 overflow-hidden rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              {game.imageUrl ? (
                <img
                  src={game.imageUrl}
                  alt={game.name}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                  <Gamepad2 className={`h-8 w-8 ${isSelected ? 'text-violet-400' : 'text-amber-400'}`} />
                </div>
              )}
            </div>

            {/* 게임명 */}
            <span
              className={`max-w-[72px] truncate text-center text-xs font-bold leading-tight ${
                isSelected ? 'text-violet-300' : 'text-zinc-400'
              }`}
            >
              {game.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
