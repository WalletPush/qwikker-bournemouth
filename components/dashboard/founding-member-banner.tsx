'use client'

import { useState, useEffect } from 'react'
import { getCityFromHostnameClient } from '@/lib/utils/client-city-detection'

interface FoundingMemberConfig {
  founding_member_enabled: boolean
  founding_member_discount: number
  founding_member_title: string
  founding_member_description: string
}

interface FoundingMemberBannerProps {
  profile?: any
  trialDaysLeft?: number
}

export function FoundingMemberBanner({ profile }: FoundingMemberBannerProps) {
  const [config, setConfig] = useState<FoundingMemberConfig | null>(null)

  useEffect(() => {
    const loadFoundingMemberConfig = async () => {
      try {
        const city = getCityFromHostnameClient(window.location.hostname)
        const response = await fetch(`/api/admin/pricing-cards?city=${city}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.config) {
            setConfig({
              founding_member_enabled: data.config.founding_member_enabled ?? true,
              founding_member_discount: data.config.founding_member_discount || 20,
              founding_member_title: data.config.founding_member_title || 'Founding Member Offer',
              founding_member_description: data.config.founding_member_description || '20% off yearly plans for life as a founding member. Choose an annual plan to lock in this rate permanently — it stays the same even when prices change.'
            })
          }
        }
      } catch (error) {
        // Fallback to default config
        setConfig({
          founding_member_enabled: true,
          founding_member_discount: 20,
          founding_member_title: 'Founding Member Offer',
          founding_member_description: '20% off yearly plans for life as a founding member. Choose an annual plan to lock in this rate permanently — it stays the same even when prices change.'
        })
      }
    }

    loadFoundingMemberConfig()
  }, [])

  // Show to ALL businesses when founding member window is open (admin toggle)
  // When spots are full, admin toggles founding_member_enabled off and banner disappears
  if (!config?.founding_member_enabled) {
    return null
  }

  return (
    <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-lg">
      <div className="flex items-center gap-2 justify-center mb-1.5">
        <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="text-emerald-400 font-semibold text-sm">{config.founding_member_title}</span>
      </div>
      <p className="text-slate-300 text-xs leading-relaxed text-center">
        {config.founding_member_description.replace(/\d+%/, `${config.founding_member_discount}%`)}
      </p>
    </div>
  )
}
