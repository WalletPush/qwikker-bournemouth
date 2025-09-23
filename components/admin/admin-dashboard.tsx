'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { AdminLogoutButton } from '@/components/admin-logout-button'
import AdminInspectionModal from './admin-inspection-modal'
import { BusinessCRMCard } from './business-crm-card'
import { ComprehensiveBusinessCRMCard } from './comprehensive-business-crm-card'
import { BusinessCRMData } from '@/types/billing'
import { useElegantModal } from '@/components/ui/elegant-modal'
import { AdminAnalytics } from './admin-analytics'
import { ContactsTab } from './contacts-tab'
import { SyncHealthOverview } from './sync-health-overview'
import { InitialAvatar } from '@/components/admin/initial-avatar'
import { SmartQRGenerator } from './smart-qr-generator'
import { ComprehensiveQRDashboard } from './comprehensive-qr-dashboard'
import { AITestPage } from './ai-test-page'
import { QRAnalyticsDashboard } from './qr-analytics-dashboard'

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
  additional_notes: string
  status: string
  created_at: string
  updated_at: string
}

interface AdminDashboardProps {
  businesses: Business[] // Legacy - keep for compatibility
  crmData: BusinessCRMData[] // New comprehensive CRM data
  adminEmail: string
  city: string
  cityDisplayName: string
  pendingChangesCount: number
  pendingChanges: any[]
}

