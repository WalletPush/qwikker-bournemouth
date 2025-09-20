'use client'

import { useState } from 'react'
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
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

  // Check if user has an existing offer
  const hasExistingOffer = profile.offer_name && profile.offer_name.trim() !== ''

  // Plan limits
  const isFreeTrial = profile.plan === 'starter'
  const offerLimit = isFreeTrial ? 3 : profile.plan === 'spotlight' ? 10 : 999
  // For now, we only support one offer in the profiles table
  // In a real app, you'd have a separate offers table and count all offers
  const currentOfferCount = hasExistingOffer ? 1 : 0

  return (
    <div className="space-y-6">
      {/* Review Process Banner */}
      <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mb-6">
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

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Offers Management</h1>
          <p className="text-gray-400">Create and manage your business offers and promotions</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">
            {currentOfferCount} of {offerLimit} offers used
          </p>
          {isFreeTrial && (
            <p className="text-xs text-yellow-400">
              Free Trial: {offerLimit} offers maximum
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

      {/* Existing Offer */}
      {hasExistingOffer && (
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
            <div className="bg-slate-700/30 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">{profile.offer_name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                        <span className="text-white ml-2">{new Date(profile.offer_start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {profile.offer_end_date && (
                      <div>
                        <span className="text-gray-400">End Date:</span>
                        <span className="text-white ml-2">{new Date(profile.offer_end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  {profile.offer_terms && (
                    <div className="mt-4">
                      <span className="text-gray-400 text-sm">Terms & Conditions:</span>
                      <p className="text-white text-sm mt-1">{profile.offer_terms}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                    onClick={() => setShowCreateForm(true)}
                  >
                    Edit Offer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-600 text-red-400 hover:bg-red-600/10"
                    onClick={() => setShowDeleteConfirmation(true)}
                  >
                    Delete
                  </Button>
                  {currentOfferCount < offerLimit && (
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white"
                      onClick={() => setShowCreateForm(true)}
                    >
                      Create Another
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Offer Button */}
      {!hasExistingOffer && !showCreateForm && currentOfferCount < offerLimit && (
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
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white"
            >
              Create Your First Offer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Offer Form */}
      {showCreateForm && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {hasExistingOffer ? 'Edit Offer' : 'Create New Offer'}
              </CardTitle>
              {showCreateForm && hasExistingOffer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  className="border-slate-600 text-gray-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Offer Details */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="offerName" className="text-white">Offer Name *</Label>
                  <Input
                    id="offerName"
                    value={formData.offerName}
                    onChange={(e) => handleInputChange('offerName', e.target.value)}
                    className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                    placeholder="e.g., Student Discount, Happy Hour Special"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="offerType" className="text-white">Offer Type</Label>
                    <select
                      id="offerType"
                      value={formData.offerType}
                      onChange={(e) => handleInputChange('offerType', e.target.value)}
                      className="w-full bg-slate-900 text-white border-slate-600 focus:border-[#00d083] rounded-md p-2"
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
                    <Label htmlFor="offerValue" className="text-white">Offer Value *</Label>
                    <Input
                      id="offerValue"
                      value={formData.offerValue}
                      onChange={(e) => handleInputChange('offerValue', e.target.value)}
                      className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                      placeholder="e.g., 20% off, Buy 1 Get 1 Free"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="offerClaimAmount" className="text-white">Claim Amount *</Label>
                    <select
                      id="offerClaimAmount"
                      value={formData.offerClaimAmount}
                      onChange={(e) => handleInputChange('offerClaimAmount', e.target.value)}
                      className="w-full bg-slate-900 text-white border-slate-600 focus:border-[#00d083] rounded-md p-2"
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
                    <Label htmlFor="offerImage" className="text-white">Offer Image</Label>
                    <div className="space-y-2">
                      <Input
                        id="offerImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                      />
                      <p className="text-xs text-gray-400">
                        Optional - QWIKKER team will design one if left blank
                      </p>
                    </div>
                  </div>
                </div>

                {imageUploadMessage && (
                  <div className={`p-3 rounded-lg border text-sm ${
                    imageUploadMessage.type === 'success' 
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}>
                    {imageUploadMessage.text}
                  </div>
                )}

                {offerImagePreview && (
                  <div>
                    <Label className="text-white">Image Preview</Label>
                    <div className="mt-2 relative">
                      <img 
                        src={offerImagePreview} 
                        alt="Offer preview" 
                        className="w-32 h-32 object-cover rounded-lg border border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setOfferImageFile(null)
                          setOfferImagePreview(null)
                          setImageUploadMessage(null)
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-sm"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate" className="text-white">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-white">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="offerTerms" className="text-white">Terms & Conditions</Label>
                  <textarea
                    id="offerTerms"
                    value={formData.offerTerms}
                    onChange={(e) => handleInputChange('offerTerms', e.target.value)}
                    className="w-full bg-slate-900 text-white border border-slate-600 focus:border-[#00d083] hover:border-slate-500 rounded-md p-3 min-h-[100px] resize-vertical transition-colors"
                    placeholder="Enter any terms and conditions, restrictions, or limitations..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                {showCreateForm && hasExistingOffer && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isLoading || currentOfferCount >= offerLimit}
                  className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white px-8"
                >
                  {isLoading ? 'Saving...' : hasExistingOffer ? 'Update Offer' : 'Create Offer'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}


      {/* Plan Upgrade Notice */}
      {isFreeTrial && currentOfferCount >= offerLimit && (
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
                  You've reached the maximum of {offerLimit} offers for the Free Trial plan. 
                  Upgrade to Spotlight for up to 10 offers or Pro for unlimited offers.
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
    </div>
  )
}
