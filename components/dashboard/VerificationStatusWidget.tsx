'use client'

import { useState } from 'react'
import { MapPin, CheckCircle2, AlertCircle, ExternalLink, Lock } from 'lucide-react'
import { getVerificationStatus, isGoogleVerified, isAiEligibleTier, isFreeTier } from '@/lib/atlas/eligibility'
import Link from 'next/link'
import { AtlasInfoModal } from './atlas-info-modal'

interface VerificationStatusWidgetProps {
  business: {
    id: string
    business_name: string
    google_place_id?: string | null
    latitude?: number | null
    longitude?: number | null
    business_tier?: string | null
  }
}

export function VerificationStatusWidget({ business }: VerificationStatusWidgetProps) {
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const verificationStatus = getVerificationStatus(business)
  const isVerified = isGoogleVerified(business)
  const hasAtlasTier = isAiEligibleTier(business.business_tier)
  const isFree = isFreeTier(business.business_tier)
  
  const handleVerifyClick = () => {
    // Redirect to profile page with Google verification flow
    // This reuses the existing Google verification component/flow
    window.location.href = `/dashboard/profile?action=verify-google`
  }
  
  // STATE B: FREE TIER + VERIFIED = Show Atlas Upgrade Promo (not locked verification)
  if (isFree && isVerified) {
    return (
      <>
        <div className="bg-slate-800/50 border border-emerald-500/20 rounded-xl p-6 relative overflow-hidden">
          {/* Subtle color accent */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                  <MapPin className="w-6 h-6 text-emerald-400" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Atlas Placement
                  </h3>
                  <p className="text-sm text-slate-400">
                    Available in selected cities
                  </p>
                </div>
              </div>
            </div>
            
            {/* Message */}
            <div className="mb-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                Atlas is QWIKKER's AI-guided discovery map. Upgrading your plan unlocks placement, directions, and real-time local discovery.
              </p>
            </div>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard/settings#pricing"
                className="flex-1 px-4 py-2.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40 font-medium rounded-lg transition-colors flex items-center justify-center"
              >
                <span>Upgrade to Be Surfaced in Atlas</span>
              </Link>
              
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-600/50"
              >
                <span className="text-sm">What is Atlas?</span>
              </button>
            </div>
          </div>
        </div>

        <AtlasInfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    )
  }
  
  // STATE A: FREE TIER + NOT VERIFIED = Show locked state
  if (isFree) {
    return (
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-700/50 text-slate-400">
              <MapPin className="w-6 h-6" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white">
                Location Verification
              </h3>
              <p className="text-sm font-medium text-slate-400">
                Locked
              </p>
            </div>
          </div>
          
          {/* Locked badge */}
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/50 flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Premium
          </span>
        </div>
        
        {/* Description */}
        <div className="mb-4">
          <p className="text-sm text-slate-300 mb-2">
            Your business is live on QWIKKER.
          </p>
          <p className="text-sm text-slate-400">
            Atlas placement is available on upgraded plans. Upgrade to unlock Atlas and Google verification.
          </p>
        </div>
        
        {/* CTA */}
        <Link
          href="/dashboard/billing"
          className="w-full px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span>View Plans</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    )
  }
  
  // AI-ELIGIBLE TIERS: Show normal verification flow
  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-white/5 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isVerified 
              ? 'bg-[#00d083]/10 text-[#00d083]' 
              : 'bg-amber-500/10 text-amber-500'
          }`}>
            {isVerified ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <MapPin className="w-6 h-6" />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white">
              Location Verification
            </h3>
            <p className={`text-sm font-medium ${
              isVerified ? 'text-[#00d083]' : 'text-amber-500'
            }`}>
              {isVerified ? 'Complete' : 'Incomplete'}
            </p>
          </div>
        </div>
        
        {/* Status badge */}
        {isVerified && (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#00d083]/10 text-[#00d083] border border-[#00d083]/20">
            Verified
          </span>
        )}
      </div>
      
      {/* Description */}
      <div className="mb-4">
        {isVerified ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-300">
              Your location is verified. Your business can appear in Atlas (subject to your plan).
            </p>
            {hasAtlasTier && (
              <p className="text-sm text-[#00d083]">
                ✓ Your {business.business_tier === 'free_trial' ? 'Featured trial' : business.business_tier} plan includes Atlas map placement
              </p>
            )}
            {business.google_place_id && (
              <p className="text-xs text-slate-500 mt-2">
                Google Place connected • Verified
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {verificationStatus === 'incomplete' ? (
              <>
                <p className="text-sm text-slate-300">
                  Your business is live on QWIKKER.
                </p>
                <p className="text-sm text-slate-300">
                  Verify with Google to also appear on QWIKKER Atlas (map discovery).
                </p>
                <div className="flex items-start gap-2 text-xs text-slate-400 mt-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Atlas shows customers exactly where you are with real-time directions
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-amber-400">
                  Your Google verification is missing location coordinates.
                </p>
                <p className="text-xs text-slate-400">
                  Please re-verify to fix this issue.
                </p>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* CTA Button */}
      {!isVerified && (
        <button
          onClick={handleVerifyClick}
          disabled={loading}
          className="w-full px-4 py-2.5 bg-[#00d083] hover:bg-[#00d083]/90 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="animate-pulse">Verifying...</span>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              <span>Verify with Google</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
      
      {/* Optional: Re-verify button for verified businesses */}
      {isVerified && verificationStatus === 'missing_coords' && (
        <button
          onClick={handleVerifyClick}
          className="w-full px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <MapPin className="w-4 h-4" />
          <span>Fix Verification</span>
        </button>
      )}
    </div>
  )
}
