'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createOffer, deleteOffer } from '@/lib/actions/business-actions'
import { Profile, OFFER_TYPE_OPTIONS, OFFER_CLAIM_AMOUNT_OPTIONS } from '@/types/profiles'

interface OffersPageProps {
  profile: Profile
}

export function OffersPage({ profile }: OffersPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  const [formData, setFormData] = useState({
    offerName: '',
    offerType: '',
    offerValue: '',
    offerClaimAmount: '',
    offerTerms: '',
    startDate: '',
    endDate: '',
  })

  const [offerImageFile, setOfferImageFile] = useState<File | null>(null)
  const [offerImagePreview, setOfferImagePreview] = useState<string | null>(null)
  const [imageUploadMessage, setImageUploadMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Function to start editing existing offer
  const startEditOffer = () => {
    setFormData({
      offerName: profile.offer_name || '',
      offerType: profile.offer_type || '',
      offerValue: profile.offer_value || '',
      offerClaimAmount: profile.offer_claim_amount || '',
      offerTerms: profile.offer_terms || '',
      startDate: profile.offer_start_date || '',
      endDate: profile.offer_end_date || '',
    })
    setIsEditMode(true)
    setShowCreateForm(true)
  }

  // Function to start creating new offer
  const startCreateOffer = () => {
    setFormData({
      offerName: '',
      offerType: '',
      offerValue: '',
      offerClaimAmount: '',
      offerTerms: '',
      startDate: '',
      endDate: '',
    })
    setIsEditMode(false)
    setShowCreateForm(true)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setImageUploadMessage({
        type: 'error',
        text: 'Please upload a valid image file (JPEG, PNG, or WebP)'
      })
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setImageUploadMessage({
        type: 'error',
        text: 'Image must be smaller than 5MB'
      })
      return
    }

    setOfferImageFile(file)
    setImageUploadMessage(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setOfferImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    // Validate dates
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      
      if (endDate <= startDate) {
        setMessage({
          type: 'error',
          text: 'End date must be after start date'
        })
        setIsLoading(false)
        return
      }
      
      // Check if end date is in the past
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (endDate < today) {
        setMessage({
          type: 'error',
          text: 'End date cannot be in the past'
        })
        setIsLoading(false)
        return
      }
    }

    try {
      // Upload image if provided
      let offerImageUrl = null
      if (offerImageFile) {
        const { uploadToCloudinary } = await import('@/lib/integrations')
        offerImageUrl = await uploadToCloudinary(offerImageFile, 'qwikker/offers')
      }

      const offerData = {
        ...formData,
        offerImage: offerImageUrl,
      }

      const result = await createOffer(profile.user_id, offerData)
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message || 'Offer submitted for admin approval!'
        })
        setShowCreateForm(false)
        setFormData({
          offerName: '',
          offerType: '',
          offerValue: '',
          offerClaimAmount: '',
          offerTerms: '',
          startDate: '',
          endDate: '',
        })
        setOfferImageFile(null)
        setOfferImagePreview(null)
        setImageUploadMessage(null)
        router.refresh()
      } else {
        throw new Error(result.error || 'Offer creation failed')
      }
    } catch (error) {
      console.error('Offer creation error:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Offer creation failed. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      offerName: '',
      offerType: '',
      offerValue: '',
      offerClaimAmount: '',
      offerTerms: '',
      startDate: '',
      endDate: '',
    })
    setOfferImageFile(null)
    setOfferImagePreview(null)
    setImageUploadMessage(null)
    setShowCreateForm(false)
    setMessage(null)
    setIsEditMode(false)
    setEditingOfferId(null) // Clear editing state
  }

  const handleDeleteOffer = async () => {
    setIsDeleting(true)
    setMessage(null)

    try {
      const result = await deleteOffer(profile.user_id)
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Offer deleted successfully!'
        })
        setShowDeleteConfirmation(false)
        router.refresh()
      } else {
        throw new Error(result.error || 'Failed to delete offer')
      }
    } catch (error) {
      console.error('Offer deletion error:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete offer. Please try again.'
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirmation(false)
    }
  }

  // Get approved offers from the new business_offers table
  const approvedOffers = profile.business_offers?.filter(offer => offer.status === 'approved') || []
  const currentOfferCount = approvedOffers.length
  
  // Check if user has any existing offers (for backward compatibility)
  const hasLegacyOffer = profile.offer_name && profile.offer_name.trim() !== ''

  // Plan limits based on business tier (updated to match database)
  const getOfferLimit = (plan: string) => {
    switch (plan) {
      case 'starter': return 3      // Starter businesses: 3 offers
      case 'featured': return 5     // Featured businesses: 5 offers  
      case 'spotlight': return 25   // Spotlight businesses: 25 offers
      default: return 3             // Default to starter limit
    }
  }
  
  const offerLimit = getOfferLimit(profile.plan || 'starter')
  const isStarterTier = profile.plan === 'starter'

  return (
    <div className="space-y-6">
      {/* Qwikker Exclusive Offer Promotion Banner */}
      <div className="bg-gradient-to-r from-[#00d083]/10 to-[#00b86f]/10 border border-[#00d083]/30 rounded-xl p-6 mb-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <div className="flex justify-center mb-3">
            <span className="bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black text-xs font-bold px-3 py-1 rounded-full">
              EXCLUSIVE
            </span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Create Qwikker-Exclusive Offers
          </h3>
          <p className="text-slate-300 mb-4 leading-relaxed max-w-3xl mx-auto">
            Stand out from competitors by creating special offers exclusively for Qwikker users. 
            These exclusive deals help build customer loyalty and drive repeat business through our platform.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <svg className="w-4 h-4 text-[#00d083] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Increase customer loyalty</span>
          </div>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <svg className="w-4 h-4 text-[#00d083] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Attract new customers</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <svg className="w-4 h-4 text-[#00d083] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span>Stand out from competition</span>
            </div>
          </div>
        </div>
      </div>


      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Offers Management</h1>
          <p className="text-gray-400">Create and manage your business offers and promotions</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">
            {currentOfferCount} of {offerLimit} offers used
          </p>
          {isStarterTier && (
            <p className="text-xs text-yellow-400">
              Starter Tier: {offerLimit} offer maximum
            </p>
          )}
          {profile.plan === 'featured' && (
            <p className="text-xs text-blue-400">
              Featured Tier: {offerLimit} offers maximum
            </p>
          )}
          {profile.plan === 'spotlight' && (
            <p className="text-xs text-green-400">
              Spotlight Tier: Unlimited offers
            </p>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Current Offers */}
      {approvedOffers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Your Active Offers ({approvedOffers.length})
          </h2>
          
          {approvedOffers.map((offer, index) => (
            <Card 
              key={offer.id} 
              className={`bg-slate-800/50 border-slate-700 transition-all duration-300 ${
                editingOfferId === offer.id ? 'ring-2 ring-[#00d083] shadow-lg shadow-[#00d083]/20' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="bg-slate-700/30 rounded-lg p-4 sm:p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white">{offer.offer_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-[#00d083]/20 text-[#00d083] px-2 py-1 rounded-full">
                            Offer #{index + 1}
                          </span>
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                            {offer.status}
                          </span>
                          {/* Business Tier Badge */}
                          {profile.business_tier === 'qwikker_picks' && (
                            <span className="text-xs bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-500/30">
                              ⭐ Qwikker Picks
                            </span>
                          )}
                          {profile.business_tier === 'featured' && (
                            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full border border-blue-500/30">
                              🔥 Featured
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="hidden sm:flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-gray-300 hover:bg-slate-700 text-xs"
                          onClick={() => {
                            // Edit this specific offer
                            setFormData({
                              offerName: offer.offer_name,
                              offerType: offer.offer_type,
                              offerValue: offer.offer_value,
                              offerClaimAmount: offer.offer_claim_amount || 'multiple',
                              offerTerms: offer.offer_terms || '',
                              startDate: offer.offer_start_date || '',
                              endDate: offer.offer_end_date || '',
                            })
                            setEditingOfferId(offer.id)
                            setIsEditMode(true)
                            setShowCreateForm(true)
                            
                            // Auto-scroll to form with delay for state update
                            setTimeout(() => {
                              formRef.current?.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start' 
                              })
                            }, 100)
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white ml-2">{offer.offer_type || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Value:</span>
                        <span className="text-white ml-2">{offer.offer_value || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Claim Amount:</span>
                        <span className="text-white ml-2">
                          {offer.offer_claim_amount === 'single' ? 'Single Use' : 
                           offer.offer_claim_amount === 'multiple' ? 'Multiple Use' : 
                           'Not specified'}
                        </span>
                      </div>
                      {offer.offer_image && (
                        <div>
                          <span className="text-gray-400">Offer Image:</span>
                          <a href={offer.offer_image} target="_blank" rel="noopener noreferrer" className="text-[#00d083] hover:text-[#00b86f] ml-2 underline">
                            View Image
                          </a>
                        </div>
                      )}
                      {offer.offer_start_date && (
                        <div>
                          <span className="text-gray-400">Start Date:</span>
                          <span className="text-white ml-2">{new Date(offer.offer_start_date).toLocaleDateString('en-GB')}</span>
                        </div>
                      )}
                      {offer.offer_end_date && (
                        <div>
                          <span className="text-gray-400">End Date:</span>
                          <span className="text-white ml-2">{new Date(offer.offer_end_date).toLocaleDateString('en-GB')}</span>
                        </div>
                      )}
                    </div>
                    
                    {offer.offer_terms && (
                      <div className="mt-4 pt-4 border-t border-slate-600">
                        <span className="text-gray-400 text-sm">Terms & Conditions:</span>
                        <p className="text-white text-sm mt-1 leading-relaxed">{offer.offer_terms}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Legacy Offer (for backward compatibility) */}
      {hasLegacyOffer && approvedOffers.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Current Offer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-700/30 rounded-lg p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold text-white flex-1 min-w-0">{profile.offer_name}</h3>
                  {/* Action buttons - only show on larger screens */}
                  <div className="hidden sm:flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-gray-300 hover:bg-slate-700 text-xs"
                      onClick={startEditOffer}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-600 text-red-400 hover:bg-red-600/10 text-xs"
                      onClick={() => setShowDeleteConfirmation(true)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Type:</span>
                    <span className="text-white ml-2">{profile.offer_type || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Value:</span>
                    <span className="text-white ml-2">{profile.offer_value || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Claim Amount:</span>
                    <span className="text-white ml-2">
                      {profile.offer_claim_amount === 'single' ? 'Single Use' : 
                       profile.offer_claim_amount === 'multiple' ? 'Multiple Use' : 
                       'Not specified'}
                    </span>
                  </div>
                  {profile.offer_image && (
                    <div>
                      <span className="text-gray-400">Offer Image:</span>
                      <a href={profile.offer_image} target="_blank" rel="noopener noreferrer" className="text-[#00d083] hover:text-[#00b86f] ml-2 underline">
                        View Image
                      </a>
                    </div>
                  )}
                  {profile.offer_start_date && (
                    <div>
                      <span className="text-gray-400">Start Date:</span>
                      <span className="text-white ml-2">{new Date(profile.offer_start_date).toLocaleDateString('en-GB')}</span>
                    </div>
                  )}
                  {profile.offer_end_date && (
                    <div>
                      <span className="text-gray-400">End Date:</span>
                      <span className="text-white ml-2">{new Date(profile.offer_end_date).toLocaleDateString('en-GB')}</span>
                    </div>
                  )}
                </div>
                
                {profile.offer_terms && (
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <span className="text-gray-400 text-sm">Terms & Conditions:</span>
                    <p className="text-white text-sm mt-1 leading-relaxed">{profile.offer_terms}</p>
                  </div>
                )}
                
                {/* Mobile action buttons */}
                <div className="sm:hidden flex flex-wrap gap-2 pt-4 border-t border-slate-600">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-gray-300 hover:bg-slate-700 flex-1 touch-manipulation min-h-[44px]"
                    onClick={startEditOffer}
                  >
                    Edit Offer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-600 text-red-400 hover:bg-red-600/10 flex-1 touch-manipulation min-h-[44px]"
                    onClick={() => setShowDeleteConfirmation(true)}
                  >
                    Delete
                  </Button>
                  {currentOfferCount < offerLimit && (
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white w-full touch-manipulation min-h-[44px]"
                      onClick={startCreateOffer}
                    >
                      Create Another Offer
                    </Button>
                  )}
                </div>
                
                {/* Desktop "Create Another" button */}
                {currentOfferCount < offerLimit && (
                  <div className="hidden sm:block pt-4 border-t border-slate-600">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white"
                    onClick={startCreateOffer}
                    >
                      Create Another Offer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Offer Button */}
      {approvedOffers.length === 0 && !showCreateForm && currentOfferCount < offerLimit && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Offers Created Yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first offer to attract customers and drive engagement
            </p>
            <Button
              onClick={startCreateOffer}
              className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white"
            >
              Create Your First Offer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Another Offer Button */}
      {approvedOffers.length > 0 && !showCreateForm && currentOfferCount < offerLimit && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium text-white mb-2">Add Another Offer</h3>
            <p className="text-gray-400 mb-4">
              You have {currentOfferCount} of {offerLimit} offers. Create another to maximize your reach!
            </p>
            <Button
              onClick={startCreateOffer}
              className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white"
            >
              Create Another Offer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Offer Form */}
      {showCreateForm && (
        <Card ref={formRef} className="bg-slate-800/80 border-slate-600 shadow-2xl backdrop-blur-sm">
          <CardHeader className="pb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                </div>
                <div>
                  <CardTitle className="text-white text-xl">
                    {isEditMode ? 'Edit Offer' : 'Create New Offer'}
              </CardTitle>
                  <p className="text-slate-400 text-sm mt-1">
                    {isEditMode ? 'Update expiry date and terms only' : 'Create and manage your business offers and promotions'}
                  </p>
                  {isEditMode && (
                    <p className="text-xs text-amber-400 mt-1">
                      Core offer details (name, type, value) cannot be changed after approval
                    </p>
                  )}
                </div>
              </div>
              {showCreateForm && hasLegacyOffer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information Section */}
              <div className="bg-slate-900/30 border border-slate-700 rounded-xl p-6 space-y-6">
                <div className="border-b border-slate-600 pb-4">
                  <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Basic Information
                  </h3>
                  <p className="text-slate-400 text-sm">Define your offer name and core details</p>
                </div>
                
              <div className="space-y-4">
                <div>
                    <Label htmlFor="offerName" className="text-white font-medium mb-2 block">
                      Offer Name <span className="text-red-400">*</span>
                    </Label>
                  <Input
                    id="offerName"
                    value={formData.offerName}
                    onChange={(e) => handleInputChange('offerName', e.target.value)}
                      className={`text-white border-2 focus:ring-2 focus:ring-[#00d083]/20 transition-all duration-200 h-12 shadow-sm ${
                        isEditMode 
                          ? 'bg-slate-700 border-slate-500 cursor-not-allowed opacity-75' 
                          : 'bg-slate-800 border-slate-600 focus:border-[#00d083] hover:border-slate-500'
                      }`}
                    placeholder="e.g., Student Discount, Happy Hour Special"
                    required
                      readOnly={isEditMode}
                      disabled={isEditMode}
                  />
                </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <Label htmlFor="offerType" className="text-white font-medium mb-2 block">
                        Offer Type <span className="text-red-400">*</span>
                      </Label>
                    <select
                      id="offerType"
                      value={formData.offerType}
                      onChange={(e) => handleInputChange('offerType', e.target.value)}
                        className={`w-full text-white border-2 focus:ring-2 focus:ring-[#00d083]/20 transition-all duration-200 rounded-lg p-3 h-12 shadow-sm ${
                          isEditMode 
                            ? 'bg-slate-700 border-slate-500 cursor-not-allowed opacity-75' 
                            : 'bg-slate-800 border-slate-600 focus:border-[#00d083] hover:border-slate-500'
                        }`}
                        required
                        disabled={isEditMode}
                    >
                      <option value="">Select offer type</option>
                      {OFFER_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                      <Label htmlFor="offerValue" className="text-white font-medium mb-2 block">
                        Offer Value <span className="text-red-400">*</span>
                      </Label>
                    <Input
                      id="offerValue"
                      value={formData.offerValue}
                      onChange={(e) => handleInputChange('offerValue', e.target.value)}
                        className={`text-white border-2 focus:ring-2 focus:ring-[#00d083]/20 transition-all duration-200 h-12 shadow-sm ${
                          isEditMode 
                            ? 'bg-slate-700 border-slate-500 cursor-not-allowed opacity-75' 
                            : 'bg-slate-800 border-slate-600 focus:border-[#00d083] hover:border-slate-500'
                        }`}
                      placeholder="e.g., 20% off, Buy 1 Get 1 Free"
                      required
                        readOnly={isEditMode}
                        disabled={isEditMode}
                    />
                    </div>
                  </div>
                  </div>
                </div>

              {/* Offer Configuration Section */}
              <div className="bg-slate-900/30 border border-slate-700 rounded-xl p-6 space-y-6">
                <div className="border-b border-slate-600 pb-4">
                  <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Offer Configuration
                  </h3>
                  <p className="text-slate-400 text-sm">Set claim limits and upload promotional image</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="offerClaimAmount" className="text-white font-medium mb-2 block">
                      Claim Amount <span className="text-red-400">*</span>
                    </Label>
                    <select
                      id="offerClaimAmount"
                      value={formData.offerClaimAmount}
                      onChange={(e) => handleInputChange('offerClaimAmount', e.target.value)}
                      className="w-full bg-slate-900/50 text-white border border-slate-600 focus:border-[#00d083] focus:ring-1 focus:ring-[#00d083]/20 hover:border-slate-500 transition-colors rounded-lg p-3 h-11"
                      required
                    >
                      <option value="">Select claim amount</option>
                      {OFFER_CLAIM_AMOUNT_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="offerImage" className="text-white font-medium mb-2 block">
                      Offer Image <span className="text-red-400">*</span>
                    </Label>
                    <div className="space-y-2">
                      <Input
                        id="offerImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="bg-slate-800 text-white border-2 border-slate-600 focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 hover:border-slate-500 transition-all duration-200 h-12 shadow-sm file:bg-slate-700 file:border-0 file:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:text-sm hover:file:bg-slate-600"
                        required
                      />
                      <p className="text-xs text-slate-400">
                        Required - Upload an image or QWIKKER team will design one
                      </p>
                    </div>
                    </div>
                  </div>
                </div>

                {imageUploadMessage && (
                  <div className={`p-4 rounded-lg border text-sm flex items-center gap-3 ${
                    imageUploadMessage.type === 'success' 
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    <svg className={`w-5 h-5 flex-shrink-0 ${
                      imageUploadMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {imageUploadMessage.type === 'success' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      )}
                    </svg>
                    {imageUploadMessage.text}
                  </div>
                )}

                {offerImagePreview && (
                  <div className="space-y-3">
                    <Label className="text-white font-medium">Image Preview</Label>
                    <div className="relative inline-block">
                      <img 
                        src={offerImagePreview} 
                        alt="Offer preview" 
                        className="w-40 h-40 object-cover rounded-xl border-2 border-slate-600 shadow-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setOfferImageFile(null)
                          setOfferImagePreview(null)
                          setImageUploadMessage(null)
                        }}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-sm shadow-lg transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

              {/* Schedule Section */}
              <div className="bg-slate-900/30 border border-slate-700 rounded-xl p-6 space-y-6">
                <div className="border-b border-slate-600 pb-4">
                  <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Schedule
                  </h3>
                  <p className="text-slate-400 text-sm">Set when your offer becomes active and expires</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="startDate" className="text-white font-medium mb-2 block">
                      Start Date <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="bg-slate-800 text-white border-2 border-slate-600 focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 hover:border-slate-500 transition-all duration-200 h-12 shadow-sm"
                      min={new Date().toISOString().split('T')[0]} // Prevent past dates
                      required
                    />
                    <p className="text-slate-400 text-xs mt-2">When the offer becomes active</p>
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-white font-medium mb-2 block">
                      End Date <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="bg-slate-800 text-white border-2 border-slate-600 focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 hover:border-slate-500 transition-all duration-200 h-12 shadow-sm"
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      required
                    />
                    <p className="text-slate-400 text-xs mt-2">When the offer expires</p>
                  </div>
                  </div>
              </div>

              {/* Terms & Conditions Section */}
              <div className="bg-slate-900/30 border border-slate-700 rounded-xl p-6 space-y-6">
                <div className="border-b border-slate-600 pb-4">
                  <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Terms & Conditions
                  </h3>
                  <p className="text-slate-400 text-sm">Add any restrictions or limitations for your offer</p>
                </div>

                <div>
                  <Label htmlFor="offerTerms" className="text-white font-medium mb-2 block">
                    Terms & Conditions <span className="text-red-400">*</span>
                  </Label>
                  <textarea
                    id="offerTerms"
                    value={formData.offerTerms}
                    onChange={(e) => handleInputChange('offerTerms', e.target.value)}
                    className="w-full bg-slate-800 text-white border-2 border-slate-600 focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 hover:border-slate-500 rounded-lg p-4 min-h-[120px] resize-vertical transition-all duration-200 placeholder:text-slate-500 shadow-sm"
                    required
                    placeholder="Enter any terms and conditions, restrictions, or limitations...

Examples:
• Valid for dine-in only
• Cannot be combined with other offers
• Maximum one per customer per day
• Valid Monday-Friday only"
                  />
                  <p className="text-slate-400 text-xs mt-2">
                    Required - Be specific about any restrictions to avoid customer confusion
                  </p>
                </div>
              </div>

              {/* Submit Section */}
              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-slate-700">
                {showCreateForm && hasLegacyOffer && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 px-6"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isLoading || currentOfferCount >= offerLimit}
                  className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold px-8 py-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Saving...
                    </div>
                  ) : (
                    isEditMode ? 'Update Offer' : 'Create Offer'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}


      {/* Plan Upgrade Notice */}
      {currentOfferCount >= offerLimit && profile.plan !== 'spotlight' && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Offer Limit Reached</h3>
                <p className="text-sm text-gray-400">
                  {profile.plan === 'starter' && (
                    <>You've reached the maximum of {offerLimit} offer for the Starter plan. Upgrade to Featured for 3 offers or Spotlight for unlimited offers.</>
                  )}
                  {profile.plan === 'featured' && (
                    <>You've reached the maximum of {offerLimit} offers for the Featured plan. Upgrade to Spotlight for unlimited offers.</>
                  )}
                </p>
              </div>
              <Button
                onClick={() => router.push('/dashboard/settings')}
                className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white"
              >
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-slate-800 border-slate-700 max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Delete Offer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete the offer "{profile.offer_name}"? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirmation(false)}
                  disabled={isDeleting}
                  className="border-slate-600 text-gray-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteOffer}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Offer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Review Process Banner */}
      <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-200 mb-1">Review Process</h3>
            <p className="text-blue-100 text-sm leading-relaxed">
              Offers, menus, secret menu items, and images can take <strong>up to 48 hours</strong> to be reviewed and go live on the QWIKKER database. You'll see the status update here once reviewed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
