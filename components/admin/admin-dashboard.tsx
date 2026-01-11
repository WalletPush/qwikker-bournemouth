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
import { ComprehensiveAdminAnalytics } from './comprehensive-admin-analytics'
import { ContactsTab } from './contacts-tab'
import { SyncHealthOverview } from './sync-health-overview'
import { InitialAvatar } from '@/components/admin/initial-avatar'
import { SmartQRGenerator } from './smart-qr-generator'
import { ComprehensiveQRDashboard } from './comprehensive-qr-dashboard'
import { AITestPage } from './ai-test-page'
import { QRAnalyticsDashboard } from './qr-analytics-dashboard'
import { AdminDashboardOverview } from './admin-dashboard-overview'
import { PricingCardEditor } from './pricing-card-editor'
import { AdminSetupPage } from './admin-setup-page'
import { EventPreviewCard } from '@/components/ui/event-preview-card'

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
  pendingMenus: any[]
  pendingEvents: any[]
  walletPassesCount: number
}

export function AdminDashboard({ businesses, crmData, adminEmail, city, cityDisplayName, pendingChangesCount, pendingChanges, pendingMenus, pendingEvents, walletPassesCount }: AdminDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get initial tab from URL or default to 'pending'
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'updates' | 'live' | 'unclaimed' | 'incomplete' | 'expired' | 'rejected' | 'knowledge' | 'analytics' | 'contacts' | 'import' | 'claims' | 'qr-management' | 'ai-test' | 'pricing' | 'setup'>(() => {
    const urlTab = searchParams.get('tab')
    const validTabs = ['overview', 'pending', 'updates', 'live', 'unclaimed', 'incomplete', 'expired', 'rejected', 'knowledge', 'analytics', 'contacts', 'import', 'claims', 'qr-management', 'ai-test', 'pricing', 'setup']
    return validTabs.includes(urlTab || '') ? (urlTab as any) : 'overview'
  })

  // No redirects - all tabs stay in dashboard

  // Real claims data from database (will be loaded via API)
  const [mockClaims, setMockClaims] = useState([])
  const [loadingClaims, setLoadingClaims] = useState(true)
  const [expandedClaims, setExpandedClaims] = useState<Set<string>>(new Set())

  // Load real claims from database
  useEffect(() => {
    const loadClaims = async () => {
      try {
        const response = await fetch(`/api/admin/claims?city=${city}`)
        const data = await response.json()
        
        if (data.success && data.claims) {
          setMockClaims(data.claims)
        }
      } catch (error) {
        console.error('Failed to load claims:', error)
      } finally {
        setLoadingClaims(false)
      }
    }
    
    loadClaims()
  }, [city])

  const [processingClaim, setProcessingClaim] = useState<string | null>(null)

  const toggleExpandClaim = (claimId: string) => {
    const newExpanded = new Set(expandedClaims)
    if (newExpanded.has(claimId)) {
      newExpanded.delete(claimId)
    } else {
      newExpanded.add(claimId)
    }
    setExpandedClaims(newExpanded)
  }

  const handleApproveClaim = async (claimId: string) => {
    setProcessingClaim(claimId)
    
    try {
      const response = await fetch('/api/admin/approve-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action: 'approve' }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Update local state
        setMockClaims(mockClaims.map(c => 
          c.id === claimId ? { ...c, status: 'approved' as const } : c
        ))
        showSuccess('Claim Approved!', 'Business now has free tier access and is visible in Discover')
        // Auto-switch to approved view
        setTimeout(() => {
          setClaimsView('approved')
          window.location.reload() // Refresh to show updated business in Live Listings
        }, 1500)
      } else {
        showError('Approval Failed', result.error || 'Failed to approve claim. Please try again.')
      }
    } catch (error) {
      console.error('Error approving claim:', error)
      showError('Unexpected Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setProcessingClaim(null)
    }
  }

  const handleRequestProof = async (claim: any) => {
    setProcessingClaim(claim.id)
    
    try {
      const response = await fetch('/api/admin/request-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          claimId: claim.id,
          businessName: claim.business.name,
          email: claim.user.email,
          riskFactors: {
            emailDomainMatch: claim.verification.emailDomainMatch,
            genericEmail: claim.user.email.split('@')[1]?.match(/(gmail|yahoo|hotmail|outlook)\.com/),
            accountAge: claim.user.accountCreated
          }
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        showSuccess('Proof Requested', `Email sent to ${claim.user.email}`)
      } else {
        showError('Request Failed', result.error || 'Failed to send proof request')
      }
    } catch (error) {
      console.error('Error requesting proof:', error)
      showError('Request Failed', 'An unexpected error occurred')
    } finally {
      setProcessingClaim(null)
    }
  }

  const handleContactBusiness = async (claim: any) => {
    // Get custom message from admin
    const customMessage = prompt(
      `Contact ${claim.business.name}\n\nEnter your message to ${claim.user.name}:`,
      ''
    )
    
    if (customMessage && customMessage.trim()) {
      try {
        const response = await fetch('/api/admin/contact-business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            claimId: claim.id,
            email: claim.user.email,
            businessName: claim.business.name,
            userName: claim.user.name,
            customMessage: customMessage.trim(),
            city: city
          }),
        })

        const result = await response.json()
        if (response.ok && result.success) {
          showSuccess('Email Sent', `Message sent to ${claim.user.email}`)
        } else {
          showError('Send Failed', result.error || 'Failed to send email')
        }
      } catch (error) {
        console.error('Error sending email:', error)
        showError('Send Failed', 'An unexpected error occurred')
      }
    }
  }

  const handleDenyClaim = async (claimId: string) => {
    setProcessingClaim(claimId)
    
    try {
      const response = await fetch('/api/admin/approve-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, action: 'deny' }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Update local state
        setMockClaims(mockClaims.map(c => 
          c.id === claimId ? { ...c, status: 'denied' as const } : c
        ))
        showSuccess('Claim Denied', 'Business listing remains unclaimed')
        // Auto-switch to denied view
        setTimeout(() => setClaimsView('denied'), 500)
      } else {
        showError('Denial Failed', result.error || 'Failed to deny claim. Please try again.')
      }
    } catch (error) {
      console.error('Error denying claim:', error)
      showError('Unexpected Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setProcessingClaim(null)
    }
  }

  const formatTimeAgo = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const minutes = Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60))
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'safe': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950'
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950'
      case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950'
      case 'critical': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950'
    }
  }

  const getRiskIcon = (level: string) => {
    // Icons removed for cleaner UI
    return null
  }

  const pendingClaims = mockClaims.filter(c => c.status === 'pending')
  const approvedClaims = mockClaims.filter(c => c.status === 'approved')
  const deniedClaims = mockClaims.filter(c => c.status === 'denied')
  
  const [claimsView, setClaimsView] = useState<'pending' | 'approved' | 'denied'>('pending')
  const [businessList, setBusinessList] = useState<Business[]>(businesses)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [inspectionModal, setInspectionModal] = useState<{ open: boolean; business: Business | null }>({ open: false, business: null })
  const [inspectedBusinesses, setInspectedBusinesses] = useState<Set<string>>(new Set())
  const [processingChangeId, setProcessingChangeId] = useState<string | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [eventPreviewModal, setEventPreviewModal] = useState<{ open: boolean; event: any; businessName: string } | null>(null)
  const [expandedEventDetails, setExpandedEventDetails] = useState<Set<string>>(new Set())
  
  // 🔍 SEARCH & FILTER STATE
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterTier, setFilterTier] = useState('all')
  
  // Menu processing state
  const [processingMenuId, setProcessingMenuId] = useState<string | null>(null)
  
  const { showSuccess, showError, showConfirm, ModalComponent } = useElegantModal()
  
  // Knowledge Base State
  const [selectedTarget, setSelectedTarget] = useState<string>('general')
  const [knowledgeStatus, setKnowledgeStatus] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  // Auto-populate handler
  const handleAutoPopulate = async () => {
    setIsProcessing('auto-populate')
    setKnowledgeStatus('🚀 Auto-populating knowledge base...')

    try {
      const response = await fetch('/api/admin/knowledge/auto-populate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: city })
      })

      const result = await response.json()

      if (result.success) {
        setKnowledgeStatus(`✅ Success! Processed ${result.stats.businessesProcessed} businesses and created ${result.stats.knowledgeEntriesCreated} knowledge entries.

${result.results.map(r => `${r.success ? '✅' : '❌'} ${r.type}: ${r.business}`).join('\n')}`)
      } else {
        setKnowledgeStatus(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      setKnowledgeStatus(`❌ Error: ${error.message}`)
    } finally {
      setIsProcessing(null)
    }
  }

  // PDF Upload Handler
  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing('pdf')
    setKnowledgeStatus('🔄 Processing PDF...')

    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('targetId', selectedTarget === 'general' ? city : selectedTarget)
      formData.append('targetType', selectedTarget === 'general' ? 'general' : 'business')
      formData.append('title', file.name.replace('.pdf', ''))

      const response = await fetch('/api/admin/knowledge/upload-pdf', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setKnowledgeStatus(`✅ ${data.message}`)
        showSuccess('PDF Processed Successfully', `Created ${data.data.embeddings} embeddings from ${data.data.chunks} text chunks`)
        // Clear the file input
        event.target.value = ''
      } else {
        setKnowledgeStatus(`❌ ${data.error}`)
        showError('PDF Processing Failed', data.error || 'Unknown error occurred')
      }
    } catch (error) {
      setKnowledgeStatus(`❌ Upload failed: ${error.message}`)
      showError('Upload Error', 'Failed to upload PDF. Please try again.')
    } finally {
      setIsProcessing(null)
    }
  }
  
  // Function to update tab and URL
  const updateActiveTab = (newTab: 'overview' | 'pending' | 'updates' | 'live' | 'incomplete' | 'expired' | 'rejected' | 'knowledge' | 'analytics' | 'contacts' | 'import' | 'claims' | 'qr-management' | 'ai-test' | 'pricing' | 'setup') => {
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
      
      // Filter by business_type ONLY (case-insensitive to handle both lowercase and Google Places proper case)
      const matchesCategory = filterCategory === 'all' || business.business_type?.toLowerCase() === filterCategory.toLowerCase()
      
      // Filter by tier - Check CRM subscription data
      let matchesTier = false
      if (filterTier === 'all') {
        matchesTier = true
      } else {
        const crm = crmData.find(c => c.id === business.id)
        if (filterTier === 'trial') {
          matchesTier = crm?.subscription?.is_in_free_trial === true
        } else if (filterTier === 'free') {
          // CRITICAL: Only show truly free listings (unclaimed or claimed_free WITHOUT trial)
          // EXCLUDE businesses on free trial (they show in 'trial' filter)
          const isOnTrial = crm?.subscription?.is_in_free_trial === true
          matchesTier = !isOnTrial && (business.status === 'unclaimed' || business.status === 'claimed_free' || crm?.subscription?.tier_name === 'free')
        } else if (filterTier === 'synced') {
          matchesTier = !!crm?.last_ghl_sync
        } else {
          matchesTier = crm?.subscription?.tier_name === filterTier
        }
      }

      
      return matchesSearch && matchesCategory && matchesTier
    })
  }

  // ORIGINAL counts for sidebar (NEVER filtered)
  const allPendingBusinesses = businessList.filter(b => b.status === 'pending_review')
  
  // ✅ FIXED: Exclude expired trials from Live Listings
  // ✅ INCLUDE claimed_free businesses (they're live with free tier)
  // ✅ EXCLUDE unclaimed businesses (they have their own tab)
  const allLiveBusinesses = businessList.filter(b => {
    if (b.status !== 'approved' && b.status !== 'claimed_free') return false
    
    // Check if trial is expired (only for approved businesses with trials)
    if (b.status === 'approved' && b.subscription && Array.isArray(b.subscription) && b.subscription.length > 0) {
      const sub = b.subscription[0]
      if (sub.is_in_free_trial && sub.free_trial_end_date) {
        const endDate = new Date(sub.free_trial_end_date)
        const now = new Date()
        if (endDate < now) {
          return false // ❌ Exclude expired trials from Live
        }
      }
    }
    
    return true // ✅ Include approved AND claimed_free
  })
  
  // ✅ NEW: Unclaimed businesses (separate tab)
  const allUnclaimedBusinesses = businessList.filter(b => b.status === 'unclaimed')
  
  const allIncompleteBusinesses = businessList.filter(b => b.status === 'incomplete')
  const allRejectedBusinesses = businessList.filter(b => b.status === 'rejected')
  
  // ✅ FIXED: Check subscription end date, not status
  const allExpiredTrialBusinesses = businessList.filter(b => {
    // Check if business has subscription data
    if (!b.subscription || !Array.isArray(b.subscription) || b.subscription.length === 0) return false
    
    const sub = b.subscription[0] // Get first subscription
    if (!sub.free_trial_end_date || !sub.is_in_free_trial) return false
    
    // Check if trial is expired
    const endDate = new Date(sub.free_trial_end_date)
    const now = new Date()
    
    return endDate < now
  })

  // FILTERED businesses for display content only
  const pendingBusinesses = filterBusinesses(allPendingBusinesses)
  const liveBusinesses = filterBusinesses(allLiveBusinesses)
  const unclaimedBusinesses = filterBusinesses(allUnclaimedBusinesses)
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
      id: 'overview', 
      label: 'Dashboard Overview', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0z" /></svg>, 
    },
    { 
      id: 'pending', 
      label: 'Pending Applications', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
      count: allPendingBusinesses.length 
    },
    { 
      id: 'updates', 
      label: 'Pending Updates', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>, 
      count: pendingChangesCount + pendingMenus.length + pendingEvents.length 
    },
    { 
      id: 'claims', 
      label: 'Claim Requests', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      count: pendingClaims.length
    },
    { 
      id: 'live', 
      label: 'Live Listings', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
      count: allLiveBusinesses.length 
    },
    { 
      id: 'unclaimed', 
      label: 'Unclaimed Listings', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>, 
      count: allUnclaimedBusinesses.length 
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
      id: 'analytics', 
      label: 'Analytics', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, 
    },
    { 
      id: 'contacts', 
      label: 'Contacts', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, 
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
    
    if ((!business.business_hours || business.business_hours.trim() === '') && !business.business_hours_structured) missingRequiredFields.push('Opening Hours')
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
    <div className="min-h-screen bg-slate-950">
      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 z-50 flex flex-col ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:max-w-none`}>
        
        {/* Logo - Fixed at top */}
        <div className="flex-shrink-0 p-6 border-b border-slate-700/50">
          <div className="text-center space-y-2">
              {/* QWIKKER Logo */}
              <img 
                src="/Qwikker Logo web.svg" 
                alt="QWIKKER Admin Dashboard" 
                className="qwikker-logo mx-auto"
                style={{ maxHeight: '32px' }}
              />
              {/* Admin Dashboard Text */}
              <div>
                <p className="text-lg font-bold text-white mb-1">Admin Dashboard</p>
                <p className="text-sm text-slate-400">{cityDisplayName}</p>
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
                        : item.count > 0 && (item.id === 'incomplete' || item.id === 'pending' || item.id === 'updates' || item.id === 'claims')
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

              {/* Control Center Section Divider */}
              <div className="px-4 py-3 mt-4 border-t border-slate-700/50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Control Center</p>
              </div>

              {/* Control Center Items */}
              <button
                onClick={() => setActiveTab('import')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'import' 
                    ? 'bg-[#00d083] text-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <span>Import Businesses</span>
              </button>

              <button
                onClick={() => setActiveTab('knowledge')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'knowledge' 
                    ? 'bg-[#00d083] text-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Knowledge Base</span>
              </button>

              <button
                onClick={() => setActiveTab('qr-management')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'qr-management' 
                    ? 'bg-[#00d083] text-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span>QR Management</span>
              </button>

              <button
                onClick={() => setActiveTab('setup')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'setup' 
                    ? 'bg-[#00d083] text-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Franchise Setup</span>
              </button>

              <button
                onClick={() => setActiveTab('pricing')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'pricing' 
                    ? 'bg-[#00d083] text-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Pricing & Billing</span>
              </button>

              <button
                onClick={() => setActiveTab('ai-test')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'ai-test' 
                    ? 'bg-[#00d083] text-black' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>AI Test</span>
              </button>

              {/* Divider */}
              <div className="px-4 py-2">
                <div className="border-t border-slate-700/50"></div>
              </div>

              {/* Admin Tools */}
              <button 
                onClick={() => router.push('/admin/find-user')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all duration-200 text-slate-300 hover:text-white hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Find Users</span>
                </div>
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>

              <button 
                onClick={() => router.push('/admin/emergency-email-fix')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all duration-200 text-slate-300 hover:text-white hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Fix User Email</span>
                </div>
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
        </nav>

        {/* Bottom section - Admin info */}
        <div className="flex-shrink-0 p-4 border-t border-slate-700">
          <AdminLogoutButton />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-80">
        {/* Top header */}
        <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-4">
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
                {activeTab === 'pending' && 'Pending Applications'}
                {activeTab === 'updates' && 'Pending Updates'}
                {activeTab === 'live' && 'Live Listings'}
                {activeTab === 'unclaimed' && 'Unclaimed Listings'}
                {activeTab === 'incomplete' && 'Incomplete Listings'}
                {activeTab === 'rejected' && 'Rejected Applications'}
                {activeTab === 'knowledge' && 'Knowledge Base'}
                {activeTab === 'analytics' && 'City Analytics'}
                {activeTab === 'pricing' && 'Pricing & Billing'}
                {activeTab === 'setup' && 'Franchise Setup'}
                {activeTab === 'contacts' && 'Business Contacts'}
                {activeTab === 'import' && 'Import Businesses'}
                {activeTab === 'claims' && 'Claim Requests'}
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
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center font-bold text-slate-200 border border-slate-600">
                {cityDisplayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            {/* Header - Enhanced for Live Listings */}
            {activeTab === 'live' ? (
              <div className="mb-8">
                {/* Title Section - Centered */}
                <div className="flex flex-col items-center justify-center mb-6 text-center">
                  <h2 className="text-4xl font-bold text-white mb-2">
                    Live Listings
                  </h2>
                  <p className="text-slate-400 text-lg">
                    View and manage your live listings
                  </p>
                </div>

                {/* Stats Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  {/* Total Active */}
                  <button
                    onClick={() => setFilterTier('all')}
                    className={`w-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border rounded-xl p-4 hover:bg-slate-700/50 transition-all cursor-pointer ${
                      filterTier === 'all' ? 'border-[#00d083] ring-2 ring-[#00d083]/20' : 'border-slate-700/50 hover:border-[#00d083]/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-[#00d083]/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-medium">Total Active</p>
                        <p className="text-2xl font-bold text-white">{allLiveBusinesses.length}</p>
                      </div>
                    </div>
                  </button>

                  {/* Free Trial */}
                  <button
                    onClick={() => setFilterTier('trial')}
                    className={`w-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border rounded-xl p-4 hover:bg-slate-700/50 transition-all cursor-pointer ${
                      filterTier === 'trial' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-700/50 hover:border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-medium">Free Trial</p>
                        <p className="text-2xl font-bold text-white">
                          {allLiveBusinesses.filter(b => {
                            const crm = crmData.find(c => c.id === b.id)
                            // ONLY check subscription data, ignore legacy trial_days_remaining
                            return crm?.subscription?.is_in_free_trial
                          }).length}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Free Tier */}
                  <button
                    onClick={() => setFilterTier('free')}
                    className={`w-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border rounded-xl p-4 hover:bg-slate-700/50 transition-all cursor-pointer ${
                      filterTier === 'free' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-700/50 hover:border-emerald-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-medium">Free</p>
                        <p className="text-2xl font-bold text-white">
                          {allLiveBusinesses.filter(b => {
                            const crm = crmData.find(c => c.id === b.id)
                            // CRITICAL: Only count truly free listings, NOT free trials
                            const isOnTrial = crm?.subscription?.is_in_free_trial === true
                            return !isOnTrial && (b.status === 'unclaimed' || b.status === 'claimed_free' || crm?.subscription?.tier_name === 'free')
                          }).length}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Starter Tier */}
                  <button
                    onClick={() => setFilterTier('starter')}
                    className={`w-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border rounded-xl p-4 hover:bg-slate-700/50 transition-all cursor-pointer ${
                      filterTier === 'starter' ? 'border-slate-400 ring-2 ring-slate-400/20' : 'border-slate-700/50 hover:border-slate-400/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-slate-400/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-medium">Starter</p>
                        <p className="text-2xl font-bold text-white">
                          {allLiveBusinesses.filter(b => {
                            const crm = crmData.find(c => c.id === b.id)
                            // Starter tier EXCLUDING trials
                            const isTrial = crm?.subscription?.is_in_free_trial
                            return !isTrial && crm?.subscription?.tier_name === 'starter'
                          }).length}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Featured Tier */}
                  <button
                    onClick={() => setFilterTier('featured')}
                    className={`w-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border rounded-xl p-4 hover:bg-slate-700/50 transition-all cursor-pointer ${
                      filterTier === 'featured' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-700/50 hover:border-purple-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-medium">Featured</p>
                        <p className="text-2xl font-bold text-white">
                          {allLiveBusinesses.filter(b => {
                            const crm = crmData.find(c => c.id === b.id)
                            // Featured tier EXCLUDING trials
                            const isTrial = crm?.subscription?.is_in_free_trial
                            return !isTrial && crm?.subscription?.tier_name === 'featured'
                          }).length}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Spotlight Tier */}
                  <button
                    onClick={() => setFilterTier('spotlight')}
                    className={`w-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border rounded-xl p-4 hover:bg-slate-700/50 transition-all cursor-pointer ${
                      filterTier === 'spotlight' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-700/50 hover:border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-medium">Spotlight</p>
                        <p className="text-2xl font-bold text-white">
                          {allLiveBusinesses.filter(b => {
                            const crm = crmData.find(c => c.id === b.id)
                            // Spotlight tier EXCLUDING trials
                            const isTrial = crm?.subscription?.is_in_free_trial
                            return !isTrial && crm?.subscription?.tier_name === 'spotlight'
                          }).length}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Synced to CRM */}
                  <button
                    onClick={() => setFilterTier('synced')}
                    className={`w-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border rounded-xl p-4 hover:bg-slate-700/50 transition-all cursor-pointer ${
                      filterTier === 'synced' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-700/50 hover:border-emerald-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-medium">Synced</p>
                        <p className="text-2xl font-bold text-white">
                          {allLiveBusinesses.filter(b => {
                            const crm = crmData.find(c => c.id === b.id)
                            return crm?.last_ghl_sync
                          }).length}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Search & Filter Bar */}
                <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 mb-6">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative group">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-10 group-hover:text-[#00d083] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search by name, owner, or category..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-2xl text-white placeholder-slate-500 hover:bg-slate-700/50 focus:outline-none focus:border-[#00d083]/50 focus:ring-2 focus:ring-[#00d083]/20 focus:bg-slate-700/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Type Filter */}
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-2xl text-white hover:bg-slate-700/50 focus:outline-none focus:border-[#00d083]/50 focus:ring-2 focus:ring-[#00d083]/20 focus:bg-slate-700/50 transition-all cursor-pointer"
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

                    {/* Tier Filter */}
                    <select
                      value={filterTier}
                      onChange={(e) => setFilterTier(e.target.value)}
                      className="px-4 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:border-[#00d083]/50 focus:ring-2 focus:ring-[#00d083]/20 transition-all cursor-pointer"
                    >
                      <option value="all">All Tiers</option>
                      <option value="trial">Trial</option>
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="featured">Featured</option>
                      <option value="spotlight">Spotlight</option>
                    </select>

                    {/* Clear Filters */}
                    {(searchTerm || filterCategory !== 'all' || filterTier !== 'all') && (
                      <button
                        onClick={() => {
                          setSearchTerm('')
                          setFilterCategory('all')
                          setFilterTier('all')
                        }}
                        className="px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear
                      </button>
                    )}

                    {/* Results Count */}
                    {(searchTerm || filterCategory !== 'all' || filterTier !== 'all') && (
                      <div className="ml-auto text-sm text-slate-400 whitespace-nowrap">
                        Showing <span className="text-white font-semibold">{liveBusinesses.length}</span> of {allLiveBusinesses.length}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {activeTab === 'overview' && 'Dashboard Overview'}
                  {activeTab === 'pending' && 'Pending Applications'}
                  {activeTab === 'updates' && 'Pending Updates'}
                  {activeTab === 'incomplete' && 'Incomplete Listings'}
                  {activeTab === 'rejected' && 'Rejected Applications'}
                  {activeTab === 'knowledge' && 'Knowledge Base'}
                  {activeTab === 'analytics' && 'City Analytics'}
                  {activeTab === 'pricing' && 'Pricing & Billing'}
                  {activeTab === 'setup' && 'Franchise Setup'}
                  {activeTab === 'contacts' && 'Business Contacts'}
                  {activeTab === 'qr-management' && 'QR Code Management'}
                  {activeTab === 'ai-test' && 'AI Chat Testing'}
                </h2>
                <p className="text-slate-400">
                  {activeTab === 'overview' && `Quick overview of ${cityDisplayName} admin activities and priority actions`}
                  {activeTab === 'pending' && 'Businesses awaiting your review and approval'}
                  {activeTab === 'updates' && 'Changes from approved businesses awaiting your review'}
                  {activeTab === 'incomplete' && 'Businesses that need to complete their profiles'}
                  {activeTab === 'rejected' && 'Previously rejected business applications'}
                  {activeTab === 'knowledge' && 'AI knowledge base management for businesses and city information'}
                  {activeTab === 'analytics' && `Performance metrics and user analytics for ${cityDisplayName}`}
                  {activeTab === 'pricing' && `Customize pricing cards, currency, and billing settings for ${cityDisplayName}`}
                  {activeTab === 'contacts' && `CRM contact management with GHL sync for ${cityDisplayName}`}
                  {activeTab === 'import' && 'Auto-populate your city with businesses from Google Places API'}
                  {activeTab === 'claims' && 'Review and approve business owners claiming their listings'}
                  {activeTab === 'qr-management' && 'Generate and manage QR codes for businesses, offers, and secret menus'}
                  {activeTab === 'ai-test' && 'Test AI chat responses and knowledge base accuracy'}
                </p>
              </div>
            )}

            {/* Sync Health Overview - Only show on contacts tab */}
            {activeTab === 'contacts' && (
              <div className="mb-6">
                <SyncHealthOverview />
              </div>
            )}

            {/* 🔍 SEARCH & FILTER - ONLY show on Live Listings tab (has enhanced version in header)
                REMOVED from: overview, pending, updates, incomplete, expired, rejected
                (as per user request) */}
            {activeTab === 'live' && null /* Search already in header above, this section not needed */}

            {/* Content */}
            <div className="space-y-6">
              {activeTab === 'overview' && (
                <AdminDashboardOverview
                  city={cityDisplayName}
                  pendingCount={allPendingBusinesses.length}
                  updatesCount={pendingChangesCount}
                  liveCount={liveBusinesses.length}
                  incompleteCount={incompleteBusinesses.length}
                  claimsCount={pendingClaims.length}
                  walletPassesCount={walletPassesCount}
                  onNavigateToTab={setActiveTab}
                />
              )}

              {activeTab === 'pending' && (
                <div className="grid gap-6">
                  {pendingBusinesses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">No pending applications</h3>
                      <p className="text-slate-400">All business applications have been reviewed.</p>
                    </div>
                  ) : (
                    pendingBusinesses.map((business) => renderBusinessCard(business, true))
                  )}
                </div>
              )}

              {activeTab === 'live' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  {allLiveBusinesses.length === 0 ? (
                    <div className="text-center py-12 col-span-full">
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
                      // Use CRM data which already has correct subscription + trial info
                      const crmRecord = crmData.find(crm => crm.id === business.id)
                      
                      // If we have CRM data, use it directly (it has correct subscription data from admin-crm-actions)
                      if (crmRecord) {
                        return (
                          <ComprehensiveBusinessCRMCard
                            key={business.id}
                            business={crmRecord}
                            onApprove={handleApproval}
                            onInspect={(business) => {
                              // Find the original business data from allBusinesses to get complete info
                              const fullBusinessData = allBusinesses.find(b => b.id === business.id)
                              if (fullBusinessData) {
                                setSelectedBusiness(fullBusinessData)
                                setInspectionModalOpen(true)
                              }
                            }}
                          />
                        )
                      }
                      
                      // Fallback: Convert business data to CRM format (shouldn't happen for live businesses)
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
                        logo: business.logo || '',
                        business_tagline: business.business_tagline || '',
                        business_description: business.business_description || '',
                        business_hours: business.business_hours || '',
                        business_hours_structured: business.business_hours_structured || null,
                        website_url: business.website_url || '',
                        website: business.website_url || '',
                        instagram_handle: business.instagram_handle || '',
                        facebook_url: business.facebook_url || '',
                        status: business.status as 'incomplete' | 'pending_review' | 'approved' | 'rejected',
                        approved_at: business.approved_at,
                        created_at: business.created_at,
                        updated_at: business.updated_at,
                        last_ghl_sync: null,
                        last_crm_sync: null,
                        crm_sync_status: 'pending',
                        admin_notes: business.admin_notes,
                        subscription: null,
                        tier: null,
                        recent_payments: [],
                        menu_url: business.menu_url,
                        business_images: business.business_images as string[] | null,
                        business_menus: null,
                        offer_name: business.offer_name,
                        offer_type: business.offer_type,
                        offer_image: business.offer_image,
                        offer_start_date: business.offer_start_date,
                        offer_end_date: business.offer_end_date,
                        offer_terms: business.offer_terms,
                        business_offers: business.business_offers || [],
                        secret_menu_items: [],
                        trial_days_remaining: null,
                        trial_status: 'not_applicable' as const,
                        billing_starts_date: null,
                        last_updated: business.updated_at || business.created_at,
                        has_pending_changes: false,
                        pending_changes_count: 0,
                        plan: business.plan || 'starter',
                        features: business.features || { social_wizard: false, loyalty_cards: false, analytics: false, push_notifications: false }
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

              {activeTab === 'unclaimed' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  {allUnclaimedBusinesses.length === 0 ? (
                    <div className="text-center py-12 col-span-full">
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">No unclaimed listings</h3>
                      <p className="text-slate-400">There are no unclaimed business listings at the moment.</p>
                    </div>
                  ) : (
                    unclaimedBusinesses.map((business) => {
                      // Build CRM-compatible business object for unclaimed listings
                      const crmBusiness = {
                        id: business.id,
                        business_name: business.business_name || 'Unnamed Business',
                        first_name: '',
                        last_name: '',
                        business_category: business.business_category || 'Uncategorized',
                        business_type: business.business_type,
                        business_address: business.business_address || '',
                        business_town: business.business_town || '',
                        business_postcode: business.business_postcode || '',
                        email: business.email || '',
                        phone: business.phone || '',
                        logo: business.logo || '',
                        business_tagline: business.business_tagline || '',
                        business_description: business.business_description || '',
                        business_hours: business.business_hours || '',
                        business_hours_structured: business.business_hours_structured || null,
                        website_url: business.website_url || '',
                        website: business.website_url || '',
                        instagram_handle: business.instagram_handle || '',
                        facebook_page: business.facebook_page || '',
                        status: 'unclaimed',
                        subscription: null, // No subscription for unclaimed
                        business_tier: null,
                        offer_name: '',
                        offer_type: '',
                        offer_value: '',
                        offer_claim_amount: 0,
                        offer_start_date: null,
                        offer_end_date: null,
                        offer_terms: '',
                        business_offers: [],
                        secret_menu_items: [],
                        trial_days_remaining: null,
                        trial_status: 'not_applicable' as const,
                        billing_starts_date: null,
                        last_updated: business.updated_at || business.created_at,
                        has_pending_changes: false,
                        pending_changes_count: 0,
                        plan: null,
                        features: { social_wizard: false, loyalty_cards: false, analytics: false, push_notifications: false }
                      }
                      
                      return (
                        <ComprehensiveBusinessCRMCard
                          key={business.id}
                          business={crmBusiness}
                          onApprove={handleApproval}
                          onInspect={(business) => {
                            const fullBusinessData = allBusinesses.find(b => b.id === business.id)
                            if (fullBusinessData) {
                              setSelectedBusiness(fullBusinessData)
                              setInspectionModalOpen(true)
                            }
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
                <div className="space-y-6">
                  {/* Pending Menus Section */}
                  {pendingMenus.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Pending Menu Approvals ({pendingMenus.length})
                      </h2>
                      
                      <div className="grid gap-4">
                        {pendingMenus.map((menu) => (
                          <div key={menu.id} className="bg-slate-800/50 backdrop-blur border border-orange-500/30 rounded-2xl overflow-hidden hover:border-orange-400/50 transition-all duration-300">
                            <div className="p-6">
                              <div className="flex items-start gap-4 mb-4">
                                <div className="flex-shrink-0">
                                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border-2 border-orange-500/30 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-xl font-bold text-white mb-1 truncate">
                                        {menu.business_profiles?.business_name || 'Unknown Business'}
                                      </h3>
                                      <p className="text-slate-300 text-sm mb-2">
                                        {menu.business_profiles?.first_name} {menu.business_profiles?.last_name} • {menu.business_profiles?.email}
                                      </p>
                                      <div className="flex items-center gap-3 mb-3">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                          📄 {menu.menu_name}
                                        </span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                          {menu.menu_type}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                          Uploaded {new Date(menu.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Menu Actions */}
                                  <div className="flex gap-3 mt-4">
                                    <button
                                      onClick={() => window.open(menu.menu_url, '_blank')}
                                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      View PDF
                                    </button>
                                    <button
                                      onClick={async () => {
                                        console.log('🚀 APPROVE BUTTON CLICKED!')
                                        console.log('🔍 Menu:', menu.menu_name)
                                        
                                        const confirmed = await showConfirm(
                                          `Approve "${menu.menu_name}" and add to Knowledge Base?\n\nThis will:\n• Parse the PDF content\n• Create text chunks for AI search\n• Add to the knowledge base for chat queries`
                                        )
                                        
                                        console.log('🔍 User confirmed:', confirmed)
                                        if (!confirmed) return

                                        // Set loading state
                                        setProcessingMenuId(menu.id)

                                        try {
                                          console.log('🔄 Approving menu:', menu.id)
                                          console.log('🔄 Admin email:', adminEmail)
                                          console.log('🔄 Menu data:', menu)
                                          
                                          const response = await fetch('/api/admin/menus/approve', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              menuId: menu.id,
                                              action: 'approve',
                                              adminUserId: adminEmail,
                                              adminNotes: 'Approved via admin dashboard'
                                            })
                                          })
                                          
                                          const result = await response.json()
                                          console.log('📄 Menu approval response:', result)
                                          
                                          if (response.ok && result.success) {
                                            showSuccess(`Menu approved and added to Knowledge Base!\n\n• PDF processed successfully\n• ${result.chunksCreated || 'Multiple'} text chunks created\n• Available for AI chat queries`)
                                            setTimeout(() => window.location.reload(), 2000)
                                          } else {
                                            console.error('❌ Menu approval failed:', result)
                                            showError(`Failed to approve menu: ${result.error || 'Unknown error'}`)
                                          }
                                        } catch (error) {
                                          console.error('❌ Menu approval error:', error)
                                          showError(`Error approving menu: ${error.message}`)
                                        } finally {
                                          setProcessingMenuId(null)
                                        }
                                      }}
                                      disabled={processingMenuId === menu.id}
                                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {processingMenuId === menu.id ? (
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
                                          Approve
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={async () => {
                                        const confirmed = await showConfirm('Are you sure you want to reject this menu?')
                                        if (!confirmed) return
                                        
                                        setProcessingMenuId(menu.id)
                                        
                                        try {
                                          const response = await fetch('/api/admin/menus/approve', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              menuId: menu.id,
                                              action: 'reject',
                                              adminUserId: adminEmail,
                                              adminNotes: 'Rejected via admin dashboard'
                                            })
                                          })
                                          
                                          if (response.ok) {
                                            showSuccess('Menu rejected')
                                            window.location.reload()
                                          } else {
                                            showError('Failed to reject menu')
                                          }
                                        } catch (error) {
                                          showError('Error rejecting menu')
                                        } finally {
                                          setProcessingMenuId(null)
                                        }
                                      }}
                                      disabled={processingMenuId === menu.id}
                                      className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {processingMenuId === menu.id ? (
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
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                          Reject
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Events Section */}
                  {pendingEvents.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Pending Event Approvals ({pendingEvents.length})
                      </h2>
                      
                      <div className="grid gap-4">
                        {pendingEvents.map((event: any) => (
                          <div key={event.id} className="bg-slate-800/50 backdrop-blur border border-purple-500/30 rounded-2xl overflow-hidden hover:border-purple-400/50 transition-all duration-300">
                            <div className="p-6">
                              <div className="flex items-start gap-4 mb-4">
                                <div className="flex-shrink-0">
                                  {event.event_image ? (
                                    <img
                                      src={event.event_image}
                                      alt={event.event_name}
                                      className="w-24 h-24 object-cover rounded-xl border-2 border-purple-500/30"
                                    />
                                  ) : (
                                    <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30 flex items-center justify-center">
                                      <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-xl font-bold text-white mb-1 truncate">
                                        {event.event_name}
                                      </h3>
                                      <p className="text-slate-300 text-sm mb-2">
                                        {event.business_profiles?.business_name} • {event.business_profiles?.first_name} {event.business_profiles?.last_name}
                                      </p>
                                      <div className="flex items-center gap-3 mb-3">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                          📅 {new Date(event.event_date).toLocaleDateString('en-GB')}
                                        </span>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                          {event.event_type?.replace('_', ' ').toUpperCase()}
                                        </span>
                                        {event.event_start_time && (
                                          <span className="text-xs text-slate-400">
                                            🕐 {event.event_start_time}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-slate-400 text-sm line-clamp-2">
                                        {event.event_description}
                                      </p>
                                    </div>
                                  </div>

                                  {/* View Full Details Toggle */}
                                  <button
                                    onClick={() => {
                                      const newExpanded = new Set(expandedEventDetails)
                                      if (newExpanded.has(event.id)) {
                                        newExpanded.delete(event.id)
                                      } else {
                                        newExpanded.add(event.id)
                                      }
                                      setExpandedEventDetails(newExpanded)
                                    }}
                                    className="text-sm text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 mt-2"
                                  >
                                    {expandedEventDetails.has(event.id) ? (
                                      <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                        Hide Full Details
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        View Full Details
                                      </>
                                    )}
                                  </button>

                                  {/* Expanded Details Section */}
                                  {expandedEventDetails.has(event.id) && (
                                    <div className="mt-4 p-4 bg-slate-900/50 border border-purple-500/20 rounded-xl space-y-3 text-sm">
                                      {/* Full Description */}
                                      <div>
                                        <h4 className="text-purple-300 font-semibold mb-1">Full Description</h4>
                                        <p className="text-slate-300 whitespace-pre-wrap">{event.event_description}</p>
                                      </div>

                                      {/* Short Description */}
                                      {event.event_short_description && (
                                        <div>
                                          <h4 className="text-purple-300 font-semibold mb-1">Short Description</h4>
                                          <p className="text-slate-300">{event.event_short_description}</p>
                                        </div>
                                      )}

                                      {/* Time Details */}
                                      {(event.event_start_time || event.event_end_time) && (
                                        <div>
                                          <h4 className="text-purple-300 font-semibold mb-1">Time</h4>
                                          <p className="text-slate-300">
                                            {event.event_start_time && `Start: ${event.event_start_time}`}
                                            {event.event_start_time && event.event_end_time && ' • '}
                                            {event.event_end_time && `End: ${event.event_end_time}`}
                                          </p>
                                        </div>
                                      )}

                                      {/* Recurring Event Info */}
                                      {event.is_recurring && (
                                        <div>
                                          <h4 className="text-purple-300 font-semibold mb-1">Recurring Event</h4>
                                          <p className="text-slate-300">{event.recurrence_pattern || 'Pattern not specified'}</p>
                                        </div>
                                      )}

                                      {/* Price Info */}
                                      {event.price_info && (
                                        <div>
                                          <h4 className="text-purple-300 font-semibold mb-1">Price</h4>
                                          <p className="text-slate-300">{event.price_info}</p>
                                        </div>
                                      )}

                                      {/* Booking Information */}
                                      {event.requires_booking && (
                                        <div>
                                          <h4 className="text-purple-300 font-semibold mb-1">Booking Required</h4>
                                          {event.booking_url ? (
                                            <a 
                                              href={event.booking_url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-[#00d083] hover:text-[#00b86f] font-medium flex items-center gap-1"
                                            >
                                              {event.booking_url}
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                              </svg>
                                            </a>
                                          ) : (
                                            <p className="text-slate-400">Yes (no booking link provided)</p>
                                          )}
                                        </div>
                                      )}

                                      {/* Custom Location */}
                                      {(event.custom_location_name || event.custom_location_address) && (
                                        <div>
                                          <h4 className="text-purple-300 font-semibold mb-1">Custom Location</h4>
                                          {event.custom_location_name && (
                                            <p className="text-slate-300 font-medium">{event.custom_location_name}</p>
                                          )}
                                          {event.custom_location_address && (
                                            <p className="text-slate-400 text-xs">{event.custom_location_address}</p>
                                          )}
                                        </div>
                                      )}

                                      {/* Created Date */}
                                      <div>
                                        <h4 className="text-purple-300 font-semibold mb-1">Submitted</h4>
                                        <p className="text-slate-400 text-xs">
                                          {new Date(event.created_at).toLocaleDateString('en-GB', { 
                                            day: 'numeric', 
                                            month: 'long', 
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Event Actions */}
                                  <div className="space-y-3 mt-4">
                                    <div className="flex gap-3">
                                      <button
                                        onClick={() => setEventPreviewModal({ open: true, event, businessName: event.business_profiles?.business_name || 'Unknown Business' })}
                                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Preview
                                      </button>
                                      <button
                                        onClick={async () => {
                                          const confirmed = await showConfirm(
                                            `Approve "${event.event_name}" and add to Knowledge Base?\\n\\nThis will:\\n• Make it visible on user event discovery page\\n• Add to AI chat knowledge base\\n• Allow users to query about this event`
                                          )
                                          
                                          if (!confirmed) return

                                          try {
                                            const { approveEvent } = await import('@/lib/actions/event-actions')
                                            const result = await approveEvent(event.id)
                                            
                                            if (result.success) {
                                              showSuccess(`Event approved successfully!`)
                                              setTimeout(() => {
                                                router.refresh()
                                                window.location.reload()
                                              }, 1500)
                                            } else {
                                              console.error('Error approving event:', result.error)
                                              showError(`Failed to approve event: ${result.error || 'Unknown error'}`)
                                            }
                                          } catch (error) {
                                            console.error('Error approving event:', error)
                                            showError(`Failed to approve event: ${error instanceof Error ? error.message : 'Unknown error'}`)
                                          }
                                        }}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Approve
                                      </button>
                                      <button
                                        onClick={async () => {
                                          const reason = prompt('Reason for rejection:')
                                          if (!reason) return

                                          try {
                                            const { rejectEvent } = await import('@/lib/actions/event-actions')
                                            const result = await rejectEvent(event.id, reason)
                                            
                                            if (result.success) {
                                              showSuccess(`Event rejected`)
                                              setTimeout(() => {
                                                router.refresh()
                                                window.location.reload()
                                              }, 1500)
                                            } else {
                                              console.error('Error rejecting event:', result.error)
                                              showError(`Failed to reject event: ${result.error || 'Unknown error'}`)
                                            }
                                          } catch (error) {
                                            console.error('Error rejecting event:', error)
                                            showError(`Failed to reject event: ${error instanceof Error ? error.message : 'Unknown error'}`)
                                          }
                                        }}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Reject
                                      </button>
                                    </div>
                                    {/* Contact Business Button */}
                                    <button
                                      onClick={() => {
                                        const eventDate = new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                                        const subject = `Qwikker Event Submission - ${event.event_name}`
                                        const body = `Dear ${event.business_profiles?.first_name || 'Business Owner'},

Thank you for submitting your event "${event.event_name}" (${eventDate}) to Qwikker.

We're reviewing your submission and may have some questions or feedback to share.

Event Details:
• Name: ${event.event_name}
• Type: ${event.event_type?.replace('_', ' ').toUpperCase()}
• Date: ${eventDate}
${event.event_start_time ? `• Time: ${event.event_start_time}` : ''}

If you have any questions or would like to discuss your event, please don't hesitate to reach out.

Best regards,
Qwikker Admin Team`
                                        
                                        window.open(`mailto:${event.business_profiles?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
                                      }}
                                      className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-medium py-2 px-4 rounded-lg transition-all shadow-lg shadow-amber-600/20 hover:shadow-amber-600/30 flex items-center justify-center gap-2"
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Business Changes Section */}
                  <div className="space-y-4">
                    {pendingChanges.length > 0 && (
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Pending Business Changes ({pendingChanges.length})
                      </h2>
                    )}
                    
                    <div className="grid gap-6">
                      {pendingChanges.length === 0 && pendingMenus.length === 0 && pendingEvents.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-semibold text-white mb-2">No pending updates</h3>
                          <p className="text-slate-400">
                            All business changes, events, and menu uploads have been reviewed.
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
                                <h4 className="text-white font-semibold mb-2">
                                  {change.change_type === 'offer' ? 'Offer Details:' : 'Change Details:'}
                                </h4>
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
                  </div>
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
                      // 🔥 FIX: Use CRM data which has correct subscription + trial info (same as Live Businesses)
                      const crmRecord = crmData.find(crm => crm.id === business.id)
                      
                      // If we have CRM data, use it directly (it has correct subscription data from admin-crm-actions)
                      if (crmRecord) {
                        return (
                          <ComprehensiveBusinessCRMCard
                            key={business.id}
                            business={crmRecord}
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
                      }
                      
                      // Fallback: Convert business data to CRM format (shouldn't happen for expired businesses)
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
                        business_menus: crmMenus,
                        offer_name: business.offer_name,
                        offer_type: business.offer_type,
                        offer_image: business.offer_image,
                        offer_start_date: business.offer_start_date,
                        offer_end_date: business.offer_end_date,
                        offer_terms: business.offer_terms,
                        business_offers: business.business_offers || [],
                        secret_menu_items: business.additional_notes ? 
                          (() => {
                            try {
                              const parsed = JSON.parse(business.additional_notes)
                              return parsed.secret_menu_items || []
                            } catch {
                              return []
                            }
                          })() : [],
                        // Calculate trial info for expired businesses (✅ FIXED: Use subscription data, not hardcoded 120 days)
                        trial_days_remaining: business.subscription?.[0]?.free_trial_end_date ? 
                          (() => {
                            const endDate = new Date(business.subscription[0].free_trial_end_date)
                            const now = new Date()
                            return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                          })() : null,
                        trial_status: 'expired' as const,
                        billing_starts_date: business.subscription?.[0]?.free_trial_end_date || null,
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
                      <select 
                        value={selectedTarget}
                        onChange={(e) => setSelectedTarget(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-[#00d083] focus:ring-1 focus:ring-[#00d083] transition-colors"
                      >
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

                  {/* Auto-Populate Section */}
                  <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Auto-Populate Knowledge Base
                    </h3>
                    <p className="text-slate-300 mb-4 text-sm">
                      Automatically add all approved businesses in {cityDisplayName} to the AI knowledge base with embeddings. This gives the AI instant knowledge of every business.
                    </p>
                    <button
                      onClick={handleAutoPopulate}
                      disabled={isProcessing === 'auto-populate'}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      {isProcessing === 'auto-populate' ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Auto-Populate {cityDisplayName}
                        </>
                      )}
                    </button>
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
                          onChange={handlePDFUpload}
                          disabled={isProcessing === 'pdf'}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-red-400 focus:ring-1 focus:ring-red-400 file:bg-red-500/20 file:border-0 file:text-red-400 file:px-3 file:py-1 file:rounded file:text-sm file:mr-3 disabled:opacity-50"
                        />
                        <div className="text-xs text-slate-400 mt-2">
                          {selectedTarget === 'general' 
                            ? `Upload PDF for general ${cityDisplayName} knowledge`
                            : `Upload PDF for ${liveBusinesses.find(b => b.id === selectedTarget)?.business_name || 'selected business'}`
                          }
                        </div>
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

                  {/* Status Display */}
                  {knowledgeStatus && (
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-4">
                      <div className="text-sm font-mono text-slate-300">
                        {knowledgeStatus}
                      </div>
                    </div>
                  )}

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

                  {/* Status Display */}
                  {knowledgeStatus && (
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Status
                      </h3>
                      <div className="bg-slate-900/50 rounded-lg p-4">
                        <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{knowledgeStatus}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="space-y-8">
                  <ComprehensiveAdminAnalytics city={city} />
                </div>
              )}

              {/* Contacts Tab */}
              {activeTab === 'contacts' && (
                <ContactsTab city={city} cityDisplayName={cityDisplayName} />
              )}

              {/* Import Businesses Tab */}
              {activeTab === 'import' && (
                <div className="h-full">
                  <iframe 
                    src="/admin/import" 
                    className="w-full border-0 rounded-2xl bg-slate-800/50"
                    style={{ height: 'calc(100vh - 200px)' }}
                    title="Import Businesses"
                  />
                </div>
              )}

              {/* Claim Requests Tab */}
              {activeTab === 'claims' && (
                <div className="space-y-6">
                  {/* Tabs / Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setClaimsView('pending')}
                      className={`bg-slate-800/50 border rounded-xl p-6 transition-colors text-left cursor-pointer ${
                        claimsView === 'pending' 
                          ? 'border-yellow-500/50' 
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <p className="text-sm text-slate-400 mb-1">Pending Review</p>
                      <p className="text-3xl font-semibold text-white">{pendingClaims.length}</p>
                    </button>

                    <button
                      onClick={() => setClaimsView('approved')}
                      className={`bg-slate-800/50 border rounded-xl p-6 transition-colors text-left cursor-pointer ${
                        claimsView === 'approved' 
                          ? 'border-green-500/50' 
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <p className="text-sm text-slate-400 mb-1">Approved</p>
                      <p className="text-3xl font-semibold text-white">{approvedClaims.length}</p>
                    </button>

                    <button
                      onClick={() => setClaimsView('denied')}
                      className={`bg-slate-800/50 border rounded-xl p-6 transition-colors text-left cursor-pointer ${
                        claimsView === 'denied' 
                          ? 'border-red-500/50' 
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <p className="text-sm text-slate-400 mb-1">Denied</p>
                      <p className="text-3xl font-semibold text-white">{deniedClaims.length}</p>
                    </button>
                  </div>

                  {/* Claims List */}
                  {claimsView === 'pending' && pendingClaims.length === 0 && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
                      <p className="text-slate-400">No pending claims</p>
                    </div>
                  )}
                  
                  {claimsView === 'approved' && approvedClaims.length === 0 && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
                      <p className="text-slate-400">No approved claims yet</p>
                    </div>
                  )}
                  
                  {claimsView === 'denied' && deniedClaims.length === 0 && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
                      <p className="text-slate-400">No denied claims</p>
                    </div>
                  )}

                  {(claimsView === 'pending' ? pendingClaims : claimsView === 'approved' ? approvedClaims : deniedClaims).map(claim => (
                      <div key={claim.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                        <div className="p-6">
                          <div className="grid md:grid-cols-[1fr,auto] gap-6">
                            {/* Main Content */}
                            <div className="space-y-4">
                              {/* Header */}
                              <div className="flex gap-4">
                                <img 
                                  src={claim.business.image} 
                                  alt={claim.business.name}
                                  className="w-20 h-20 rounded-xl object-cover"
                                />
                                <div className="flex-1">
                                  <h3 className="font-bold text-xl text-white mb-1">
                                    {claim.user.name} → {claim.business.name}
                                  </h3>
                                  <p className="text-sm text-slate-400 mb-2">
                                    Claimed {formatTimeAgo(claim.createdAt)}
                                  </p>
                                  
                                  <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                                    <div className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                      {claim.user.email}
                                    </div>
                                    {claim.website && (
                                      <div className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                        </svg>
                                        {claim.website.replace('https://', '')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Business Info */}
                              <div className="flex flex-wrap gap-3 text-sm text-slate-400 pl-24">
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4 fill-yellow-400 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  {claim.business.rating} ({claim.business.reviewCount} reviews)
                                </div>
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {claim.business.address}
                                </div>
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  {claim.business.googleYears} years on Google
                                </div>
                              </div>

                              {/* Risk Analysis */}
                              <div className={`rounded-xl p-4 ${getRiskColor(claim.verification.riskLevel)}`}>
                                <div className="flex items-start gap-3">
                                  <span className="text-2xl">{getRiskIcon(claim.verification.riskLevel)}</span>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-semibold uppercase text-sm">
                                        {claim.verification.riskLevel === 'safe' && 'SAFE'}
                                        {claim.verification.riskLevel === 'medium' && 'MEDIUM RISK'}
                                        {claim.verification.riskLevel === 'high' && 'HIGH RISK'}
                                        {claim.verification.riskLevel === 'critical' && 'CRITICAL RISK'}
                                      </h4>
                                      <span className="text-sm font-mono">
                                        Risk: {claim.verification.riskScore}/100
                                      </span>
                                    </div>

                                    <p className="text-sm mb-3">
                                      {claim.verification.confidenceBadge}
                                    </p>

                                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <strong>Email Domain:</strong>{' '}
                                        {claim.verification.emailDomainMatch ? 'Matches' : 'No match'}
                                      </div>
                                      <div>
                                        <strong>Previous Claims:</strong>{' '}
                                        {claim.verification.duplicateClaims === 0 ? 'First claim' : `${claim.verification.duplicateClaims} other claims`}
                                      </div>
                                      <div>
                                        <strong>Account Age:</strong>{' '}
                                        {formatTimeAgo(claim.user.accountCreated)}
                                      </div>
                                      <div>
                                        <strong>Denied Before:</strong>{' '}
                                        {claim.verification.deniedClaims === 0 ? 'No' : `${claim.verification.deniedClaims} times`}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Edited Business Details */}
                              {claim.dataEdited && claim.editedData && (
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl overflow-hidden">
                                  <button
                                    onClick={() => toggleExpandClaim(claim.id)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-colors"
                                  >
                                    <h4 className="text-sm font-medium text-slate-300">
                                      {expandedClaims.has(claim.id) ? 'Updated Business Information' : 'Review Business Info'}
                                    </h4>
                                    <svg 
                                      className={`w-4 h-4 text-slate-400 transition-transform ${expandedClaims.has(claim.id) ? 'rotate-180' : ''}`}
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  
                                  {expandedClaims.has(claim.id) && (
                                    <div className="px-4 pb-4 space-y-3">
                                  
                                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                                    {claim.editedData.businessName && (
                                      <div>
                                        <strong className="text-slate-400">Business Name:</strong>
                                        <p className="text-white">{claim.editedData.businessName}</p>
                                      </div>
                                    )}
                                    {claim.editedData.address && (
                                      <div>
                                        <strong className="text-slate-400">Address:</strong>
                                        <p className="text-white">{claim.editedData.address}</p>
                                      </div>
                                    )}
                                    {claim.editedData.phone && (
                                      <div>
                                        <strong className="text-slate-400">Phone:</strong>
                                        <p className="text-white">{claim.editedData.phone}</p>
                                      </div>
                                    )}
                                    {claim.editedData.website && (
                                      <div>
                                        <strong className="text-slate-400">Website:</strong>
                                        <p className="text-white truncate">
                                          <a href={claim.editedData.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                            {claim.editedData.website}
                                          </a>
                                        </p>
                                      </div>
                                    )}
                                    {claim.editedData.category && (
                                      <div>
                                        <strong className="text-slate-400">Category:</strong>
                                        <p className="text-white">{claim.editedData.category}</p>
                                      </div>
                                    )}
                                    {claim.editedData.type && (
                                      <div>
                                        <strong className="text-slate-400">Type:</strong>
                                        <p className="text-white">{claim.editedData.type}</p>
                                      </div>
                                    )}
                                  </div>

                                  {claim.editedData.hours && (
                                    <div>
                                      <strong className="text-slate-400 text-sm">Opening Hours:</strong>
                                      <p className="text-white text-sm whitespace-pre-line mt-1">{claim.editedData.hours}</p>
                                    </div>
                                  )}

                                  {claim.editedData.description && (
                                    <div>
                                      <strong className="text-slate-400 text-sm">Description:</strong>
                                      <p className="text-white text-sm mt-1">{claim.editedData.description}</p>
                                    </div>
                                  )}

                                  {/* Logo and Hero Images */}
                                  {(claim.editedData.logoUrl || claim.editedData.heroImageUrl) && (
                                    <div>
                                      <strong className="text-slate-400 text-sm block mb-2">Uploaded Images:</strong>
                                      <div className="flex gap-3">
                                        {claim.editedData.logoUrl && (
                                          <div>
                                            <p className="text-xs text-slate-400 mb-1">Logo</p>
                                            <img 
                                              src={claim.editedData.logoUrl} 
                                              alt="Business Logo" 
                                              className="w-20 h-20 object-cover rounded-lg border border-slate-600"
                                            />
                                          </div>
                                        )}
                                        {claim.editedData.heroImageUrl && (
                                          <div>
                                            <p className="text-xs text-slate-400 mb-1">Hero Image</p>
                                            <img 
                                              src={claim.editedData.heroImageUrl} 
                                              alt="Hero Image" 
                                              className="w-32 h-20 object-cover rounded-lg border border-slate-600"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Founding Member */}
                              {claim.foundingMemberEligible && (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                                  <p className="text-sm text-yellow-300">
                                    <strong>Founding Member Eligible</strong> (Spot #{claim.foundingMemberCount}/150)
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Actions - Only show for pending claims */}
                            {claim.status === 'pending' && (
                              <div className="grid grid-cols-4 gap-2 mt-4">
                                <button
                                  onClick={() => handleApproveClaim(claim.id)}
                                  disabled={processingClaim === claim.id}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-3 rounded transition-colors disabled:opacity-50 text-sm"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleDenyClaim(claim.id)}
                                  disabled={processingClaim === claim.id}
                                  className="bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-3 rounded transition-colors disabled:opacity-50 text-sm"
                                >
                                  Deny
                                </button>
                                <button
                                  onClick={() => handleRequestProof(claim)}
                                  disabled={processingClaim === claim.id}
                                  className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-3 rounded transition-colors disabled:opacity-50 text-sm"
                                >
                                  Request Proof
                                </button>
                                <button
                                  onClick={() => handleContactBusiness(claim)}
                                  disabled={processingClaim === claim.id}
                                  className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-3 rounded transition-colors disabled:opacity-50 text-sm"
                                >
                                  Contact
                                </button>
                              </div>
                            )}
                            
                            {/* Status badge for approved/denied */}
                            {claim.status === 'approved' && (
                              <div className="md:w-32 flex items-center justify-center">
                                <div className="bg-green-600/20 border border-green-600 text-green-400 font-semibold py-2 px-4 rounded-xl">
                                  Approved
                                </div>
                              </div>
                            )}
                            
                            {claim.status === 'denied' && (
                              <div className="md:w-32 flex items-center justify-center">
                                <div className="bg-red-600/20 border border-red-600 text-red-400 font-semibold py-2 px-4 rounded-xl">
                                  Denied
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* QR Management Tab */}
              {activeTab === 'qr-management' && (
                <ComprehensiveQRDashboard city={city} />
              )}

              {/* Pricing & Billing Tab */}
              {activeTab === 'pricing' && (
                <PricingCardEditor city={city} />
              )}

              {/* Franchise Setup Tab */}
              {activeTab === 'setup' && (
                <AdminSetupPage city={city} />
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

      {/* Event Preview Modal */}
      {eventPreviewModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setEventPreviewModal(null)}
              className="absolute top-4 right-4 z-10 bg-slate-800 hover:bg-slate-700 text-white rounded-full p-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-purple-500/30 p-6">
              <h2 className="text-2xl font-bold text-white">Event Preview</h2>
              <p className="text-slate-300 text-sm mt-1">
                This is exactly how users will see this event
              </p>
            </div>

            {/* Preview Content */}
            <div className="p-6">
              <EventPreviewCard 
                event={eventPreviewModal.event} 
                businessName={eventPreviewModal.businessName} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
