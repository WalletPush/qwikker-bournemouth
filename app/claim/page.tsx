'use client'

import { useState, useEffect } from 'react'
import { Search, Building2, Star, MapPin, Globe, Mail, CheckCircle2, Clock, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmailVerification } from '@/components/claim/email-verification'
import { CreateAccount } from '@/components/claim/create-account'
import { PendingApproval } from '@/components/claim/pending-approval'
import { ConfirmBusinessDetails } from '@/components/claim/confirm-business-details'
import type { ClaimBusiness } from '@/types/claim'
import { getDisplayName, getDisplayAddress, getDisplayCategory, getDisplayType, getDisplayDescription, getDisplayReviewCount } from '@/types/claim'
import { getPlaceholderUrl } from '@/lib/placeholders/getPlaceholderImage'
import { resolveSystemCategory } from '@/lib/utils/resolve-system-category'
import { getCityFromHostnameClient } from '@/lib/utils/client-city-detection'

// Mock businesses for testing (dev/preview only)
const MOCK_BUSINESSES: ClaimBusiness[] = [
  {
    id: 'larder-house',
    name: 'The Larder House',
    address: '123 Old Christchurch Rd',
    category: 'Restaurant',
    rating: 4.6,
    reviewCount: 847,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    status: 'unclaimed'
  },
  {
    id: 'joes-barber',
    name: "Joe's Barber Shop",
    address: '456 High Street',
    category: 'Barber',
    rating: 4.8,
    reviewCount: 203,
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400',
    status: 'unclaimed'
  },
  {
    id: 'coffee-lab',
    name: 'The Coffee Lab',
    address: '789 Commercial Rd',
    category: 'Cafe',
    rating: 4.7,
    reviewCount: 512,
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400',
    status: 'unclaimed'
  }
]

type Step = 'search' | 'confirm' | 'email-verify' | 'verify-code' | 'business-details' | 'account' | 'submitted'

