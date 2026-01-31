'use client'

import { useMemo, useState, useRef } from 'react'
import { getPlaceholderUrl } from '@/lib/placeholders/getPlaceholderImage'
import type { SystemCategory } from '@/lib/constants/system-categories'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Info, CheckCircle2, Upload } from 'lucide-react'
import { uploadToCloudinary } from '@/lib/integrations'

type Props = {
  businessId: string
  businessName: string
  status: string
  systemCategory: SystemCategory
  placeholderVariant: number | null
  onSave: (variant: number) => Promise<void>
}

// Dynamic variant count based on category
const CATEGORY_VARIANTS: Record<string, number> = {
  restaurant: 6,
  cafe: 4,
  bakery: 5,
  bar: 6,
  dessert: 5,
  barber: 4,
  salon: 3,
  wellness: 4,
  pub: 3,
  tattoo: 6,
  // Default for other categories
  default: 3,
}

function getVariantsForCategory(category: SystemCategory): Array<{ id: number; label: string }> {
  const count = CATEGORY_VARIANTS[category] || CATEGORY_VARIANTS.default
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    label: `Variant ${i.toString().padStart(2, '0')}`,
  }))
}

export function PlaceholderSelector({
  businessId,
  businessName,
  status,
  systemCategory,
  placeholderVariant,
  onSave,
}: Props) {
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedVariant, setSelectedVariant] = useState(placeholderVariant ?? 0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isUnclaimed = status === 'unclaimed'
  const variants = useMemo(() => getVariantsForCategory(systemCategory), [systemCategory])

  // Preview URL
  const previewUrl = useMemo(() => {
    const variantStr = selectedVariant.toString().padStart(2, '0')
    return `/placeholders/${systemCategory}/${variantStr}.webp`
  }, [systemCategory, selectedVariant])

  async function handleSave() {
    try {
      setIsSaving(true)
      await onSave(selectedVariant)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadMessage({ type: 'error', text: 'Please select a valid image file' })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadMessage({ type: 'error', text: 'Image must be less than 5MB' })
      return
    }

    try {
      setIsUploading(true)
      setUploadMessage(null)

      // Upload to Cloudinary
      const uploadedUrl = await uploadToCloudinary(file, `placeholders/${systemCategory}`)

      // TODO: Save this URL to the database as a custom placeholder
      // For now, just show success message
      setUploadMessage({
        type: 'success',
        text: 'Image uploaded! Custom placeholders coming soon.',
      })

      console.log('📸 Uploaded placeholder to:', uploadedUrl)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Upload failed',
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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
          src={previewUrl}
          alt={`${businessName} placeholder preview`}
          className="h-16 w-24 rounded-md object-cover border border-slate-700"
        />
        <div className="text-xs">
          <div className="text-slate-200 font-medium">{systemCategory}</div>
          <div className="text-slate-400">
            Variant {selectedVariant.toString().padStart(2, '0')}
          </div>
          <Badge variant="outline" className="mt-1 text-[10px]">
            {selectedVariant === 0 ? 'Default' : `Variant ${selectedVariant}`}
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
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.id === 0 ? '⭐ ' : ''}{v.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-400">
          {variants.length} variant{variants.length > 1 ? 's' : ''} available ({variants.map(v => v.id.toString().padStart(2, '0')).join(', ')})
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

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-slate-900 px-2 text-slate-400">or</span>
        </div>
      </div>

      {/* Upload custom image */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-300">Upload Custom Placeholder</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={isUploading}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          size="sm"
          variant="outline"
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? 'Uploading...' : 'Upload New Image'}
        </Button>
        <p className="text-xs text-slate-400">
          Max 5MB, any image format (auto-converts to WebP)
        </p>
      </div>

      {/* Upload status messages */}
      {uploadMessage && (
        <div
          className={`text-xs p-2 rounded ${
            uploadMessage.type === 'success'
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {uploadMessage.text}
        </div>
      )}
    </div>
  )
}
