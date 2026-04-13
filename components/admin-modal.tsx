'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Settings, 
  PlusCircle, 
  Package, 
  BarChart3, 
  Users, 
  ChevronRight,
  ArrowLeft,
  Image as ImageIcon,
  Save
} from 'lucide-react'
import { rarityColors } from '@/lib/mock-cards'

interface AdminModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AdminView = 'menu' | 'add-card' | 'inventory' | 'analytics' | 'users'

const menuItems = [
  { id: 'add-card' as const, icon: PlusCircle, label: '카드 수동 추가', desc: '새 카드를 시스템에 등록' },
  { id: 'inventory' as const, icon: Package, label: '재고 관리', desc: '카드 재고 현황 확인' },
  { id: 'analytics' as const, icon: BarChart3, label: '매입 통계', desc: '매입 데이터 분석' },
  { id: 'users' as const, icon: Users, label: '직원 관리', desc: '직원 계정 및 권한 관리' },
]

const rarities = ['N', 'R', 'SR', 'UR', 'UL', 'SE', 'PSR'] as const

export function AdminModal({ open, onOpenChange }: AdminModalProps) {
  const [view, setView] = useState<AdminView>('menu')
  const [newCard, setNewCard] = useState({
    name: '',
    code: '',
    imageUrl: '',
    enabledRarities: new Set<string>(['N', 'R', 'SR']),
    prices: {} as Record<string, string>,
  })

  const handleClose = () => {
    setView('menu')
    onOpenChange(false)
  }

  const toggleRarity = (rarity: string) => {
    const newEnabled = new Set(newCard.enabledRarities)
    if (newEnabled.has(rarity)) {
      newEnabled.delete(rarity)
    } else {
      newEnabled.add(rarity)
    }
    setNewCard({ ...newCard, enabledRarities: newEnabled })
  }

  const renderMenu = () => (
    <div className="grid gap-3 p-6">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setView(item.id)}
          className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 transition-colors text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-zinc-700 flex items-center justify-center group-hover:bg-amber-500/20">
            <item.icon className="w-6 h-6 text-zinc-400 group-hover:text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">{item.label}</h3>
            <p className="text-sm text-zinc-500">{item.desc}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400" />
        </button>
      ))}
    </div>
  )

  const renderAddCard = () => (
    <ScrollArea className="h-[calc(85vh-80px)]">
      <div className="p-6 space-y-6">
        {/* Image Preview & URL */}
        <div className="space-y-3">
          <Label className="text-zinc-400">카드 이미지</Label>
          <div className="flex gap-4">
            <div className="w-32 h-44 rounded-xl bg-zinc-800 border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden">
              {newCard.imageUrl ? (
                <img 
                  src={newCard.imageUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-10 h-10 text-zinc-600" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Input
                placeholder="이미지 URL 입력"
                value={newCard.imageUrl}
                onChange={(e) => setNewCard({ ...newCard, imageUrl: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <p className="text-xs text-zinc-500">
                이미지 URL을 입력하면 미리보기가 표시됩니다
              </p>
            </div>
          </div>
        </div>

        {/* Card Name & Code */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-zinc-400">카드명</Label>
            <Input
              placeholder="예: 푸른 눈의 백룡"
              value={newCard.name}
              onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
              className="bg-zinc-800 border-zinc-700 h-12 text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400">카드 코드</Label>
            <Input
              placeholder="예: CARD-0001"
              value={newCard.code}
              onChange={(e) => setNewCard({ ...newCard, code: e.target.value })}
              className="bg-zinc-800 border-zinc-700 h-12 text-lg"
            />
          </div>
        </div>

        {/* Rarity Prices with Toggles */}
        <div className="space-y-3">
          <Label className="text-zinc-400">레어도별 매입가</Label>
          <p className="text-xs text-zinc-500">
            해당 카드가 가진 레어도만 활성화하세요
          </p>
          <div className="space-y-3">
            {rarities.map((rarity) => {
              const colors = rarityColors[rarity]
              const isEnabled = newCard.enabledRarities.has(rarity)
              return (
                <div 
                  key={rarity}
                  className={`p-4 rounded-xl transition-all ${
                    isEnabled ? 'bg-zinc-800' : 'bg-zinc-900 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleRarity(rarity)}
                      />
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold ${colors.bg} ${colors.text}`}>
                        {rarity}
                      </span>
                    </div>
                    {isEnabled && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="0"
                          value={newCard.prices[rarity] || ''}
                          onChange={(e) => setNewCard({
                            ...newCard,
                            prices: { ...newCard.prices, [rarity]: e.target.value }
                          })}
                          className="w-32 bg-zinc-700 border-zinc-600 text-right"
                        />
                        <span className="text-zinc-500">원</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Save Button */}
        <Button className="w-full h-14 text-lg bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold">
          <Save className="w-5 h-5 mr-2" />
          카드 등록
        </Button>
      </div>
    </ScrollArea>
  )

  const renderPlaceholder = (title: string) => (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-500 p-6">
      <Settings className="w-16 h-16 opacity-30" />
      <p className="text-lg">{title}</p>
      <p className="text-sm text-center">이 기능은 현재 개발 중입니다.<br />곧 업데이트될 예정입니다.</p>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="w-[90vw] max-w-xl h-[85vh] max-h-none p-0 bg-zinc-900 border-zinc-700 overflow-hidden flex flex-col"
        aria-describedby={undefined}
      >
        <DialogHeader className="px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl">
            {view !== 'menu' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-2"
                onClick={() => setView('menu')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <Settings className="w-6 h-6 text-amber-500" />
            {view === 'menu' && '관리자 설정'}
            {view === 'add-card' && '카드 수동 추가'}
            {view === 'inventory' && '재고 관리'}
            {view === 'analytics' && '매입 통계'}
            {view === 'users' && '직원 관리'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {view === 'menu' && renderMenu()}
          {view === 'add-card' && renderAddCard()}
          {view === 'inventory' && renderPlaceholder('재고 관리')}
          {view === 'analytics' && renderPlaceholder('매입 통계')}
          {view === 'users' && renderPlaceholder('직원 관리')}
        </div>
      </DialogContent>
    </Dialog>
  )
}