export function AdminDashboard({ businesses, crmData, adminEmail, city, cityDisplayName, pendingChangesCount, pendingChanges }: AdminDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get initial tab from URL or default to 'pending'
  const [activeTab, setActiveTab] = useState<'pending' | 'updates' | 'live' | 'incomplete' | 'rejected' | 'knowledge' | 'analytics' | 'contacts' | 'qr-management' | 'ai-test'>(() => {
    const urlTab = searchParams.get('tab')
    const validTabs = ['pending', 'updates', 'live', 'incomplete', 'rejected', 'knowledge', 'analytics', 'contacts', 'qr-management', 'ai-test']
    return validTabs.includes(urlTab || '') ? (urlTab as any) : 'pending'
  })
  const [businessList, setBusinessList] = useState<Business[]>(businesses)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [inspectionModal, setInspectionModal] = useState<{ open: boolean; business: Business | null }>({ open: false, business: null })
  const [inspectedBusinesses, setInspectedBusinesses] = useState<Set<string>>(new Set())
  const [processingChangeId, setProcessingChangeId] = useState<string | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // 🔍 SEARCH & FILTER STATE
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterTier, setFilterTier] = useState('all')
  
  const { showSuccess, showError, showConfirm, ModalComponent } = useElegantModal()
  
  // Function to update tab and URL
  const updateActiveTab = (newTab: 'pending' | 'updates' | 'live' | 'incomplete' | 'rejected' | 'knowledge' | 'analytics' | 'contacts' | 'qr-management' | 'ai-test') => {
    setActiveTab(newTab)
    setIsMobileMenuOpen(false) // Close mobile menu when tab is selected
    // Update URL without page refresh
    const url = new URL(window.location.href)
    url.searchParams.set('tab', newTab)
    router.replace(url.pathname + url.search, { scroll: false })
  }


  // 🔍 FILTER FUNCTION
  const filterBusinesses = (businesses: Business[]) => {

    
    return businesses.filter(business => {
      const matchesSearch = !searchTerm || 
        business.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.business_category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.business_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.business_town?.toLowerCase().includes(searchTerm.toLowerCase())
      
      // Filter by business_type ONLY (clean standardized values)
      const matchesCategory = filterCategory === 'all' || business.business_type === filterCategory
      
      const matchesTier = filterTier === 'all' || business.business_tier === filterTier

      
      return matchesSearch && matchesCategory && matchesTier
    })
  }

  // ORIGINAL counts for sidebar (NEVER filtered)
  const allPendingBusinesses = businessList.filter(b => b.status === 'pending_review')
  const allLiveBusinesses = businessList.filter(b => b.status === 'approved')
  const allIncompleteBusinesses = businessList.filter(b => b.status === 'incomplete')
  const allRejectedBusinesses = businessList.filter(b => b.status === 'rejected')
  const allExpiredTrialBusinesses = businessList.filter(b => b.status === 'trial_expired' || b.status === 'inactive')

  // FILTERED businesses for display content only
  const pendingBusinesses = filterBusinesses(allPendingBusinesses)
  const liveBusinesses = filterBusinesses(allLiveBusinesses)
  const incompleteBusinesses = filterBusinesses(allIncompleteBusinesses)
  const rejectedBusinesses = filterBusinesses(allRejectedBusinesses)
  const expiredTrialBusinesses = filterBusinesses(allExpiredTrialBusinesses)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${day}/${month}/${year}, ${hours}:${minutes}`
  }

  const handleApproval = async (businessId: string, action: 'approve' | 'reject' | 'restore') => {
    setIsLoading(businessId)
    
    try {
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, action }),
      })

      if (response.ok) {
        const newStatus = action === 'approve' ? 'approved' : 
                         action === 'restore' ? 'pending_review' : 'rejected'
        setBusinessList(prev => prev.map(business => 
          business.id === businessId 
            ? { ...business, status: newStatus }
            : business
        ))
        
        if (action === 'approve') {
          updateActiveTab('live')
        }
        
        showSuccess(
          'Success!', 
          `Business ${action}d successfully! The page will refresh to show the updated status.`
        )
        
        // Refresh the page to update CRM data
        window.location.reload()
      } else {
        showError(
          'Action Failed', 
          `Failed to ${action} business. Please try again or contact support if the issue persists.`
        )
      }
    } catch (error) {
      console.error(`Error ${action}ing business:`, error)
      showError(
        'Unexpected Error', 
        `An unexpected error occurred while trying to ${action} the business. Please try again.`
      )
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
        
        updateActiveTab('pending')
        showSuccess(
          'Business Restored!', 
          'Business has been successfully restored to pending review status.'
        )
      } else {
        showError(
          'Restore Failed', 
          'Failed to restore business. Please try again or contact support.'
        )
      }
    } catch (error) {
      console.error('Error restoring business:', error)
      showError(
        'Unexpected Error', 
        'An unexpected error occurred while restoring the business. Please try again.'
      )
    } finally {
      setIsLoading(null)
    }
  }

  const handleChangeApproval = async (changeId: string, action: 'approve' | 'reject') => {
    setProcessingChangeId(changeId)
    
    try {
      const response = await fetch('/api/admin/approve-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeId, action }),
      })

      if (response.ok) {
        const result = await response.json()
        showSuccess(
          'Success!', 
          `Change ${action}d successfully! The page will refresh to show updated data.`
        )
        
        // Refresh the page to update all data including CRM data and pending changes
        window.location.reload()
      } else {
        const errorData = await response.json()
        showError(
          'Action Failed', 
          `Failed to ${action} change: ${errorData.error || 'Please try again or contact support.'}`
        )
      }
    } catch (error) {
      console.error(`Error ${action}ing change:`, error)
      showError(
        'Unexpected Error', 
        `An unexpected error occurred while trying to ${action} the change. Please try again.`
      )
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
      count: allPendingBusinesses.length 
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
      count: allLiveBusinesses.length 
    },
    { 
      id: 'incomplete', 
      label: 'Incomplete Listings', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, 
      count: allIncompleteBusinesses.length 
    },
    { 
      id: 'expired', 
      label: 'Expired Trials', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
      count: allExpiredTrialBusinesses.length 
    },
    { 
      id: 'rejected', 
      label: 'Rejected Applications', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>, 
      count: allRejectedBusinesses.length 
    },
    { 
      id: 'knowledge', 
      label: 'Knowledge Base', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, 
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, 
    },
    { 
      id: 'contacts', 
      label: 'Contacts', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, 
    },
    { 
      id: 'qr-management', 
      label: 'QR Management', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>, 
    },
    { 
      id: 'ai-test', 
      label: 'AI Test', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>, 
    },
  ]

  const renderBusinessCard = (business: Business, showActions: boolean) => (
    <div key={business.id} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl overflow-hidden hover:border-slate-600 transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <InitialAvatar 
              businessName={business.business_name} 
              className="w-16 h-16 rounded-xl border-2 border-indigo-400/30 text-lg font-bold"
            />
            
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

  const renderIncompleteBusinessCard = (business: Business, expanded: boolean = false) => {
    // Calculate missing fields for completion tracking using REAL database field names
    const missingRequiredFields = []
    const providedRequiredFields = []
    const optionalFields = []

    // Core business info (already have from onboarding)
    if (business.business_name) providedRequiredFields.push('Business Name')
    if (business.business_type) providedRequiredFields.push('Business Type') 
    if (business.business_category) providedRequiredFields.push('Business Category')
    if (business.business_address) providedRequiredFields.push('Business Address')
    if (business.phone) providedRequiredFields.push('Phone Number')
    if (business.email) providedRequiredFields.push('Email')

    // Required completion fields for approval
    if (!business.business_tagline) missingRequiredFields.push('Business Tagline')
    else providedRequiredFields.push('Business Tagline')
    
    if (!business.business_description) missingRequiredFields.push('Business Description') 
    else providedRequiredFields.push('Business Description')
    
    if (!business.business_hours && !business.business_hours_structured) missingRequiredFields.push('Opening Hours')
    else providedRequiredFields.push('Opening Hours')
    
    if (!business.logo) missingRequiredFields.push('Business Logo')
    else providedRequiredFields.push('Business Logo')
    
    if (!business.business_images || business.business_images.length === 0) missingRequiredFields.push('Business Photos')
    else providedRequiredFields.push('Business Photos')
    
    // Optional fields (NOT counted in completion percentage)
    if (business.menu_url) optionalFields.push('Services/Menu')
    if (business.offer_name) optionalFields.push('First Offer')
    
    const totalRequiredFields = providedRequiredFields.length + missingRequiredFields.length
    const completedRequiredFields = providedRequiredFields.length
    const completionPercentage = totalRequiredFields > 0 ? Math.round((completedRequiredFields / totalRequiredFields) * 100) : 0
    
    const isExpanded = expandedCards.has(business.id)
    
    const toggleExpanded = () => {
      const newExpanded = new Set(expandedCards)
      if (isExpanded) {
        newExpanded.delete(business.id)
      } else {
        newExpanded.add(business.id)
      }
      setExpandedCards(newExpanded)
    }

    return (
      <div key={business.id} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl overflow-hidden hover:border-slate-600 transition-all duration-300">
        <div className={isExpanded ? "p-6" : "p-4"}>
          {/* Compact Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <InitialAvatar 
                businessName={business.business_name} 
                className="w-12 h-12 rounded-lg border border-orange-400/40 text-sm font-bold"
              />
              <div>
                <h3 className="text-lg font-bold text-white">
                  {business.business_name || 'Unnamed Business'}
                </h3>
                <p className="text-slate-400 text-sm">
                  {business.first_name && business.last_name ? `${business.first_name} ${business.last_name}` : 'Owner name not provided'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-1 text-xs font-medium text-white rounded-full bg-orange-500">
                    INCOMPLETE
                  </span>
                  <span className="text-orange-400 font-semibold text-sm">{completionPercentage}%</span>
                </div>
              </div>
            </div>
            
            {/* Compact completion status and expand button */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="w-16 h-2 bg-slate-700 rounded-full">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <div className="text-xs text-slate-400 mt-1">{completedRequiredFields}/{totalRequiredFields}</div>
              </div>
              
              <button
                onClick={toggleExpanded}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <svg 
                  className={`w-4 h-4 text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <>
              {/* Contact & Business Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-slate-400">Email</p>
                  <p className="text-white font-medium text-xs break-all">
                    {business.email || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Phone</p>
                  <p className="text-white font-medium">
                    {business.phone || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Location</p>
                  <p className="text-white font-medium">
                    {business.business_town || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Applied</p>
                  <p className="text-white font-medium">
                    {new Date(business.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* What's PROVIDED (Green) */}
              {providedRequiredFields.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Information Provided ({providedRequiredFields.length} items)
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {providedRequiredFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-green-200 bg-green-500/10 rounded-lg px-3 py-2 border border-green-500/20">
                        <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
                        {field}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What's MISSING (Orange) */}
              {missingRequiredFields.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-orange-400 font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Missing Information ({missingRequiredFields.length} items needed)
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {missingRequiredFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-orange-200 bg-orange-500/10 rounded-lg px-3 py-2 border border-orange-500/20">
                        <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" />
                        {field}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Information (Blue) */}
              {optionalFields.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Optional Information ({optionalFields.length} items provided)
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {optionalFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-blue-200 bg-blue-500/10 rounded-lg px-3 py-2 border border-blue-500/20">
                        <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                        {field}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-600">
                <button
                  onClick={() => window.open(`mailto:${business.email}?subject=Complete Your Qwikker Profile - ${business.business_name}&body=Hi ${business.first_name},\n\nYour Qwikker business profile for ${business.business_name} is ${completionPercentage}% complete.\n\nTo get your business live on Qwikker, please complete these missing items:\n${missingRequiredFields.map(field => `• ${field}`).join('\n')}\n\nLog into your dashboard to finish your profile: https://qwikkerdashboard-theta.vercel.app/dashboard\n\nBest regards,\nThe Qwikker Team`)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Completion Reminder
                </button>
                
                {business.phone && (
                  <button
                    onClick={() => window.open(`tel:${business.phone}`)}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950">
      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-slate-900/95 backdrop-blur-xl border-r border-indigo-500/30 transform transition-transform duration-300 z-50 flex flex-col ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:max-w-none`}>
        
        {/* Logo - Fixed at top */}
        <div className="flex-shrink-0 p-6 border-b border-slate-700/50">
          <div className="text-center space-y-2">
              {/* QWIKKER Logo */}
              <img 
                src="/Qwikker Logo web.svg" 
                alt="QWIKKER Admin Dashboard" 
                className="h-8 w-auto sm:h-10 mx-auto"
              />
              {/* Admin Dashboard Text */}
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <p className="text-lg font-bold text-white">Admin Dashboard</p>
                  <div className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-full border border-indigo-400/50">
                    ADMIN
                  </div>
                </div>
                <p className="text-sm text-indigo-300">{cityDisplayName}</p>
              </div>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-scroll overflow-x-hidden scrollbar-hidden p-4 space-y-2"
        style={{ 
          touchAction: 'pan-y',
          overscrollBehavior: 'contain'
        }}>
              {adminNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => updateActiveTab(item.id as any)}
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
                  {item.count !== undefined && (
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      activeTab === item.id
                        ? 'bg-[#00d083]/20 text-[#00d083]'
                        : item.count > 0 && (item.id === 'incomplete' || item.id === 'pending' || item.id === 'updates')
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30' // Red ONLY when count > 0 AND needs attention
                          : item.count > 0 && item.id === 'live'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' // Green ONLY when count > 0 AND live
                          : 'bg-slate-700 text-slate-300' // Default gray when count is 0 or other tabs
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
        </nav>

        {/* Bottom section - Admin info */}
        <div className="flex-shrink-0 p-4 border-t border-slate-700">
          <AdminLogoutButton />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-80">
        {/* Top header */}
        <header className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-700 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Mobile menu button */}
            <div className="flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors touch-manipulation min-h-[48px] min-w-[48px] flex items-center justify-center"
                aria-label="Open navigation menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {/* Page title */}
              <div className="hidden lg:block ml-4">
                <h1 className="text-lg font-semibold text-slate-100">
                {activeTab === 'pending' && 'Pending Reviews'}
                {activeTab === 'updates' && 'Pending Updates'}
                {activeTab === 'live' && 'Live Listings'}
                {activeTab === 'incomplete' && 'Incomplete Listings'}
                {activeTab === 'rejected' && 'Rejected Applications'}
                {activeTab === 'knowledge' && 'Knowledge Base'}
                {activeTab === 'analytics' && 'City Analytics'}
                {activeTab === 'contacts' && 'Business Contacts'}
                {activeTab === 'qr-management' && 'QR Code Management'}
                {activeTab === 'ai-test' && 'AI Chat Testing'}
                </h1>
              </div>
            </div>

            {/* Right side - City info */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold text-slate-100">{cityDisplayName}</p>
                <p className="text-sm text-slate-400">Admin Dashboard</p>
              </div>
              
              {/* City indicator */}
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center font-semibold text-slate-100">
                {cityDisplayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {activeTab === 'pending' && 'Pending Reviews'}
                {activeTab === 'updates' && 'Pending Updates'}
                {activeTab === 'live' && 'Live Listings'}
                {activeTab === 'incomplete' && 'Incomplete Listings'}
                {activeTab === 'rejected' && 'Rejected Applications'}
                {activeTab === 'knowledge' && 'Knowledge Base'}
                {activeTab === 'analytics' && 'City Analytics'}
                {activeTab === 'contacts' && 'Business Contacts'}
                {activeTab === 'qr-management' && 'QR Code Management'}
                {activeTab === 'ai-test' && 'AI Chat Testing'}
              </h2>
              <p className="text-slate-400">
                {activeTab === 'pending' && 'Businesses awaiting your review and approval'}
                {activeTab === 'updates' && 'Changes from approved businesses awaiting your review'}
                {activeTab === 'live' && 'Currently active businesses on the platform'}
                {activeTab === 'incomplete' && 'Businesses that need to complete their profiles'}
                {activeTab === 'rejected' && 'Previously rejected business applications'}
                {activeTab === 'knowledge' && 'AI knowledge base management for businesses and city information'}
                {activeTab === 'analytics' && `Performance metrics and user analytics for ${cityDisplayName}`}
                {activeTab === 'contacts' && `CRM contact management with GHL sync for ${cityDisplayName}`}
                {activeTab === 'qr-management' && 'Generate and manage QR codes for businesses, offers, and secret menus'}
                {activeTab === 'ai-test' && 'Test AI chat responses and knowledge base accuracy'}
              </p>
            </div>

            {/* Sync Health Overview - Only show on contacts tab */}
            {activeTab === 'contacts' && (
              <div className="mb-6">
                <SyncHealthOverview />
              </div>
            )}

            {/* 🔍 MINIMAL SEARCH */}
            {activeTab !== 'knowledge' && activeTab !== 'analytics' && activeTab !== 'contacts' && (
              <div className="mb-3 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-2 py-1 w-48 bg-slate-700/30 border border-slate-600/50 rounded text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#00d083]/50"
                />

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-2 py-1 bg-slate-700/30 border border-slate-600/50 rounded text-white text-xs focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="bar">Bar</option>
                  <option value="cafe">Café</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="salon">Salon</option>
                  <option value="spa">Spa</option>
                  <option value="gym">Gym</option>
                  <option value="retail_shop">Retail Shop</option>
                  <option value="hotel">Hotel</option>
                  <option value="service_business">Service Business</option>
                  <option value="other">Other</option>
                </select>

                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="px-2 py-1 bg-slate-700/30 border border-slate-600/50 rounded text-white text-xs focus:outline-none"
                >
                  <option value="all">All Tiers</option>
                  <option value="free_trial">Trial</option>
                  <option value="starter">Starter</option>
                  <option value="featured">Featured</option>
                  <option value="spotlight">Spotlight</option>
                </select>

                {(searchTerm || filterCategory !== 'all' || filterTier !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setFilterCategory('all')
                      setFilterTier('all')
                    }}
                    className="text-slate-500 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

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
                  {allLiveBusinesses.length === 0 ? (
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
                    liveBusinesses.map((business) => {
                      // Convert business data to CRM format
                      const crmBusiness = {
                        id: business.id,
                        business_name: business.business_name || 'Unnamed Business',
                        first_name: business.first_name,
                        last_name: business.last_name,
                        business_category: business.business_category || 'Uncategorized',
                        business_type: business.business_type,
                        business_address: business.business_address || '',
                        business_town: business.business_town || '',
                        business_postcode: business.business_postcode || '',
                        email: business.email || '',
                        phone: business.phone || '',
                        status: business.status as 'incomplete' | 'pending_review' | 'approved' | 'rejected',
                        approved_at: business.approved_at,
                        admin_notes: business.admin_notes,
                        subscription: null,
                        tier: null,
                        recent_payments: [],
                        menu_url: business.menu_url,
                        business_images: business.business_images as string[] | null,
                        offer_name: business.offer_name,
                        offer_type: business.offer_type,
                        offer_image: business.offer_image,
                        offer_start_date: business.offer_start_date,
                        offer_end_date: business.offer_end_date,
                        offer_terms: business.offer_terms,
                        secret_menu_items: business.additional_notes ? 
                          (() => {
                            try {
                              const parsed = JSON.parse(business.additional_notes)
                              return parsed.secret_menu_items || []
                            } catch {
                              return []
                            }
                          })() : [],
                        // Calculate trial info for live businesses
                        trial_days_remaining: business.approved_at ? 
                          (() => {
                            const approvalDate = new Date(business.approved_at)
                            const trialEndDate = new Date(approvalDate.getTime() + (120 * 24 * 60 * 60 * 1000))
                            const now = new Date()
                            const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                            return daysRemaining > 0 ? daysRemaining : 0
                          })() : null,
                        trial_status: business.approved_at ? 
                          (() => {
                            const approvalDate = new Date(business.approved_at)
                            const trialEndDate = new Date(approvalDate.getTime() + (120 * 24 * 60 * 60 * 1000))
                            const now = new Date()
                            const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                            return daysRemaining > 0 ? 'active' : 'expired'
                          })() as 'active' | 'expired' | 'upgraded' | 'not_applicable' : 'not_applicable',
                        billing_starts_date: business.approved_at ? 
                          new Date(new Date(business.approved_at).getTime() + (120 * 24 * 60 * 60 * 1000)).toISOString() : null,
                        last_updated: business.updated_at || business.created_at,
                        has_pending_changes: false,
                        pending_changes_count: 0
                      }
                      
                      return (
                        <ComprehensiveBusinessCRMCard
                          key={business.id}
                          business={crmBusiness}
                          onApprove={handleApproval}
                          onInspect={(business) => {
                            // Find the original business data from allBusinesses to get complete info
                            const originalBusiness = allBusinesses.find(b => b.id === business.id)
                            const legacyBusiness = {
                              id: business.id,
                              user_id: originalBusiness?.user_id || '',
                              business_name: business.business_name,
                              email: business.email,
                              first_name: originalBusiness?.first_name || '',
                              last_name: originalBusiness?.last_name || '',
                              business_type: originalBusiness?.business_type || '',
                              business_category: business.business_category,
                              business_town: business.business_town,
                              business_address: business.business_address,
                              business_postcode: business.business_postcode,
                              phone: business.phone,
                              logo: originalBusiness?.logo || '',
                              business_tagline: originalBusiness?.business_tagline || '',
                              business_description: originalBusiness?.business_description || '',
                              business_hours: originalBusiness?.business_hours || '',
                              business_hours_structured: originalBusiness?.business_hours_structured || null,
                              offer_name: business.offer_name || '',
                              offer_type: business.offer_type || '',
                              offer_value: originalBusiness?.offer_value || '',
                              offer_terms: originalBusiness?.offer_terms || '',
                              menu_url: business.menu_url || '',
                              business_images: business.business_images || [],
                              menu_preview: originalBusiness?.menu_preview || '',
                              additional_notes: business.secret_menu_items ? JSON.stringify({ secret_menu_items: business.secret_menu_items }) : '',
                              status: business.status,
                              created_at: originalBusiness?.created_at || '',
                              updated_at: business.last_updated
                            }
                            setInspectionModal({ open: true, business: legacyBusiness })
                          }}
                        />
                      )
                    })
                  )}
                </div>
              )}

              {activeTab === 'incomplete' && (
                <div className="grid gap-6">
                  {incompleteBusinesses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">No incomplete listings</h3>
                      <p className="text-slate-400">All businesses have completed their profiles.</p>
                    </div>
                  ) : (
                    incompleteBusinesses.map((business) => renderIncompleteBusinessCard(business))
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
                                    {change.change_data.offer_image && (
                                      <div className="mt-3">
                                        <p><strong>Offer Image:</strong></p>
                                        <a 
                                          href={change.change_data.offer_image} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-2 text-[#00d083] hover:text-[#00b86f] transition-colors"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          View Offer Image
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {change.change_type === 'secret_menu' && (
                                  <div>
                                    <p><strong>Item Name:</strong> {change.change_data.itemName}</p>
                                    {change.change_data.description && <p><strong>Description:</strong> {change.change_data.description}</p>}
                                    {change.change_data.price && <p><strong>Price:</strong> {change.change_data.price}</p>}
                                  </div>
                                )}
                                {change.change_type === 'logo' && (
                                  <div>
                                    <p><strong>New Business Logo:</strong></p>
                                    <a 
                                      href={change.change_data.logo_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-[#00d083] hover:text-[#00b86f] transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      View New Logo
                                    </a>
                                  </div>
                                )}
                                {change.change_type === 'menu_url' && (
                                  <div>
                                    <p><strong>New Menu/Service List:</strong></p>
                                    <a 
                                      href={change.change_data.menu_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-[#00d083] hover:text-[#00b86f] transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      View Menu PDF
                                    </a>
                                  </div>
                                )}
                                {change.change_type === 'business_images' && (
                                  <div>
                                    <p><strong>New Business Photo:</strong></p>
                                    <a 
                                      href={change.change_data.new_business_image} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-[#00d083] hover:text-[#00b86f] transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      View Business Photo
                                    </a>
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

              {activeTab === 'expired' && (
                <div className="grid gap-6">
                  {expiredTrialBusinesses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">No expired trials</h3>
                      <p className="text-slate-400">All businesses are either active or haven't reached trial expiration yet.</p>
                    </div>
                  ) : (
                    expiredTrialBusinesses.map((business) => {
                      // Convert business data to CRM format (same as live businesses)
                      const crmBusiness = {
                        id: business.id,
                        business_name: business.business_name || 'Unnamed Business',
                        first_name: business.first_name,
                        last_name: business.last_name,
                        business_category: business.business_category || 'Uncategorized',
                        business_type: business.business_type,
                        business_address: business.business_address || '',
                        business_town: business.business_town || '',
                        business_postcode: business.business_postcode || '',
                        email: business.email || '',
                        phone: business.phone || '',
                        status: business.status as 'incomplete' | 'pending_review' | 'approved' | 'rejected' | 'trial_expired' | 'inactive',
                        approved_at: business.approved_at,
                        admin_notes: business.admin_notes,
                        subscription: null,
                        tier: null,
                        recent_payments: [],
                        menu_url: business.menu_url,
                        business_images: business.business_images as string[] | null,
                        offer_name: business.offer_name,
                        offer_type: business.offer_type,
                        offer_image: business.offer_image,
                        offer_start_date: business.offer_start_date,
                        offer_end_date: business.offer_end_date,
                        offer_terms: business.offer_terms,
                        secret_menu_items: business.additional_notes ? 
                          (() => {
                            try {
                              const parsed = JSON.parse(business.additional_notes)
                              return parsed.secret_menu_items || []
                            } catch {
                              return []
                            }
                          })() : [],
                        // Calculate trial info for expired businesses
                        trial_days_remaining: business.approved_at ? 
                          (() => {
                            const approvalDate = new Date(business.approved_at)
                            const trialEndDate = new Date(approvalDate.getTime() + (120 * 24 * 60 * 60 * 1000))
                            const now = new Date()
                            return Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                          })() : null,
                        trial_status: 'expired' as const,
                        billing_starts_date: business.approved_at ? 
                          new Date(new Date(business.approved_at).getTime() + (120 * 24 * 60 * 60 * 1000)).toISOString() : null,
                        last_updated: business.updated_at || business.created_at,
                        has_pending_changes: false,
                        pending_changes_count: 0
                      }
                      
                      return (
                        <ComprehensiveBusinessCRMCard
                          key={business.id}
                          business={crmBusiness}
                          onApprove={handleApproval}
                          onInspect={(business) => {
                            // Find the original business data from allBusinesses to get complete info
                            const originalBusiness = allBusinesses.find(b => b.id === business.id)
                            const legacyBusiness = {
                              id: business.id,
                              user_id: originalBusiness?.user_id || '',
                              business_name: business.business_name,
                              email: business.email,
                              first_name: originalBusiness?.first_name || '',
                              last_name: originalBusiness?.last_name || '',
                              business_type: originalBusiness?.business_type || '',
                              business_category: business.business_category,
                              business_town: business.business_town,
                              business_address: business.business_address,
                              business_postcode: business.business_postcode,
                              phone: business.phone,
                              logo: originalBusiness?.logo || '',
                              business_tagline: originalBusiness?.business_tagline || '',
                              business_description: originalBusiness?.business_description || '',
                              business_hours: originalBusiness?.business_hours || '',
                              business_hours_structured: originalBusiness?.business_hours_structured || null,
                              offer_name: business.offer_name || '',
                              offer_type: business.offer_type || '',
                              offer_value: originalBusiness?.offer_value || '',
                              offer_terms: originalBusiness?.offer_terms || '',
                              menu_url: business.menu_url || '',
                              business_images: business.business_images || [],
                              menu_preview: originalBusiness?.menu_preview || '',
                              additional_notes: business.secret_menu_items ? JSON.stringify({ secret_menu_items: business.secret_menu_items }) : '',
                              status: business.status,
                              created_at: originalBusiness?.created_at || '',
                              updated_at: business.last_updated
                            }
                            setInspectionModal({ open: true, business: legacyBusiness })
                          }}
                        />
                      )
                    })
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

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="space-y-8">
                  <AdminAnalytics city={city} />
                  
                  {/* QR Analytics Section */}
                  <div className="border-t border-slate-700 pt-8">
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-white mb-2">QR Code Analytics</h3>
                      <p className="text-slate-400">Track QR code performance and user engagement</p>
                    </div>
                    <QRAnalyticsDashboard city={city} />
                  </div>
                </div>
              )}

              {/* Contacts Tab */}
              {activeTab === 'contacts' && (
                <ContactsTab city={city} cityDisplayName={cityDisplayName} />
              )}

              {/* QR Management Tab */}
              {activeTab === 'qr-management' && (
                <ComprehensiveQRDashboard city={city} />
              )}

              {/* AI Test Tab */}
              {activeTab === 'ai-test' && (
                <AITestPage city={city} />
              )}

            </div>
          </div>
        </main>
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
      
      {/* Elegant Modal System */}
      <ModalComponent />
    </div>
  )
}
