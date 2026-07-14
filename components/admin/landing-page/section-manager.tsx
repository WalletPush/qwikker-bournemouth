'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LandingPageConfig,
  LANDING_SECTION_BY_KEY,
  isSectionEnabled,
  resolveSectionOrder,
} from '@/lib/constants/landing-templates'

interface SectionManagerProps {
  config: LandingPageConfig
  onChange: (updater: (prev: LandingPageConfig) => LandingPageConfig) => void
}

// Write a section's enabled flag to the correct source key.
function setSectionEnabled(prev: LandingPageConfig, key: string, value: boolean): LandingPageConfig {
  const def = LANDING_SECTION_BY_KEY[key]
  if (!def) return prev
  switch (def.enableSource) {
    case 'sections_enabled':
      return { ...prev, sections_enabled: { ...(prev.sections_enabled || {}), [key]: value } }
    case 'offers_section':
      return { ...prev, offers_section: { ...(prev.offers_section || {}), enabled: value } }
    case 'category_tiles':
      return { ...prev, category_tiles: { ...(prev.category_tiles || {}), enabled: value } }
    case 'sponsor_enabled':
      return { ...prev, sponsor_enabled: value }
    case 'supporters_enabled':
      return { ...prev, supporters_enabled: value }
    case 'show_founding_counter':
      return { ...prev, show_founding_counter: value }
    case 'show_featured_businesses':
      return { ...prev, show_featured_businesses: value }
    case 'show_pass_count':
      return { ...prev, show_pass_count: value }
    default:
      return prev
  }
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${checked ? 'bg-[#00d083]' : 'bg-slate-600'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

export function SectionManager({ config, onChange }: SectionManagerProps) {
  const order = resolveSectionOrder(config)

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= order.length) return
    const next = [...order]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange((prev) => ({ ...prev, section_order: next }))
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#00d083]/10">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <div>
            <CardTitle className="text-white">Sections</CardTitle>
            <p className="text-sm text-slate-400 mt-1">Show, hide and reorder sections. The hero always sits at the top.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {order.map((key, index) => {
            const def = LANDING_SECTION_BY_KEY[key]
            if (!def) return null
            const enabled = isSectionEnabled(config, key)
            return (
              <div
                key={key}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${enabled ? 'border-slate-700 bg-slate-900/50' : 'border-slate-800 bg-slate-900/20 opacity-70'}`}
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                    aria-label="Move up"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === order.length - 1}
                    className="text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                    aria-label="Move down"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{def.label}</span>
                    {!def.editable && (
                      <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400" title="Wording is set by Qwikker for brand consistency">Locked copy</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{def.description}</p>
                </div>
                <Toggle checked={enabled} onChange={(v) => onChange((prev) => setSectionEnabled(prev, key, v))} />
              </div>
            )
          })}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Sections marked &quot;Locked copy&quot; can be shown, hidden and reordered, but their wording is maintained by Qwikker to keep the brand consistent across cities.
        </p>
      </CardContent>
    </Card>
  )
}