export default function ClaimPage() {
  const [step, setStep] = useState<Step>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ClaimBusiness[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<ClaimBusiness | null>(null)
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  
  // Edited business data
  const [editedBusinessData, setEditedBusinessData] = useState<any>(null)
  
  // SECURITY: Detect city from subdomain (server-derived)
  const [city, setCity] = useState<string | null>(null)
  const [cityLoading, setCityLoading] = useState(true)
  
  // Franchise capabilities (determines what features to show)
  const [smsOptInAvailable, setSmsOptInAvailable] = useState(false)
  const [trialConfig, setTrialConfig] = useState<{ trialTier: string; trialDays: number } | null>(null)
  
  // Fetch city and capabilities on mount
  useEffect(() => {
    async function fetchCityAndCapabilities() {
      try {
        // Fetch city
        const cityResponse = await fetch('/api/internal/get-city')
        const cityData = await cityResponse.json()
        if (cityData.success) {
          setCity(cityData.city)
        } else {
          console.warn('Failed to detect city, using hostname fallback')
          setCity(getCityFromHostnameClient(window.location.hostname))
        }
        
        // Fetch franchise capabilities
        const capabilitiesResponse = await fetch('/api/public/franchise-capabilities')
        const capabilitiesData = await capabilitiesResponse.json()
        if (capabilitiesData.success && capabilitiesData.capabilities) {
          setSmsOptInAvailable(capabilitiesData.capabilities.sms_opt_in_available)
        }

        // Fetch trial config for plan choice card
        const resolvedCity = cityData.success ? cityData.city : getCityFromHostnameClient(window.location.hostname)
        if (resolvedCity) {
          const trialResponse = await fetch(`/api/admin/pricing-cards?city=${encodeURIComponent(resolvedCity)}`)
          const trialData = await trialResponse.json()
          if (trialData.success && trialData.config?.default_trial_tier && trialData.config?.founding_member_trial_days) {
            setTrialConfig({
              trialTier: trialData.config.default_trial_tier,
              trialDays: trialData.config.founding_member_trial_days,
            })
          }
        }
      } catch (error) {
        console.error('Error fetching city/capabilities:', error)
        setCity(getCityFromHostnameClient(window.location.hostname))
        setSmsOptInAvailable(false)
      } finally {
        setCityLoading(false)
      }
    }
    
    fetchCityAndCapabilities()
  }, [])

  // Handle pre-selection from URL params (e.g. /claim?business_id=xyz)
  // SECURITY: Uses server-side validation endpoint that checks city + unclaimed status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const businessId = params.get('business_id')
      
      if (businessId && !selectedBusiness) {
        const validateAndPreselect = async () => {
          try {
            const response = await fetch(`/api/claim/preselect?business_id=${encodeURIComponent(businessId)}`)
            
            if (response.ok) {
              const { business } = await response.json()
              if (business) {
                // Server confirmed this business is eligible
                setSelectedBusiness({
                  id: business.id,
                  name: business.name,
                  business_name: business.name,
                  address: business.address,
                  business_address: business.address,
                  category: business.category,
                  business_category: business.category,
                  status: 'unclaimed'
                })
                setStep('confirm')
              }
            }
            // If 404 or non-ok response: silently ignore and show normal search
          } catch (error) {
            // Network error: silently ignore and show normal search
            console.error('Preselect validation failed:', error)
          }
        }
        validateAndPreselect()
      }
    }
  }, [])

  // Debounce search (auto-search after 250ms of no typing)
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        handleSearch(searchQuery)
      }, 250)
      return () => clearTimeout(timer)
    } else if (searchQuery.trim().length === 0) {
      setSearchResults([])
    }
  }, [searchQuery])

  const handleSearch = async (query: string = searchQuery) => {
    // Real search - call API
    const trimmedQuery = query.trim()
    
    // Clear results if query is empty
    if (!trimmedQuery) {
      setSearchResults([])
      return
    }
    
    // Don't search if less than 2 characters (API will reject it anyway)
    if (trimmedQuery.length < 2) {
      setSearchResults([])
      return
    }
    
    try {
      const response = await fetch('/api/claim/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmedQuery })
        // Note: City is derived server-side from subdomain for security
      })

      const data = await response.json()

      if (data.success && data.results && data.results.length > 0) {
        setSearchResults(data.results)
      } else {
        // Fallback to mock businesses in development or when ?mock=1 is present
        const isDev = process.env.NODE_ENV !== 'production'
        const useMock = isDev || (typeof window !== 'undefined' && window.location.search.includes('mock=1'))
        
        if (useMock) {
          // Filter mock businesses by search query (case-insensitive)
          const filtered = MOCK_BUSINESSES.filter(business => {
            const searchLower = trimmedQuery.toLowerCase()
            const name = getDisplayName(business).toLowerCase()
            const category = getDisplayCategory(business).toLowerCase()
            const address = getDisplayAddress(business).toLowerCase()
            return name.includes(searchLower) || category.includes(searchLower) || address.includes(searchLower)
          })
          setSearchResults(filtered)
        } else {
          setSearchResults([])
        }
      }
    } catch (error) {
      console.error('Search error:', error)
      
      // Fallback to mock businesses in development
      const isDev = process.env.NODE_ENV !== 'production'
      const useMock = isDev || (typeof window !== 'undefined' && window.location.search.includes('mock=1'))
      
      if (useMock && trimmedQuery) {
        const filtered = MOCK_BUSINESSES.filter(business => {
          const searchLower = trimmedQuery.toLowerCase()
          const name = getDisplayName(business).toLowerCase()
          const category = getDisplayCategory(business).toLowerCase()
          const address = getDisplayAddress(business).toLowerCase()
          return name.includes(searchLower) || category.includes(searchLower) || address.includes(searchLower)
        })
        setSearchResults(filtered)
      } else {
        setSearchResults([])
      }
    }
  }

  const handleSelectBusiness = (business: ClaimBusiness) => {
    setSelectedBusiness(business)
    setStep('confirm')
  }

  const handleConfirm = () => {
    setStep('email-verify')
  }

  const handleBack = () => {
    if (step === 'account') {
      setStep('business-details')
    } else if (step === 'business-details') {
      setStep('verify-code')
    } else if (step === 'verify-code') {
      setStep('email-verify')
    } else if (step === 'email-verify') {
      setStep('confirm')
    } else if (step === 'confirm') {
      setStep('search')
      setSelectedBusiness(null)
    }
  }

  const handleSendVerification = async () => {
    // Real: Send verification email
    try {
      const response = await fetch('/api/claim/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.toLowerCase(), 
          businessId: selectedBusiness?.id 
        })
      })

      const data = await response.json()

      if (data.success) {
        setStep('verify-code')
      } else {
        alert(data.error || 'Failed to send verification code')
      }
    } catch (error) {
      console.error('Send verification error:', error)
      alert('Failed to send verification code. Please try again.')
    }
  }

  const handleVerified = (code: string) => {
    setVerificationCode(code)
    setStep('business-details')
  }

  const handleBusinessDetailsConfirmed = (editedData: any) => {
    setEditedBusinessData(editedData)
    setStep('account')
  }

  const handleResendCode = async () => {
    // Real: Resend verification email
    await handleSendVerification()
  }

  const handleCreateAccount = async (data: { firstName: string; lastName: string; password: string }) => {
    // Real: Create account and submit claim
    try {
      const formData = new FormData()
      formData.append('firstName', data.firstName)
      formData.append('lastName', data.lastName)
      formData.append('password', data.password)
      formData.append('email', email.toLowerCase())
      formData.append('website', website)
      formData.append('businessId', selectedBusiness?.id || '')
      formData.append('verificationCode', verificationCode)
      
      // Add edited business data
      if (editedBusinessData) {
        formData.append('editedBusinessName', editedBusinessData.business_name)
        formData.append('editedAddress', editedBusinessData.address)
        formData.append('editedPhone', editedBusinessData.phone)
        formData.append('editedWebsite', editedBusinessData.website)
        formData.append('editedCategory', editedBusinessData.category)
        formData.append('editedType', editedBusinessData.type)
        formData.append('editedDescription', editedBusinessData.description)
        formData.append('editedTagline', editedBusinessData.tagline)
        formData.append('editedHours', editedBusinessData.hours)
        
        // Add image files if they exist
        if (editedBusinessData.logo) {
          formData.append('logo', editedBusinessData.logo)
        }
        if (editedBusinessData.heroImage) {
          formData.append('heroImage', editedBusinessData.heroImage)
        }

        // Add booking preference data
        if (editedBusinessData.booking_preference) {
          formData.append('editedBookingPreference', editedBusinessData.booking_preference)
        }
        if (editedBusinessData.booking_url) {
          formData.append('editedBookingUrl', editedBusinessData.booking_url)
        }

        // Add vibe tags
        if (editedBusinessData.vibe_tags) {
          formData.append('editedVibeTags', editedBusinessData.vibe_tags)
        }

        // Add plan choice
        if (editedBusinessData.plan_choice) {
          formData.append('planChoice', editedBusinessData.plan_choice)
        }
      }

      const response = await fetch('/api/claim/submit', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setStep('submitted')
      } else {
        alert(result.error || 'Failed to submit claim. Please try again.')
      }
    } catch (error) {
      console.error('Submit claim error:', error)
      alert('Failed to submit claim. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white relative overflow-hidden">
      {/* Layered background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-[#00d083] opacity-[0.04] blur-[160px] rounded-full" />
        <div className="absolute top-[20%] right-0 w-[400px] h-[400px] bg-[#00d083] opacity-[0.03] blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600 opacity-[0.02] blur-[120px] rounded-full" />
      </div>

      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />
      
      <div className="container max-w-2xl mx-auto px-4 py-12 md:py-16 relative">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="flex justify-center mb-10">
            <img 
              src="/qwikker-logo-web.svg" 
              alt="QWIKKER" 
              className="h-12 w-auto"
            />
          </div>
          
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#00d083]/10 border border-[#00d083]/20 text-[#00d083] text-sm font-medium mb-6">
            Free to claim your listing
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
            Claim Your Business
          </h1>
          <p className="text-base md:text-lg text-neutral-400 max-w-lg mx-auto leading-relaxed">
            Already listed? Verify ownership and start managing your listing, offers, and visibility.
          </p>
        </div>

        {/* Step 1: Search */}
        {step === 'search' && (
          <div className="space-y-8">
            {/* Search card */}
            <div className="relative group">
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-[#00d083]/20 via-white/[0.06] to-transparent opacity-100" />
              <Card className="relative bg-[#111315]/80 backdrop-blur-xl border-0 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <CardHeader className="pb-4 pt-8 px-8">
                  <CardTitle className="flex items-center gap-3 text-xl font-semibold text-white">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#00d083]/10 border border-[#00d083]/20">
                      <Search className="w-5 h-5 text-[#00d083]" />
                    </div>
                    Find Your Business
                  </CardTitle>
                  <CardDescription className="text-neutral-500 ml-[52px]">
                    Search by name or category
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-8 pb-8">
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      placeholder="e.g. The Larder House, Scissors Barbers, Ember & Oak"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="flex-1 h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-neutral-600 focus:border-[#00d083]/40 focus:ring-[#00d083]/20 rounded-xl text-base"
                    />
                    <button
                      onClick={() => handleSearch()}
                      className="bg-[#00d083] hover:bg-[#00b86f] text-[#0a0a0a] h-12 px-7 rounded-xl font-semibold transition-all flex items-center gap-2.5 whitespace-nowrap hover:shadow-[0_0_20px_rgba(0,208,131,0.3)] active:scale-[0.98]"
                    >
                      <Search className="w-4 h-4" />
                      Search
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="space-y-3 mt-6">
                      <p className="text-sm font-medium text-neutral-500">
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                      </p>
                      {searchResults.map((business) => {
                        const displayName = getDisplayName(business)
                        const displayAddress = getDisplayAddress(business)
                        const displayCategory = getDisplayCategory(business)
                        const displayReviewCount = getDisplayReviewCount(business)
                        
                        const resolvedCategory = resolveSystemCategory(business) || (business as any).system_category || (business as any).systemCategory || 'other'
                        const placeholderVariant = (business as any).placeholder_variant ?? undefined
                        const imgSrc = business.image || getPlaceholderUrl(resolvedCategory, business.id)
                        
                        return (
                          <div 
                            key={business.id}
                            className="group/card relative cursor-pointer"
                            onClick={() => handleSelectBusiness(business)}
                          >
                            <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-[#00d083]/0 via-[#00d083]/0 to-[#00d083]/0 group-hover/card:from-[#00d083]/30 group-hover/card:via-[#00d083]/10 group-hover/card:to-[#00d083]/30 transition-all duration-300" />
                            <div className="relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] rounded-xl p-4 transition-all duration-300">
                              <div className="flex gap-4">
                                <img 
                                  src={imgSrc}
                                  alt={displayName}
                                  className="w-20 h-20 rounded-xl object-cover ring-1 ring-white/[0.08]"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    if (target.src !== '/placeholders/default/00.webp') {
                                      target.src = '/placeholders/default/00.webp'
                                    }
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-lg text-white mb-1.5 truncate">{displayName}</h3>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-400">
                                    {business.rating && (
                                      <div className="flex items-center gap-1.5">
                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                        <span>{business.rating} ({displayReviewCount} reviews)</span>
                                      </div>
                                    )}
                                    {displayAddress && (
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                                        <span className="truncate">{displayAddress}</span>
                                      </div>
                                    )}
                                  </div>
                                  {displayCategory && (
                                    <div className="mt-2.5">
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.06] text-neutral-300 border border-white/[0.06]">
                                        {displayCategory}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="hidden sm:flex items-center text-neutral-600 group-hover/card:text-[#00d083] transition-colors">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {searchQuery && searchResults.length === 0 && (
                    <div className="text-center py-10 text-neutral-500">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                        <Building2 className="w-8 h-8 opacity-40" />
                      </div>
                      <p className="mb-1.5 text-neutral-300">No businesses found matching &ldquo;{searchQuery}&rdquo;</p>
                      <p className="text-sm text-neutral-500">We may not have imported your business yet.</p>
                      <a href="/onboarding" className="mt-4 inline-block text-sm text-[#00d083] hover:text-[#00e894] transition-colors font-medium">
                        Create your free listing here →
                      </a>
                    </div>
                  )}

                  {!searchQuery && searchResults.length === 0 && (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#00d083]/5 border border-[#00d083]/10 flex items-center justify-center">
                        <Search className="w-7 h-7 text-[#00d083]/40" />
                      </div>
                      <p className="text-sm text-neutral-400">Start typing to search for your business</p>
                      <p className="text-xs mt-2 text-neutral-600">(minimum 2 characters)</p>
                    </div>
                  )}

                  {searchQuery.length === 1 && searchResults.length === 0 && (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                        <Search className="w-7 h-7 opacity-30" />
                      </div>
                      <p className="text-sm text-neutral-400">Type at least 2 characters to search</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Create listing CTA */}
            <div className="text-center pt-2">
              <p className="text-sm text-neutral-500 mb-3">
                Can&apos;t find your business?
              </p>
              <a 
                href="/onboarding"
                className="inline-flex items-center px-6 py-2.5 border border-[#00d083]/20 text-[#00d083] hover:bg-[#00d083]/10 hover:border-[#00d083]/30 rounded-xl font-medium transition-all text-sm"
              >
                Create your free listing here →
              </a>
            </div>

            {/* Trust signals */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#00d083]/10">
                  <Clock className="w-4 h-4 text-[#00d083]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-200">Quick Setup</p>
                  <p className="text-xs text-neutral-500">Under 5 minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#00d083]/10">
                  <Shield className="w-4 h-4 text-[#00d083]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-200">Verified Owners</p>
                  <p className="text-xs text-neutral-500">Email verification</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#00d083]/10">
                  <CheckCircle2 className="w-4 h-4 text-[#00d083]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-200">Free to Claim</p>
                  <p className="text-xs text-neutral-500">No hidden costs</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Confirm Business */}
        {step === 'confirm' && selectedBusiness && (
          <div className="space-y-6">
            <Button variant="ghost" onClick={handleBack} className="mb-4 text-neutral-400 hover:text-white hover:bg-white/[0.05]">
              ← Back to Search
            </Button>

            <div className="relative">
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-[#00d083]/20 via-white/[0.06] to-transparent" />
              <Card className="relative bg-[#111315]/80 backdrop-blur-xl border-0 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <CardHeader className="px-8 pt-8">
                  <CardTitle className="text-xl text-white">Confirm Your Business</CardTitle>
                  <CardDescription className="text-neutral-500">
                    Verify the details match before proceeding
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-8 pb-8">
                  <div className="flex gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <img 
                      src={
                        selectedBusiness.image || 
                        getPlaceholderUrl(
                          resolveSystemCategory(selectedBusiness),
                          selectedBusiness.id
                        )
                      }
                      alt={selectedBusiness.name || selectedBusiness.business_name || ''}
                      className="w-24 h-24 rounded-xl object-cover ring-1 ring-white/[0.08]"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = getPlaceholderUrl('other', selectedBusiness.id)
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-2xl mb-2 text-white">{selectedBusiness.name}</h3>
                      <div className="space-y-2 text-sm text-neutral-400">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span>{selectedBusiness.rating} stars ({selectedBusiness.reviewCount} reviews on Google)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-neutral-500" />
                          <span>{selectedBusiness.address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-neutral-500" />
                          <span>{selectedBusiness.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                    <p className="text-sm text-neutral-400">
                      This information is from Google. You&apos;ll be able to update it once verified.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={handleConfirm} className="flex-1 h-12 bg-[#00d083] hover:bg-[#00b86f] text-[#0a0a0a] rounded-xl font-semibold transition-all hover:shadow-[0_0_20px_rgba(0,208,131,0.3)] active:scale-[0.98]">
                      Yes, This Is My Business
                    </button>
                    <button onClick={handleBack} className="flex-1 h-12 border border-white/[0.1] hover:border-white/[0.2] text-neutral-300 hover:text-white rounded-xl font-medium transition-all hover:bg-white/[0.04]">
                      Not My Business
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 3: Contact Details */}
        {step === 'email-verify' && selectedBusiness && (
          <div className="space-y-6">
            <Button variant="ghost" onClick={handleBack} className="mb-4 text-neutral-400 hover:text-white hover:bg-white/[0.05]">
              ← Back
            </Button>

            <div className="relative">
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-[#00d083]/20 via-white/[0.06] to-transparent" />
              <Card className="relative bg-[#111315]/80 backdrop-blur-xl border-0 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <CardHeader className="px-8 pt-8">
                  <CardTitle className="text-xl text-white">Business Contact Information</CardTitle>
                  <CardDescription className="text-neutral-500">
                    We need your business email to verify ownership
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-8 pb-8">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-neutral-300">
                      <Mail className="w-4 h-4 text-[#00d083]" />
                      Business Email Address *
                    </label>
                    <Input
                      type="email"
                      placeholder="info@yourbusiness.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-neutral-600 focus:border-[#00d083]/40 focus:ring-[#00d083]/20 rounded-xl text-base"
                    />
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2 text-sm">
                      <p className="font-medium text-neutral-300">Business email examples:</p>
                      <ul className="space-y-1 text-neutral-500 ml-4 list-disc">
                        <li>info@yourbusiness.com</li>
                        <li>yourbusinessname@gmail.com</li>
                        <li>owner.name@yourbusiness.com</li>
                      </ul>
                      <p className="text-neutral-600 mt-2 text-xs">
                        Using a business email helps us verify ownership more quickly.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2 text-neutral-300">
                      <Globe className="w-4 h-4 text-[#00d083]" />
                      Business Website (Optional)
                    </label>
                    <Input
                      type="url"
                      placeholder="https://yourbusiness.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-neutral-600 focus:border-[#00d083]/40 focus:ring-[#00d083]/20 rounded-xl text-base"
                    />
                    <p className="text-sm text-neutral-500">
                      Adding your website helps us verify ownership faster. Leave blank if not applicable.
                    </p>
                  </div>

                  <button 
                    className={`w-full h-12 rounded-xl font-semibold transition-all active:scale-[0.98] ${
                      email
                        ? 'bg-[#00d083] hover:bg-[#00b86f] text-[#0a0a0a] hover:shadow-[0_0_20px_rgba(0,208,131,0.3)]'
                        : 'bg-white/[0.06] text-neutral-600 cursor-not-allowed'
                    }`}
                    disabled={!email}
                    onClick={handleSendVerification}
                  >
                    Send Verification Code
                  </button>

                  <div className="border-t border-white/[0.06] pt-6">
                    <h4 className="font-medium mb-4 text-neutral-200">What happens next?</h4>
                    <ol className="space-y-3 text-sm">
                      {[
                        'We\'ll send a 6-digit verification code to your email',
                        'Enter the code and create your account',
                        'Your claim will be reviewed (usually within 48 hours)',
                        'Once approved, you\'ll receive dashboard access',
                      ].map((text, i) => (
                        <li key={i} className="flex gap-3 items-start">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00d083]/10 text-[#00d083] text-xs font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-neutral-400">{text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 4: Email Verification */}
        {step === 'verify-code' && (
          <EmailVerification
            email={email}
            onVerified={handleVerified}
            onResend={handleResendCode}
            onBack={handleBack}
          />
        )}

        {/* Step 5: Confirm Business Details */}
        {step === 'business-details' && selectedBusiness && (
          <ConfirmBusinessDetails
            business={{
              id: selectedBusiness.id,
              name: getDisplayName(selectedBusiness) || '',
              address: getDisplayAddress(selectedBusiness) || '',
              phone: selectedBusiness.phone,
              website: selectedBusiness.website || website,
              category: getDisplayCategory(selectedBusiness) || '',
              type: getDisplayType(selectedBusiness) || '',
              description: getDisplayDescription(selectedBusiness) || '',
              hours: selectedBusiness.hours,
              rating: selectedBusiness.rating,
              reviewCount: getDisplayReviewCount(selectedBusiness)
            }}
            smsOptInAvailable={smsOptInAvailable}
            trialConfig={trialConfig}
            onConfirm={handleBusinessDetailsConfirmed}
            onBack={handleBack}
          />
        )}

        {/* Step 6: Create Account */}
        {step === 'account' && selectedBusiness && (
          <CreateAccount
            email={email}
            businessName={getDisplayName(selectedBusiness)}
            onSubmit={handleCreateAccount}
            onBack={handleBack}
          />
        )}

        {/* Step 7: Submitted / Pending Approval */}
        {step === 'submitted' && selectedBusiness && city && (
          <PendingApproval
            businessName={getDisplayName(selectedBusiness)}
            email={email}
            franchiseCity={city.charAt(0).toUpperCase() + city.slice(1)}
            supportEmail={`${city}@qwikker.com`}
          />
        )}
      </div>
    </div>
  )
}

