'use client'

import { useState, useEffect } from 'react'
import { Search, Building2, Star, MapPin, Globe, Mail } from 'lucide-react'
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

// Mock businesses for testing (dev/preview only)
const MOCK_BUSINESSES: ClaimBusiness[] = [
  {
    id: 'larder-house',
    name: 'The Larder House',
    address: '123 Old Christchurch Rd, Bournemouth',
    category: 'Restaurant',
    rating: 4.6,
    reviewCount: 847,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    status: 'unclaimed'
  },
  {
    id: 'joes-barber',
    name: "Joe's Barber Shop",
    address: '456 High Street, Bournemouth',
    category: 'Barber',
    rating: 4.8,
    reviewCount: 203,
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400',
    status: 'unclaimed'
  },
  {
    id: 'coffee-lab',
    name: 'The Coffee Lab',
    address: '789 Commercial Rd, Bournemouth',
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
          console.warn('Failed to detect city, using fallback')
          setCity('bournemouth')
        }
        
        // Fetch franchise capabilities
        const capabilitiesResponse = await fetch('/api/public/franchise-capabilities')
        const capabilitiesData = await capabilitiesResponse.json()
        if (capabilitiesData.success && capabilitiesData.capabilities) {
          setSmsOptInAvailable(capabilitiesData.capabilities.sms_opt_in_available)
        }
      } catch (error) {
        console.error('Error fetching city/capabilities:', error)
        setCity('bournemouth')
        setSmsOptInAvailable(false) // Fail safely: no SMS
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 relative">
      {/* Subtle green radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#00d083] opacity-[0.03] blur-[120px] rounded-full" />
      </div>
      
      <div className="container max-w-4xl mx-auto px-4 py-12 relative">
        {/* Header */}
        <div className="text-center mb-12">
          {/* QWIKKER Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src="/qwikker-logo-web.svg" 
              alt="QWIKKER" 
              className="h-8 md:h-10"
              style={{ maxHeight: '40px' }}
            />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-semibold mb-2">Claim Your Business</h1>
          <p className="text-base text-muted-foreground">
            Already listed? Verify ownership to start managing your listing.
          </p>
        </div>

        {/* Step 1: Search */}
        {step === 'search' && (
          <div className="space-y-6">
            <Card className="dark:bg-[#181818] border-white/[0.06] shadow-[0_10px_40px_rgba(0,0,0,0.4)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.6)] border-t-[#00d083]/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="w-5 h-5" />
                  Find Your Business
                </CardTitle>
                <CardDescription>
                  Search by name or category
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="e.g. The Larder House, Scissors Barbers, Ember & Oak"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                  />
                  <button
                    onClick={() => handleSearch()}
                    className="bg-[#00d083] hover:bg-[#00b86f] text-[#0a0a0a] px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <p className="text-sm font-medium text-muted-foreground">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                    </p>
                    {searchResults.map((business) => {
                      const displayName = getDisplayName(business)
                      const displayAddress = getDisplayAddress(business)
                      const displayCategory = getDisplayCategory(business)
                      const displayReviewCount = getDisplayReviewCount(business)
                      
                      // Resolve category and placeholder URL
                      const resolvedCategory = resolveSystemCategory(business) || (business as any).system_category || (business as any).systemCategory || 'other'
                      const placeholderVariant = (business as any).placeholder_variant ?? undefined
                      const imgSrc = business.image || getPlaceholderUrl(resolvedCategory, business.id, placeholderVariant)
                      
                      return (
                        <Card 
                          key={business.id}
                          className="hover:border-primary cursor-pointer transition-all"
                          onClick={() => handleSelectBusiness(business)}
                        >
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              {/* ✅ Always show image - use placeholder for unclaimed businesses */}
                              <img 
                                src={imgSrc}
                                alt={displayName}
                                className="w-20 h-20 rounded-lg object-cover"
                                onError={(e) => {
                                  // Fallback to default placeholder if image fails to load
                                  const target = e.target as HTMLImageElement
                                  if (target.src !== '/placeholders/default/00.webp') {
                                    target.src = '/placeholders/default/00.webp'
                                  }
                                }}
                              />
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-1">{displayName}</h3>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {business.rating && (
                                    <div className="flex items-center gap-1">
                                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                      <span>{business.rating} ({displayReviewCount} reviews)</span>
                                    </div>
                                  )}
                                  {displayAddress && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-4 h-4" />
                                      <span>{displayAddress}</span>
                                    </div>
                                  )}
                                </div>
                                {displayCategory && (
                                  <div className="mt-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                      {displayCategory}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="mb-2">No businesses found matching "{searchQuery}"</p>
                    <p className="text-sm">We may not have imported your business yet.</p>
                    <button className="mt-3 text-sm text-[#00d083] hover:underline">
                      Contact us to add your business
                    </button>
                  </div>
                )}

                {!searchQuery && searchResults.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-30 animate-pulse" />
                    <p className="text-sm">Start typing to search for your business</p>
                    <p className="text-xs mt-2 opacity-60">(minimum 2 characters)</p>
                  </div>
                )}

                {searchQuery.length === 1 && searchResults.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Type at least 2 characters to search</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Can't find your business?
              </p>
              <button className="px-5 py-2.5 border border-[#00d083]/30 text-[#00d083] hover:bg-[#00d083]/10 rounded-lg font-medium transition-colors text-sm">
                Request a listing
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Confirm Business */}
        {step === 'confirm' && selectedBusiness && (
          <div className="space-y-6">
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              ← Back to Search
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>Confirm Your Business</CardTitle>
                <CardDescription>
                  Verify the details match before proceeding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Business Preview */}
                <div className="flex gap-4">
                  <img 
                    src={
                      selectedBusiness.image || 
                      getPlaceholderUrl(
                        resolveSystemCategory(selectedBusiness),
                        selectedBusiness.id
                      )
                    }
                    alt={selectedBusiness.name || selectedBusiness.business_name || ''}
                    className="w-24 h-24 rounded-lg object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = getPlaceholderUrl('other', selectedBusiness.id)
                    }}
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-2xl mb-2">{selectedBusiness.name}</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{selectedBusiness.rating} stars ({selectedBusiness.reviewCount} reviews on Google)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{selectedBusiness.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>{selectedBusiness.category}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notice */}
                <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    This information is from Google. You'll be able to update it once verified.
                  </p>
                </div>

                {/* Confirm Buttons */}
                <div className="flex gap-3">
                  <Button onClick={handleConfirm} className="flex-1" size="lg">
                    Yes, This Is My Business
                  </Button>
                  <Button onClick={handleBack} variant="outline" className="flex-1" size="lg">
                    Not My Business
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Contact Details */}
        {step === 'email-verify' && selectedBusiness && (
          <div className="space-y-6">
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              ← Back
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>Business Contact Information</CardTitle>
                <CardDescription>
                  We need your business email to verify ownership
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Business Email Address *
                  </label>
                  <Input
                    type="email"
                    placeholder="info@yourbusiness.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-base"
                  />
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
                    <p className="font-medium">Business email examples:</p>
                    <ul className="space-y-1 text-muted-foreground ml-4 list-disc">
                      <li>info@yourbusiness.com</li>
                      <li>yourbusinessname@gmail.com</li>
                      <li>owner.name@yourbusiness.com</li>
                    </ul>
                    <p className="text-muted-foreground mt-2 text-xs">
                      Using a business email helps us verify ownership more quickly.
                    </p>
                  </div>
                </div>

                {/* Website Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Business Website (Optional)
                  </label>
                  <Input
                    type="url"
                    placeholder="https://yourbusiness.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="text-base"
                  />
                  <p className="text-sm text-muted-foreground">
                    Adding your website helps us verify ownership faster. Leave blank if not applicable.
                  </p>
                </div>

                {/* Submit Button */}
                <Button 
                  size="lg" 
                  className="w-full"
                  disabled={!email}
                  onClick={handleSendVerification}
                >
                  Send Verification Code
                </Button>

                {/* What Happens Next */}
                <div className="border-t pt-6">
                  <h4 className="font-medium mb-3">What happens next?</h4>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="font-medium">1.</span>
                      <span>We'll send a 6-digit verification code to your email</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">2.</span>
                      <span>Enter the code and create your account</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">3.</span>
                      <span>Your claim will be reviewed (usually within 48 hours)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">4.</span>
                      <span>Once approved, you'll receive dashboard access</span>
                    </li>
                  </ol>
                </div>
              </CardContent>
            </Card>
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

