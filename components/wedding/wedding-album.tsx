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
import { createClient } from '@/lib/supabase/client'
import { WEDDING_BUCKET, WEDDING_MAX_FILE_BYTES } from '@/lib/wedding/config'

interface Photo {
  name: string
  path: string
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
  const supabase = createClient()

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

      for (const file of files) {
        if (file.size > WEDDING_MAX_FILE_BYTES) {
          tooBig.push(file.name)
          done++
          setProgress({ done, total: files.length })
          continue
        }
        const rawExt = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const ext = rawExt || 'jpg'
        const key = `${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
        const { error } = await supabase.storage.from(WEDDING_BUCKET).upload(key, file, {
          contentType: file.type || undefined,
          upsert: false,
        })
        if (error) failed++
        done++
        setProgress({ done, total: files.length })
      }

      setUploading(false)
      const succeeded = files.length - failed - tooBig.length
      setJustUploaded(succeeded)
      if (tooBig.length > 0) {
        setUploadError(`${tooBig.length} photo(s) were too large (max 50MB each) and were skipped.`)
      } else if (failed > 0) {
        setUploadError(`${failed} photo(s) didn’t upload — please try those again.`)
      }
      await refreshPhotos()
      if (succeeded > 0) {
        setTimeout(() => setJustUploaded(0), 6000)
      }
    },
    [slug, supabase, refreshPhotos]
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
    <div className="mx-auto w-full max-w-5xl px-5 pb-24 pt-14 sm:pt-20">
      {/* Hero */}
      <header className="text-center">
        <p
          className="text-[11px] uppercase tracking-[0.35em] text-[#b08d57] sm:text-xs"
          style={serif}
        >
          {welcome}
        </p>
        <h1 className="mt-6 text-6xl leading-none text-[#3a3330] sm:text-8xl" style={script}>
          {coupleNames}
        </h1>
        <div className="mx-auto mt-6 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-[#d8c6a8]" />
          <Heart className="h-4 w-4 text-[#b08d57]" fill="#b08d57" />
          <span className="h-px w-12 bg-[#d8c6a8]" />
        </div>
        <h2 className="mt-6 text-2xl text-[#5a4f45] sm:text-3xl" style={serif}>
          {title}
        </h2>
        <p
          className="mx-auto mt-4 max-w-xl text-lg italic leading-relaxed text-[#7a6d60] sm:text-xl"
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
            dragOver ? 'border-[#b08d57] bg-[#f3e9d7]' : 'border-[#d8c6a8] bg-white/60'
          }`}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f3e9d7]">
            <Camera className="h-8 w-8 text-[#b08d57]" />
          </div>
          <h3 className="mt-5 text-2xl text-[#3a3330]" style={serif}>
            Share your photos
          </h3>
          <p className="mt-2 text-[#7a6d60]" style={serif}>
            Tap below to add photos from your phone, or drag them here.
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#b08d57] px-8 py-3.5 text-base font-medium text-white shadow-sm transition-all hover:bg-[#9a7a48] disabled:cursor-not-allowed disabled:opacity-70"
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
            <div className="mx-auto mt-6 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-[#eaddc6]">
              <div
                className="h-full rounded-full bg-[#b08d57] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          {!uploading && justUploaded > 0 && (
            <p className="mt-5 inline-flex items-center gap-2 text-[#5a8a5a]" style={serif}>
              <Check className="h-5 w-5" />
              Thank you! {justUploaded} photo{justUploaded !== 1 ? 's' : ''} added to the album.
            </p>
          )}
          {uploadError && (
            <p className="mt-4 text-sm text-[#b5544a]" style={serif}>
              {uploadError}
            </p>
          )}
        </div>
      </section>

      {/* Gallery */}
      <section className="mt-16">
        <div className="text-center">
          <h3 className="text-3xl text-[#3a3330]" style={script}>
            The album so far
          </h3>
          <p className="mt-1 text-sm uppercase tracking-[0.25em] text-[#b08d57]" style={serif}>
            {photos.length} moment{photos.length !== 1 ? 's' : ''} shared
          </p>
        </div>

        {photos.length === 0 ? (
          <p className="mt-10 text-center italic text-[#9a8d7e]" style={serif}>
            No photos yet — be the first to share one!
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, i) => (
              <button
                key={photo.path}
                onClick={() => setLightbox(i)}
                className="group relative aspect-square overflow-hidden rounded-xl bg-[#eaddc6] shadow-sm ring-1 ring-black/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
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
        <div className="mx-auto max-w-md rounded-3xl border border-[#e4d5ba] bg-white/60 p-8">
          <h3 className="text-2xl text-[#3a3330]" style={serif}>
            Are you the happy couple?
          </h3>
          <p className="mt-2 text-[#7a6d60]" style={serif}>
            Download every photo as a single album.
          </p>
          <button
            onClick={() => {
              setPwError(null)
              setShowDownload(true)
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#b08d57] px-7 py-3 text-[#8a6d3f] transition-colors hover:bg-[#f3e9d7]"
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
              className="inline-flex items-center gap-2 text-sm text-[#b5544a]/80 hover:text-[#b5544a] disabled:opacity-60"
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
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#9a8d7e]" style={serif}>
          Powered by
        </span>
        <Image
          src="/qwikker-logo-web.svg"
          alt="Qwikker Bournemouth"
          width={96}
          height={24}
          className="h-5 w-auto"
        />
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#9a8d7e]" style={serif}>
          Bournemouth
        </span>
      </footer>

      {/* Download password modal */}
      {showDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!downloading) setShowDownload(false)
            }}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-[#fbf6ee] p-7 shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f3e9d7]">
              <Lock className="h-6 w-6 text-[#b08d57]" />
            </div>
            <h3 className="mt-4 text-center text-xl text-[#3a3330]" style={serif}>
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
              className="mt-5 w-full rounded-xl border border-[#d8c6a8] bg-white px-4 py-3 text-center text-lg tracking-widest text-[#3a3330] outline-none focus:border-[#b08d57]"
            />
            {pwError && (
              <p className="mt-3 text-center text-sm text-[#b5544a]" style={serif}>
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
                className="flex-1 rounded-full border border-[#d8c6a8] py-3 text-[#7a6d60] transition-colors hover:bg-[#f3e9d7]"
                style={serif}
              >
                Cancel
              </button>
              <button
                onClick={() => void doDownload()}
                disabled={!password || downloading}
                className="flex-1 rounded-full bg-[#b08d57] py-3 font-medium text-white transition-colors hover:bg-[#9a7a48] disabled:opacity-60"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
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
            src={photos[lightbox].url}
            alt="Wedding moment"
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
