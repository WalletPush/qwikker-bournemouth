'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LandingPageConfig,
  LandingTemplateId,
  LANDING_TEMPLATES,
  resolveTemplate,
  applyCityToken,
} from '@/lib/constants/landing-templates'

interface TemplatePickerProps {
  config: LandingPageConfig
  displayName: string
  onChange: (updater: (prev: LandingPageConfig) => LandingPageConfig) => void
}

// A tiny visual swatch so admins can see the vibe of each template at a glance.
function TemplateThumb({ id }: { id: LandingTemplateId }) {
  const t = LANDING_TEMPLATES[id]
  const dark = t.theme.mode === 'dark'
  const bg = dark ? '#0b0d10' : id === 'editorial' ? '#faf8f5' : '#ffffff'
  const text = dark ? '#ffffff' : '#0f172a'
  const muted = dark ? 'rgba(255,255,255,0.15)' : 'rgba(17,24,39,0.12)'
  return (
    <div className="h-24 w-full rounded-lg overflow-hidden border border-slate-700 flex flex-col" style={{ backgroundColor: bg }}>
      <div className="flex-1 p-2 flex flex-col gap-1.5">
        <div className="h-2 w-12 rounded-full" style={{ backgroundColor: t.theme.accent }} />
        <div className="h-1.5 w-20 rounded-full" style={{ backgroundColor: text, opacity: 0.5 }} />
        <div className="mt-auto flex gap-1.5">
          <div className="h-6 flex-1 rounded" style={{ backgroundColor: muted }} />
          <div className="h-6 flex-1 rounded" style={{ backgroundColor: muted }} />
          <div className="h-6 flex-1 rounded" style={{ backgroundColor: t.theme.accent, opacity: 0.85 }} />
        </div>
      </div>
    </div>
  )
}

export function TemplatePicker({ config, displayName, onChange }: TemplatePickerProps) {
  const active = resolveTemplate(config).id

  function applyTemplate(id: LandingTemplateId) {
    const t = LANDING_TEMPLATES[id]
    const sub = (s: string) => applyCityToken(s, displayName)
    onChange((prev) => ({
      ...prev,
      template: id,
      theme: { accent: t.theme.accent, accent_hover: t.theme.accent_hover, mode: t.theme.mode },
      section_order: [...t.section_order],
      sections_enabled: { ...t.sections_enabled },
      // Load this template's voice into the editable boxes so admins see + can tweak it.
      hero_headline: sub(t.copy.heroHeadline),
      hero_subtitle: sub(t.copy.heroSubtitle),
      offers_section: { ...prev.offers_section, heading: sub(t.copy.offersHeading) },
      category_tiles: { ...prev.category_tiles, heading: sub(t.copy.tilesHeading) },
    }))
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#00d083]/10">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-white">Template</CardTitle>
            <p className="text-sm text-slate-400 mt-1">Pick a professionally designed look. Switching applies its layout, theme and default copy (which loads into the boxes below so you can tweak it). Your logos and offers are kept.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.keys(LANDING_TEMPLATES) as LandingTemplateId[]).map((id) => {
            const t = LANDING_TEMPLATES[id]
            const isActive = active === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => applyTemplate(id)}
                className={`text-left rounded-xl border p-3 transition-all ${
                  isActive ? 'border-[#00d083] bg-[#00d083]/5 ring-1 ring-[#00d083]/40' : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                }`}
              >
                <TemplateThumb id={id} />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{t.label}</span>
                  {isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00d083]/20 text-[#00d083] font-medium">Active</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.description}</p>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
