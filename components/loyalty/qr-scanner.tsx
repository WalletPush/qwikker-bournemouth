'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, AlertTriangle, PartyPopper, Clock } from 'lucide-react'
import { StampGrid } from './stamp-grid'
import { STAMP_ICONS } from '@/lib/loyalty/loyalty-utils'
import type { StampIconKey } from '@/lib/loyalty/loyalty-utils'

interface QrScannerProps {
  walletPassId: string
  onClose: () => void
  onStampEarned?: () => void
}

type ScanState = 'scanning' | 'processing' | 'success' | 'reward' | 'cooldown' | 'error' | 'not_member'

interface EarnResult {
  newBalance: number
  rewardUnlocked: boolean
  proximityMessage: string | null
  nextEligibleAt: string | null
  program: {
    business_name: string
    logo_url: string | null
    program_name: string
    reward_description: string
    reward_threshold: number
    stamp_icon: string
    stamp_label: string
  }
}

function parseEarnUrl(url: string): { publicId: string; token: string } | null {
  try {
    const parsed = new URL(url)
    const pathMatch = parsed.pathname.match(/\/loyalty\/start\/([^/]+)/)
    if (!pathMatch) return null
    const publicId = pathMatch[1]
    const token = parsed.searchParams.get('t')
    const mode = parsed.searchParams.get('mode')
    if (!token || mode !== 'earn') return null
    return { publicId, token }
  } catch {
    return null
  }
}

