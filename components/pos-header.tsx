'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface POSHeaderProps {
  onMenuClick: () => void
}

export function POSHeader({ onMenuClick }: POSHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex w-full items-center gap-4 px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="shrink-0"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">메뉴 열기</span>
        </Button>
        
        <h1 className="flex-1 text-center text-lg font-semibold tracking-tight">
          TCG 매입 시스템
        </h1>
        
        {/* Spacer to center the title */}
        <div className="w-10 shrink-0" />
      </div>
    </header>
  )
}
