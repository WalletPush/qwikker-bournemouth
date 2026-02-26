'use client'

import { StampGrid } from './stamp-grid'
import { STAMP_ICONS } from '@/lib/loyalty/loyalty-utils'
import type { StampIconKey } from '@/lib/loyalty/loyalty-utils'
import { Gift } from 'lucide-react'

interface LoyaltyCardPreviewProps {
  programName?: string | null
  rewardDescription?: string | null
  rewardThreshold?: number
  stampLabel?: string | null
  stampIcon?: string | null
  earnInstructions?: string | null
  primaryColor?: string | null
  backgroundColor?: string | null
  logoUrl?: string | null
  stripImageUrl?: string | null
  businessName?: string | null
  /** Number of stamps to show as filled (default: ~40% of threshold) */
  sampleFill?: number
  /** Optional disclaimer shown below the card */
  disclaimer?: string
  className?: string
}

/**
 * Renders a visual mockup of a loyalty card using the business's
 * chosen design specs. Used on the business dashboard, loyalty portal,
 * and admin queue to show what users see in the app.
 */
export function LoyaltyCardPreview({
  programName,
  rewardDescription,
  rewardThreshold = 8,
  stampLabel,
  stampIcon,
  earnInstructions,
  primaryColor,
  backgroundColor,
  logoUrl,
  stripImageUrl,
  businessName,
  sampleFill,
  disclaimer,
  className = '',
}: LoyaltyCardPreviewProps) {
  const bgColor = backgroundColor || '#0b0f14'
  const fgColor = primaryColor || '#00d083'
  const threshold = rewardThreshold || 8
  const filled = sampleFill ?? Math.floor(threshold * 0.4)
  const iconKey = stampIcon as StampIconKey | undefined
  const stampIconName = (iconKey && STAMP_ICONS[iconKey]?.icon) || 'Stamp'
  const label = stampLabel || 'stamps'

  return (
    <div className={`max-w-sm mx-auto ${className}`}>
      <div
        className="rounded-xl overflow-hidden border border-zinc-700/60 w-full max-w-sm"
        style={{ backgroundColor: bgColor }}
      >
        {/* Strip image banner -- Apple Wallet strips are ~1125x432 (roughly 2.6:1) */}
        {stripImageUrl && (
          <div className="w-full aspect-[2.6/1] overflow-hidden">
            <img
              src={stripImageUrl}
              alt=""
              className="w-full h-full object-cover object-center"
            />
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* Logo + program name row */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="w-10 h-10 rounded-lg object-cover bg-zinc-800 shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${fgColor}15` }}
              >
                <Gift className="w-5 h-5" style={{ color: fgColor }} />
              </div>
            )}
            <div className="min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: fgColor }}
              >
                {programName || businessName || 'Loyalty Program'}
              </p>
              {businessName && programName && (
                <p className="text-xs truncate opacity-60" style={{ color: fgColor }}>
                  {businessName}
                </p>
              )}
            </div>
          </div>

          {/* Reward description */}
          <p className="text-xs" style={{ color: `${fgColor}cc` }}>
            Collect {threshold} {label.toLowerCase()} to earn{' '}
            <span className="font-medium" style={{ color: fgColor }}>
              {rewardDescription || 'a reward'}
            </span>
          </p>

          {/* Stamp grid */}
          <StampGrid
            stampIcon={stampIconName}
            filled={filled}
            threshold={threshold}
            size={22}
          />

          {/* Earn instructions */}
          {earnInstructions && (
            <p className="text-[11px] opacity-50" style={{ color: fgColor }}>
              {earnInstructions}
            </p>
          )}
        </div>
      </div>

      {/* Disclaimer below the card */}
      {disclaimer && (
        <p className="text-[11px] text-zinc-500 mt-2 max-w-sm leading-relaxed">
          {disclaimer}
        </p>
      )}
    </div>
  )
}

/**
 * Helper to map either a loyalty_programs row or a design_spec_json
 * into LoyaltyCardPreviewProps. Handles both snake_case DB fields
 * and camelCase form/spec fields.
 */
export function toLoyaltyCardPreviewProps(data: Record<string, any>): LoyaltyCardPreviewProps {
  return {
    programName: data.program_name ?? data.programName ?? null,
    rewardDescription: data.reward_description ?? data.rewardDescription ?? null,
    rewardThreshold: data.reward_threshold ?? data.rewardThreshold ?? 8,
    stampLabel: data.stamp_label ?? data.stampLabel ?? 'stamps',
    stampIcon: data.stamp_icon ?? data.stampIcon ?? null,
    earnInstructions: data.earn_instructions ?? data.earnInstructions ?? null,
    primaryColor: data.primary_color ?? data.primaryColor ?? data.brand?.primaryColor ?? null,
    backgroundColor: data.background_color ?? data.backgroundColor ?? data.brand?.backgroundColor ?? null,
    logoUrl: data.logo_url ?? data.logoUrl ?? data.brand?.logoUrl ?? null,
    stripImageUrl: data.strip_image_url ?? data.stripImageUrl ?? data.brand?.stripImageUrl ?? null,
    businessName: data.business_name ?? data.businessName ?? null,
  }
}
