'use client'

import { useState, useEffect } from 'react'

interface PassInstallData {
  passUrl: string
  googleWalletUrl: string | null
  serialNumber: string
  createdAt: number
}

export function WalletInstallBanner() {
  const [installData, setInstallData] = useState<PassInstallData | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [deviceType, setDeviceType] = useState<'iphone' | 'android' | 'desktop'>('desktop')

  useEffect(() => {
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/i.test(ua)) setDeviceType('iphone')
    else if (/Android/i.test(ua)) setDeviceType('android')

    try {
      const wasDismissed = localStorage.getItem('qwikker-pass-install-dismissed')
      if (wasDismissed) {
        setDismissed(true)
        return
      }

      const raw = localStorage.getItem('qwikker-pass-install')
      if (!raw) return

      const data: PassInstallData = JSON.parse(raw)
      // Only show for passes created in the last 7 days
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - data.createdAt > sevenDays) {
        localStorage.removeItem('qwikker-pass-install')
        return
      }

      setInstallData(data)
    } catch {}
  }, [])

  function handleDismiss() {
    setDismissed(true)
    try {
      localStorage.setItem('qwikker-pass-install-dismissed', 'true')
      localStorage.removeItem('qwikker-pass-install')
    } catch {}
  }

  function handleInstalled() {
    setDismissed(true)
    try {
      localStorage.setItem('qwikker-pass-install-dismissed', 'true')
      localStorage.removeItem('qwikker-pass-install')
    } catch {}
  }

  if (!installData || dismissed || deviceType === 'desktop') return null

  const installUrl = deviceType === 'android' && installData.googleWalletUrl
    ? installData.googleWalletUrl
    : installData.passUrl

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0 mt-0.5">
          {deviceType === 'iphone' ? '🍎' : '📱'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">
            Your Qwikker pass isn&apos;t in your wallet yet
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Add it now to get offers, secret menus and loyalty stamps delivered straight to your phone.
          </p>

          <div className="flex gap-2 mt-3">
            <a
              href={installUrl}
              onClick={handleInstalled}
              className="flex-1 py-2.5 bg-[#00D083] hover:bg-[#00b86f] text-black font-semibold text-sm rounded-lg text-center transition-colors"
            >
              {deviceType === 'android' ? 'Add to Google Wallet' : 'Add to Apple Wallet'}
            </a>
            <button
              onClick={handleDismiss}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm rounded-lg transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
