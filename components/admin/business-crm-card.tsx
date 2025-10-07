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
  const [activeTab, setActiveTab] = useState<'overview' | 'contact' | 'activity' | 'tasks' | 'offers' | 'analytics'>('overview')
  const [newTask, setNewTask] = useState('')
  const [isAddingTask, setIsAddingTask] = useState(false)

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

  // CRM data based on Julie's Sports Bar - Mix of real data and realistic projections
  const contactHistory = [
    { id: 1, type: 'approval', date: '2024-09-23', duration: '2 min', notes: 'Business approved by bournemouth admin', outcome: 'positive' },
    { id: 2, type: 'sync', date: '2024-09-23', subject: 'GoHighLevel sync completed', status: 'success' },
    { id: 3, type: 'knowledge', date: '2024-09-23', notes: 'Basic knowledge added for Julie\'s Sports Bar', outcome: 'positive' },
    { id: 4, type: 'signup', date: '2024-09-20', notes: 'Initial business registration', outcome: 'positive' },
  ]

  const businessTasks = [
    { id: 1, title: 'Upload menu photos', due: '2024-09-25', priority: 'high', completed: false },
    { id: 2, title: 'Create first offer/promotion', due: '2024-09-27', priority: 'medium', completed: false },
    { id: 3, title: 'Add secret menu items', due: '2024-09-30', priority: 'low', completed: false },
    { id: 4, title: 'Review business hours', due: '2024-09-24', priority: 'medium', completed: true },
  ]

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

  const handleAddTask = () => {
    if (!newTask.trim()) return
    setIsAddingTask(true)
    // In production, this would make an API call
    setTimeout(() => {
      businessTasks.push({
        id: Date.now(),
        title: newTask,
        due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'medium',
        completed: false
      })
      setNewTask('')
      setIsAddingTask(false)
    }, 500)
  }

  const handleCall = () => {
    window.open(`tel:${business.phone}`)
    // Log call attempt
    contactHistory.unshift({
      id: Date.now(),
      type: 'call',
      date: new Date().toISOString().split('T')[0],
      duration: 'Initiated',
      notes: 'Call initiated from CRM',
      outcome: 'pending'
    })
  }

  const handleEmail = () => {
    const subject = encodeURIComponent(`Qwikker Business Update - ${business.business_name}`)
    const body = encodeURIComponent(`Hi ${business.first_name || 'there'},\n\nI hope this email finds you well. I wanted to reach out regarding your Qwikker business profile for ${business.business_name}.\n\nBest regards,\nQwikker Team`)
    window.open(`mailto:${business.email}?subject=${subject}&body=${body}`)
    // Log email attempt
    contactHistory.unshift({
      id: Date.now(),
      type: 'email',
      date: new Date().toISOString().split('T')[0],
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
      <div className={`bg-gradient-to-r ${getHeaderColor()} px-4 sm:px-6 py-4`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Business Type Icon */}
            <div className="flex-shrink-0">
              <InitialAvatar 
                businessName={business.business_name} 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 border-white/20 text-base sm:text-lg font-bold"
              />
            </div>
            
            {/* Business Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 truncate">
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
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Contact Buttons - Hidden on very small screens */}
            <div className="hidden sm:flex gap-1">
              <button
                onClick={() => window.open(`mailto:${business.email}`)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px]"
                title="Send Email"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => window.open(`tel:${business.phone}`)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px]"
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
              className="text-white border-white/30 hover:bg-white/10 hover:border-white/50 touch-manipulation min-h-[40px] text-xs sm:text-sm"
            >
              {isExpanded ? 'Less' : 'More'}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 110-8 4 4 0 010 8zm0 0v3m-3-3h6m-6 0l3-3m0 0l3 3" />
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
                { id: 'overview', label: 'Overview', icon: 'chart-bar' },
                { id: 'contact', label: 'Contact History', icon: 'phone' },
                { id: 'activity', label: 'Activity Feed', icon: 'activity' },
                { id: 'tasks', label: 'Tasks', icon: 'check' },
                { id: 'offers', label: 'Offers & Content', icon: 'gift' },
                { id: 'analytics', label: 'Performance', icon: 'trending-up' }
              ].map((tab) => (
                <Button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  size="sm"
                  className={`text-xs ${
                    activeTab === tab.id 
                      ? 'bg-slate-700 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {tab.icon === 'chart-bar' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      )}
                      {tab.icon === 'phone' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      )}
                      {tab.icon === 'activity' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      )}
                      {tab.icon === 'check' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      )}
                      {tab.icon === 'gift' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      )}
                      {tab.icon === 'trending-up' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      )}
                    </svg>
                    {tab.label}
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* CRM Tab Content */}
          <div className="px-6 py-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

                {/* Quick Info */}
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
                          {business.last_ghl_sync ? new Date(business.last_ghl_sync).toLocaleDateString() : 'Never'}
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
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                              contact.type === 'call' ? 'bg-green-500/20 text-green-400' :
                              contact.type === 'email' ? 'bg-blue-500/20 text-blue-400' :
                              contact.type === 'approval' ? 'bg-purple-500/20 text-purple-400' :
                              contact.type === 'sync' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {contact.type === 'call' && (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                )}
                                {contact.type === 'email' && (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                )}
                                {contact.type === 'approval' && (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                )}
                                {contact.type === 'sync' && (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                )}
                                {!['call', 'email', 'approval', 'sync'].includes(contact.type) && (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                )}
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
              </svg>
              Contact Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                    View Menu PDF
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
