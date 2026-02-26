'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadToCloudinary } from '@/lib/integrations'

interface CloudinaryUploaderProps {
  folder: string
  onUpload: (url: string) => void
  accept?: string
  maxSizeMb?: number
  label?: string
  preview?: boolean
  currentUrl?: string
  className?: string
  previewClassName?: string
}

export function CloudinaryUploader({
  folder,
  onUpload,
  accept = 'image/png,image/jpeg,image/webp',
  maxSizeMb = 5,
  label = 'Upload image',
  preview = true,
  currentUrl,
  className,
  previewClassName,
}: CloudinaryUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File too large. Maximum ${maxSizeMb}MB.`)
      return
    }

    const validTypes = accept.split(',').map(t => t.trim())
    if (!validTypes.some(t => file.type === t || t === 'image/*')) {
      setError('Invalid file type. Please upload a PNG, JPEG, or WebP image.')
      return
    }

    setIsUploading(true)
    try {
      const url = await uploadToCloudinary(file, folder)
      setPreviewUrl(url)
      onUpload(url)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }, [folder, onUpload, accept, maxSizeMb])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }, [handleFile])

  const clearImage = useCallback(() => {
    setPreviewUrl(null)
    onUpload('')
  }, [onUpload])

  return (
    <div className={cn('space-y-2', className)}>
      {preview && previewUrl ? (
        <div className="flex items-center gap-3">
          <div
            className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/50 shrink-0"
            style={previewClassName ? { maxWidth: 320, maxHeight: 80 } : { maxWidth: 320, maxHeight: 128 }}
          >
            <img
              src={previewUrl}
              alt={label}
              style={previewClassName ? { maxWidth: 320, maxHeight: 80, objectFit: 'contain' as const } : { maxWidth: 320, maxHeight: 128, objectFit: 'cover' as const }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors text-left"
            >
              Change
            </button>
            <button
              type="button"
              onClick={clearImage}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors text-left"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed',
            'border-zinc-700 bg-zinc-900/30 px-4 py-8 cursor-pointer transition-colors',
            'hover:border-emerald-600/50 hover:bg-zinc-900/50',
            isUploading && 'pointer-events-none opacity-60'
          )}
        >
          {isUploading ? (
            <Loader2 className="size-6 text-emerald-500 animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="rounded-full bg-zinc-800 p-2.5">
                <ImageIcon className="size-5 text-zinc-400" />
              </div>
              <span className="text-sm font-medium text-zinc-300">{label}</span>
              <span className="text-xs text-zinc-500">
                PNG, JPEG, or WebP up to {maxSizeMb}MB
              </span>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
