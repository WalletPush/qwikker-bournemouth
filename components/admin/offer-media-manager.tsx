'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { uploadToCloudinary } from '@/lib/integrations'
import { buildQwikkerImageUrl, cssFramingStyle, presentationFromAsset } from '@/lib/media/build-qwikker-image-url'
import type { MediaAsset } from '@/lib/media/types'
import { MediaFramingEditor } from '@/components/admin/media-framing-editor'

interface OfferMediaManagerProps {
  offerId: string
  businessId: string
  offerName: string
  onClose: () => void
  onChanged?: () => void
}

/** Admin: select / frame / upload offer artwork (claimed + unclaimed businesses). */
export function OfferMediaManager({
  offerId,
  businessId,
  offerName,
  onClose,
  onChanged,
}: OfferMediaManagerProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [offerMediaId, setOfferMediaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [framingAsset, setFramingAsset] = useState<MediaAsset | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/media?offerId=${offerId}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to load')
      setAssets(body.assets || [])
      setOfferMediaId(body.offerMediaId || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [offerId])

  useEffect(() => {
    void load()
  }, [load])

  async function postAction(payload: Record<string, unknown>) {
    const res = await fetch('/api/admin/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Request failed')
    return body
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Offer image</h3>
            <p className="text-sm text-slate-400">{offerName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            Close
          </button>
        </div>

        <div className="space-y-4 p-5">
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-300">Artwork library</p>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setBusy(true)
                  setError(null)
                  try {
                    const url = await uploadToCloudinary(file, `qwikker/offers/${offerId}`)
                    await postAction({
                      action: 'upload',
                      businessId,
                      offerId,
                      sourceUrl: url,
                      assetType: 'offer_artwork',
                      reviewStatus: 'approved',
                      setAsOfferMedia: true,
                      // Prefer contain for finished offer graphics with text
                      framing: undefined,
                    })
                    // Default new offer art to show-whole when it looks like graphic (admin can switch)
                    await load()
                    onChanged?.()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Upload failed')
                  } finally {
                    setBusy(false)
                    if (fileRef.current) fileRef.current.value = ''
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="bg-[#00d083] text-black hover:bg-[#00d083]/90"
              >
                {busy ? 'Uploading…' : 'Upload replacement'}
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : assets.length === 0 ? (
            <p className="text-sm text-slate-500">No offer artwork yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {assets.map((asset) => {
                const presentation = presentationFromAsset(asset)
                const thumb =
                  buildQwikkerImageUrl(presentation, 'offer') || asset.source_url
                const isSelected = asset.id === offerMediaId
                return (
                  <div key={asset.id} className="rounded-lg border border-slate-700 overflow-hidden">
                    <div className="relative aspect-video bg-slate-950 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumb}
                        alt=""
                        className="absolute inset-0 h-full w-full"
                        style={cssFramingStyle(presentation)}
                      />
                      {isSelected && (
                        <Badge className="absolute top-2 left-2 bg-[#00d083] text-black text-[10px]">
                          Display
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 p-2">
                      {!isSelected && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-7"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true)
                            try {
                              await postAction({ action: 'select_offer', offerId, mediaId: asset.id })
                              setOfferMediaId(asset.id)
                              onChanged?.()
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Select failed')
                            } finally {
                              setBusy(false)
                            }
                          }}
                        >
                          Select display
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-7"
                        onClick={() => setFramingAsset(asset)}
                      >
                        Adjust framing
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {framingAsset && (
        <MediaFramingEditor
          asset={framingAsset}
          onClose={() => setFramingAsset(null)}
          onSave={async (framing) => {
            await postAction({ action: 'frame', mediaId: framingAsset.id, framing })
            await load()
            onChanged?.()
          }}
        />
      )}
    </div>
  )
}
