'use client'

import { useState } from 'react'
import { Search, Building2, Star, MapPin, Globe, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmailVerification } from '@/components/claim/email-verification'
import { CreateAccount } from '@/components/claim/create-account'
import { PendingApproval } from '@/components/claim/pending-approval'

// Mock business data (will be replaced with real API)
const MOCK_BUSINESSES = [
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

type Step = 'search' | 'confirm' | 'details' | 'verify' | 'account' | 'submitted'

export default function ClaimPage() {
  const [step, setStep] = useState<Step>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<typeof MOCK_BUSINESSES>([])
  const [selectedBusiness, setSelectedBusiness] = useState<typeof MOCK_BUSINESSES[0] | null>(null)
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [verificationCode, setVerificationCode] = useState('')

  const handleSearch = async (query: string = searchQuery) => {
    // Real search - call API
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    
    try {
      const response = await fetch('/api/claim/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, city: 'bournemouth' })
      })

      const data = await response.json()

      if (data.success) {
        setSearchResults(data.results || [])
      } else {
        console.error('Search failed:', data.error)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    }
  }

  const handleSelectBusiness = (business: typeof MOCK_BUSINESSES[0]) => {
    setSelectedBusiness(business)
    setStep('confirm')
  }

  const handleConfirm = () => {
    setStep('details')
  }

  const handleBack = () => {
    if (step === 'account') {
      setStep('verify')
    } else if (step === 'verify') {
      setStep('details')
    } else if (step === 'details') {
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
        setStep('verify')
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
    setStep('account')
  }

  const handleResendCode = async () => {
    // Real: Resend verification email
    await handleSendVerification()
  }

  const handleCreateAccount = async (data: { firstName: string; lastName: string; password: string }) => {
    // Real: Create account and submit claim
    try {
      const response = await fetch('/api/claim/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...data, 
          email: email.toLowerCase(), 
          website, 
          businessId: selectedBusiness?.id,
          verificationCode
        })
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          {/* QWIKKER Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src="/Qwikker Logo web.svg" 
              alt="QWIKKER" 
              className="h-8 md:h-10"
              style={{ maxHeight: '40px' }}
            />
          </div>
          
          <h1 className="text-4xl font-bold mb-3">Claim Your Listing</h1>
          <p className="text-lg text-muted-foreground">
            Already listed on QWIKKER? Claim your business to unlock your dashboard
          </p>
        </div>

        {/* Step 1: Search */}
        {step === 'search' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Find Your Business
                </CardTitle>
                <CardDescription>
                  Search for your business by name or category
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="e.g. The Larder House, Coffee Shop, Barber..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      handleSearch(e.target.value)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                  />
                  <Button onClick={handleSearch}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <p className="text-sm font-medium text-muted-foreground">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                    </p>
                    {searchResults.map((business) => (
                      <Card 
                        key={business.id}
                        className="hover:border-primary cursor-pointer transition-all"
                        onClick={() => handleSelectBusiness(business)}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <img 
                              src={business.image} 
                              alt={business.name}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{business.name}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  <span>{business.rating} ({business.reviewCount} reviews)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  <span>{business.address}</span>
                                </div>
                              </div>
                              <div className="mt-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                  {business.category}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="mb-2">No businesses found matching "{searchQuery}"</p>
                    <p className="text-sm">We may not have imported your business yet.</p>
                    <Button variant="link" className="mt-2">
                      Contact us to add your business
                    </Button>
                  </div>
                )}

                {!searchQuery && searchResults.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Start typing to search for your business</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Can't find your business?
              </p>
              <Button variant="outline">
                Request to Add My Business
              </Button>
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
                <CardTitle>Confirm This Is Your Business</CardTitle>
                <CardDescription>
                  Make sure all the details match your business before claiming
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Business Preview */}
                <div className="flex gap-4">
                  <img 
                    src={selectedBusiness.image} 
                    alt={selectedBusiness.name}
                    className="w-24 h-24 rounded-lg object-cover"
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
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    ℹ️ This information is from Google. You'll be able to update it once your claim is approved.
                  </p>
                </div>

                {/* Confirm Buttons */}
                <div className="flex gap-3">
                  <Button onClick={handleConfirm} className="flex-1" size="lg">
                    ✅ Yes, This Is My Business
                  </Button>
                  <Button onClick={handleBack} variant="outline" className="flex-1" size="lg">
                    ❌ Not My Business
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Contact Details */}
        {step === 'details' && selectedBusiness && (
          <div className="space-y-6">
            <Button variant="ghost" onClick={handleBack} className="mb-4">
              ← Back
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>📧 Business Contact Information</CardTitle>
                <CardDescription>
                  We need your business email to verify you own this listing
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
                    <p className="font-medium">💡 Use your business email, not personal</p>
                    <p className="text-muted-foreground">Examples of BUSINESS emails:</p>
                    <ul className="space-y-1 text-muted-foreground ml-4">
                      <li>✅ info@yourbusiness.com</li>
                      <li>✅ yourbusinessname@gmail.com</li>
                      <li>✅ owner.name@yourbusiness.com</li>
                    </ul>
                    <p className="text-muted-foreground mt-2">
                      ❌ Don't use: yourname123@gmail.com (personal email)
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
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm space-y-2">
                    <p className="font-medium">💡 If you have a website, add it here</p>
                    <p className="text-muted-foreground">
                      This helps us verify ownership faster! If you don't have a website, 
                      leave this blank. (Many small businesses don't - that's totally fine!)
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  size="lg" 
                  className="w-full"
                  disabled={!email}
                  onClick={handleSendVerification}
                >
                  📧 Send Verification Code
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
                      <span>Create your QWIKKER account password</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">3.</span>
                      <span>Your claim will be reviewed by the Bournemouth team (usually within 48 hours)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">4.</span>
                      <span>Once approved, you'll get dashboard access and can upgrade to unlock premium features</span>
                    </li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Email Verification */}
        {step === 'verify' && (
          <EmailVerification
            email={email}
            onVerified={handleVerified}
            onResend={handleResendCode}
            onBack={handleBack}
          />
        )}

        {/* Step 5: Create Account */}
        {step === 'account' && selectedBusiness && (
          <CreateAccount
            email={email}
            businessName={selectedBusiness.name}
            onSubmit={handleCreateAccount}
            onBack={handleBack}
          />
        )}

        {/* Step 6: Submitted / Pending Approval */}
        {step === 'submitted' && selectedBusiness && (
          <PendingApproval
            businessName={selectedBusiness.name}
            email={email}
            franchiseCity="Bournemouth"
            supportEmail="bournemouth@qwikker.com"
          />
        )}
      </div>
    </div>
  )
}

