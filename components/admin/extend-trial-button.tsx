'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ExtendTrialButtonProps {
  businessId: string
  businessName: string
  currentEndDate?: string
}

export function ExtendTrialButton({ businessId, businessName, currentEndDate }: ExtendTrialButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [customDate, setCustomDate] = useState('')
  const router = useRouter()
  
  const handleExtend = async (days: number) => {
    if (!confirm(`Extend trial for "${businessName}" by ${days} days?`)) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/admin/extend-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, days })
      })
      
      const data = await res.json()
      
      if (data.success) {
        alert(`✅ Success! Trial extended.\n\nNew end date: ${new Date(data.newEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`)
        setShowOptions(false)
        router.refresh()
      } else {
        alert('❌ Error: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to extend trial:', error)
      alert('Failed to extend trial. Check console for details.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCustomDate = async () => {
    if (!customDate) {
      alert('Please select a date')
      return
    }
    
    // Calculate days difference
    const newDate = new Date(customDate)
    const currentDate = currentEndDate ? new Date(currentEndDate) : new Date()
    const daysDiff = Math.ceil((newDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff <= 0) {
      alert('New date must be after current end date')
      return
    }
    
    if (!confirm(`Set new trial end date to ${newDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}?\n\n(+${daysDiff} days)`)) return
    
    await handleExtend(daysDiff)
  }
  
  return (
    <div className="relative">
      {!showOptions ? (
        <button
          onClick={() => setShowOptions(true)}
          className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          disabled={loading}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Extend Trial
        </button>
      ) : (
        <div className="flex flex-col gap-3 p-4 bg-slate-800/50 rounded-lg border border-yellow-500/30">
          {/* Custom Date Picker */}
          <div className="space-y-2">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Set custom end date:
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex-1 bg-slate-900/50 border border-slate-600 text-white px-3 py-2 rounded text-sm focus:outline-none focus:border-yellow-500/50"
                disabled={loading}
              />
              <button
                onClick={handleCustomDate}
                disabled={loading || !customDate}
                className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white px-4 py-2 rounded text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Set
              </button>
            </div>
          </div>
          
          {/* Quick Extend Buttons */}
          <div className="space-y-2">
            <div className="text-xs text-slate-400">
              Or quick extend:
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleExtend(7)}
                disabled={loading}
                className="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 border border-yellow-500/30 px-3 py-2 rounded text-sm font-medium transition-all disabled:opacity-50"
              >
                +7 days
              </button>
              <button
                onClick={() => handleExtend(30)}
                disabled={loading}
                className="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 border border-yellow-500/30 px-3 py-2 rounded text-sm font-medium transition-all disabled:opacity-50"
              >
                +30 days
              </button>
              <button
                onClick={() => handleExtend(90)}
                disabled={loading}
                className="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 border border-yellow-500/30 px-3 py-2 rounded text-sm font-medium transition-all disabled:opacity-50"
              >
                +90 days
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setShowOptions(false)}
            className="text-xs text-slate-500 hover:text-slate-400 mt-1"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

