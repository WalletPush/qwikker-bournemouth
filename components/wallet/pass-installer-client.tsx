'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface PassInstallerClientProps {
  city: string
  displayName: string
  currencySymbol: string
}

export function PassInstallerClient({ 
  city, 
  displayName,
  currencySymbol
}: PassInstallerClientProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [deviceType, setDeviceType] = useState<'desktop' | 'iphone' | 'android'>('desktop')
  const [showQR, setShowQR] = useState(false)
  const [passUrl, setPassUrl] = useState<string | null>(null)
  const [serialNumber, setSerialNumber] = useState<string | null>(null)

  // Detect device type
  useEffect(() => {
    const userAgent = navigator.userAgent
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      setDeviceType('iphone')
    } else if (/Android/i.test(userAgent)) {
      setDeviceType('android')
    } else {
      setDeviceType('desktop')
      setShowQR(true)
    }
  }, [])

  // Generate QR code on desktop
  useEffect(() => {
    if (showQR && deviceType === 'desktop') {
      // Load QRCode.js dynamically
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
      script.async = true
      script.onload = () => {
        const qrDiv = document.getElementById('qr-code')
        if (qrDiv && (window as any).QRCode) {
          // Clear any existing QR code
          qrDiv.innerHTML = ''
          new (window as any).QRCode(qrDiv, {
            text: window.location.href, // Same URL (mobile will show form)
            width: 220,
            height: 220,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: (window as any).QRCode.CorrectLevel.H
          })
        }
      }
      document.body.appendChild(script)
      
      return () => {
        // Cleanup
        document.body.removeChild(script)
      }
    }
  }, [showQR, deviceType])

  // Countdown timer after success
  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      
      if (countdown === 1 && serialNumber) {
        // Redirect to welcome page
        window.location.href = `/welcome?wallet_pass_id=${serialNumber}&name=${encodeURIComponent(formData.firstName + ' ' + formData.lastName)}`
      }
      
      return () => clearTimeout(timer)
    }
  }, [success, countdown, serialNumber, formData.firstName, formData.lastName])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // ✅ SECURE: Call server API route (keys never exposed to browser)
      const response = await fetch('/api/walletpass/create-main-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          city: city // Dynamic per hostname
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create pass')
      }

      // Success!
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const finalPassUrl = isMobile 
        ? data.passUrl.replace('?t=', '.pkpass?t=')
        : data.passUrl

      setPassUrl(finalPassUrl)
      setSerialNumber(data.serialNumber)
      setSuccess(true)
      
      // ✅ CRITICAL: Send to GHL for pass creation tracking
      // This is non-blocking - don't prevent pass installation if GHL fails
      try {
        console.log('📡 Syncing pass creation to GHL...')
        const ghlResponse = await fetch('/api/internal/ghl-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formData: {
              eventType: 'pass_creation', // Routes to ghl_pass_creation_webhook_url
              First_Name: formData.firstName,
              Last_Name: formData.lastName,
              email: formData.email,
              serialNumber: data.serialNumber,
              passTypeIdentifier: 'pass.com.WalletPush',
              url: data.passUrl,
              device: deviceType,
              franchise_city: city,
              // GHL expects these headers for webhook context
              headers: {
                host: 'services.leadconnectorhq.com',
                'cf-ray': '940a0fc3c99aecfd-LHR' // Static placeholder for consistency
              }
            },
            city: city
          })
        })
        
        if (ghlResponse.ok) {
          console.log('✅ Pass creation synced to GHL')
        } else {
          const ghlError = await ghlResponse.text()
          console.warn('⚠️  GHL sync failed (non-critical):', ghlError)
        }
      } catch (ghlError) {
        console.warn('⚠️  GHL sync failed (non-critical):', ghlError)
        // Don't block user flow if GHL fails - pass installation is more important
      }
      
      setLoading(false)
      
      // Redirect to pass URL (opens wallet app on mobile)
      window.location.href = finalPassUrl

    } catch (err: any) {
      console.error('Pass creation error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo + City Name */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            {/* Qwikker Logo */}
            <div className="relative w-64 h-20 mx-auto mb-4">
              <Image
                src="/qwikker-logo-web.svg"
                alt="QWIKKER"
                fill
                className="object-contain"
                priority
              />
            </div>
            {/* City Name */}
            <h2 className="text-2xl font-bold text-white">
              {displayName}
            </h2>
          </div>
        </div>

        {/* Main Container */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header - Dark, restrained */}
          <div className="bg-neutral-900 border-b border-neutral-800 p-6 text-center">
            <h1 className="text-2xl font-medium text-white mb-2">
              Get your {displayName} pass
            </h1>
            <p className="text-sm text-neutral-400">
              Join your local community and unlock exclusive offers
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Device-Specific Message */}
            <div className="mb-6">
              {deviceType === 'iphone' && (
                <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-4">
                  <p className="text-neutral-400 text-xs mb-1">
                    You're on mobile.
                  </p>
                  <p className="text-neutral-300 text-sm">
                    Complete the form below and your pass will be delivered to Apple Wallet.
                  </p>
                </div>
              )}
              
              {deviceType === 'android' && (
                <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-4">
                  <p className="text-neutral-400 text-xs mb-3">
                    You're on Android.
                  </p>
                  <p className="text-neutral-300 text-sm mb-3">
                    To get your pass, follow these steps:
                  </p>
                  <ol className="text-left text-xs text-neutral-400 space-y-2 mb-4 pl-4">
                    <li>1. Download WalletPasses app below</li>
                    <li>2. Complete the form</li>
                    <li>3. Install your pass</li>
                  </ol>
                  <a
                    href="https://play.google.com/store/apps/details?id=io.walletpasses.android&hl=en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block hover:opacity-80 transition-opacity"
                  >
                    <img
                      src="https://walletpush.s3.us-east-1.amazonaws.com/walletpush/google-play-badge-logo-png-transparent.png"
                      alt="Get it on Google Play"
                      className="w-40 mx-auto"
                    />
                  </a>
                </div>
              )}
              
              {deviceType === 'desktop' && (
                <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-6 text-center">
                  {/* Context - secondary */}
                  <p className="text-neutral-400 text-xs mb-3">
                    You're on desktop.
                  </p>
                  {/* Instruction - primary */}
                  <p className="text-neutral-200 text-sm font-medium mb-6">
                    Scan this QR code with your phone
                  </p>
                  {/* QR Code */}
                  <div className="flex justify-center mb-4">
                    <div
                      id="qr-code"
                      className="inline-block p-6 bg-white rounded-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] border border-neutral-200"
                    />
                  </div>
                  {/* Friction removers - very muted */}
                  <p className="text-xs text-neutral-500 mb-2">
                    Free. No app required.
                  </p>
                  {/* Compatibility - tertiary */}
                  <p className="text-xs text-neutral-600">
                    Works with iPhone and Android
                  </p>
                </div>
              )}
            </div>

            {/* Form (hidden on desktop) */}
            {deviceType !== 'desktop' && !success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00D083] focus:border-transparent transition-all"
                    placeholder="Enter your first name"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00D083] focus:border-transparent transition-all"
                    placeholder="Enter your last name"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#00D083] focus:border-transparent transition-all"
                    placeholder="Enter your email"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-red-400 text-sm">❌ {error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#00D083] hover:bg-[#00b86f] text-black font-semibold text-base rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00D083]/10 hover:shadow-[#00D083]/20"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Creating your pass<span className="animate-pulse">...</span>
                    </span>
                  ) : (
                    'Get your pass'
                  )}
                </button>

                <p className="text-xs text-center text-neutral-600 mt-4">
                  Free forever · No payment required
                </p>
              </form>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-[#00D083]/10 border border-[#00D083]/20 rounded-lg p-6 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-[#00D083] mb-2">
                  Your Pass is Ready!
                </h3>
                <p className="text-neutral-300 mb-4">
                  Please add the pass to your wallet now.
                </p>
                <div className="bg-neutral-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-neutral-400">
                    Redirecting to your dashboard in <span className="text-[#00D083] font-bold text-lg">{countdown}</span> seconds...
                  </p>
                </div>
                {passUrl && (
                  <a
                    href={passUrl}
                    className="inline-block px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Didn't work? Tap here to add pass
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Footer - Whisper quiet */}
          <div className="bg-neutral-900 px-6 py-4 text-center border-t border-neutral-800">
            <p className="text-xs text-neutral-700">
              Powered by <span className="text-neutral-600">QWIKKER</span>
            </p>
          </div>
        </div>

        {/* Info Section */}
        {deviceType !== 'desktop' && !success && (
          <div className="mt-6 text-center">
            <p className="text-xs text-neutral-600">
              Your pass includes exclusive offers, secret menus, and local perks
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
