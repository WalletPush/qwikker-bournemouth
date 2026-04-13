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
    <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-[#00D083]/10 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#00D083]">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">
            Add your pass to {deviceType === 'android' ? 'Google' : 'Apple'} Wallet
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Get offers, secret menus and loyalty stamps delivered straight to your phone.
          </p>

          <div className="flex gap-2 mt-3 items-center">
            {deviceType === 'android' ? (
              <a
                href={installUrl}
                onClick={handleInstalled}
                className="flex-1 flex justify-center"
              >
                <img src="/images/add-to-google-wallet.svg" alt="Add to Google Wallet" className="h-10" />
              </a>
            ) : (
              <a
                href={installUrl}
                onClick={handleInstalled}
                className="flex-1 py-2.5 bg-[#00D083] hover:bg-[#00b86f] text-black font-semibold text-sm rounded-lg text-center transition-colors"
              >
                Add to Apple Wallet
              </a>
            )}
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
