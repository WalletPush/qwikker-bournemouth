'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  LandingPageConfig,
  resolveTemplate,
  resolveTheme,
} from '@/lib/constants/landing-templates'

interface ThemePickerProps {
  config: LandingPageConfig
  onChange: (updater: (prev: LandingPageConfig) => LandingPageConfig) => void
}

// Darken a hex color by a percentage for a sensible hover shade.
function darken(hex: string, amount = 0.12): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return hex
  const num = parseInt(m[1], 16)
  const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amount)))
  const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amount)))
  const b = Math.max(0, Math.round((num & 255) * (1 - amount)))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

const HEX6 = /^#[0-9a-fA-F]{6}$/

export function ThemePicker({ config, onChange }: ThemePickerProps) {
  const template = resolveTemplate(config)
  const theme = resolveTheme(config)
  const palette = template.palette

  function setAccent(accent: string) {
    if (!HEX6.test(accent)) return
    onChange((prev) => ({
      ...prev,
      theme: { ...(prev.theme || {}), accent, accent_hover: darken(accent), mode: prev.theme?.mode || theme.mode },
    }))
  }

  function setMode(mode: 'dark' | 'light') {
    onChange((prev) => ({
      ...prev,
      theme: { accent: prev.theme?.accent || theme.accent, accent_hover: prev.theme?.accent_hover || theme.accent_hover, mode },
    }))
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#00d083]/10">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-white">Accent &amp; Theme</CardTitle>
            <p className="text-sm text-slate-400 mt-1">Your accent colour drives buttons, links and highlights. The Qwikker logo stays the same.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-slate-300">Accent colour</Label>
          <div className="flex flex-wrap gap-2.5">
            {palette.map((c) => {
              const isActive = theme.accent.toLowerCase() === c.toLowerCase()
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAccent(c)}
                  title={c}
                  className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${isActive ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              )
            })}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className="h-9 w-9 rounded-lg border border-slate-600" style={{ backgroundColor: theme.accent }} />
            <Input
              value={theme.accent}
              onChange={(e) => setAccent(e.target.value)}
              placeholder="#00d083"
              className="bg-slate-900 border-slate-600 text-white focus:border-[#00d083] max-w-[140px] font-mono"
            />
            <span className="text-xs text-slate-500">Custom hex (advanced)</span>
          </div>
        </div>

        {/* Vibrant-only: how strongly the accent colour washes the hero + offer/category cards */}
        {template.id === 'vibrant' && (() => {
          const wash = typeof config.hero_blur === 'number' ? config.hero_blur : 60
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Colour wash</Label>
                <span className="text-xs font-medium text-[#00d083] tabular-nums">{wash}%</span>
              </div>
              <p className="text-xs text-slate-500">How strongly your accent colour tints the hero image, offer cards and category tiles. Lower = clearer photos, higher = bolder colour.</p>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={wash}
                onChange={(e) => onChange((prev) => ({ ...prev, hero_blur: Number(e.target.value) }))}
                className="w-full accent-[#00d083] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Photo</span>
                <span>Colour</span>
              </div>
            </div>
          )
        })()}

        <div className="space-y-2">
          <Label className="text-slate-300">Mode</Label>
          <div className="inline-flex rounded-lg border border-slate-700 overflow-hidden">
            {(['dark', 'light'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${theme.mode === m ? 'bg-[#00d083] text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
              >
                {m === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
