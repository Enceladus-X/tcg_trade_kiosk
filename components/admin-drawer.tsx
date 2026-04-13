'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  PackagePlus,
  Warehouse,
  Settings,
  ImagePlus,
  X,
} from 'lucide-react'

interface AdminDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const rarities = ['N', 'R', 'SR', 'UR', 'UL', 'SE', 'PSR'] as const

export function AdminDrawer({ open, onOpenChange }: AdminDrawerProps) {
  const [activeSection, setActiveSection] = useState<'menu' | 'add-card'>('menu')
  const [enabledRarities, setEnabledRarities] = useState<Record<string, boolean>>({
    N: true,
    R: true,
    SR: false,
    UR: false,
    UL: false,
    SE: false,
    PSR: false,
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const toggleRarity = (rarity: string) => {
    setEnabledRarities(prev => ({ ...prev, [rarity]: !prev[rarity] }))
  }

  const handleImageUrlChange = (url: string) => {
    if (url.startsWith('http')) {
      setImagePreview(url)
    } else {
      setImagePreview(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="text-left text-base">
            {activeSection === 'menu' ? '관리자 메뉴' : '카드 수동 추가'}
          </SheetTitle>
        </SheetHeader>

        {activeSection === 'menu' ? (
          <nav className="flex flex-col gap-1 p-2">
            <Button
              variant="ghost"
              className="justify-start gap-3 px-3"
              onClick={() => {}}
            >
              <LayoutDashboard className="h-4 w-4" />
              관리자 대시보드
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-3 px-3"
              onClick={() => setActiveSection('add-card')}
            >
              <PackagePlus className="h-4 w-4" />
              카드 수동 추가
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-3 px-3"
              onClick={() => {}}
            >
              <Warehouse className="h-4 w-4" />
              재고 관리
            </Button>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              className="justify-start gap-3 px-3"
              onClick={() => {}}
            >
              <Settings className="h-4 w-4" />
              설정
            </Button>
          </nav>
        ) : (
          <ScrollArea className="h-[calc(100vh-57px)]">
            <div className="flex flex-col gap-4 p-4">
              {/* Back button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-fit gap-2"
                onClick={() => setActiveSection('menu')}
              >
                <X className="h-3 w-3" />
                돌아가기
              </Button>

              {/* Image URL with preview */}
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-xs text-muted-foreground">
                  이미지 URL
                </Label>
                <Input
                  id="imageUrl"
                  placeholder="https://example.com/card.jpg"
                  className="h-9 text-sm"
                  onChange={(e) => handleImageUrlChange(e.target.value)}
                />
                {imagePreview ? (
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-muted">
                    <img
                      src={imagePreview}
                      alt="카드 미리보기"
                      className="h-full w-full object-cover"
                      onError={() => setImagePreview(null)}
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/50">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImagePlus className="h-8 w-8" />
                      <span className="text-xs">이미지 미리보기</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Name */}
              <div className="space-y-2">
                <Label htmlFor="cardName" className="text-xs text-muted-foreground">
                  카드명 *
                </Label>
                <Input
                  id="cardName"
                  placeholder="푸른 눈의 백룡"
                  className="h-9 text-sm"
                />
              </div>

              {/* Card Code */}
              <div className="space-y-2">
                <Label htmlFor="cardCode" className="text-xs text-muted-foreground">
                  카드 코드
                </Label>
                <Input
                  id="cardCode"
                  placeholder="CARD-0001"
                  className="h-9 text-sm"
                />
              </div>

              {/* Rarity-Price Matrix */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">
                  레어도별 매입가 설정
                </Label>
                <p className="text-xs text-muted-foreground/70">
                  해당 카드에 존재하는 레어도만 활성화하세요
                </p>
                
                <div className="space-y-2">
                  {rarities.map((rarity) => (
                    <div
                      key={rarity}
                      className={`flex items-center gap-3 rounded-lg border p-2 transition-colors ${
                        enabledRarities[rarity]
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border bg-muted/30'
                      }`}
                    >
                      <Switch
                        checked={enabledRarities[rarity]}
                        onCheckedChange={() => toggleRarity(rarity)}
                        className="scale-75"
                      />
                      <span
                        className={`w-10 text-xs font-medium ${
                          enabledRarities[rarity]
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {rarity}
                      </span>
                      <Input
                        type="number"
                        placeholder="0"
                        disabled={!enabledRarities[rarity]}
                        className="h-7 flex-1 text-right text-sm"
                      />
                      <span className="text-xs text-muted-foreground">원</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <Button className="mt-2 w-full">
                카드 추가
              </Button>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  )
}
