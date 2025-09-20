'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { submitBusinessForReview } from '@/lib/actions/business-actions'
import { getPendingChanges } from '@/lib/actions/pending-changes'
import { useState, useEffect } from 'react'

interface ActionItemsPageProps {
  profile?: any
}

export function ActionItemsPage({ profile }: ActionItemsPageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<any[]>([])
  const [loadingPendingChanges, setLoadingPendingChanges] = useState(false)

  // Fetch pending changes on component mount
  useEffect(() => {
    if (profile?.user_id && profile?.status === 'approved') {
      setLoadingPendingChanges(true)
      getPendingChanges(profile.user_id).then((result) => {
        if (result.success) {
          setPendingChanges(result.pendingChanges)
        }
        setLoadingPendingChanges(false)
      })
    }
  }, [profile?.user_id, profile?.status])
  
  // Updated logic to match dashboard-home.tsx - REQUIRED fields for user dashboard listing
  const requiredTodos = []
  const optionalTodos = []
  
  // REQUIRED - Critical fields that MUST be completed for user dashboard listing
  if (!profile?.business_name) {
    requiredTodos.push({ 
      title: 'Add your business name', 
      href: '/dashboard/business',
      priority: 'REQUIRED',
      description: 'Your business name appears as the main title on your listing.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    })
  }

  if (!profile?.business_hours && !profile?.business_hours_structured) {
    requiredTodos.push({ 
      title: 'Add your business hours', 
      href: '/dashboard/business',
      priority: 'REQUIRED',
      description: 'Required for customers to know when you\'re open.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    })
  }

  if (!profile?.business_description) {
    requiredTodos.push({ 
      title: 'Add your business description', 
      href: '/dashboard/business',
      priority: 'REQUIRED',
      description: 'Required for customers to discover you and understand what you offer.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      )
    })
  }

  if (!profile?.business_tagline) {
    requiredTodos.push({ 
      title: 'Add your business tagline', 
      href: '/dashboard/business',
      priority: 'REQUIRED',
      description: 'A catchy tagline that appears on your business card.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      )
    })
  }

  if (!profile?.business_address || !profile?.business_town) {
    requiredTodos.push({ 
      title: 'Complete your business address', 
      href: '/dashboard/business',
      priority: 'REQUIRED',
      description: 'Required for customers to find your location.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    })
  }

  if (!profile?.business_category) {
    requiredTodos.push({ 
      title: 'Select your business category', 
      href: '/dashboard/business',
      priority: 'REQUIRED',
      description: 'Helps customers find you in the right category.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    })
  }

  if (!profile?.logo) {
    requiredTodos.push({ 
      title: 'Upload your business logo', 
      href: '/dashboard/files#logo',
      priority: 'REQUIRED',
      description: 'Essential for branding and customer recognition.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    })
  }

  // Check for business images (required for hero image on user dashboard)
  if (!profile?.business_images || (Array.isArray(profile.business_images) && profile.business_images.length === 0)) {
    requiredTodos.push({ 
      title: 'Upload business photo', 
      href: '/dashboard/files#business-images',
      priority: 'REQUIRED',
      description: 'Required for the hero image on your business listing.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    })
  }

  // Menu upload is now RECOMMENDED (moved to optionalTodos section below)

  // Featured services/items are recommended - helps with customer attraction
  if (!profile?.menu_preview || (Array.isArray(profile.menu_preview) && profile.menu_preview.length === 0)) {
    optionalTodos.push({ 
      title: 'Add featured services/items (top 3-5)', 
      href: '/dashboard/business',
      priority: 'RECOMMENDED',
      description: 'Helps attract customers by showcasing your best services/offerings.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    })
  }
  
  // Recommended menu/service list upload
  if (!profile?.menu_url) {
    optionalTodos.push({ 
      title: 'Upload full menu/service list (PDF)', 
      href: '/dashboard/files#menu',
      priority: 'RECOMMENDED',
      description: 'Critical for AI responses. Allows QWIKKER to recommend your business accurately.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    })
  }
  
  // RECOMMENDED - Nice to have but not required for user dashboard listing
  if (!profile?.offer_name) {
    optionalTodos.push({ 
      title: 'Create your first exclusive offer', 
      href: '/dashboard/offers',
      priority: 'RECOMMENDED',
      description: 'Drives customer acquisition and engagement. Special offers help attract new customers.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    })
  }

  // Check for secret menu items (optional)
  const hasSecretMenuItems = profile?.additional_notes ? 
    (() => {
      try {
        const notesData = JSON.parse(profile.additional_notes)
        return notesData.secret_menu_items && notesData.secret_menu_items.length > 0
      } catch {
        return false
      }
    })() : false

  if (!hasSecretMenuItems) {
    optionalTodos.push({ 
      title: 'Add a secret menu item', 
      href: '/dashboard/secret-menu',
      priority: 'RECOMMENDED',
      description: 'Create exclusive items that only special customers know about. Builds loyalty and word-of-mouth marketing.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    })
  }
  
  if (!profile?.instagram_handle) {
    optionalTodos.push({ 
      title: 'Add your Instagram handle', 
      href: '/dashboard/business',
      priority: 'RECOMMENDED',
      description: 'Social media integration for promotion and customer engagement.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    })
  }

  if (!profile?.website_url) {
    optionalTodos.push({ 
      title: 'Add your website URL', 
      href: '/dashboard/business',
      priority: 'RECOMMENDED',
      description: 'Additional business information for customer reference.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
        </svg>
      )
    })
  }
  
  if (!profile?.facebook_url) {
    optionalTodos.push({ 
      title: 'Add your Facebook page', 
      href: '/dashboard/business',
      priority: 'RECOMMENDED',
      description: 'Secondary social media presence for broader customer reach.',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    })
  }

  const allTodos = [
    { priority: 'REQUIRED', items: requiredTodos },
    { priority: 'RECOMMENDED', items: optionalTodos }
  ]

  const totalRequiredItems = requiredTodos.length
  const totalItems = requiredTodos.length + optionalTodos.length
  const isReadyToSubmit = totalRequiredItems === 0

  const handleSubmitListing = async () => {
    if (!profile?.user_id || !isReadyToSubmit || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      const result = await submitBusinessForReview(profile.user_id)
      if (result.success) {
        // Show success message - could add toast notification here
        window.location.reload() // Refresh to show updated status
      } else {
        console.error('Failed to submit:', result.error)
        // Could add error toast here
      }
    } catch (error) {
      console.error('Error submitting:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show different content based on business status
  if (profile?.status === 'approved') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Business Updates</h1>
          <p className="text-gray-400">
            Your business is live on Qwikker! Keep your listing fresh with new offers, photos, and updates.
          </p>
        </div>

        {/* Approved Business - Pending Changes & Update Options */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Your Business is Live!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-200 mb-4">
              Congratulations! Your business is approved and live on the Qwikker platform. 
              You can now make updates to keep your listing fresh and engaging.
            </p>

            {/* Pending Changes Section */}
            {loadingPendingChanges ? (
              <div className="p-4 bg-slate-700/50 rounded-lg mb-6">
                <p className="text-gray-400">Loading pending changes...</p>
              </div>
            ) : pendingChanges.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pending Approval ({pendingChanges.length})
                </h3>
                <div className="space-y-3">
                  {pendingChanges.map((change) => (
                    <div key={change.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">
                            {change.change_type === 'offer' && 'New Offer'}
                            {change.change_type === 'secret_menu' && 'Secret Menu Item'}
                            {change.change_type === 'business_images' && 'Business Photos'}
                            {change.change_type === 'business_info' && 'Business Info Update'}
                          </h4>
                          <p className="text-gray-300 text-sm">
                            {change.change_type === 'offer' && `"${change.change_data.offer_name}"`}
                            {change.change_type === 'secret_menu' && `"${change.change_data.itemName}"`}
                            {change.change_type === 'business_images' && 'New photos uploaded'}
                            {change.change_type === 'business_info' && 'Business information updated'}
                          </p>
                          <p className="text-gray-400 text-xs">
                            Submitted: {new Date(change.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-yellow-400 text-sm font-medium">
                          Under Review
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Update Options for Approved Businesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/dashboard/offers" className="block">
                <div className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 713 12V7a4 4 0 714-4z" />
                      </svg>
                    </div>
                    <h4 className="text-white font-medium">Create New Offer</h4>
                  </div>
                  <p className="text-gray-400 text-sm">Add special promotions to attract more customers</p>
                </div>
              </Link>

              <Link href="/dashboard/secret-menu" className="block">
                <div className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h4 className="text-white font-medium">Add Secret Menu Item</h4>
                  </div>
                  <p className="text-gray-400 text-sm">Create exclusive items for special customers</p>
                </div>
              </Link>

              <Link href="/dashboard/files" className="block">
                <div className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 01 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 01 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="text-white font-medium">Upload New Photos</h4>
                  </div>
                  <p className="text-gray-400 text-sm">Add fresh photos to showcase your business</p>
                </div>
              </Link>

              <Link href="/dashboard/business" className="block">
                <div className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h4 className="text-white font-medium">Update Business Info</h4>
                  </div>
                  <p className="text-gray-400 text-sm">Keep your business details current</p>
                </div>
              </Link>
            </div>

            {pendingChanges.length === 0 && (
              <div className="mt-4 p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                <p className="text-gray-300 text-sm">
                  <strong>Tip:</strong> Regular updates keep your business engaging! 
                  Consider adding seasonal offers or updating your photos monthly.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Original logic for incomplete/pending businesses
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Action Items</h1>
        <p className="text-gray-400">
          {totalRequiredItems > 0 
            ? `Complete ${totalRequiredItems} required field${totalRequiredItems !== 1 ? 's' : ''} to go live on Qwikker. Your listing will not be visible to users until all required items are completed and approved.`
            : 'All required fields complete! You can now submit your listing for admin review.'
          }
        </p>
      </div>

      {totalItems === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">All Caught Up!</h3>
            <p className="text-gray-400">Your business profile is complete. Great job!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {allTodos.map(({ priority, items }) => 
            items.length > 0 && (
              <Card key={priority} className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      priority === 'REQUIRED' 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      {priority}
                    </span>
                    <span className="text-gray-400 text-sm">({items.length} item{items.length !== 1 ? 's' : ''})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50 min-w-0">
                        <div className="flex-shrink-0">
                          <span className={`inline-flex items-center text-[9px] px-2 py-1 rounded-full font-bold uppercase tracking-wide ${
                            priority === 'REQUIRED' 
                              ? 'bg-red-500 text-white' 
                              : 'bg-green-500 text-white'
                          }`}>
                            {priority === 'REQUIRED' ? 'REQ' : 'REC'}
                          </span>
                        </div>
                        <div className="text-[#00d083] mt-1 flex-shrink-0">{item.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white mb-1">{item.title}</h4>
                          <p className="text-sm text-gray-400 mb-3">{item.description}</p>
                        </div>
                        <Button asChild size="sm" className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white flex-shrink-0">
                          <Link href={item.href}>Complete</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}

      {/* Submit Listing Button */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00d083]/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">
                {isReadyToSubmit ? 'Ready to Submit!' : 'Submit Your Listing'}
              </h3>
              <p className="text-sm text-gray-400">
                {isReadyToSubmit 
                  ? 'All required fields complete. Submit your listing for admin review to go live on Qwikker.'
                  : `Complete ${totalRequiredItems} more required field${totalRequiredItems !== 1 ? 's' : ''} before you can submit your listing.`
                }
              </p>
            </div>
            <Button 
              onClick={handleSubmitListing}
              disabled={!isReadyToSubmit || isSubmitting}
              className={`${
                isReadyToSubmit 
                  ? 'bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white' 
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Listing'}
            </Button>
          </div>
          {!isReadyToSubmit && (
            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-xs text-yellow-400">
                💡 Your listing will be reviewed by our team before going live to ensure the best experience for customers.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Need Help?</h3>
              <p className="text-sm text-gray-400">Contact our support team if you need assistance completing any of these tasks.</p>
            </div>
            <Button asChild variant="outline" className="border-slate-600 text-gray-300 hover:bg-slate-700">
              <Link href="/dashboard/support">Get Help</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
