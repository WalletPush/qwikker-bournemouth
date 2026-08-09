'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { uploadToCloudinary } from '@/lib/integrations'
import { presentationFromAsset } from '@/lib/media/build-qwikker-image-url'
import type { MediaAsset, MediaPresentation } from '@/lib/media/types'
import { MediaFramingEditor } from '@/components/admin/media-framing-editor'
import { PlaceholderSelector } from '@/components/admin/placeholder-selector'
import type { SystemCategory } from '@/lib/constants/system-categories'

interface MediaManagerProps {
  businessId: string
  businessName: string
  status: string
  systemCategory: SystemCategory
  placeholderVariant: number | null
  customUrl?: string | null
  onClose: () => void
  /** Fired after select/frame/upload so parent cards can apply fit/focal immediately */
  onChanged?: (heroMedia?: MediaPresentation | null) => void
  onPlaceholderSave?: (variant: number) => Promise<void>
  onCustomChange?: (url: string | null) => void
}

export function MediaManager({
  businessId,
  businessName,
  status,
  systemCategory,
  placeholderVariant,
  customUrl,
  onClose,
  onChanged,
  onPlaceholderSave,
  onCustomChange,
}: MediaManagerProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [heroMediaId, setHeroMediaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [framingAsset, setFramingAsset] = useState<MediaAsset | null>(null)
  const [tab, setTab] = useState<'library' | 'pool'>(
    status === 'unclaimed' ? 'library' : 'library'
  )
  const fileRef = useRef<HTMLInputElement>(null)

  const emitHero = useCallback(
    (assetsList: MediaAsset[], heroId: string | null) => {
      const hero = heroId ? assetsList.find((a) => a.id === heroId) : null
      onChanged?.(hero ? presentationFromAsset(hero) : null)
    },
    [onChanged]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/media?businessId=${businessId}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to load media')
      const nextAssets = (body.assets || []) as MediaAsset[]
      const nextHeroId = (body.heroMediaId || null) as string | null
      setAssets(nextAssets)
      setHeroMediaId(nextHeroId)
      return { assets: nextAssets, heroMediaId: nextHeroId }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      return null
    } finally {
      setLoading(false)
    }
  }, [businessId])

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

  async function handleSelectDisplay(mediaId: string) {
    setBusyId(mediaId)
    setError(null)
    try {
      await postAction({ action: 'select_hero', businessId, mediaId })
      setHeroMediaId(mediaId)
      const hero = assets.find((a) => a.id === mediaId)
      onChanged?.(hero ? presentationFromAsset(hero) : null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Select failed')
    } finally {
      setBusyId(null)
    }
  }

  async function handleArchive(mediaId: string) {
    setBusyId(mediaId)
    setError(null)
    try {
      await postAction({ action: 'archive', mediaId })
      const loaded = await load()
      if (loaded) emitHero(loaded.assets, loaded.heroMediaId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Archive failed')
    } finally {
      setBusyId(null)
    }
  }

  async function handlePromote(mediaId: string) {
    setBusyId(mediaId)
    setError(null)
    try {
      await postAction({ action: 'promote', mediaId })
      const loaded = await load()
      if (loaded) emitHero(loaded.assets, loaded.heroMediaId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Promote failed')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(mediaId: string) {
    setBusyId(mediaId)
    setError(null)
    try {
      await postAction({ action: 'reject', mediaId })
      const loaded = await load()
      if (loaded) emitHero(loaded.assets, loaded.heroMediaId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed')
    } finally {
      setBusyId(null)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be less than 8MB')
      return
    }

    setUploading(true)
    setError(null)
    try {
      const url = await uploadToCloudinary(file, `qwikker/business_images/${businessId}`)
      // Admin upload is approved immediately; owner uploads use review_status=pending elsewhere
      await postAction({
        action: 'upload',
        businessId,
        sourceUrl: url,
        assetType: 'business_photo',
        reviewStatus: 'approved',
        setAsHero: !heroMediaId,
      })
      const loaded = await load()
      if (loaded) emitHero(loaded.assets, loaded.heroMediaId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const photos = assets.filter((a) => a.asset_type === 'business_photo')
  const pending = photos.filter((a) => a.review_status === 'pending')
  const approved = photos.filter((a) => a.review_status === 'approved')

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Manage display image</h2>
            <p className="text-sm text-slate-400 mt-0.5">{businessName}</p>
            <p className="text-xs text-slate-500 mt-1">
              Select display · Adjust framing · Upload replacement — claimed and unclaimed.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            Close
          </button>
        </div>

        {status === 'unclaimed' && (
          <div className="flex gap-2 border-b border-slate-800 px-5 py-2">
            <button
              type="button"
              onClick={() => setTab('library')}
              className={`text-xs px-3 py-1.5 rounded-md ${tab === 'library' ? 'bg-[#00d083]/20 text-[#00d083]' : 'text-slate-400'}`}
            >
              Library
            </button>
            <button
              type="button"
              onClick={() => setTab('pool')}
              className={`text-xs px-3 py-1.5 rounded-md ${tab === 'pool' ? 'bg-[#00d083]/20 text-[#00d083]' : 'text-slate-400'}`}
            >
              Placeholder pool
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {tab === 'pool' && status === 'unclaimed' && onPlaceholderSave ? (
            <PlaceholderSelector
              businessId={businessId}
              businessName={businessName}
              status={status}
              systemCategory={systemCategory}
              placeholderVariant={placeholderVariant}
              customUrl={customUrl}
              onSave={async (variant) => {
                await onPlaceholderSave(variant)
                setHeroMediaId(null)
                await load()
                onChanged?.(null)
              }}
              onCustomChange={async (url) => {
                onCustomChange?.(url)
                if (url === null) {
                  setHeroMediaId(null)
                  await load()
                  onChanged?.(null)
                } else {
                  const loaded = await load()
                  if (loaded) emitHero(loaded.assets, loaded.heroMediaId)
                }
              }}
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-300">Photo library</p>
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="bg-[#00d083] text-black hover:bg-[#00d083]/90"
                  >
                    {uploading ? 'Uploading…' : 'Upload replacement'}
                  </Button>
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : (
                <>
                  {pending.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-amber-400">
                        Awaiting approval
                      </p>
                      <p className="text-xs text-slate-500">
                        Owner uploads do not replace the live display until you promote them.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {pending.map((asset) => (
                          <AssetTile
                            key={asset.id}
                            asset={asset}
                            isHero={false}
                            busy={busyId === asset.id}
                            onPromote={() => handlePromote(asset.id)}
                            onReject={() => handleReject(asset.id)}
                            onFrame={() => setFramingAsset(asset)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {approved.length === 0 ? (
                      <p className="col-span-full text-sm text-slate-500">
                        No photos yet. Upload one or use the placeholder pool (unclaimed).
                      </p>
                    ) : (
                      approved.map((asset) => (
                        <AssetTile
                          key={asset.id}
                          asset={asset}
                          isHero={asset.id === heroMediaId}
                          busy={busyId === asset.id}
                          onSelect={() => handleSelectDisplay(asset.id)}
                          onFrame={() => setFramingAsset(asset)}
                          onArchive={() => handleArchive(asset.id)}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {framingAsset && (
        <MediaFramingEditor
          asset={framingAsset}
          onClose={() => setFramingAsset(null)}
          onSave={async (framing) => {
            const body = await postAction({
              action: 'frame',
              mediaId: framingAsset.id,
              framing,
            })
            const updated = (body.asset || {
              ...framingAsset,
              ...framing,
            }) as MediaAsset
            setAssets((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)))
            // If this is the display image, push fit/focal to the live card immediately
            if (updated.id === heroMediaId || framingAsset.id === heroMediaId) {
              onChanged?.(presentationFromAsset(updated))
            } else {
              onChanged?.(undefined)
            }
          }}
        />
      )}
    </div>
  )
}

function AssetTile({
  asset,
  isHero,
  busy,
  onSelect,
  onFrame,
  onArchive,
  onPromote,
  onReject,
}: {
  asset: MediaAsset
  isHero: boolean
  busy: boolean
  onSelect?: () => void
  onFrame?: () => void
  onArchive?: () => void
  onPromote?: () => void
  onReject?: () => void
}) {
  // Always use the original URL in the library — transformed delivery URLs were breaking thumbs.
  // CSS object-fit reflects saved framing (contain keeps text/logos visible).
  const objectFit = asset.fit === 'contain' ? 'contain' : 'cover'

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/60 overflow-hidden">
      <div className="relative aspect-[4/3] bg-slate-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.source_url}
          alt=""
          className="absolute inset-0 h-full w-full"
          style={{ objectFit }}
        />
        {isHero && (
          <Badge className="absolute top-2 left-2 bg-[#00d083] text-black text-[10px]">
            Display
          </Badge>
        )}
        {asset.review_status === 'pending' && (
          <Badge className="absolute top-2 left-2 bg-amber-500 text-black text-[10px]">
            Pending
          </Badge>
        )}
        {asset.fit === 'contain' && (
          <Badge className="absolute top-2 right-2 bg-slate-800/90 text-slate-200 text-[10px] border border-slate-600">
            Whole image
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-1 p-2">
        {onSelect && !isHero && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onSelect} className="text-[10px] h-7 px-2">
            Select display
          </Button>
        )}
        {onFrame && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onFrame} className="text-[10px] h-7 px-2">
            Adjust framing
          </Button>
        )}
        {onPromote && (
          <Button type="button" size="sm" disabled={busy} onClick={onPromote} className="text-[10px] h-7 px-2 bg-[#00d083] text-black">
            Promote to display
          </Button>
        )}
        {onReject && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onReject} className="text-[10px] h-7 px-2">
            Archive / reject
          </Button>
        )}
        {onArchive && !isHero && (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onArchive} className="text-[10px] h-7 px-2 text-slate-400">
            Archive
          </Button>
        )}
      </div>
    </div>
  )
}
