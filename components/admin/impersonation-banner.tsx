'use client'

import { useState } from 'react'

interface ImpersonationBannerProps {
  adminUsername: string
  city: string
  hqEmail: string
}

export function ImpersonationBanner({ adminUsername, city, hqEmail }: ImpersonationBannerProps) {
  const [exiting, setExiting] = useState(false)

  const handleExit = async () => {
    setExiting(true)
    try {
      await fetch('/api/hq/stop-impersonate', { method: 'POST' })
      window.location.href = '/hqadmin/franchises'
    } catch {
      setExiting(false)
      alert('Failed to exit impersonation')
    }
  }

  return (
    <div className="bg-amber-600 text-black px-4 py-2 flex items-center justify-between text-sm font-medium sticky top-0 z-[9999]">
      <div className="flex items-center gap-2">
        <span className="opacity-70">HQ viewing as</span>
        <span className="font-semibold">@{adminUsername}</span>
        <span className="opacity-70">in</span>
        <span className="font-semibold capitalize">{city}</span>
        <span className="opacity-50 text-xs ml-2">({hqEmail})</span>
      </div>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="px-3 py-1 bg-black/20 rounded hover:bg-black/30 text-black font-medium disabled:opacity-50"
      >
        {exiting ? 'Exiting...' : 'Return to HQ'}
      </button>
    </div>
  )
}
