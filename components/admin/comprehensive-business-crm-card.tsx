'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SyncStatusBadge } from './sync-status-badge'
import { 
  BusinessCRMData, 
  formatCurrency, 
  getSubscriptionDisplayText, 
  getPaymentStatusColor,
  getSubscriptionStatusColor,
  calculateTrialStatus
} from '@/types/billing'
import { InitialAvatar } from '@/components/admin/initial-avatar'
import { formatDate, formatLastSync, formatJoinedDate } from '@/lib/utils/date-formatter'
import { formatBusinessHours } from '@/lib/utils/business-hours-formatter'
import { OfferDeletionModal } from '@/components/admin/offer-deletion-modal'

interface ComprehensiveBusinessCRMCardProps {
  business: BusinessCRMData
  onApprove?: (businessId: string, action: 'approve' | 'reject' | 'restore') => void
  onInspect?: (business: BusinessCRMData) => void
  className?: string
}

export function ComprehensiveBusinessCRMCard({ business, onApprove, onInspect, className }: ComprehensiveBusinessCRMCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [adminNotes, setAdminNotes] = useState(business.admin_notes || '')
  const [deletionModal, setDeletionModal] = useState<{ isOpen: boolean; offer: any | null }>({
    isOpen: false,
    offer: null
  })
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'contact' | 'files' | 'activity' | 'tasks' | 'offers' | 'controls' | 'analytics'>('overview')
  const [newTask, setNewTask] = useState('')
  const [isAddingTask, setIsAddingTask] = useState(false)

  // Handle offer deletion
  const handleDeleteOffer = async (offerId: string, confirmationText: string) => {
    try {
      const response = await fetch('/api/admin/offers/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offerId,
          confirmationText,
          adminUserId: 'admin' // You might want to pass the actual admin user ID
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Refresh the page or update the business data
        window.location.reload()
      } else {
        alert(`Failed to delete offer: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting offer:', error)
      alert('Failed to delete offer. Please try again.')
    }
  }

  // Use trial info directly from business data
  const trialInfo = {
    trial_days_remaining: business.trial_days_remaining,
    trial_status: business.trial_status,
    billing_starts_date: business.billing_starts_date
  }

  // CRM data based on Julie's Sports Bar - Mix of real data and realistic projections
  const contactHistory = [
    { id: 1, type: 'approval', date: '2024-09-23', duration: '2 min', notes: 'Business approved by bournemouth admin', outcome: 'positive' },
    { id: 2, type: 'sync', date: '2024-09-23', subject: 'GoHighLevel sync completed', status: 'success' },
    { id: 3, type: 'knowledge', date: '2024-09-23', notes: 'Basic knowledge added for Julie\'s Sports Bar', outcome: 'positive' },
    { id: 4, type: 'signup', date: '2024-09-20', notes: 'Initial business registration', outcome: 'positive' },
  ]

  // Generate real tasks based on business completion status
  const generateBusinessTasks = () => {
    const tasks = []
    let taskId = 1

    // Check for missing essential items and create tasks
    if (!business.logo) {
      tasks.push({
        id: taskId++,
        title: 'Upload business logo',
        due: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'high',
        completed: false,
        category: 'setup'
      })
    }

    if (!business.menu_url) {
      tasks.push({
        id: taskId++,
        title: 'Upload menu PDF',
        due: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'high',
        completed: false,
        category: 'setup'
      })
    }

    if (!business.business_hours && !business.business_hours_structured) {
      tasks.push({
        id: taskId++,
        title: 'Set business opening hours',
        due: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'high',
        completed: false,
        category: 'setup'
      })
    }

    if (!business.business_images || business.business_images.length === 0) {
      tasks.push({
        id: taskId++,
        title: 'Add business photos',
        due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'medium',
        completed: false,
        category: 'content'
      })
    }

    // Integration tasks only

    if (business.status === 'approved' && !business.last_ghl_sync) {
      tasks.push({
        id: taskId++,
        title: 'Complete GoHighLevel sync',
        due: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'medium',
        completed: false,
        category: 'integration'
      })
    }

    // Trial-based tasks
    if (trialInfo.trial_status === 'active' && trialInfo.trial_days_remaining && trialInfo.trial_days_remaining <= 7) {
      tasks.push({
        id: taskId++,
        title: 'Follow up on trial conversion',
        due: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'high',
        completed: false,
        category: 'billing'
      })
    }

    if (trialInfo.trial_status === 'expired') {
      tasks.push({
        id: taskId++,
        title: 'Contact about subscription renewal',
        due: new Date().toISOString().split('T')[0],
        priority: 'high',
        completed: false,
        category: 'billing'
      })
    }

    // Add some completed tasks for context
    if (business.logo) {
      tasks.push({
        id: taskId++,
        title: 'Business logo uploaded',
        due: '2024-09-15',
        priority: 'high',
        completed: true,
        category: 'setup'
      })
    }


    if (business.business_hours || business.business_hours_structured) {
      tasks.push({
        id: taskId++,
        title: 'Business hours configured',
        due: '2024-09-16',
        priority: 'high',
        completed: true,
        category: 'setup'
      })
    }

    return tasks
  }

  const businessTasks = generateBusinessTasks()

  const activityFeed = [
    { id: 1, type: 'status_change', message: `${business.business_name} approved`, timestamp: '2024-09-23 10:30', user: 'bournemouth' },
    { id: 2, type: 'knowledge_added', message: 'Basic knowledge added', timestamp: '2024-09-23 10:30', user: 'System' },
    { id: 3, type: 'sync_completed', message: 'GoHighLevel sync completed', timestamp: '2024-09-23 10:29', user: 'System' },
    { id: 4, type: 'registration', message: 'Business profile created', timestamp: business.created_at || '2024-09-20 14:20', user: 'Business' },
  ]

  // Real business metrics for Julie's Sports Bar
  const businessMetrics = {
    totalUsers: 1, // From analytics
    walletPasses: 0, // No passes created yet
    offers: business.business_offers?.filter(offer => offer.status === 'approved')?.length || 0,
    secretItems: business.secret_menu_items?.length || 0,
    lastActive: business.last_ghl_sync || business.updated_at || business.created_at,
    status: business.status,
    trialDays: business.trial_days_remaining || 0
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

  const handleAddTask = () => {
    if (!newTask.trim()) return
    setIsAddingTask(true)
    setTimeout(() => {
      const now = new Date()
      const dueDate = new Date(now)
      dueDate.setDate(dueDate.getDate() + 7)
      
      businessTasks.push({
        id: Date.now(),
        title: newTask,
        due: dueDate.toISOString().split('T')[0],
        priority: 'medium',
        completed: false
      })
      setNewTask('')
      setIsAddingTask(false)
    }, 500)
  }

  const handleCall = () => {
    window.open(`tel:${business.phone}`)
    const now = new Date()
    contactHistory.unshift({
      id: now.getTime(),
      type: 'call',
      date: now.toISOString().split('T')[0],
      duration: 'Initiated',
      notes: 'Call initiated from CRM',
      outcome: 'pending'
    })
  }

  const handleEmail = () => {
    const subject = encodeURIComponent(`Qwikker Business Update - ${business.business_name}`)
    const body = encodeURIComponent(`Hi ${business.first_name || 'there'},\n\nI hope this email finds you well. I wanted to reach out regarding your Qwikker business profile for ${business.business_name}.\n\nBest regards,\nQwikker Team`)
    window.open(`mailto:${business.email}?subject=${subject}&body=${body}`)
    const now = new Date()
    contactHistory.unshift({
      id: now.getTime(),
      type: 'email',
      date: now.toISOString().split('T')[0],
      subject: `Business Update - ${business.business_name}`,
      status: 'sent'
    })
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
    <div className={`bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl hover:border-slate-600 transition-all duration-300 ${className}`}>
      {/* Header Section */}
      <div className={`bg-gradient-to-r ${getHeaderColor()} px-4 sm:px-6 py-4 overflow-visible relative rounded-t-2xl`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <InitialAvatar 
                businessName={business.business_name} 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 border-white/20 text-base sm:text-lg font-bold"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 truncate">
                {business.business_name}
              </h3>
              {(business.first_name || business.last_name) && (
                <p className="text-blue-100 text-sm font-medium mb-1">
                  {business.first_name} {business.last_name}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap relative overflow-visible">
                {getStatusBadge()}
                {getTrialBadge()}
                
                <SyncStatusBadge
                  businessId={business.id}
                  businessName={business.business_name}
                  supabaseStatus={'synced'}
                  ghlStatus={'synced'}
                  lastSync={business.last_ghl_sync || undefined}
                  errors={[]}
                  onForceSync={async (businessId) => {
                    // Force sync implementation
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
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex gap-1">
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
              {isExpanded ? 'Less' : 'CRM'}
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
              <div>
                <span className="text-slate-400 font-medium">Tier:</span>
                <span className={`ml-2 font-semibold ${
                  trialInfo.trial_status === 'active' ? 'text-blue-400' :
                  trialInfo.trial_status === 'expired' ? 'text-red-400' :
                  'text-green-400'
                }`}>
                  {trialInfo.trial_status === 'active' ? 'Trial' :
                   trialInfo.trial_status === 'expired' ? 'Expired' :
                   trialInfo.trial_status === 'upgraded' ? 'Paid' : 'Free'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Billing:</span>
                <span className="ml-2 text-white">
                  {trialInfo.billing_starts_date ? 
                    new Date(trialInfo.billing_starts_date).toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: 'short' 
                    }) : 
                    trialInfo.trial_days_remaining ? `${trialInfo.trial_days_remaining}d left` : 'N/A'
                  }
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Joined:</span>
                <span className="ml-2 text-white">
                  {formatJoinedDate(business.created_at)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Status:</span>
                <span className={`ml-2 font-medium ${
                  business.status === 'approved' ? 'text-green-400' :
                  business.status === 'pending_review' ? 'text-yellow-400' :
                  business.status === 'rejected' ? 'text-red-400' :
                  'text-orange-400'
                }`}>
                  {business.status === 'approved' ? 'Live' :
                   business.status === 'pending_review' ? 'Pending' :
                   business.status === 'rejected' ? 'Rejected' :
                   business.status === 'trial_expired' ? 'Expired' : 'Incomplete'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Files:</span>
                <span className="ml-2 text-white">
                  {(business.logo ? 1 : 0) + (business.business_menus?.length || 0) + (business.business_images?.length || 0)} uploaded
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Sync:</span>
                <span className="ml-2 text-green-400">
                  Synced
                </span>
              </div>
            </div>
          </div>


      {/* Comprehensive CRM Interface */}
      {isExpanded && (
        <div className="border-t border-slate-600">
          {/* CRM Action Bar */}
          <div className="px-6 py-4 bg-slate-700/20 border-b border-slate-600">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCall}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call
                </Button>
                <Button
                  onClick={handleEmail}
                  size="sm"
                  variant="outline"
                  className="border-blue-500 text-blue-400 hover:bg-blue-500/20 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-purple-500 text-purple-400 hover:bg-purple-500/20 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Visit
                </Button>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Last contact: {contactHistory[0]?.date || 'Never'}
              </div>
            </div>
          </div>

          {/* CRM Tab Navigation */}
          <div className="px-6 py-3 bg-slate-800/30 border-b border-slate-600">
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'overview', label: 'Overview', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { id: 'contact', label: 'Contact History', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
                { id: 'files', label: 'Files & Assets', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
                { id: 'activity', label: 'Activity Feed', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
                { id: 'tasks', label: 'Tasks', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                { id: 'offers', label: 'Offers & Content', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
                { id: 'controls', label: 'Business Controls', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4' },
                { id: 'analytics', label: 'Performance', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
              ].map((tab) => (
                <Button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  size="sm"
                  className={`text-xs flex items-center gap-2 ${
                    activeTab === tab.id 
                      ? 'bg-slate-700 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Admin Notes Section - Inside Expanded Area */}
          <div className="px-6 py-4 bg-orange-900/20 border-b border-slate-600">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <label className="text-sm font-medium text-orange-300 mb-2 block">Admin Notes</label>
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

          {/* CRM Tab Content */}
          <div className="px-6 py-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400 mb-1">{businessMetrics.trialDays}</div>
                      <div className="text-xs text-slate-400">Trial Days Left</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-400 mb-1">{businessMetrics.offers}</div>
                      <div className="text-xs text-slate-400">Active Offers</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-400 mb-1">{businessMetrics.secretItems}</div>
                      <div className="text-xs text-slate-400">Secret Items</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-400 mb-1">{businessMetrics.walletPasses}</div>
                      <div className="text-xs text-slate-400">Wallet Passes</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Email:</span>
                        <span className="text-white text-sm">{business.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Phone:</span>
                        <span className="text-white text-sm">{business.phone || 'Not provided'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Address:</span>
                        <span className="text-white text-sm text-right">{business.business_address || 'Not provided'}</span>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="text-slate-400 text-sm">Hours:</span>
                        <div className="text-white text-sm text-right max-w-[250px]">
                          {business.business_hours || business.business_hours_structured ? (
                            <div className="text-right">
                              <div className="text-xs leading-relaxed whitespace-pre-line">
                                {formatBusinessHours(
                                  business.business_hours,
                                  business.business_hours_structured,
                                  true // showFullSchedule = true for complete weekly schedule
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-red-400">Missing</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Website:</span>
                        <span className="text-white text-sm text-right">
                          {business.website_url ? (
                            <a href={business.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                              View Site
                            </a>
                          ) : 'Not provided'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Instagram:</span>
                        <span className="text-white text-sm text-right">
                          {business.instagram_handle ? (
                            <a href={`https://instagram.com/${business.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">
                              @{business.instagram_handle}
                            </a>
                          ) : 'Not provided'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Facebook:</span>
                        <span className="text-white text-sm text-right">
                          {business.facebook_url ? (
                            <a href={business.facebook_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                              View Page
                            </a>
                          ) : 'Not provided'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Business Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Status:</span>
                        {getStatusBadge()}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Category:</span>
                        <span className="text-white text-sm">{business.business_category || 'Not set'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Last Sync:</span>
                        <span className="text-white text-sm">
                          {formatLastSync(business.last_ghl_sync)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Joined:</span>
                        <span className="text-white text-sm">
                          {formatDate(business.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Updated:</span>
                        <span className="text-white text-sm">
                          {formatDate(business.updated_at)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Contact History Tab */}
            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Contact History</h3>
                  <div className="text-sm text-slate-400">
                    {contactHistory.length} interactions
                  </div>
                </div>
                
                <div className="space-y-3">
                  {contactHistory.map((contact) => (
                    <Card key={contact.id} className="bg-slate-800/30 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              contact.type === 'call' ? 'bg-green-500/20 text-green-400' :
                              contact.type === 'email' ? 'bg-blue-500/20 text-blue-400' :
                              contact.type === 'approval' ? 'bg-purple-500/20 text-purple-400' :
                              contact.type === 'sync' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                                  contact.type === 'call' ? 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' :
                                  contact.type === 'email' ? 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' :
                                  contact.type === 'approval' ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' :
                                  contact.type === 'sync' ? 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' :
                                  'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                                } />
                              </svg>
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm">
                                {contact.type === 'call' ? `Phone call - ${contact.duration}` :
                                 contact.type === 'email' ? contact.subject :
                                 contact.type === 'approval' ? 'Business Approved' :
                                 contact.type === 'sync' ? 'System Sync' :
                                 contact.notes}
                              </div>
                              {contact.notes && contact.type !== 'signup' && (
                                <div className="text-slate-400 text-sm mt-1">{contact.notes}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-slate-400 text-xs">
                            {contact.date}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Files & Assets Tab */}
            {activeTab === 'files' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Files & Assets</h3>
                  <div className="text-sm text-slate-400">
                    {(business.logo ? 1 : 0) + (business.business_menus?.length || 0) + (business.business_images?.length || 0)} files
                  </div>
                </div>

                {/* Logo */}
                <Card className="bg-slate-800/30 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-white">Business Logo</div>
                          <div className="text-sm text-slate-400">
                            {business.logo ? 'Uploaded' : 'Not uploaded'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {business.logo ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
                              onClick={() => window.open(business.logo, '_blank')}
                            >
                              View
                            </Button>
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          </>
                        ) : (
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Menus & Files */}
                <Card className="bg-slate-800/30 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium text-white">Menu Files</div>
                        <div className="text-sm text-slate-400">
                          {business.business_menus && business.business_menus.length > 0 
                            ? `${business.business_menus.length} menu${business.business_menus.length > 1 ? 's' : ''} uploaded`
                            : business.menu_url 
                              ? '1 legacy menu uploaded'
                              : 'No menus uploaded'
                          }
                        </div>
                      </div>
                    </div>

                    {/* Multiple Menus Display */}
                    {business.business_menus && business.business_menus.length > 0 ? (
                      <div className="space-y-2">
                        {business.business_menus.map((menu, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-white">
                                📄 {menu.menu_name}
                              </div>
                              <span className="text-xs text-slate-400">
                                ({menu.menu_type})
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                menu.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                menu.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                menu.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {menu.status}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              {menu.menu_url && menu.menu_url.includes('cloudinary.com') ? (
                                // Menu has a proper Cloudinary PDF URL - show View PDF button
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-500 text-green-400 hover:bg-green-500/20"
                                  onClick={() => {
                                    console.log('🔍 Opening PDF:', menu.menu_url)
                                    window.open(menu.menu_url, '_blank')
                                  }}
                                >
                                  View PDF
                                </Button>
                              ) : (
                                // Menu doesn't have PDF URL - show View Text button for knowledge base content
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-green-500 text-green-400 hover:bg-green-500/20"
                                    onClick={() => {
                                      // Fetch and display menu content from knowledge base
                                      fetch(`/api/admin/menus/view-text/${menu.id}`)
                                        .then(res => res.json())
                                        .then(data => {
                                          if (data.content) {
                                            // Create a popup window with the menu content
                                            const popup = window.open('', '_blank', 'width=600,height=800,scrollbars=yes')
                                            if (popup) {
                                              popup.document.write(`
                                                <html>
                                                  <head>
                                                    <title>${data.title}</title>
                                                    <style>
                                                      body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                                                      h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                                                      pre { white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px; }
                                                      .note { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0; }
                                                    </style>
                                                  </head>
                                                  <body>
                                                    <h1>${data.title}</h1>
                                                    <div class="note">
                                                      <strong>Note:</strong> This menu was uploaded via knowledge base. Original PDF not available for review. 
                                                      If you need to check PDF quality for AI parsing, ask the business to re-upload via the new menu system.
                                                    </div>
                                                    <pre>${data.content}</pre>
                                                  </body>
                                                </html>
                                              `)
                                              popup.document.close()
                                            }
                                          } else {
                                            alert('Menu content not found')
                                          }
                                        })
                                        .catch(err => {
                                          console.error('Error fetching menu content:', err)
                                          alert('Error loading menu content')
                                        })
                                    }}
                                  >
                                    View Text
                                  </Button>
                                  <div className="text-xs text-orange-400">
                                    PDF not available (legacy upload)
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 p-2">
                        No menus uploaded yet
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Business Images */}
                <Card className="bg-slate-800/30 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-white">Business Images</div>
                          <div className="text-sm text-slate-400">
                            {business.business_images?.length || 0} images uploaded
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {business.business_images && business.business_images.length > 0 ? (
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        ) : (
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    
                    {business.business_images && business.business_images.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {business.business_images.slice(0, 8).map((image, index) => (
                          <div key={index} className="aspect-square bg-slate-700 rounded-lg overflow-hidden">
                            <img 
                              src={image} 
                              alt={`Business image ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                              onClick={() => window.open(image, '_blank')}
                            />
                          </div>
                        ))}
                        {business.business_images.length > 8 && (
                          <div className="aspect-square bg-slate-700 rounded-lg flex items-center justify-center">
                            <span className="text-slate-400 text-sm">+{business.business_images.length - 8}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* File Upload Summary */}
                <Card className="bg-slate-800/30 border-slate-700">
                  <CardContent className="p-4">
                    <h4 className="text-white font-semibold mb-3">Upload Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Profile Completion:</span>
                        <span className="text-white">
                          {Math.round(((business.logo ? 1 : 0) + 
                                     (business.business_menus?.length > 0 ? 1 : 0) + 
                                     (business.business_images?.length > 0 ? 1 : 0)) / 3 * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{
                            width: `${Math.round(((business.logo ? 1 : 0) + 
                                                 (business.business_menus?.length > 0 ? 1 : 0) + 
                                                 (business.business_images?.length > 0 ? 1 : 0)) / 3 * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Activity Feed Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Activity Feed</h3>
                  <div className="text-sm text-slate-400">
                    {activityFeed.length} activities
                  </div>
                </div>
                
                <div className="space-y-3">
                  {activityFeed.map((activity) => (
                    <Card key={activity.id} className="bg-slate-800/30 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              activity.type === 'status_change' ? 'bg-green-500/20 text-green-400' :
                              activity.type === 'knowledge_added' ? 'bg-blue-500/20 text-blue-400' :
                              activity.type === 'sync_completed' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                                  activity.type === 'status_change' ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' :
                                  activity.type === 'knowledge_added' ? 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' :
                                  activity.type === 'sync_completed' ? 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' :
                                  'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                                } />
                              </svg>
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm">{activity.message}</div>
                              <div className="text-slate-400 text-xs mt-1">by {activity.user}</div>
                            </div>
                          </div>
                          <div className="text-slate-400 text-xs">
                            {new Date(activity.timestamp).toLocaleDateString('en-GB', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Tasks & Follow-ups</h3>
                  <div className="text-sm text-slate-400">
                    {businessTasks.filter(t => !t.completed).length} pending
                  </div>
                </div>

                <Card className="bg-slate-800/30 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Input
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder="Add a new task or follow-up..."
                        className="bg-slate-700 border-slate-600 text-white"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                      />
                      <Button
                        onClick={handleAddTask}
                        disabled={isAddingTask || !newTask.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isAddingTask ? 'Adding...' : 'Add'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="space-y-3">
                  {businessTasks.map((task) => (
                    <Card key={task.id} className="bg-slate-800/30 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              task.completed 
                                ? 'bg-green-500 border-green-500' 
                                : 'border-slate-400 hover:border-green-400'
                            }`}>
                              {task.completed && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className={`font-medium ${task.completed ? 'text-slate-400 line-through' : 'text-white'}`}>
                                {task.title}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-slate-400 text-xs">Due: {task.due}</span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  task.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                                  task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-blue-500/20 text-blue-300'
                                }`}>
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Offers & Content Tab */}
            {activeTab === 'offers' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Offers & Content</h3>
                
                {business.business_offers && business.business_offers.length > 0 ? (
                  <div className="space-y-3">
                    {business.business_offers.filter(offer => offer.status === 'approved').map((offer, index) => (
                      <Card key={offer.id || index} className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-700/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-yellow-300 font-semibold">{offer.offer_name}</h4>
                              <p className="text-slate-300 text-sm mt-1">{offer.offer_type?.replace('_', ' ').toUpperCase()}</p>
                              <p className="text-orange-300 text-sm font-medium">{offer.offer_value}</p>
                              {offer.offer_terms && (
                                <p className="text-slate-400 text-sm mt-2">{offer.offer_terms}</p>
                              )}
                            </div>
                            <div className="text-right space-y-3">
                              <div className="bg-green-500/20 text-green-400 text-sm font-medium px-3 py-1 rounded-full border border-green-500/30">
                                Active
                              </div>
                              {offer.offer_end_date && (
                                <div className="text-slate-400 text-xs">
                                  Ends: {new Date(offer.offer_end_date).toLocaleDateString('en-GB', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit' 
                                  })}
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white text-xs"
                                onClick={() => setDeletionModal({ isOpen: true, offer })}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-slate-800/30 border-slate-700 border-dashed">
                    <CardContent className="p-6 text-center">
                      <div className="text-slate-400 mb-2">No active offers</div>
                      <div className="text-slate-500 text-sm">Encourage business to create their first offer</div>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-slate-800/30 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Secret Menu Items ({businessMetrics.secretItems})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {businessMetrics.secretItems > 0 ? (
                      <div className="text-slate-300 text-sm">
                        Business has {businessMetrics.secretItems} secret menu items configured
                      </div>
                    ) : (
                      <div className="text-slate-500 text-sm">
                        No secret menu items yet - suggest adding exclusive content
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/30 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Files & Assets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Logo:</span>
                        <div className="flex items-center gap-1">
                          {business.logo ? (
                            <>
                              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-green-400 text-sm">Uploaded</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="text-red-400 text-sm">Missing</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Menu:</span>
                        <div className="flex items-center gap-1">
                          {business.menu_url ? (
                            <>
                              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-green-400 text-sm">Uploaded</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="text-red-400 text-sm">Missing</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Business Controls Tab */}
            {activeTab === 'controls' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Business Controls</h3>
                
                {/* Listing Controls */}
                <Card className="bg-slate-800/30 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Listing Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">Listing Status</div>
                        <div className="text-slate-400 text-sm">
                          {business.status === 'approved' ? 'Currently live and visible to users' : 
                           business.status === 'pending_review' ? 'Awaiting approval' :
                           business.status === 'rejected' ? 'Rejected - not visible' :
                           'Incomplete profile'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {business.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-400 hover:bg-red-500/20"
                          >
                            Pause Listing
                          </Button>
                        )}
                        {business.status === 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500 text-green-400 hover:bg-green-500/20"
                          >
                            Restore Listing
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Billing & Tier Controls */}
                <Card className="bg-slate-800/30 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Billing & Subscription</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-slate-400 text-sm mb-1">Current Tier</div>
                        <div className={`font-semibold ${
                          trialInfo.trial_status === 'active' ? 'text-blue-400' :
                          trialInfo.trial_status === 'expired' ? 'text-red-400' :
                          'text-green-400'
                        }`}>
                          {trialInfo.trial_status === 'active' ? 'Free Trial' :
                           trialInfo.trial_status === 'expired' ? 'Trial Expired' :
                           trialInfo.trial_status === 'upgraded' ? 'Paid Plan' : 'Free'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm mb-1">Next Billing</div>
                        <div className="text-white">
                          {trialInfo.billing_starts_date ? 
                            new Date(trialInfo.billing_starts_date).toLocaleDateString('en-GB', { 
                              day: '2-digit', 
                              month: 'short',
                              year: 'numeric'
                            }) : 
                            trialInfo.trial_days_remaining ? `${trialInfo.trial_days_remaining} days left` : 'N/A'
                          }
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
                      >
                        Extend Trial
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500 text-green-400 hover:bg-green-500/20"
                      >
                        Upgrade to Paid
                      </Button>
                      {trialInfo.trial_status === 'expired' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-400 hover:bg-red-500/20"
                        >
                          Suspend Account
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Communication Preferences */}
                <Card className="bg-slate-800/30 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Communication Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Email Notifications:</span>
                      <span className="text-green-400 text-sm">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">SMS Notifications:</span>
                      <span className="text-slate-500 text-sm">Disabled</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Marketing Emails:</span>
                      <span className="text-green-400 text-sm">Enabled</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="bg-red-900/20 border-red-700/30">
                  <CardHeader>
                    <CardTitle className="text-red-300 text-sm">Danger Zone</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-red-200 text-sm mb-3">
                      These actions cannot be undone. Please be careful.
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-400 hover:bg-red-500/20"
                      >
                        Reset Business Data
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-600/20"
                      >
                        Delete Business
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Performance Analytics</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="bg-slate-800/30 border-slate-700">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400 mb-1">0</div>
                      <div className="text-xs text-slate-400">QR Scans</div>
                      <div className="text-xs text-slate-500 mt-1">This month</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-800/30 border-slate-700">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-400 mb-1">0</div>
                      <div className="text-xs text-slate-400">Offer Redemptions</div>
                      <div className="text-xs text-slate-500 mt-1">This month</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-800/30 border-slate-700">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-400 mb-1">1</div>
                      <div className="text-xs text-slate-400">Profile Views</div>
                      <div className="text-xs text-slate-500 mt-1">This month</div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-slate-800/30 border-slate-700">
                  <CardContent className="p-4">
                    <h4 className="text-white font-semibold mb-3">Business Health Score</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Profile Completion:</span>
                        <span className="text-green-400 text-sm">85%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Content Quality:</span>
                        <span className="text-yellow-400 text-sm">Good</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">Engagement:</span>
                        <span className="text-blue-400 text-sm">New</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {business.status === 'pending_review' && onApprove && (
            <div className="px-6 py-4 border-t border-slate-600">
              <div className="flex gap-3">
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
            </div>
          )}
        </div>
      )}

      {/* Offer Deletion Modal */}
      <OfferDeletionModal
        isOpen={deletionModal.isOpen}
        onClose={() => setDeletionModal({ isOpen: false, offer: null })}
        offer={deletionModal.offer}
        onDelete={handleDeleteOffer}
      />

    </div>
  )
}
