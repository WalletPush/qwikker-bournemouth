'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GooglePlacesAutocompleteV2 } from '@/components/ui/google-places-autocomplete-v2'
import { updateProfileWithGoogleVerification } from '@/lib/actions/profile-verification-actions'
import { isGoogleVerified } from '@/lib/atlas/eligibility'
import { CheckCircle2, MapPin, AlertCircle } from 'lucide-react'

interface GoogleVerificationSectionProps {
  profile: {
    id: string
    business_name: string
    google_place_id?: string | null
    latitude?: number | null
    longitude?: number | null
    google_verified_at?: string | null
    rating?: number | null
    business_address?: string | null
  }
}

export function GoogleVerificationSection({ profile }: GoogleVerificationSectionProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [shouldHighlight, setShouldHighlight] = useState(false)
  
  const isVerified = isGoogleVerified(profile)
  const actionParam = searchParams?.get('action')
  
  // Handle auto-scroll and highlight when ?action=verify-google
  useEffect(() => {
    if (actionParam === 'verify-google') {
      // Remove query param to prevent re-opening on refresh
      router.replace('/dashboard/profile', { scroll: false })
      
      // Scroll to verification section with highlight
      const section = document.getElementById('google-verification')
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setShouldHighlight(true)
        
        // Remove highlight after animation
        setTimeout(() => {
          setShouldHighlight(false)
        }, 3000)
      }
    }
  }, [actionParam, router])
  
  const handlePlaceSelected = async (placeId: string) => {
    setIsVerifying(true)
    setVerificationResult(null)
    
    try {
      // 1. Fetch place details from API
      const response = await fetch('/api/google/places-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to fetch place details')
      }
      
      if (!result.success || !result.data) {
        throw new Error('Invalid response from verification service')
      }
      
      // 2. Update profile with verification data
      const updateResult = await updateProfileWithGoogleVerification(
        profile.id,
        result.data
      )
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to save verification')
      }
      
      // 3. Show success
      setVerificationResult({
        type: 'success',
        message: `✓ Verified with Google: ${updateResult.data?.businessName || 'Your business'}`
      })
      
      // Refresh page to show updated state
      setTimeout(() => {
        router.refresh()
      }, 1500)
      
    } catch (error) {
      console.error('Verification error:', error)
      setVerificationResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Verification failed'
      })
    } finally {
      setIsVerifying(false)
    }
  }
  
  return (
    <div 
      id="google-verification" 
      className={`group relative transition-all duration-1000 ${
        shouldHighlight ? 'ring-4 ring-[#00d083] ring-opacity-50 rounded-2xl' : ''
      }`}
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
      
      <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
              isVerified 
                ? 'bg-gradient-to-br from-[#00d083] to-[#00b86f]' 
                : 'bg-gradient-to-br from-slate-600 to-slate-700'
            }`}>
              {isVerified ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : (
                <MapPin className="w-6 h-6 text-white" />
              )}
            </div>
            Location Verification
            {isVerified && (
              <span className="text-sm font-normal text-[#00d083]">✓ Verified</span>
            )}
          </CardTitle>
          <p className="text-slate-400 mt-2">
            {isVerified 
              ? 'Your business location is verified with Google'
              : 'Verify your business location to appear on QWIKKER Atlas'}
          </p>
        </CardHeader>
        
        <CardContent className="p-6">
          {isVerified ? (
            <div className="space-y-4">
              <div className="p-4 bg-[#00d083]/10 border border-[#00d083]/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#00d083] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">{profile.business_name}</p>
                    {profile.business_address && (
                      <p className="text-slate-300 text-sm mt-1">{profile.business_address}</p>
                    )}
                    {profile.rating && profile.rating > 0 && (
                      <p className="text-slate-400 text-sm mt-1">
                        ★ {profile.rating.toFixed(1)} on Google
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-slate-400">
                Verified on {profile.google_verified_at ? new Date(profile.google_verified_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <GooglePlacesAutocompleteV2
                onPlaceSelected={handlePlaceSelected}
                disabled={isVerifying}
              />
              
              {isVerifying && (
                <div className="flex items-center gap-2 text-[#00d083] text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#00d083] border-t-transparent"></div>
                  <span>Verifying with Google...</span>
                </div>
              )}
              
              {verificationResult && (
                <div className={`p-4 rounded-lg border ${
                  verificationResult.type === 'success'
                    ? 'bg-[#00d083]/10 border-[#00d083]/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="flex items-start gap-3">
                    {verificationResult.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-[#00d083] flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <p className={verificationResult.type === 'success' ? 'text-[#00d083]' : 'text-red-400'}>
                      {verificationResult.message}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <p className="text-sm text-slate-300">
                  <strong>Why verify?</strong> Verified locations appear on QWIKKER Atlas with accurate directions and real-time distance for customers.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
