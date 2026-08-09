'use client'

import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cssObjectPosition } from '@/lib/media/build-qwikker-image-url'
import type { MediaAsset, MediaFit, MediaGravityMode } from '@/lib/media/types'

interface MediaFramingEditorProps {
  asset: MediaAsset
  onSave: (framing: {
    focal_x: number | null
    focal_y: number | null
    zoom: number
    fit: MediaFit
    gravity_mode: MediaGravityMode
  }) => Promise<void>
  onClose: () => void
}

function FramePreview({
  label,
  aspectClass,
  sourceUrl,
  fit,
  objectPosition,
  zoom,
}: {
  label: string
  aspectClass: string
  sourceUrl: string
  fit: MediaFit
  objectPosition: string
  zoom: number
}) {
  const objectFit = fit === 'contain' ? 'contain' : 'cover'
  const scale = fit === 'cover' ? zoom : 1

  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <div
        className={`relative ${aspectClass} overflow-hidden rounded border border-slate-700 bg-slate-950`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sourceUrl}
          alt=""
          className="absolute inset-0 h-full w-full"
          style={{
            objectFit,
            objectPosition,
            transform: scale !== 1 ? `scale(${scale})` : undefined,
            transformOrigin: objectPosition,
          }}
        />
      </div>
    </div>
  )
}

/**
 * Non-destructive framing editor.
 * Previews always use the original URL + CSS object-fit — never CDN transforms —
 * so "Show whole image" visibly letterboxes and keeps text/logos.
 */
export function MediaFramingEditor({ asset, onSave, onClose }: MediaFramingEditorProps) {
  const [fit, setFit] = useState<MediaFit>(asset.fit || 'cover')
  const [zoom, setZoom] = useState(Math.max(1, Number(asset.zoom) || 1))
  const [focalX, setFocalX] = useState(asset.focal_x ?? 0.5)
  const [focalY, setFocalY] = useState(asset.focal_y ?? 0.5)
  const [gravityMode, setGravityMode] = useState<MediaGravityMode>(
    asset.gravity_mode || 'auto'
  )
  const [saving, setSaving] = useState(false)
  const dragRef = useRef<HTMLDivElement>(null)

  const presentation = {
    source_url: asset.source_url,
    focal_x: gravityMode === 'manual' ? focalX : null,
    focal_y: gravityMode === 'manual' ? focalY : null,
    zoom: fit === 'cover' ? zoom : 1,
    fit,
    gravity_mode: gravityMode,
  }

  const objectFit = fit === 'contain' ? 'contain' : 'cover'
  const objectPosition = cssObjectPosition(presentation)
  const scale = fit === 'cover' ? zoom : 1

  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = dragRef.current
      if (!el || fit !== 'cover') return
      const rect = el.getBoundingClientRect()
      const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
      setFocalX(x)
      setFocalY(y)
      setGravityMode('manual')
    },
    [fit]
  )

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        focal_x: gravityMode === 'manual' ? focalX : null,
        focal_y: gravityMode === 'manual' ? focalY : null,
        zoom: fit === 'cover' ? zoom : 1,
        fit,
        gravity_mode: gravityMode,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Adjust framing</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Positions how the image sits in Qwikker frames — original stays intact.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            Close
          </button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="space-y-3">
            <div
              ref={dragRef}
              className="relative aspect-[16/10] overflow-hidden rounded-lg border border-slate-700 bg-slate-950 cursor-crosshair"
              onPointerDown={(e) => {
                ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
                handlePointer(e.clientX, e.clientY)
              }}
              onPointerMove={(e) => {
                if (e.buttons === 1) handlePointer(e.clientX, e.clientY)
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.source_url}
                alt=""
                className="absolute inset-0 h-full w-full"
                style={{
                  objectFit,
                  objectPosition,
                  transform: scale !== 1 ? `scale(${scale})` : undefined,
                  transformOrigin: objectPosition,
                }}
              />
              {fit === 'cover' && gravityMode === 'manual' && (
                <div
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#00d083] shadow pointer-events-none"
                  style={{ left: `${focalX * 100}%`, top: `${focalY * 100}%` }}
                />
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {fit === 'cover'
                ? 'Drag to set the focal point for Fill frame.'
                : 'Show whole image — letterboxes the frame so edges and text stay visible.'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={fit === 'cover' ? 'default' : 'outline'}
                className={fit === 'cover' ? 'bg-[#00d083] text-black hover:bg-[#00d083]/90' : ''}
                onClick={() => setFit('cover')}
              >
                Fill frame
              </Button>
              <Button
                type="button"
                variant={fit === 'contain' ? 'default' : 'outline'}
                className={fit === 'contain' ? 'bg-[#00d083] text-black hover:bg-[#00d083]/90' : ''}
                onClick={() => setFit('contain')}
              >
                Show whole image
              </Button>
            </div>

            {fit === 'cover' && (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Zoom</label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => {
                      setZoom(Number(e.target.value))
                      if (gravityMode === 'auto') setGravityMode('manual')
                    }}
                    className="w-full"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setGravityMode('auto')
                    setFocalX(0.5)
                    setFocalY(0.5)
                    setZoom(1)
                  }}
                >
                  Reset to auto-focus
                </Button>
              </>
            )}

            <div className="grid grid-cols-3 gap-2">
              <FramePreview
                label="Card"
                aspectClass="aspect-[16/10]"
                sourceUrl={asset.source_url}
                fit={fit}
                objectPosition={objectPosition}
                zoom={zoom}
              />
              <FramePreview
                label="Mobile"
                aspectClass="aspect-[4/3]"
                sourceUrl={asset.source_url}
                fit={fit}
                objectPosition={objectPosition}
                zoom={zoom}
              />
              <FramePreview
                label="Detail"
                aspectClass="aspect-video"
                sourceUrl={asset.source_url}
                fit={fit}
                objectPosition={objectPosition}
                zoom={zoom}
              />
            </div>

            {fit === 'contain' && (
              <p className="text-[11px] text-[#00d083]/90">
                Previews should show the full photo with dark bars — nothing cropped.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-700 px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="bg-[#00d083] text-black hover:bg-[#00d083]/90"
          >
            {saving ? 'Saving…' : 'Save framing'}
          </Button>
        </div>
      </div>
    </div>
  )
}