export function QrScanner({ walletPassId, onClose, onStampEarned }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(true)

  const [state, setState] = useState<ScanState>('scanning')
  const [earnResult, setEarnResult] = useState<EarnResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [countdown, setCountdown] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    scanningRef.current = false
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const handleClose = useCallback(() => {
    stopCamera()
    if (state === 'success' || state === 'reward') {
      onStampEarned?.()
    }
    onClose()
  }, [stopCamera, onClose, onStampEarned, state])

  const callEarnApi = useCallback(async (publicId: string, token: string) => {
    setState('processing')
    stopCamera()

    try {
      const res = await fetch('/api/loyalty/earn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId, token, walletPassId }),
      })
      const data = await res.json()

      if (data.reason === 'cooldown') {
        setEarnResult({
          newBalance: data.newBalance ?? 0,
          rewardUnlocked: false,
          proximityMessage: null,
          nextEligibleAt: data.nextEligibleAt,
          program: data.program || { business_name: '', logo_url: null, program_name: '', reward_description: '', reward_threshold: 10, stamp_icon: 'stamp', stamp_label: 'stamps' },
        })
        setState('cooldown')
        return
      }

      if (data.reason === 'not_member') {
        setErrorMessage(`You're not a member of this loyalty program yet. Scan the join QR or find them on the Discover page.`)
        setState('not_member')
        return
      }

      if (!res.ok) {
        setErrorMessage(data.error || 'Something went wrong')
        setState('error')
        return
      }

      setEarnResult({
        newBalance: data.newBalance,
        rewardUnlocked: data.rewardUnlocked,
        proximityMessage: data.proximityMessage,
        nextEligibleAt: data.nextEligibleAt,
        program: data.program || { business_name: '', logo_url: null, program_name: '', reward_description: '', reward_threshold: 10, stamp_icon: 'stamp', stamp_label: 'stamps' },
      })
      setState(data.rewardUnlocked ? 'reward' : 'success')
    } catch {
      setErrorMessage('Connection failed. Please try again.')
      setState('error')
    }
  }, [walletPassId, stopCamera])

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>

    async function startScanning() {
      // Check BarcodeDetector support first
      if (!('BarcodeDetector' in window)) {
        setCameraError(
          'Your browser doesn\'t support QR scanning. Use your phone\'s camera app to scan the QR code instead.'
        )
        return
      }

      let detector: any
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      } catch {
        setCameraError('QR scanning is not available on this device.')
        return
      }

      // Request camera with autofocus for close-up QR scanning
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        })
        streamRef.current = stream

        // Try to enable continuous autofocus if supported
        const track = stream.getVideoTracks()[0]
        const capabilities = track.getCapabilities?.() as any
        if (capabilities?.focusMode?.includes?.('continuous')) {
          try {
            await (track as any).applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
          } catch { /* not critical */ }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch {
        setCameraError('Camera access denied. Please allow camera access and try again.')
        return
      }

      // Scan via canvas (more reliable than passing video directly on iOS)
      intervalId = setInterval(async () => {
        if (!scanningRef.current || !videoRef.current || !canvasRef.current) return
        const video = videoRef.current
        if (video.readyState < video.HAVE_ENOUGH_DATA) return

        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(video, 0, 0)

        try {
          const barcodes = await detector.detect(canvas)
          if (barcodes.length > 0 && scanningRef.current) {
            const parsed = parseEarnUrl(barcodes[0].rawValue)
            if (parsed) {
              scanningRef.current = false
              callEarnApi(parsed.publicId, parsed.token)
            }
          }
        } catch {
          // Some frames fail to detect, continue
        }
      }, 250)
    }

    if (state === 'scanning') {
      scanningRef.current = true
      startScanning()
    }

    return () => {
      clearInterval(intervalId)
    }
  }, [state, callEarnApi])

  // Cooldown countdown
  useEffect(() => {
    if (state !== 'cooldown' || !earnResult?.nextEligibleAt) return
    const tick = () => {
      const diff = new Date(earnResult.nextEligibleAt!).getTime() - Date.now()
      if (diff <= 0) { setCountdown('Eligible now'); return }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setCountdown(`${mins}m ${secs.toString().padStart(2, '0')}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [state, earnResult?.nextEligibleAt])

  const stampIconName = earnResult?.program
    ? (STAMP_ICONS[earnResult.program.stamp_icon as StampIconKey]?.icon || 'Stamp')
    : 'Stamp'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
    >
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-white font-semibold text-lg">
          {state === 'scanning' ? 'Scan to Earn' : ''}
        </p>
        <button
          onClick={handleClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {/* Camera view */}
          {state === 'scanning' && (
            <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-sm space-y-4">
              {cameraError ? (
                <div className="text-center space-y-3 py-10">
                  <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                  <p className="text-zinc-300 text-sm">{cameraError}</p>
                  <button onClick={handleClose} className="mt-4 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors">
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative aspect-square w-full max-w-[300px] mx-auto rounded-2xl overflow-hidden border-2 border-zinc-700">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-emerald-400/50 rounded-xl" />
                    </div>
                  </div>
                  <p className="text-zinc-500 text-xs text-center">
                    Point your camera at the earn QR code on the counter
                  </p>
                </>
              )}
            </motion.div>
          )}

          {/* Processing */}
          {state === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-zinc-400 text-sm">Recording your stamp...</p>
            </motion.div>
          )}

          {/* Success */}
          {state === 'success' && earnResult && (
            <motion.div key="success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-5 max-w-sm w-full">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
              >
                <span className="text-3xl text-emerald-400 font-bold">+1</span>
              </motion.div>
              <div className="text-center">
                <p className="text-white text-xl font-semibold">Stamp earned</p>
                <p className="text-zinc-400 text-sm mt-1">
                  {earnResult.newBalance} / {earnResult.program.reward_threshold} {earnResult.program.stamp_label.toLowerCase()}
                </p>
              </div>
              <StampGrid
                stampIcon={stampIconName}
                filled={earnResult.newBalance}
                threshold={earnResult.program.reward_threshold}
                animateIndex={earnResult.newBalance - 1}
                size={32}
                className="justify-center"
              />
              {earnResult.proximityMessage && (
                <p className="text-emerald-400 text-sm font-medium">{earnResult.proximityMessage}</p>
              )}
              <button onClick={handleClose} className="mt-4 w-full h-11 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors">
                Done
              </button>
            </motion.div>
          )}

          {/* Reward unlocked */}
          {state === 'reward' && earnResult && (
            <motion.div key="reward" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5 max-w-sm w-full">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 250, damping: 12 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center"
              >
                <PartyPopper className="w-10 h-10 text-emerald-400" />
              </motion.div>
              <div className="text-center">
                <p className="text-emerald-400 text-2xl font-bold">Reward unlocked!</p>
                <p className="text-white text-lg mt-2">{earnResult.program.reward_description}</p>
              </div>
              <StampGrid
                stampIcon={stampIconName}
                filled={earnResult.newBalance}
                threshold={earnResult.program.reward_threshold}
                size={32}
                className="justify-center"
              />
              <button onClick={handleClose} className="mt-4 w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors">
                View Reward
              </button>
            </motion.div>
          )}

          {/* Cooldown */}
          {state === 'cooldown' && earnResult && (
            <motion.div key="cooldown" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-5 max-w-sm w-full">
              <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <Clock className="w-7 h-7 text-zinc-400" />
              </div>
              <div className="text-center">
                <p className="text-white text-lg font-semibold">Come back soon</p>
                <p className="text-zinc-400 text-sm mt-1">You&apos;ve already earned a stamp recently.</p>
              </div>
              {countdown && (
                <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-6 py-3 text-center">
                  <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Next eligible in</p>
                  <p className="text-white text-xl font-mono font-semibold">{countdown}</p>
                </div>
              )}
              <button onClick={handleClose} className="mt-4 w-full h-11 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors">
                Done
              </button>
            </motion.div>
          )}

          {/* Not a member */}
          {state === 'not_member' && (
            <motion.div key="not_member" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-5 max-w-sm w-full">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-amber-400" />
              </div>
              <div className="text-center">
                <p className="text-white text-lg font-semibold">Not a member yet</p>
                <p className="text-zinc-400 text-sm mt-1">{errorMessage}</p>
              </div>
              <button onClick={handleClose} className="mt-4 w-full h-11 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors">
                Close
              </button>
            </motion.div>
          )}

          {/* Error */}
          {state === 'error' && (
            <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-5 max-w-sm w-full">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-white text-lg font-semibold">Couldn&apos;t earn</p>
                <p className="text-zinc-400 text-sm mt-1">{errorMessage}</p>
              </div>
              <button onClick={handleClose} className="mt-4 w-full h-11 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-xl transition-colors">
                Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
