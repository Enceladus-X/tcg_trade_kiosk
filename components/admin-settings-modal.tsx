'use client'

import { useState } from 'react'
import { 
  ArrowLeft, 
  Plus, 
  Package, 
  DollarSign, 
  BarChart3,
  Image as ImageIcon,
  Save
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'

interface AdminSettingsModalProps {
  onClose: () => void
}

type AdminView = 'menu' | 'add-card' | 'inventory' | 'pricing' | 'analytics'

const rarities = ['N', 'R', 'SR', 'UR', 'UL', 'SE', 'PSR'] as const

export function AdminSettingsModal({ onClose }: AdminSettingsModalProps) {
  const [view, setView] = useState<AdminView>('menu')
  const [enabledRarities, setEnabledRarities] = useState<Set<string>>(new Set(['N', 'R', 'SR']))
  const [rarityPrices, setRarityPrices] = useState<Record<string, string>>({})

  const toggleRarity = (rarity: string) => {
    setEnabledRarities(prev => {
      const next = new Set(prev)
      if (next.has(rarity)) {
        next.delete(rarity)
      } else {
        next.add(rarity)
      }
      return next
    })
  }

  const menuItems = [
    { id: 'add-card' as const, icon: Plus, label: 'Add New Card', desc: 'Manual card entry' },
    { id: 'inventory' as const, icon: Package, label: 'Inventory', desc: 'Stock management' },
    { id: 'pricing' as const, icon: DollarSign, label: 'Pricing Rules', desc: 'Bulk price updates' },
    { id: 'analytics' as const, icon: BarChart3, label: 'Analytics', desc: 'Sales reports' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 flex h-[70vh] w-[70vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-zinc-800 px-6 py-4">
          {view !== 'menu' && (
            <button
              onClick={() => setView('menu')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-lg font-semibold text-white">
            {view === 'menu' && 'Admin Settings'}
            {view === 'add-card' && 'Add New Card'}
            {view === 'inventory' && 'Inventory Management'}
            {view === 'pricing' && 'Pricing Rules'}
            {view === 'analytics' && 'Analytics'}
          </h2>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {view === 'menu' && (
            <div className="grid gap-3 p-6">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className="flex items-center gap-4 rounded-xl bg-zinc-800 p-4 text-left transition-all hover:bg-zinc-750 active:scale-[0.99]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-700">
                    <item.icon className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{item.label}</p>
                    <p className="text-sm text-zinc-500">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {view === 'add-card' && (
            <div className="space-y-6 p-6">
              {/* Card Image */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Card Image</label>
                <div className="flex items-center gap-4">
                  <div className="flex h-32 w-24 items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800">
                    <ImageIcon className="h-8 w-8 text-zinc-600" />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Paste image URL..."
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
                    />
                    <p className="mt-2 text-xs text-zinc-600">
                      Or drag and drop an image file
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Card Name</label>
                  <input
                    type="text"
                    placeholder="Enter card name..."
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Card Code</label>
                  <input
                    type="text"
                    placeholder="e.g., CARD-0001"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Rarity Prices - Toggle Enabled */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-zinc-400">
                  Rarity Prices (toggle to enable)
                </label>
                <div className="grid gap-3">
                  {rarities.map((rarity) => {
                    const isEnabled = enabledRarities.has(rarity)
                    return (
                      <div
                        key={rarity}
                        className={`flex items-center gap-4 rounded-xl border p-3 transition-all ${
                          isEnabled
                            ? 'border-zinc-600 bg-zinc-800'
                            : 'border-zinc-800 bg-zinc-900'
                        }`}
                      >
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggleRarity(rarity)}
                        />
                        <span className={`w-12 font-bold ${isEnabled ? 'text-white' : 'text-zinc-600'}`}>
                          {rarity}
                        </span>
                        <input
                          type="number"
                          placeholder="Price"
                          disabled={!isEnabled}
                          value={rarityPrices[rarity] || ''}
                          onChange={(e) => setRarityPrices(prev => ({ ...prev, [rarity]: e.target.value }))}
                          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none disabled:opacity-40"
                        />
                        <span className={`text-sm ${isEnabled ? 'text-zinc-400' : 'text-zinc-700'}`}>
                          KRW
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {view === 'inventory' && (
            <div className="flex h-64 items-center justify-center p-6">
              <div className="text-center">
                <Package className="mx-auto h-12 w-12 text-zinc-600" />
                <p className="mt-4 text-zinc-500">Inventory management coming soon</p>
              </div>
            </div>
          )}

          {view === 'pricing' && (
            <div className="flex h-64 items-center justify-center p-6">
              <div className="text-center">
                <DollarSign className="mx-auto h-12 w-12 text-zinc-600" />
                <p className="mt-4 text-zinc-500">Pricing rules coming soon</p>
              </div>
            </div>
          )}

          {view === 'analytics' && (
            <div className="flex h-64 items-center justify-center p-6">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-zinc-600" />
                <p className="mt-4 text-zinc-500">Analytics coming soon</p>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer for Add Card */}
        {view === 'add-card' && (
          <div className="border-t border-zinc-800 p-6">
            <button
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-lg font-semibold text-black transition-all hover:bg-amber-400 active:scale-[0.98]"
            >
              <Save className="h-5 w-5" />
              Save Card
            </button>
          </div>
        )}
      </div>
    </>
  )
}
