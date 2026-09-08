'use client'

import { useState } from 'react'
import { uploadToCloudinary } from '@/lib/integrations'

interface ItemPhotoFieldProps {
  imageUrl?: string | null
  onChange: (url: string | undefined) => void
  /** Optional business photos the merchant can reuse */
  galleryUrls?: string[]
  cloudinaryFolder?: string
  /** Compact for dense admin forms */
  compact?: boolean
}

/**
 * Optional photo for featured/highlight items (and similar).
 * Upload new, or pick from existing business photos when available.
 */
export function ItemPhotoField({
  imageUrl,
  onChange,
  galleryUrls = [],
  cloudinaryFolder = 'qwikker/menu-items',
  compact = false,
}: ItemPhotoFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGallery, setShowGallery] = useState(false)

  const usableGallery = galleryUrls.filter(
    (url) => typeof url === 'string' && url.length > 0 && url !== imageUrl
  )

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const url = await uploadToCloudinary(file, cloudinaryFolder)
      onChange(url)
      setShowGallery(false)
    } catch {
      setError('Upload failed — try again')
    } finally {
      setUploading(false)
    }
  }

  const thumbClass = compact ? 'h-12 w-12' : 'h-16 w-16'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {imageUrl ? (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className={`${thumbClass} rounded-lg object-cover border border-slate-600`}
            />
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="text-xs text-slate-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-500/50 bg-slate-600/20 px-3 py-2 hover:bg-slate-600/40">
            {uploading ? (
              <span className="text-xs text-slate-400">Uploading…</span>
            ) : (
              <>
                <svg
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs text-slate-400">Add photo</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleUpload(file)
                e.target.value = ''
              }}
            />
          </label>
        )}

        {!imageUrl && usableGallery.length > 0 && (
          <button
            type="button"
            onClick={() => setShowGallery((v) => !v)}
            className="text-xs text-[#00d083] hover:text-[#00b872]"
          >
            {showGallery ? 'Hide photos' : 'Use business photo'}
          </button>
        )}
      </div>

      {showGallery && usableGallery.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-700/60 bg-slate-900/40 p-2">
          {usableGallery.slice(0, 8).map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => {
                onChange(url)
                setShowGallery(false)
              }}
              className="rounded-md border border-transparent hover:border-[#00d083]/60 focus:outline-none focus:ring-1 focus:ring-[#00d083]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-12 w-12 rounded-md object-cover" />
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
