'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AdminLogoutButton } from '@/components/admin-logout-button'
import AdminInspectionModal from './admin-inspection-modal'

interface Business {
  id: string
  user_id: string
  business_name: string
  email: string
  first_name: string
  last_name: string
  business_type: string
  business_category: string
  business_town: string
  business_address: string
  business_postcode: string
  phone: string
  logo: string
  business_tagline: string
  business_description: string
  business_hours: string
  offer_name: string
  offer_type: string
  offer_value: string
  offer_terms: string
  menu_url: string
  business_images: string[]
  menu_preview: string
  status: string
  created_at: string
  updated_at: string
}

interface AdminDashboardProps {
  businesses: Business[]
  city: string
  cityDisplayName: string
  pendingChangesCount: number
  pendingChanges: any[]
}

export function AdminDashboard({ businesses, city, cityDisplayName, pendingChangesCount, pendingChanges }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'updates' | 'live' | 'incomplete' | 'rejected' | 'knowledge'>('pending')
  const [businessList, setBusinessList] = useState<Business[]>(businesses)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [inspectionModal, setInspectionModal] = useState<{ open: boolean; business: Business | null }>({ open: false, business: null })
  const [inspectedBusinesses, setInspectedBusinesses] = useState<Set<string>>(new Set())
  const [processingChangeId, setProcessingChangeId] = useState<string | null>(null)

  // Filter businesses by status
  const pendingBusinesses = businessList.filter(b => b.status === 'pending_review')
  const liveBusinesses = businessList.filter(b => b.status === 'approved')
  const incompleteBusinesses = businessList.filter(b => b.status === 'incomplete')
  const rejectedBusinesses = businessList.filter(b => b.status === 'rejected')

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${day}/${month}/${year}, ${hours}:${minutes}`
  }

  const handleApproval = async (businessId: string, action: 'approve' | 'reject') => {
    setIsLoading(businessId)
    
    try {
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, action }),
      })

      if (response.ok) {
        const newStatus = action === 'approve' ? 'approved' : 'rejected'
        setBusinessList(prev => prev.map(business => 
          business.id === businessId 
            ? { ...business, status: newStatus }
            : business
        ))
        
        if (action === 'approve') {
          setActiveTab('live')
        }
        
        alert(`✅ Business ${action}d successfully!`)
      } else {
        alert(`❌ Failed to ${action} business. Please try again.`)
      }
    } catch (error) {
      console.error(`Error ${action}ing business:`, error)
      alert(`❌ Failed to ${action} business. Please try again.`)
    } finally {
      setIsLoading(null)
    }
  }

  const handleRestore = async (businessId: string) => {
    setIsLoading(businessId)
    
    try {
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, action: 'restore' }),
      })

      if (response.ok) {
        setBusinessList(prev => prev.map(business => 
          business.id === businessId 
            ? { ...business, status: 'pending_review' }
            : business
        ))
        
        setActiveTab('pending')
        alert('✅ Business restored to pending review successfully!')
      } else {
        alert('❌ Failed to restore business. Please try again.')
      }
    } catch (error) {
      console.error('Error restoring business:', error)
      alert('❌ Failed to restore business. Please try again.')
    } finally {
      setIsLoading(null)
    }
  }

  const handleChangeApproval = async (changeId: string, action: 'approve' | 'reject') => {
    setProcessingChangeId(changeId)
    
    try {
      const response = await fetch('/api/admin/approve-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changeId,
          action
        }),
      })

      const result = await response.json()

      if (response.ok) {
        console.log(`✅ Change ${action}d successfully`)
        // Refresh the page to update the pending changes list
        window.location.reload()
      } else {
        console.error(`Failed to ${action} change:`, result.error)
        alert(`Failed to ${action} change: ${result.error}`)
      }
    } catch (error) {
      console.error(`Error ${action}ing change:`, error)
      alert(`Error ${action}ing change. Please try again.`)
    } finally {
      setProcessingChangeId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-3 py-1 bg-green-600/20 text-green-300 text-xs font-semibold rounded-full border border-green-500/30 flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            LIVE
          </span>
        )
      case 'pending_review':
        return (
          <span className="px-3 py-1 bg-yellow-600/20 text-yellow-300 text-xs font-semibold rounded-full border border-yellow-500/30 flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            PENDING
          </span>
        )
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-600/20 text-red-300 text-xs font-semibold rounded-full border border-red-500/30 flex items-center gap-1">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            REJECTED
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 bg-gray-600/20 text-gray-300 text-xs font-semibold rounded-full border border-gray-500/30 flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            INCOMPLETE
          </span>
        )
    }
  }

  const adminNavItems = [
    { 
      id: 'pending', 
      label: 'Pending Reviews', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
      count: pendingBusinesses.length 
    },
    { 
      id: 'updates', 
      label: 'Pending Updates', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>, 
      count: pendingChangesCount 
    },
    { 
      id: 'live', 
      label: 'Live Listings', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
      count: liveBusinesses.length 
    },
    { 
      id: 'incomplete', 
      label: 'Incomplete Listings', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 712-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, 
      count: incompleteBusinesses.length 
    },
    { 
      id: 'rejected', 
      label: 'Rejected Applications', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>, 
      count: rejectedBusinesses.length 
    },
    { 
      id: 'knowledge', 
      label: 'Knowledge Base', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, 
      count: 0 
    },
  ]

  const renderBusinessCard = (business: Business, showActions: boolean) => (
    <div key={business.id} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl overflow-hidden hover:border-slate-600 transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {business.logo ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-700 border-2 border-slate-600">
                <Image
                  src={business.logo}
                  alt={business.business_name || 'Business'}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-slate-600 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
                </svg>
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-white">
                  {business.business_name || 'Unnamed Business'}
                </h3>
                {getStatusBadge(business.status)}
              </div>
              <p className="text-slate-300 text-sm mb-2">
                {business.business_category || 'Category not specified'} • {business.business_town || 'Location not specified'}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Applied: {formatDate(business.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-300 mb-4">
          <p><strong>Owner:</strong> {business.first_name} {business.last_name}</p>
          <p><strong>Email:</strong> {business.email}</p>
          {business.phone && <p><strong>Phone:</strong> {business.phone}</p>}
        </div>

        {/* Action Buttons */}
        {showActions && business.status !== 'approved' && business.status !== 'rejected' && (
          <div className="space-y-3 pt-4 border-t border-slate-600">
            {/* Mandatory Inspection Warning */}
            {!inspectedBusinesses.has(business.id) && (
              <div className="bg-amber-900/30 border border-amber-500/50 rounded-xl p-4 mb-3">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-amber-200 mb-1">Inspection Required</h4>
                    <p className="text-amber-300 text-sm">You must inspect this business before approval/rejection is allowed</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Inspect Before Approval Button */}
            <button
              onClick={() => setInspectionModal({ open: true, business })}
              className={`w-full font-bold py-5 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-4 text-lg shadow-xl ${
                inspectedBusinesses.has(business.id)
                  ? 'bg-gradient-to-r from-emerald-600/30 to-emerald-700/30 border-2 border-emerald-400/60 text-emerald-200 hover:from-emerald-600/40 hover:to-emerald-700/40 shadow-emerald-600/30'
                  : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-600/40 hover:shadow-red-600/50 animate-pulse border-2 border-red-500/50'
              }`}
            >
              {inspectedBusinesses.has(business.id) ? (
                <>
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>INSPECTION COMPLETE - VIEW DETAILS</span>
                </>
              ) : (
                <>
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span>INSPECT BEFORE APPROVAL</span>
                </>
              )}
            </button>
            
            {/* Approve/Reject Buttons - Only enabled after inspection */}
            <div className="flex gap-3">
              <button
                onClick={() => handleApproval(business.id, 'approve')}
                disabled={isLoading === business.id || !inspectedBusinesses.has(business.id)}
                className={`flex-1 font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  inspectedBusinesses.has(business.id)
                    ? 'bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white shadow-[#00d083]/20 hover:shadow-[#00d083]/30'
                    : 'bg-slate-700/50 text-slate-400 cursor-not-allowed opacity-50'
                }`}
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve Business
                  </>
                )}
              </button>
              
              <button
                onClick={() => handleApproval(business.id, 'reject')}
                disabled={isLoading === business.id || !inspectedBusinesses.has(business.id)}
                className={`flex-1 font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  inspectedBusinesses.has(business.id)
                    ? 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-red-600 hover:to-red-700 text-white shadow-slate-600/20 hover:shadow-red-600/30 border border-slate-500 hover:border-red-500'
                    : 'bg-slate-700/50 text-slate-400 cursor-not-allowed opacity-50 border border-slate-600'
                }`}
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
          </div>
        )}
      </div>
    </div>
  )

  const renderRejectedBusinessCard = (business: Business) => (
    <div key={business.id} className="bg-red-900/10 backdrop-blur border border-red-500/30 rounded-2xl overflow-hidden hover:border-red-400/50 transition-all duration-300">
      <div className="p-6">
        {/* Business Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0">
            {business.logo ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-700 border-2 border-red-500/30">
                <Image
                  src={business.logo}
                  alt={business.business_name || 'Business'}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-600/20 to-red-700/20 border-2 border-red-500/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-white mb-1 truncate">
                  {business.business_name || 'Unnamed Business'}
                </h3>
                <p className="text-red-300 text-sm mb-2">
                  {business.business_category || 'Category not specified'} • {business.business_town || 'Location not specified'}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-red-600/20 text-red-300 text-xs font-semibold rounded-full border border-red-500/30 flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    REJECTED
                  </span>
                  <span className="text-xs text-gray-400">
                    Applied: {formatDate(business.created_at)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-sm text-red-200 mb-4">
              <p><strong>Owner:</strong> {business.first_name} {business.last_name}</p>
              <p><strong>Email:</strong> {business.email}</p>
              {business.phone && <p><strong>Phone:</strong> {business.phone}</p>}
            </div>
          </div>
        </div>

        {/* Action Buttons for Rejected Business */}
        <div className="space-y-3 pt-4 border-t border-red-500/20">
          <div className="flex gap-3">
            {/* Restore to Pending Button */}
                  <button
                    onClick={() => handleRestore(business.id)}
                    disabled={isLoading === business.id}
                    className="flex-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-[#00d083]/20 hover:shadow-[#00d083]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
              {isLoading === business.id ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Restoring...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                        Restore to Pending
                </>
              )}
            </button>

            {/* Contact Business Button */}
            <button
              onClick={() => {
                const subject = `Qwikker Business Application - ${business.business_name || 'Your Business'} - Follow Up`
                const body = `Dear ${business.first_name},

