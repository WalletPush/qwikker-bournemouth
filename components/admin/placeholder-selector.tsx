'use client'

import { useMemo, useState } from 'react'
import { getCategoryVariants, getPlaceholder } from '@/lib/constants/category-placeholders'
import type { SystemCategory } from '@/lib/constants/system-categories'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Info, CheckCircle2 } from 'lucide-react'

type Props = {
  businessId: string
  businessName: string
  status: string
  systemCategory: SystemCategory
  googlePlaceId: string
  placeholderVariant: number | null
  unclaimedMaxVariantId: number // Pass from category data
  onSave: (variant: number) => Promise<void>
}

export function PlaceholderSelector({
  businessId,
  businessName,
  status,
  systemCategory,
  googlePlaceId,
  placeholderVariant,
  unclaimedMaxVariantId,
  onSave,
}: Props) {
  const [isSaving, setIsSaving] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState(placeholderVariant ?? 0)

  const variants = useMemo(() => getCategoryVariants(systemCategory), [systemCategory])

  // Filter to neutral variants only for unclaimed businesses
  const isUnclaimed = status === 'unclaimed'
  const availableVariants = useMemo(() => {
    if (!isUnclaimed) return variants
    return variants.filter(v => v.id <= unclaimedMaxVariantId)
  }, [variants, isUnclaimed, unclaimedMaxVariantId])

  // Preview what will show
  const preview = useMemo(() => {
    return getPlaceholder(systemCategory, googlePlaceId || businessId, selectedVariant, status)
  }, [systemCategory, googlePlaceId, businessId, selectedVariant, status])

  async function handleSave() {
    try {
      setIsSaving(true)
      await onSave(selectedVariant)
    } finally {
      setIsSaving(false)
    }
  }

  // If claimed, placeholders aren't used
  if (!isUnclaimed) {
    return (
      <div className="space-y-3 p-4 bg-slate-900 border border-slate-700 rounded-lg">
        <div className="flex items-start gap-2 text-sm text-slate-400">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-slate-300">Claimed listings use real business photos</div>
            <div className="text-xs mt-1">Placeholder images are not used for claimed businesses.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4 bg-slate-900 border border-slate-700 rounded-lg">
      {/* Info header */}
      <div className="flex items-start gap-2 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-medium">Placeholder Image (Unclaimed Listing)</div>
          <div className="mt-1 text-blue-200/80">
            This image is shown until the business claims their listing and uploads real photos. Choose a variant to add variety across listings.
          </div>
          <div className="mt-1 text-blue-200/60 text-[11px]">
            Keep it generic (no specific dishes/brands) to avoid misrepresentation.
          </div>
        </div>
      </div>

      {/* Preview thumbnail */}
      <div className="flex items-center gap-3">
        <img
          src={preview.imagePath}
          alt={`${businessName} placeholder preview`}
          className="h-16 w-24 rounded-md object-cover border border-slate-700"
        />
        <div className="text-xs">
          <div className="text-slate-200 font-medium">{preview.label}</div>
          <div className="text-slate-400">
            Variant {selectedVariant} • {preview.selectedVariant?.description ?? 'Unknown'}
          </div>
          <Badge variant="outline" className="mt-1 text-[10px]">
            {selectedVariant === 0 ? 'Default' : `Custom ${selectedVariant}/${unclaimedMaxVariantId}`}
          </Badge>
        </div>
      </div>

      {/* Dropdown */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-300">Select Placeholder Variant</label>
        <select
          className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
          value={selectedVariant}
          disabled={isSaving}
          onChange={(e) => setSelectedVariant(parseInt(e.target.value, 10))}
        >
          {availableVariants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.id === 0 ? '⭐ ' : ''}Variant {v.id} — {v.description}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-400">
          Showing variants 0-{unclaimedMaxVariantId} (generic images only for unclaimed listings)
        </p>
      </div>

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        size="sm"
        className="w-full"
      >
        {isSaving ? 'Saving...' : 'Save Placeholder'}
      </Button>

      {isSaving && <div className="text-xs text-slate-400 text-center">Updating placeholder...</div>}
    </div>
  )
}
