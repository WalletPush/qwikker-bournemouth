'use client'

import { useState } from 'react'
import Image from 'next/image'
import { LogoutButton } from '@/components/logout-button'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'

interface Business {
  id: string
  user_id: string
  business_name: string | null
  email: string
  first_name: string
  last_name: string
  business_type: string | null
  business_category: string | null
  business_town: string | null
  business_address: string | null
  business_postcode: string | null
  phone: string | null
  logo: string | null
  business_tagline: string | null
  business_description: string | null
  business_hours: string | null
  offer_name: string | null
  offer_type: string | null
  offer_value: string | null
  offer_terms: string | null
  menu_url: string | null
  business_images: string[] | null
  menu_preview: any[] | null
  status: string
  created_at: string
  updated_at: string
}

interface AdminDashboardProps {
  businesses: Business[]
  adminEmail: string
  city?: string
  cityDisplayName?: string
}

export function AdminDashboard({ businesses, adminEmail, city = 'bournemouth', cityDisplayName = 'Bournemouth' }: AdminDashboardProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [businessList, setBusinessList] = useState(businesses)
  const [activeTab, setActiveTab] = useState<'pending' | 'incomplete' | 'live' | 'changes'>('pending')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [emailPromptModal, setEmailPromptModal] = useState<{ open: boolean; business: Business | null }>({ 
    open: false, 
    business: null 
  })
  const [successModal, setSuccessModal] = useState<{ open: boolean; message: string; businessName: string }>({ 
    open: false, 
    message: '', 
    businessName: '' 
  })

  const handleApproval = async (businessId: string, action: 'approve' | 'reject') => {
    setIsLoading(businessId)
    
    try {
      const response = await fetch('/api/admin/approve-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          action,
          adminEmail
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update business status')
      }

      const result = await response.json()
      
      // Update the business list with new status
      setBusinessList(prev => 
        prev.map(business => 
          business.id === businessId 
            ? { ...business, status: action === 'approve' ? 'approved' : 'rejected' }
            : business
        )
      )

      // Show success message
      const businessName = businessList.find(b => b.id === businessId)?.business_name || 'Business'
      setSuccessModal({
        open: true,
        businessName,
        message: action === 'approve' 
          ? 'The business is now live and visible to users on the discover page!' 
          : 'The business application has been rejected and the owner will be notified.'
      })
      
      // If approved, switch to Live Listings tab to show the result
      if (action === 'approve') {
        setTimeout(() => {
          setActiveTab('live')
          setSuccessModal({ open: false, message: '', businessName: '' })
        }, 3000)
      } else {
        setTimeout(() => {
          setSuccessModal({ open: false, message: '', businessName: '' })
        }, 3000)
      }
      
    } catch (error) {
      console.error('Error updating business:', error)
      alert('❌ Failed to update business status. Please try again.')
    } finally {
      setIsLoading(null)
    }
  }

  // Filter businesses by status and completion
  const pendingBusinesses = businessList.filter(b => b.status === 'pending_review')
  const liveBusinesses = businessList.filter(b => b.status === 'approved')
  
  // Incomplete = either status is 'incomplete' OR missing required business fields
  const incompleteBusinesses = businessList.filter(b => {
    if (b.status === 'incomplete') return true
    
    // Also include profiles that haven't completed required business fields
    const hasRequiredFields = b.business_name && b.business_category && b.business_town
    return !hasRequiredFields && b.status !== 'approved' && b.status !== 'rejected' && b.status !== 'pending_review'
  })
  
  const changesAwaitingApproval = [] // TODO: Implement changes tracking

  const adminNavItems = [
    { 
      id: 'pending', 
      title: 'Pending Reviews', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      count: pendingBusinesses.length
    },
    { 
      id: 'incomplete', 
      title: 'Incomplete Listings', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      count: incompleteBusinesses.length
    },
    { 
      id: 'live', 
      title: 'Live Listings', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
      count: liveBusinesses.length
    },
    { 
      id: 'changes', 
      title: 'Content Changes', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.647z" /></svg>,
      count: changesAwaitingApproval.length
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'incomplete':
        return (
          <span className="px-3 py-1 bg-slate-600/50 text-gray-300 text-xs font-semibold rounded-full border border-slate-500 flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            Incomplete
          </span>
        )
      case 'pending_review':
        return (
          <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs font-semibold rounded-full border border-orange-500/30 flex items-center gap-1">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
            Pending Review
          </span>
        )
      case 'approved':
        return (
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-500/30 flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-500/20 text-red-300 text-xs font-semibold rounded-full border border-red-500/30 flex items-center gap-1">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            Rejected
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 bg-slate-600/50 text-gray-300 text-xs font-semibold rounded-full border border-slate-500">
            {status}
          </span>
        )
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    const day = date.getDate().toString().padStart(2, '0')
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    
    return `${day} ${month} ${year}, ${hours}:${minutes}`
  }

  const renderBusinessCard = (business: Business, showActions: boolean) => (
    <div key={business.id} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl overflow-hidden hover:border-slate-600 transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {business.logo ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-700 flex-shrink-0 ring-2 ring-slate-600">
                <Image
                  src={business.logo}
                  alt={business.business_name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex-shrink-0 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
                </svg>
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                {business.business_name}
              </h3>
              <p className="text-gray-400 mb-2">
                {business.first_name} {business.last_name} • {business.email}
              </p>
              <div className="flex items-center gap-2">
                {getStatusBadge(business.status)}
                <span className="px-3 py-1 bg-slate-600/50 text-gray-300 text-xs font-medium rounded-full border border-slate-500">
                  {business.business_type?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-right text-sm text-gray-400">
            <p className="mb-1">Applied: {formatDate(business.created_at)}</p>
            {business.updated_at !== business.created_at && (
              <p>Updated: {formatDate(business.updated_at)}</p>
            )}
          </div>
        </div>
        
        {/* Business Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
              </svg>
              Business Details
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Category:</span>
                <span className="text-gray-300">{business.business_category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Location:</span>
                <span className="text-gray-300">{business.business_town}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Address:</span>
                <span className="text-gray-300">{business.business_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Phone:</span>
                <span className="text-gray-300">{business.phone}</span>
              </div>
            </div>
          </div>
          
          {business.offer_name && (
            <div>
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Offer Details
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Offer:</span>
                  <span className="text-gray-300">{business.offer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-gray-300">{business.offer_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Value:</span>
                  <span className="text-gray-300">{business.offer_value}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        {showActions && business.status !== 'approved' && business.status !== 'rejected' && (
          <div className="flex gap-3 pt-4 border-t border-slate-600">
            <button
              onClick={() => handleApproval(business.id, 'approve')}
              disabled={isLoading === business.id}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading === business.id ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve Business
                </>
              )}
            </button>
            
            <button
              onClick={() => handleApproval(business.id, 'reject')}
              disabled={isLoading === business.id}
              className="flex-1 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-slate-600/20 hover:shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-slate-500 hover:border-red-500"
            >
              {isLoading === business.id ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject Application
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const renderIncompleteBusinessCard = (business: Business) => {
    const actionItemsCount = calculateActionItemsCount(business)
    
    return (
      <div key={business.id} className="bg-slate-800/50 backdrop-blur border border-orange-500/30 rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all duration-300">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {business.logo ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-700 flex-shrink-0 ring-2 ring-orange-500/50">
                  <Image
                    src={business.logo}
                    alt={business.business_name || 'Business'}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex-shrink-0 flex items-center justify-center border border-orange-500/30">
                  <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {business.business_name || `${business.first_name} ${business.last_name}` || 'New Registration'}
                </h3>
                <p className="text-gray-400 mb-2">
                  {business.email}
                </p>
                <div className="flex items-center gap-2">
                  {getStatusBadge(business.status)}
                  <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs font-semibold rounded-full border border-orange-500/30 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {actionItemsCount} action items remaining
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right text-sm text-gray-400">
              <p className="mb-1">Registered: {formatDate(business.created_at)}</p>
              <p className="text-orange-400 font-medium">Incomplete Profile</p>
            </div>
          </div>
          
          {/* Progress Overview */}
          <div className="mb-6">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Profile Completion Status
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Business Name:</span>
                  <span className={business.business_name ? "text-emerald-400" : "text-orange-400"}>
                    {business.business_name ? "✓ Complete" : "✗ Missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Category:</span>
                  <span className={business.business_category ? "text-emerald-400" : "text-orange-400"}>
                    {business.business_category ? "✓ Complete" : "✗ Missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Location:</span>
                  <span className={business.business_town ? "text-emerald-400" : "text-orange-400"}>
                    {business.business_town ? "✓ Complete" : "✗ Missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Business Hours:</span>
                  <span className={business.business_hours ? "text-emerald-400" : "text-orange-400"}>
                    {business.business_hours ? "✓ Complete" : "✗ Missing"}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Description:</span>
                  <span className={business.business_description ? "text-emerald-400" : "text-orange-400"}>
                    {business.business_description ? "✓ Complete" : "✗ Missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Logo:</span>
                  <span className={business.logo ? "text-emerald-400" : "text-orange-400"}>
                    {business.logo ? "✓ Uploaded" : "✗ Missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Menu:</span>
                  <span className={business.menu_url ? "text-emerald-400" : "text-orange-400"}>
                    {business.menu_url ? "✓ Uploaded" : "✗ Missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Offer:</span>
                  <span className={business.offer_name ? "text-emerald-400" : "text-orange-400"}>
                    {business.offer_name ? "✓ Complete" : "✗ Missing"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          <div className="flex gap-3 pt-4 border-t border-slate-600">
            <button
              onClick={() => setEmailPromptModal({ open: true, business })}
              className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-orange-600/20 hover:shadow-orange-600/30 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Prompt Email
            </button>
            
            <button
              onClick={() => {
                // TODO: Implement admin impersonation or profile view
                alert(`Contact Details:\n\nEmail: ${business.email}\nName: ${business.first_name} ${business.last_name}\nPhone: ${business.phone || 'Not provided'}\n\nYou can contact them directly to help complete their profile.`)
              }}
              className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all duration-200 border border-slate-500 hover:border-slate-400 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Contact Info
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleSendPromptEmail = async (business: Business) => {
    // TODO: Implement email sending logic
    alert(`Email prompt sent to ${business.email}!\n\nThis will remind them to complete their ${calculateActionItemsCount(business)} remaining action items.\n\n(Email integration coming soon)`)
    setEmailPromptModal({ open: false, business: null })
  }

  return (
    <>
      {/* Success Modal */}
      {successModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-emerald-500/30 shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Success!</h3>
                  <p className="text-sm text-gray-400">Business status updated</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-white">{successModal.businessName}</p>
                      <p className="text-sm text-emerald-400">Status Updated Successfully</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300">{successModal.message}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setSuccessModal({ open: false, message: '', businessName: '' })}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Prompt Modal */}
      {emailPromptModal.open && emailPromptModal.business && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Send Completion Reminder</h3>
                  <p className="text-sm text-gray-400">Prompt business to complete their profile</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-slate-700/50 rounded-xl border border-slate-600">
                  <div className="flex items-center gap-3 mb-3">
                    {emailPromptModal.business.logo ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden">
                        <Image
                          src={emailPromptModal.business.logo}
                          alt="Business logo"
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-white">
                        {emailPromptModal.business.business_name || `${emailPromptModal.business.first_name} ${emailPromptModal.business.last_name}`}
                      </p>
                      <p className="text-sm text-gray-400">{emailPromptModal.business.email}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-300">
                    <p><strong>{calculateActionItemsCount(emailPromptModal.business)} action items</strong> remaining to complete profile</p>
                  </div>
                </div>
                
                <div className="text-sm text-gray-400">
                  <p>This will send a friendly email reminder to help them complete their business profile and get live on Qwikker.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setEmailPromptModal({ open: false, business: null })}
                  className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors border border-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSendPromptEmail(emailPromptModal.business!)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-medium rounded-xl transition-all shadow-lg shadow-orange-600/20"
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-slate-950 text-white">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Match your exact dashboard layout */}
      <div className={`fixed inset-y-0 left-0 w-80 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 transform transition-transform duration-300 z-50 flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        
        {/* Logo - Fixed at top */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800">
          <div className="text-center space-y-2">
            <img 
              src="/Qwikker Logo web.svg" 
              alt="QWIKKER Admin Dashboard" 
              className="h-8 w-auto sm:h-10 mx-auto"
            />
            <p className="text-sm text-gray-400 font-medium">Admin Dashboard</p>
            <p className="text-xs text-gray-500 font-medium">{cityDisplayName}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-scroll overflow-x-hidden scrollbar-hidden p-4 space-y-2">
          {adminNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as 'pending' | 'incomplete' | 'live' | 'changes')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left group ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-emerald-600/20 to-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <span className={`${activeTab === item.id ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                {item.icon}
              </span>
              <span className="font-medium flex-1">{item.title}</span>
              {item.count > 0 && (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  activeTab === item.id 
                    ? 'bg-emerald-500/20 text-emerald-300' 
                    : 'bg-slate-700 text-gray-300'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Admin User</p>
              <p className="text-xs text-gray-400 truncate">{adminEmail}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-80">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              {activeTab === 'pending' && 'Pending Reviews'}
              {activeTab === 'incomplete' && 'Incomplete Listings'}
              {activeTab === 'live' && 'Live Listings'}
              {activeTab === 'changes' && 'Content Changes'}
            </h1>
            <p className="text-gray-400">
              {activeTab === 'pending' && 'Review and approve new business applications'}
              {activeTab === 'incomplete' && 'Businesses that registered but haven\'t completed their profiles'}
              {activeTab === 'live' && 'Monitor and manage live business listings'}
              {activeTab === 'changes' && 'Approve changes to menus, offers, and business info'}
            </p>
          </div>

          {/* Tab Content */}
          {activeTab === 'pending' && (
            <div className="space-y-6">
              {pendingBusinesses.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No pending applications</h3>
                  <p className="text-gray-500">New business applications will appear here for review</p>
                </div>
              ) : (
                pendingBusinesses.map((business) => renderBusinessCard(business, true))
              )}
            </div>
          )}

          {activeTab === 'incomplete' && (
            <div className="space-y-6">
              {incompleteBusinesses.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-300 mb-2">All businesses have completed their profiles</h3>
                  <p className="text-gray-500">Businesses with incomplete profiles will appear here</p>
                </div>
              ) : (
                incompleteBusinesses.map((business) => renderIncompleteBusinessCard(business))
              )}
            </div>
          )}

          {activeTab === 'live' && (
            <div className="space-y-6">
              {liveBusinesses.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No live listings</h3>
                  <p className="text-gray-500">Approved businesses will appear here</p>
                </div>
              ) : (
                liveBusinesses.map((business) => renderBusinessCard(business, false))
              )}
            </div>
          )}

          {activeTab === 'changes' && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-300 mb-2">No pending changes</h3>
                <p className="text-gray-500">Business updates to menus, offers, and info will appear here</p>
                <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <p className="text-sm text-gray-400">
                    <strong>Coming Soon:</strong> Track changes to business menus, offers, images, and contact details that require admin approval
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
