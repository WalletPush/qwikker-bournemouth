'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SyncStatusBadge } from './sync-status-badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  BusinessCRMData, 
  formatCurrency, 
  getSubscriptionDisplayText, 
  getPaymentStatusColor,
  getSubscriptionStatusColor,
  calculateTrialStatus
} from '@/types/billing'
import { InitialAvatar } from '@/components/admin/initial-avatar'

interface BusinessCRMCardProps {
  business: BusinessCRMData
  onApprove?: (businessId: string, action: 'approve' | 'reject' | 'restore') => void
  onInspect?: (business: BusinessCRMData) => void
  className?: string
}

export function BusinessCRMCard({ business, onApprove, onInspect, className }: BusinessCRMCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [adminNotes, setAdminNotes] = useState(business.admin_notes || '')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // Use trial info directly from business data (already calculated in admin actions)
  const trialInfo = {
    trial_days_remaining: business.trial_days_remaining,
    trial_status: business.trial_status,
    billing_starts_date: business.billing_starts_date
  }
  
  const handleAction = async (action: 'approve' | 'reject' | 'restore') => {
    if (!onApprove) return
    setIsLoading(true)
    try {
      await onApprove(business.id, action)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveNotes = async () => {
    setIsSavingNotes(true)
    try {
      const response = await fetch('/api/admin/update-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          adminNotes: adminNotes
        })
      })
      
      if (response.ok) {
        setIsEditingNotes(false)
        // Update the business object
        business.admin_notes = adminNotes
      } else {
        alert('Failed to save notes')
      }
    } catch (error) {
      console.error('Error saving notes:', error)
      alert('Failed to save notes')
    } finally {
      setIsSavingNotes(false)
    }
  }

  const getStatusBadge = () => {
    const statusConfig = {
      'incomplete': { bg: 'bg-orange-500/20', text: 'text-orange-300', label: 'INCOMPLETE' },
      'pending_review': { bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'PENDING REVIEW' },
      'approved': { bg: 'bg-green-500/20', text: 'text-green-300', label: 'APPROVED' },
      'rejected': { bg: 'bg-red-500/20', text: 'text-red-300', label: 'REJECTED' },
      'trial_expired': { bg: 'bg-gray-500/20', text: 'text-gray-300', label: 'TRIAL EXPIRED' },
      'inactive': { bg: 'bg-gray-500/20', text: 'text-gray-300', label: 'INACTIVE' }
    }
    
    const config = statusConfig[business.status] || statusConfig['incomplete']
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const getTrialBadge = () => {
    if (trialInfo.trial_status === 'not_applicable') return null
    
    const badgeConfig = {
      'active': { bg: 'bg-blue-500/20', text: 'text-blue-300', label: `${trialInfo.trial_days_remaining} days left` },
      'expired': { bg: 'bg-gray-500/20', text: 'text-gray-300', label: 'Trial ended - Hidden from users' },
      'upgraded': { bg: 'bg-purple-500/20', text: 'text-purple-300', label: 'Signed up for paid plan' }
    }
    
    const config = badgeConfig[trialInfo.trial_status] || badgeConfig['active']
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  // Get header color based on business type - PROFESSIONAL COLORS
  const getHeaderColor = () => {
    const colors = {
      'restaurant': 'from-slate-700/90 to-slate-800/90',
      'cafe': 'from-slate-700/90 to-slate-800/90', 
      'bar': 'from-slate-700/90 to-slate-800/90',
      'salon': 'from-slate-700/90 to-slate-800/90',
      'spa': 'from-slate-700/90 to-slate-800/90',
      'gym': 'from-slate-700/90 to-slate-800/90',
      'retail_shop': 'from-slate-700/90 to-slate-800/90',
      'hotel': 'from-slate-700/90 to-slate-800/90',
      'service_business': 'from-slate-700/90 to-slate-800/90',
      'other': 'from-slate-700/90 to-slate-800/90'
    }
    return colors[business.business_type as keyof typeof colors] || colors['other']
  }

  return (
    <div className={`bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl overflow-hidden hover:border-slate-600 transition-all duration-300 ${className}`}>
      {/* Header Section */}
      <div className={`bg-gradient-to-r ${getHeaderColor()} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Business Type Icon */}
            <div className="flex-shrink-0">
              <InitialAvatar 
                businessName={business.business_name} 
                className="w-14 h-14 rounded-lg border-2 border-white/20 text-lg font-bold"
              />
            </div>
            
            {/* Business Info */}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">
                {business.business_name}
              </h3>
              {(business.first_name || business.last_name) && (
                <p className="text-blue-100 text-sm font-medium mb-1">
                  {business.first_name} {business.last_name}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge()}
                {getTrialBadge()}
                
                {/* Sync Status Badge */}
                <SyncStatusBadge
                  businessId={business.id}
                  businessName={business.business_name}
                  ghlStatus={'synced'}
                  lastSync={business.last_ghl_sync}
                  errors={[]}
                  onForceSync={async (businessId) => {
                    try {
                      const response = await fetch('/api/admin/sync/force-sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ businessId })
                      })
                      
                      const result = await response.json()
                      
                      if (result.success) {
                        // Show success toast
                        const toast = document.createElement('div')
                        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full'
                        toast.innerHTML = `
                          <div class="flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span class="font-medium">Force Sync Successful</span>
                          </div>
                        `
                        document.body.appendChild(toast)
                        
                        // Animate in
                        setTimeout(() => toast.classList.remove('translate-x-full'), 100)
                        
                        // Remove after 3 seconds
                        setTimeout(() => {
                          toast.classList.add('translate-x-full')
                          setTimeout(() => document.body.removeChild(toast), 300)
                        }, 3000)
                        
                        // Refresh the page to show updated sync status
                        setTimeout(() => window.location.reload(), 1000)
                      } else {
                        // Show error toast
                        const toast = document.createElement('div')
                        toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full'
                        toast.innerHTML = `
                          <div class="flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                            <span class="font-medium">Sync Failed: ${result.error}</span>
                          </div>
                        `
                        document.body.appendChild(toast)
                        
                        // Animate in
                        setTimeout(() => toast.classList.remove('translate-x-full'), 100)
                        
                        // Remove after 5 seconds
                        setTimeout(() => {
                          toast.classList.add('translate-x-full')
                          setTimeout(() => document.body.removeChild(toast), 300)
                        }, 5000)
                      }
                    } catch (error) {
                      console.error('Force sync error:', error)
                      // Show error toast
                      const toast = document.createElement('div')
                      toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full'
                      toast.innerHTML = `
                        <div class="flex items-center gap-2">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                          <span class="font-medium">Network Error - Check Console</span>
                        </div>
                      `
                      document.body.appendChild(toast)
                      
                      // Animate in
                      setTimeout(() => toast.classList.remove('translate-x-full'), 100)
                      
                      // Remove after 5 seconds
                      setTimeout(() => {
                        toast.classList.add('translate-x-full')
                        setTimeout(() => document.body.removeChild(toast), 300)
                      }, 5000)
                    }
                  }}
                />
                
                {business.has_pending_changes && (
                  <span className="px-2 py-1 text-xs font-medium text-orange-800 bg-orange-200 rounded-full">
                    {business.pending_changes_count} pending
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Contact Buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => window.open(`mailto:${business.email}`)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Send Email"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => window.open(`tel:${business.phone}`)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Call Phone"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white border-white/30 hover:bg-white/10 hover:border-white/50"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            
            {business.status === 'pending_review' && onInspect && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInspect(business)}
                className="text-white border-white/30 hover:bg-white/10 hover:border-white/50"
              >
                Inspect
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Info Bar */}
      <div className="bg-slate-700/30 px-6 py-3 border-b border-slate-600">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-400 font-medium">Type:</span>
            <span className="ml-2 text-white">
              {business.business_type ? business.business_type.charAt(0).toUpperCase() + business.business_type.slice(1).replace('_', ' ') : 'Not set'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Signup:</span>
            <span className="ml-2 text-white">
              {business.approved_at ? new Date(business.approved_at).toLocaleDateString() : 'Not approved'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Trial:</span>
            <span className="ml-2 text-white">
              {trialInfo.trial_days_remaining ? `${trialInfo.trial_days_remaining} days left` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Trial Ends:</span>
            <span className="ml-2 text-white">
              {trialInfo.billing_starts_date 
                ? new Date(trialInfo.billing_starts_date).toLocaleDateString()
                : 'N/A'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Admin Notes Section - Always Visible */}
      <div className="px-6 py-4 bg-orange-900/20 border-b border-slate-600">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Label className="text-sm font-medium text-orange-300 mb-2 block">Admin Notes</Label>
            {isEditingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-sm text-white placeholder-slate-400 resize-none focus:outline-none focus:border-orange-500"
                  rows={3}
                  placeholder="Add internal notes about this business..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    {isSavingNotes ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingNotes(false)
                      setAdminNotes(business.admin_notes || '')
                    }}
                    className="px-3 py-1 bg-slate-600 text-slate-300 text-sm rounded hover:bg-slate-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setIsEditingNotes(true)}
                className="min-h-[60px] p-3 bg-slate-700/50 border border-slate-600 rounded-md cursor-pointer hover:border-orange-500 transition-colors"
              >
                {adminNotes ? (
                  <p className="text-sm text-white">{adminNotes}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">Click to add admin notes...</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-6 py-6 space-y-6">
          {/* Contact Details */}
          <div className="bg-slate-700/30 rounded-lg border border-slate-600 p-4">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Contact Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-400">Email Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-white">{business.email}</p>
                  <button
                    onClick={() => window.open(`mailto:${business.email}`)}
                    className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Phone Number</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-white">{business.phone}</p>
                  <button
                    onClick={() => window.open(`tel:${business.phone}`)}
                    className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Address</label>
                <p className="text-white mt-1">{business.business_address}</p>
                <p className="text-slate-300 text-sm">{business.business_town}, {business.business_postcode}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Business Category</label>
                <p className="text-white mt-1">{business.business_category}</p>
              </div>
            </div>
          </div>

          {/* Files & Assets */}
          <div className="bg-slate-700/30 rounded-lg border border-slate-600 p-4">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Files & Assets
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-400">Logo</label>
                {business.logo ? (
                  <a href={business.logo} target="_blank" className="text-purple-400 hover:text-purple-300 text-sm block mt-1">
                    🎨 View Logo
                  </a>
                ) : (
                  <p className="text-slate-500 text-sm mt-1">Not uploaded</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Menu</label>
                {business.menu_url ? (
                  <a href={business.menu_url} target="_blank" className="text-purple-400 hover:text-purple-300 text-sm block mt-1">
                    📋 View Menu PDF
                  </a>
                ) : (
                  <p className="text-slate-500 text-sm mt-1">Not uploaded</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Offer Image</label>
                {business.offer_image ? (
                  <a href={business.offer_image} target="_blank" className="text-purple-400 hover:text-purple-300 text-sm block mt-1">
                    🎁 View Offer
                  </a>
                ) : (
                  <p className="text-slate-500 text-sm mt-1">Not uploaded</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Photos</label>
                <p className="text-white text-sm mt-1">{business.business_images?.length || 0} photos</p>
                {business.business_images && business.business_images.length > 0 && (
                  <div className="mt-1">
                    {business.business_images.slice(0, 2).map((imageUrl, index) => (
                      <a
                        key={index}
                        href={imageUrl}
                        target="_blank"
                        className="text-purple-400 hover:text-purple-300 text-xs block"
                      >
                        📸 Photo {index + 1}
                      </a>
                    ))}
                    {business.business_images.length > 2 && (
                      <p className="text-slate-500 text-xs">+{business.business_images.length - 2} more</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Current Offer */}
          {business.offer_name && (
            <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-700/30 p-4">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Current Offer
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-yellow-400">Offer Name</label>
                  <p className="text-white font-semibold mt-1">{business.offer_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-yellow-400">Offer Type</label>
                  <p className="text-white mt-1">{business.offer_type?.replace('_', ' ').toUpperCase() || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-yellow-400">Start Date</label>
                  <p className="text-white mt-1">
                    {business.offer_start_date ? new Date(business.offer_start_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-yellow-400">End Date</label>
                  <p className="text-white mt-1">
                    {business.offer_end_date ? new Date(business.offer_end_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
              {business.offer_terms && (
                <div className="mt-4 p-3 bg-slate-700/50 rounded-lg border border-yellow-700/20">
                  <label className="text-sm font-medium text-yellow-400 block mb-2">Terms & Conditions</label>
                  <p className="text-slate-300 text-sm">{business.offer_terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Secret Menu Items */}
          {business.secret_menu_items && business.secret_menu_items.length > 0 && (
            <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg border border-purple-700/30 p-4">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secret Menu Items ({business.secret_menu_items.length})
              </h4>
              <div className="space-y-3">
                {business.secret_menu_items.map((item, index) => (
                  <div key={index} className="bg-slate-700/50 rounded-lg border border-purple-700/20 p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-white">{item.itemName}</p>
                        {item.description && (
                          <p className="text-slate-300 text-sm mt-1">{item.description}</p>
                        )}
                        <p className="text-slate-400 text-xs mt-2">
                          Added: {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {item.price && (
                        <span className="text-purple-400 font-semibold ml-3">{item.price}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {business.status === 'pending_review' && onApprove && (
            <div className="flex gap-3 pt-4 border-t border-slate-600">
              <Button
                onClick={() => handleAction('approve')}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? 'Processing...' : 'Approve Business'}
              </Button>
              <Button
                onClick={() => handleAction('reject')}
                disabled={isLoading}
                variant="outline"
                className="flex-1 border-red-500 text-red-400 hover:bg-red-500/20"
              >
                {isLoading ? 'Processing...' : 'Reject'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
