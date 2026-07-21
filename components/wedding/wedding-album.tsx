'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Camera,
  Check,
  Download,
  Heart,
  Loader2,
  Lock,
  Trash2,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  CLOUDINARY_CLOUD,
  CLOUDINARY_UNSIGNED_PRESET,
  WEDDING_MAX_FILE_BYTES,
  weddingCloudinaryFolder,
} from '@/lib/wedding/config'

interface Photo {
  id: string
  url: string
}

interface WeddingAlbumProps {
  slug: string
  coupleNames: string
  title: string
  welcome: string
  intro: string
  initialPhotos: Photo[]
  manage: boolean
}

const serif = { fontFamily: 'var(--font-wedding-serif), Georgia, serif' }
const script = { fontFamily: 'var(--font-wedding-script), cursive' }

// Serve small, auto-optimised images to guests (saves Cloudinary bandwidth + loads fast on
// mobile data) while the full original is only ever pulled for the couple's ZIP download.
// f_auto also transparently converts HEIC/HEIF (iPhone) so every thumbnail renders.
function cldTransform(url: string, transform: string): string {
  if (!url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/${transform}/`)
}
const thumbUrl = (u: string) => cldTransform(u, 'c_fill,g_auto,w_600,h_600,f_auto,q_auto')
const fullUrl = (u: string) => cldTransform(u, 'c_limit,w_1600,h_1600,f_auto,q_auto')

interface CloudinaryResult {
  url: string
  publicId: string | null
  width: number | null
  height: number | null
}

async function uploadToCloudinary(file: File, slug: string): Promise<CloudinaryResult | null> {
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', CLOUDINARY_UNSIGNED_PRESET)
  form.append('folder', weddingCloudinaryFolder(slug))
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.secure_url) return null
    return {
      url: data.secure_url as string,
      publicId: (data.public_id as string) ?? null,
      width: typeof data.width === 'number' ? data.width : null,
      height: typeof data.height === 'number' ? data.height : null,
    }
  } catch {
    return null
  }
}

export function WeddingAlbum({
  slug,
  coupleNames,
  title,
  welcome,
  intro,
  initialPhotos,
  manage,
}: WeddingAlbumProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [justUploaded, setJustUploaded] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const [showDownload, setShowDownload] = useState(false)
  const [password, setPassword] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  const [lightbox, setLightbox] = useState<number | null>(null)
  const [clearing, setClearing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const refreshPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/wedding/${slug}/photos`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.photos)) setPhotos(data.photos)
      }
    } catch {
      /* non-fatal — gallery just won't refresh */
    }
  }, [slug])

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const files = Array.from(fileList).filter(
        (f) => f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|gif)$/i.test(f.name)
      )
      if (files.length === 0) {
        setUploadError('Those files aren’t photos — please choose images.')
        return
      }

      setUploadError(null)
      setJustUploaded(0)
      setUploading(true)
      setProgress({ done: 0, total: files.length })

      let done = 0
      let failed = 0
      const tooBig: string[] = []
      const uploaded: CloudinaryResult[] = []

      for (const file of files) {
        if (file.size > WEDDING_MAX_FILE_BYTES) {
          tooBig.push(file.name)
          done++
          setProgress({ done, total: files.length })
          continue
        }
        const result = await uploadToCloudinary(file, slug)
        if (result) uploaded.push(result)
        else failed++
        done++
        setProgress({ done, total: files.length })
      }

      // Record the uploads so the gallery / download / cleanup can see them.
      if (uploaded.length > 0) {
        try {
          await fetch(`/api/wedding/${slug}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photos: uploaded }),
          })
        } catch {
          /* if recording fails the asset still exists in Cloudinary; refresh will just miss it */
        }
      }

      setUploading(false)
      const succeeded = uploaded.length
      setJustUploaded(succeeded)
      if (failed > 0) {
        setUploadError(
          `Couldn’t upload ${failed} photo${failed !== 1 ? 's' : ''} right now. Don’t worry — keep them safe on your phone and try again in a little while.`
        )
      } else if (tooBig.length > 0) {
        setUploadError(
          `${tooBig.length} photo${tooBig.length !== 1 ? 's were' : ' was'} over 10MB and skipped — try sending ${tooBig.length !== 1 ? 'those' : 'that one'} a little smaller.`
        )
      }
      await refreshPhotos()
      if (succeeded > 0) {
        setTimeout(() => setJustUploaded(0), 6000)
      }
    },
    [slug, refreshPhotos]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      void handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const doDownload = useCallback(async () => {
    setPwError(null)
    setDownloading(true)
    try {
      const res = await fetch(`/api/wedding/${slug}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.status === 401) {
        setPwError('That password isn’t right.')
        return
      }
      if (res.status === 404 && (await res.clone().json().catch(() => ({})))?.error === 'empty') {
        setPwError('No photos have been shared yet.')
        return
      }
      if (!res.ok) {
        setPwError('Something went wrong preparing your album. Please try again.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}-album.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setShowDownload(false)
      setPassword('')
    } catch {
      setPwError('Something went wrong. Please try again.')
    } finally {
      setDownloading(false)
    }
  }, [slug, password])

  const doClear = useCallback(async () => {
    if (!confirm('Delete ALL uploaded photos for this album? This cannot be undone.')) return
    setClearing(true)
    try {
      const managePw = new URLSearchParams(window.location.search).get('manage') || ''
      const res = await fetch(`/api/wedding/${slug}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: managePw }),
      })
      if (res.ok) {
        setPhotos([])
      } else {
        alert('Could not clear the album.')
      }
    } finally {
      setClearing(false)
    }
  }, [slug])

  // Keyboard nav for the lightbox
  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight') setLightbox((i) => (i === null ? i : (i + 1) % photos.length))
      if (e.key === 'ArrowLeft')
        setLightbox((i) => (i === null ? i : (i - 1 + photos.length) % photos.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, photos.length])

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-28 pt-14 sm:pb-24 sm:pt-20">
      {/* Hero */}
      <header className="text-center">
        <p
          className="text-[11px] uppercase tracking-[0.35em] text-[#4a97cf] sm:text-xs"
          style={serif}
        >
          {welcome}
        </p>
        <h1 className="mt-6 text-6xl leading-none text-[#2c4a5e] sm:text-8xl" style={script}>
          {coupleNames}
        </h1>
        <div className="mx-auto mt-6 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-[#bfe0f2]" />
          <Heart className="h-4 w-4 text-[#5aa9e6]" fill="#5aa9e6" />
          <span className="h-px w-12 bg-[#bfe0f2]" />
        </div>
        <h2 className="mt-6 text-2xl text-[#45677d] sm:text-3xl" style={serif}>
          {title}
        </h2>
        <p
          className="mx-auto mt-4 max-w-xl text-lg italic leading-relaxed text-[#5a7789] sm:text-xl"
          style={serif}
        >
          {intro}
        </p>
      </header>

      {/* Upload */}
      <section className="mt-12">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-3xl border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${
            dragOver ? 'border-[#5aa9e6] bg-[#dceffa]' : 'border-[#bfe0f2] bg-white/70'
          }`}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf5fc]">
            <Camera className="h-8 w-8 text-[#5aa9e6]" />
          </div>
          <h3 className="mt-5 text-2xl text-[#2c4a5e]" style={serif}>
            Share your photos
          </h3>
          <p className="mt-2 text-[#5a7789]" style={serif}>
            Tap below to add photos from your phone, or drag them here.
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5aa9e6] px-8 py-4 text-lg font-medium text-white shadow-sm transition-all active:scale-[0.98] hover:bg-[#4a97cf] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:py-3.5 sm:text-base"
            style={serif}
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Uploading {progress.done}/{progress.total}…
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Choose photos
              </>
            )}
          </button>

          <p className="mx-auto mt-4 max-w-xs text-xs text-[#8aa5b5]" style={serif}>
            Trouble uploading? Don’t worry — keep your photos safe on your phone and try again a
            little later.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files)
              e.target.value = ''
            }}
          />

          {uploading && (
            <div className="mx-auto mt-6 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-[#d6ecfa]">
              <div
                className="h-full rounded-full bg-[#5aa9e6] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          {!uploading && justUploaded > 0 && (
            <p className="mt-5 inline-flex items-center gap-2 text-[#3f8f5a]" style={serif}>
              <Check className="h-5 w-5" />
              Thank you! {justUploaded} photo{justUploaded !== 1 ? 's' : ''} added to the album.
            </p>
          )}
          {uploadError && (
            <p className="mt-4 text-sm text-[#c0564c]" style={serif}>
              {uploadError}
            </p>
          )}
        </div>
      </section>

      {/* Gallery */}
      <section className="mt-16">
        <div className="text-center">
          <h3 className="text-3xl text-[#2c4a5e]" style={script}>
            The album so far
          </h3>
          <p className="mt-1 text-sm uppercase tracking-[0.25em] text-[#4a97cf]" style={serif}>
            {photos.length} moment{photos.length !== 1 ? 's' : ''} shared
          </p>
        </div>

        {photos.length === 0 ? (
          <p className="mt-10 text-center italic text-[#8aa5b5]" style={serif}>
            No photos yet — be the first to share one!
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setLightbox(i)}
                className="group relative aspect-square overflow-hidden rounded-xl bg-[#eaf5fc] shadow-sm ring-1 ring-[#bfe0f2]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl(photo.url)}
                  alt="Wedding moment"
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Download for the couple */}
      <section className="mt-20 text-center">
        <div className="mx-auto max-w-md rounded-3xl border border-[#bfe0f2] bg-white/70 p-8">
          <h3 className="text-2xl text-[#2c4a5e]" style={serif}>
            Are you the happy couple?
          </h3>
          <p className="mt-2 text-[#5a7789]" style={serif}>
            Download every photo as a single album.
          </p>
          <button
            onClick={() => {
              setPwError(null)
              setShowDownload(true)
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#5aa9e6] px-7 py-3 text-[#3f7fae] transition-colors hover:bg-[#eaf5fc]"
            style={serif}
          >
            <Download className="h-5 w-5" />
            Download album
          </button>
        </div>

        {manage && (
          <div className="mt-6">
            <button
              onClick={doClear}
              disabled={clearing}
              className="inline-flex items-center gap-2 text-sm text-[#c0564c]/80 hover:text-[#c0564c] disabled:opacity-60"
              style={serif}
            >
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete all photos (test cleanup)
            </button>
          </div>
        )}
      </section>

      {/* Footer credit — the ONLY Qwikker mark on the page */}
      <footer className="mt-20 flex flex-col items-center gap-2 opacity-60">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#8aa5b5]" style={serif}>
          Powered by
        </span>
        <Image
          src="/qwikker-logo-web.svg"
          alt="Qwikker Bournemouth"
          width={96}
          height={24}
          className="h-5 w-auto"
        />
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#8aa5b5]" style={serif}>
          Bournemouth
        </span>
      </footer>

      {/* Mobile floating "add photos" button — always within thumb reach while browsing */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="fixed bottom-5 left-1/2 z-40 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#5aa9e6] px-6 py-3.5 text-base font-medium text-white shadow-lg shadow-[#5aa9e6]/40 transition-transform active:scale-95 disabled:opacity-70 sm:hidden"
        style={serif}
      >
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Uploading {progress.done}/{progress.total}…
          </>
        ) : (
          <>
            <Camera className="h-5 w-5" />
            Add photos
          </>
        )}
      </button>

      {/* Download password modal */}
      {showDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#2c4a5e]/40"
            onClick={() => {
              if (!downloading) setShowDownload(false)
            }}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eaf5fc]">
              <Lock className="h-6 w-6 text-[#5aa9e6]" />
            </div>
            <h3 className="mt-4 text-center text-xl text-[#2c4a5e]" style={serif}>
              Enter the album password
            </h3>
            <input
              type="password"
              value={password}
              autoFocus
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password && !downloading) void doDownload()
              }}
              placeholder="Password"
              className="mt-5 w-full rounded-xl border border-[#bfe0f2] bg-white px-4 py-3 text-center text-lg tracking-widest text-[#2c4a5e] outline-none focus:border-[#5aa9e6]"
            />
            {pwError && (
              <p className="mt-3 text-center text-sm text-[#c0564c]" style={serif}>
                {pwError}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  if (!downloading) {
                    setShowDownload(false)
                    setPassword('')
                    setPwError(null)
                  }
                }}
                className="flex-1 rounded-full border border-[#bfe0f2] py-3 text-[#5a7789] transition-colors hover:bg-[#eaf5fc]"
                style={serif}
              >
                Cancel
              </button>
              <button
                onClick={() => void doDownload()}
                disabled={!password || downloading}
                className="flex-1 rounded-full bg-[#5aa9e6] py-3 font-medium text-white transition-colors hover:bg-[#4a97cf] disabled:opacity-60"
                style={serif}
              >
                {downloading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Preparing…
                  </span>
                ) : (
                  'Download'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f2c3f]/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightbox((i) => (i === null ? i : (i - 1 + photos.length) % photos.length))
                }}
                aria-label="Previous"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                className="absolute right-4 top-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightbox((i) => (i === null ? i : (i + 1) % photos.length))
                }}
                aria-label="Next"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullUrl(photos[lightbox].url)}
            alt="Wedding moment"
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