We hope this email finds you well.

Your business application for "${business.business_name || 'your business'}" was previously reviewed. We would like to give you another opportunity to join the Qwikker platform.

If you're still interested in being featured on Qwikker, please let us know and we can discuss any improvements needed to get your business approved.

We look forward to hearing from you.

Best regards,
Qwikker Admin Team`
                
                window.open(`mailto:${business.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
              }}
              className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-amber-600/20 hover:shadow-amber-600/30 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
                      Contact Business
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-slate-900/95 backdrop-blur-sm border-r border-slate-700/50 min-h-screen">
          <div className="p-6">
            <div className="text-center space-y-4 mb-8 border-b border-slate-700/50 pb-6">
              {/* QWIKKER Logo */}
              <img 
                src="/Qwikker Logo web.svg" 
                alt="QWIKKER Admin Dashboard" 
                className="h-8 w-auto sm:h-10 mx-auto"
              />
              {/* Admin Dashboard Text */}
              <div>
                <p className="text-lg font-bold text-white">Admin Dashboard</p>
                <p className="text-sm text-slate-400">{cityDisplayName}</p>
              </div>
            </div>

            <nav className="space-y-2">
              {adminNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-[#00d083]/20 to-[#00b86f]/20 border border-[#00d083]/30 text-[#00d083]'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    activeTab === item.id
                      ? 'bg-[#00d083]/20 text-[#00d083]'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {item.count}
                  </span>
                </button>
              ))}
            </nav>

            <div className="mt-8 pt-6 border-t border-slate-700">
              <AdminLogoutButton />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {activeTab === 'pending' && 'Pending Reviews'}
                {activeTab === 'updates' && 'Pending Updates'}
                {activeTab === 'live' && 'Live Listings'}
                {activeTab === 'incomplete' && 'Incomplete Listings'}
                {activeTab === 'rejected' && 'Rejected Applications'}
                {activeTab === 'knowledge' && 'Knowledge Base'}
              </h2>
              <p className="text-slate-400">
                {activeTab === 'pending' && 'Businesses awaiting your review and approval'}
                {activeTab === 'updates' && 'Changes from approved businesses awaiting your review'}
                {activeTab === 'live' && 'Currently active businesses on the platform'}
                {activeTab === 'incomplete' && 'Businesses that need to complete their profiles'}
                {activeTab === 'rejected' && 'Previously rejected business applications'}
                {activeTab === 'knowledge' && 'AI knowledge base management for businesses and city information'}
              </p>
            </div>

            {/* Content */}
            <div className="space-y-6">
              {activeTab === 'pending' && (
                <div className="grid gap-6">
                  {pendingBusinesses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">No pending reviews</h3>
                      <p className="text-slate-400">All businesses have been reviewed.</p>
                    </div>
                  ) : (
                    pendingBusinesses.map((business) => renderBusinessCard(business, true))
                  )}
                </div>
              )}

              {activeTab === 'live' && (
                <div className="grid gap-6">
                  {liveBusinesses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">No live listings</h3>
                      <p className="text-slate-400">No businesses are currently live on the platform.</p>
                    </div>
                  ) : (
                    liveBusinesses.map((business) => renderBusinessCard(business, false))
                  )}
                </div>
              )}

              {activeTab === 'incomplete' && (
                <div className="grid gap-6">
                  {incompleteBusinesses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 712-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">No incomplete listings</h3>
                      <p className="text-slate-400">All businesses have completed their profiles.</p>
                    </div>
                  ) : (
                    incompleteBusinesses.map((business) => renderBusinessCard(business, false))
                  )}
                </div>
              )}

              {activeTab === 'updates' && (
                <div className="grid gap-6">
                  {pendingChanges.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">No pending updates</h3>
                      <p className="text-slate-400">
                        All business changes have been reviewed. New offers and updates from approved businesses will appear here.
                      </p>
                    </div>
                  ) : (
                    pendingChanges.map((change) => (
                      <div key={change.id} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl overflow-hidden hover:border-slate-600 transition-all duration-300">
                        <div className="p-6">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="flex-shrink-0">
                              {change.business?.logo ? (
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-700 border-2 border-slate-600">
                                  <Image
                                    src={change.business.logo}
                                    alt={change.business?.business_name || 'Business'}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-slate-600 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
                                  </svg>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-xl font-bold text-white mb-1 truncate">
                                    {change.business?.business_name || 'Unknown Business'}
                                  </h3>
                                  <p className="text-slate-300 text-sm mb-2">
                                    {change.change_type === 'offer' && 'New Offer Submitted'}
                                    {change.change_type === 'secret_menu' && 'Secret Menu Item Submitted'}
                                    {change.change_type === 'business_images' && 'Business Photos Submitted'}
                                    {change.change_type === 'business_info' && 'Business Info Update Submitted'}
                                  </p>
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="px-3 py-1 bg-yellow-600/20 text-yellow-300 text-xs font-semibold rounded-full border border-yellow-500/30 flex items-center gap-1">
                                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                      PENDING REVIEW
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      Submitted: {formatDate(change.submitted_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-sm text-slate-300 mb-4">
                                <p><strong>Business Owner:</strong> {change.business?.first_name} {change.business?.last_name}</p>
                                <p><strong>Email:</strong> {change.business?.email}</p>
                              </div>

                              {/* Change Details */}
                              <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                                <h4 className="text-white font-semibold mb-2">Change Details:</h4>
                                {change.change_type === 'offer' && (
                                  <div>
                                    <p><strong>Offer Name:</strong> {change.change_data.offer_name}</p>
                                    <p><strong>Type:</strong> {change.change_data.offer_type}</p>
                                    <p><strong>Value:</strong> {change.change_data.offer_value}</p>
                                    {change.change_data.offer_terms && <p><strong>Terms:</strong> {change.change_data.offer_terms}</p>}
                                  </div>
                                )}
                                {change.change_type === 'secret_menu' && (
                                  <div>
                                    <p><strong>Item Name:</strong> {change.change_data.itemName}</p>
                                    {change.change_data.description && <p><strong>Description:</strong> {change.change_data.description}</p>}
                                    {change.change_data.price && <p><strong>Price:</strong> {change.change_data.price}</p>}
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-3">
                                <button
                                  onClick={() => handleChangeApproval(change.id, 'approve')}
                                  disabled={processingChangeId === change.id}
                                  className="flex-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-[#00d083]/20 hover:shadow-[#00d083]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                  {processingChangeId === change.id ? (
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
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Approve Change
                                    </>
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => handleChangeApproval(change.id, 'reject')}
                                  disabled={processingChangeId === change.id}
                                  className="flex-1 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-slate-600/20 hover:shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-500 hover:border-red-500 flex items-center justify-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Reject Change
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'rejected' && (
                <div className="grid gap-6">
                  {rejectedBusinesses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">No rejected applications</h3>
                      <p className="text-slate-400">No businesses have been rejected.</p>
                    </div>
                  ) : (
                    rejectedBusinesses.map((business) => renderRejectedBusinessCard(business))
                  )}
                </div>
              )}

              {activeTab === 'knowledge' && (
                <div className="space-y-6">
                  {/* Business Selector */}
                  <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <svg className="w-6 h-6 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6" />
                      </svg>
                      Select Target for Knowledge Base
                    </h3>
                    
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Choose Business or General Knowledge
                      </label>
                      <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-[#00d083] focus:ring-1 focus:ring-[#00d083] transition-colors">
                        <option value="general">General {cityDisplayName} Knowledge</option>
                        <optgroup label="Live Businesses">
                          {liveBusinesses.map((business) => (
                            <option key={business.id} value={business.id}>
                              {business.business_name} - {business.business_category}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {/* Knowledge Base Actions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Web Scraping Card */}
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-bold text-white">Web Scrape</h4>
                      </div>
                      <p className="text-slate-400 text-sm mb-4">
                        Scrape business websites, local news, or any URL to extract knowledge for AI chat.
                      </p>
                      <div className="space-y-3">
                        <input
                          type="url"
                          placeholder="Enter website URL to scrape..."
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                        />
                        <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm">
                          Start Scraping
                        </button>
                      </div>
                    </div>

                    {/* PDF Upload Card */}
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-bold text-white">Upload PDF</h4>
                      </div>
                      <p className="text-slate-400 text-sm mb-4">
                        Upload menus, brochures, or documents to enrich business knowledge.
                      </p>
                      <div className="space-y-3">
                        <input
                          type="file"
                          accept=".pdf"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-red-400 focus:ring-1 focus:ring-red-400 file:bg-red-500/20 file:border-0 file:text-red-400 file:px-3 file:py-1 file:rounded file:text-sm file:mr-3"
                        />
                        <button className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm">
                          Process PDF
                        </button>
                      </div>
                    </div>

                    {/* Add Event Card */}
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-bold text-white">Add Event</h4>
                      </div>
                      <p className="text-slate-400 text-sm mb-4">
                        Create events for businesses or general city activities.
                      </p>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Event name..."
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                        />
                        <button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm">
                          Create Event
                        </button>
                      </div>
                    </div>

                    {/* News Article Card */}
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-bold text-white">News Article</h4>
                      </div>
                      <p className="text-slate-400 text-sm mb-4">
                        Add local news or business announcements to the knowledge base.
                      </p>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Article title..."
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-green-400 focus:ring-1 focus:ring-green-400"
                        />
                        <button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm">
                          Add Article
                        </button>
                      </div>
                    </div>

                    {/* Custom Knowledge Card */}
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-bold text-white">Custom Knowledge</h4>
                      </div>
                      <p className="text-slate-400 text-sm mb-4">
                        Add custom facts, tips, or information manually to the AI knowledge base.
                      </p>
                      <div className="space-y-3">
                        <textarea
                          placeholder="Enter custom knowledge..."
                          rows={2}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none"
                        />
                        <button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm">
                          Add Knowledge
                        </button>
                      </div>
                    </div>

                    {/* Knowledge History Card */}
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-slate-500/20 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-bold text-white">View History</h4>
                      </div>
                      <p className="text-slate-400 text-sm mb-4">
                        View all knowledge base entries and manage existing content.
                      </p>
                      <button className="w-full bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm">
                        View All Entries
                      </button>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-gradient-to-r from-[#00d083]/10 to-[#00b86f]/10 border border-[#00d083]/20 rounded-2xl p-6">
                    <h3 className="text-[#00d083] font-bold text-lg mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      How Knowledge Base Works
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="text-white font-semibold mb-2">Business-Specific Knowledge:</h4>
                        <ul className="text-slate-300 space-y-1">
                          <li>• Select a business → Upload their menu PDF → AI knows their full menu</li>
                          <li>• Scrape business website → AI knows current offers, hours, etc.</li>
                          <li>• Add business events → AI can recommend for occasions</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-2">General City Knowledge:</h4>
                        <ul className="text-slate-300 space-y-1">
                          <li>• Select "General" → Scrape local news → AI knows city events</li>
                          <li>• Upload tourism PDFs → AI recommends businesses to tourists</li>
                          <li>• Add city events → AI suggests nearby businesses</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Clean Inspection Modal */}
      <AdminInspectionModal
        business={inspectionModal.business}
        isOpen={inspectionModal.open}
        onClose={() => setInspectionModal({ open: false, business: null })}
        onApprove={(businessId) => {
          handleApproval(businessId, 'approve')
          setInspectionModal({ open: false, business: null })
        }}
        onReject={(businessId) => {
          handleApproval(businessId, 'reject')
          setInspectionModal({ open: false, business: null })
        }}
        isLoading={!!isLoading}
        isInspected={inspectionModal.business ? inspectedBusinesses.has(inspectionModal.business.id) : false}
        onMarkInspected={() => {
          if (inspectionModal.business) {
            setInspectedBusinesses(prev => new Set([...prev, inspectionModal.business!.id]))
          }
        }}
      />
    </div>
  )
}
