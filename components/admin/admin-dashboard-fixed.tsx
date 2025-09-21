'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { AdminLogoutButton } from '@/components/admin-logout-button'
import AdminInspectionModal from './admin-inspection-modal'
import { BusinessCRMCard } from './business-crm-card'
import { BusinessCRMData } from '@/types/billing'
import { useElegantModal } from '@/components/ui/elegant-modal'
import { AdminAnalytics } from './admin-analytics'
import { ContactsTab } from './contacts-tab'
import { SyncHealthOverview } from './sync-health-overview'
import { ComprehensiveQRManagement } from './comprehensive-qr-management'
import { InitialAvatar } from '@/components/admin/initial-avatar'

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
  businesses: Business[]
  crmData: BusinessCRMData[]
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
  const [activeTab, setActiveTab] = useState<'pending' | 'updates' | 'live' | 'incomplete' | 'rejected' | 'knowledge' | 'analytics' | 'contacts' | 'ai-test' | 'qr-codes'>(() => {
    const urlTab = searchParams.get('tab')
    const validTabs = ['pending', 'updates', 'live', 'incomplete', 'rejected', 'knowledge', 'analytics', 'contacts', 'ai-test', 'qr-codes']
    return validTabs.includes(urlTab || '') ? (urlTab as any) : 'pending'
  })
  const [businessList, setBusinessList] = useState<Business[]>(businesses)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { showSuccess, showError, showConfirm, ModalComponent } = useElegantModal()
  
  // Filter businesses by status
  const pendingBusinesses = businessList.filter(b => b.status === 'pending')
  const liveBusinesses = businessList.filter(b => b.status === 'approved')
  const incompleteBusinesses = businessList.filter(b => b.status === 'incomplete')
  const rejectedBusinesses = businessList.filter(b => b.status === 'rejected')

  // Admin navigation items
  const adminNavItems = [
    {
      id: 'pending',
      label: 'Pending Reviews',
      icon: '⏳',
      count: pendingBusinesses.length,
      color: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30'
    },
    {
      id: 'updates',
      label: 'Pending Updates',
      icon: '🔄',
      count: pendingChangesCount || 0,
      color: 'bg-orange-600/20 text-orange-300 border-orange-500/30'
    },
    {
      id: 'live',
      label: 'Live Listings',
      icon: '✅',
      count: liveBusinesses.length,
      color: 'bg-green-600/20 text-green-300 border-green-500/30'
    },
    {
      id: 'incomplete',
      label: 'Incomplete',
      icon: '⚠️',
      count: incompleteBusinesses.length,
      color: 'bg-gray-600/20 text-gray-300 border-gray-500/30'
    },
    {
      id: 'rejected',
      label: 'Rejected',
      icon: '❌',
      count: rejectedBusinesses.length,
      color: 'bg-red-600/20 text-red-300 border-red-500/30'
    },
    {
      id: 'knowledge',
      label: 'Knowledge Base',
      icon: '🧠',
      count: 0,
      color: 'bg-purple-600/20 text-purple-300 border-purple-500/30'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: '📊',
      count: 0,
      color: 'bg-blue-600/20 text-blue-300 border-blue-500/30'
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: '👥',
      count: businessList.length,
      color: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
    },
    {
      id: 'ai-test',
      label: 'AI Chat Test',
      icon: '🤖',
      count: 0,
      color: 'bg-cyan-600/20 text-cyan-300 border-cyan-500/30'
    },
    {
      id: 'qr-codes',
      label: 'QR Codes',
      icon: '📱',
      count: 0,
      color: 'bg-pink-600/20 text-pink-300 border-pink-500/30'
    }
  ]

  const handleApproval = async (businessId: string, action: 'approve' | 'reject') => {
    setIsLoading(businessId)
    
    try {
      const response = await fetch('/api/admin/approve-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessId, action, city }),
      })

      const result = await response.json()
      
      if (result.success) {
        // Update the business list
        setBusinessList(prev => prev.map(business => 
          business.id === businessId 
            ? { ...business, status: action === 'approve' ? 'approved' : 'rejected' }
            : business
        ))
        
        showSuccess(`Business ${action === 'approve' ? 'approved' : 'rejected'} successfully!`)
      } else {
        showError(result.error || `Failed to ${action} business`)
      }
    } catch (error) {
      console.error(`Error ${action}ing business:`, error)
      showError(`Failed to ${action} business. Please try again.`)
    } finally {
      setIsLoading(null)
    }
  }

  const renderBusinessCard = (business: Business) => (
    <div key={business.id} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl overflow-hidden hover:border-slate-600 transition-all duration-300">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <InitialAvatar name={business.business_name} size="md" />
            <div>
              <h3 className="text-white font-bold text-lg">{business.business_name}</h3>
              <p className="text-slate-400 text-sm">{business.business_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-yellow-600/20 text-yellow-300 text-xs font-semibold rounded-full border border-yellow-500/30">
              PENDING
            </span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="text-sm text-slate-300 mb-4">
          <p><strong>Owner:</strong> {business.first_name} {business.last_name}</p>
          <p><strong>Email:</strong> {business.email}</p>
          {business.phone && <p><strong>Phone:</strong> {business.phone}</p>}
          <p><strong>Address:</strong> {business.business_address}, {business.business_town}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => handleApproval(business.id, 'approve')}
            disabled={isLoading === business.id}
            className="flex-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-[#00d083]/20 hover:shadow-[#00d083]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                Approve
              </>
            )}
          </button>
          
          <button
            onClick={() => handleApproval(business.id, 'reject')}
            disabled={isLoading === business.id}
            className="flex-1 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-slate-600/20 hover:shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-500 hover:border-red-500 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 transform transition-transform duration-300 ease-in-out z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">Admin Dashboard</h1>
                <p className="text-slate-400 text-sm">{cityDisplayName}</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm">Welcome back, {adminEmail}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {adminNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any)
                  setSidebarOpen(false)
                  router.push(`/admin?tab=${item.id}`)
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-[#00d083]/20 text-[#00d083] border border-[#00d083]/30 shadow-lg shadow-[#00d083]/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.count > 0 && (
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    activeTab === item.id ? 'bg-[#00d083] text-black' : item.color
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800">
            <AdminLogoutButton />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-72">
        {/* Mobile Header */}
        <div className="lg:hidden bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-white font-bold">Admin Dashboard</h1>
            <div className="w-10"></div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {/* Header */}
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
              {activeTab === 'ai-test' && 'AI Chat Testing'}
              {activeTab === 'qr-codes' && 'QR Code Management'}
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
              {activeTab === 'ai-test' && 'Test AI chat responses for accuracy, context awareness, and business filtering'}
              {activeTab === 'qr-codes' && `Manage dynamic QR code assignments and deep linking for ${cityDisplayName}`}
            </p>
          </div>

          {/* Sync Health Overview - Only show on contacts tab */}
          {activeTab === 'contacts' && (
            <div className="mb-6">
              <SyncHealthOverview />
            </div>
          )}

          {/* Content */}
          <div className="space-y-6">
            {/* Pending Tab */}
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
                  pendingBusinesses.map((business) => renderBusinessCard(business))
                )}
              </div>
            )}

            {/* Live Tab */}
            {activeTab === 'live' && (
              <div className="grid gap-6">
                {liveBusinesses.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No live businesses</h3>
                    <p className="text-slate-400">No businesses are currently live on the platform.</p>
                  </div>
                ) : (
                  liveBusinesses.map((business) => (
                    <BusinessCRMCard
                      key={business.id}
                      business={crmData.find(crm => crm.id === business.id) || {
                        id: business.id,
                        business_name: business.business_name,
                        first_name: business.first_name,
                        last_name: business.last_name,
                        email: business.email,
                        phone: business.phone,
                        business_address: business.business_address,
                        business_postcode: business.business_postcode,
                        business_type: business.business_type,
                        status: business.status,
                        created_at: business.created_at,
                        business_tier: 'free_trial',
                        trial_start_date: business.created_at,
                        trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        billing_date: null,
                        billing_type: null,
                        payment_history: [],
                        plan_upgrades: [],
                        lifetime_discount: false,
                        logo: business.logo,
                        menu_pdf: business.menu_url,
                        ghl_sync_status: 'never_synced',
                        last_ghl_sync: null,
                        ghl_contact_id: null,
                        admin_notes: '',
                        business_town: business.business_town
                      }}
                      onApprove={() => {}}
                      onInspect={() => {}}
                    />
                  ))
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <AdminAnalytics city={city} />
            )}

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <ContactsTab city={city} cityDisplayName={cityDisplayName} />
            )}

            {/* AI Chat Tab */}
            {activeTab === 'ai-test' && (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-white mb-2">
                    🤖 AI Chat Console
                  </h2>
                  <p className="text-slate-400">
                    AI chat integration coming soon for {cityDisplayName}.
                  </p>
                </div>
                
                {/* Placeholder */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🤖</div>
                    <h3 className="text-white text-xl mb-4">AI Chat Coming Soon</h3>
                    <p className="text-slate-400 text-sm">
                      We're working on integrating the AI chat for admin testing.
                    </p>
                  </div>
                </div>
                
                {/* Footer Info */}
                <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
                  <span>Integration in progress</span>
                  <span>Admin Testing Mode</span>
                </div>
              </div>
            )}

            {/* QR Code Management Tab */}
            {activeTab === 'qr-codes' && (
              <ComprehensiveQRManagement city={city} cityDisplayName={cityDisplayName} />
            )}

            {/* Knowledge Base Tab */}
            {activeTab === 'knowledge' && (
              <div className="space-y-6">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🧠</div>
                  <h3 className="text-white text-xl mb-4">Knowledge Base Coming Soon</h3>
                  <p className="text-slate-400 text-sm">
                    AI knowledge base management for businesses and city information.
                  </p>
                </div>
              </div>
            )}

            {/* Updates Tab */}
            {activeTab === 'updates' && (
              <div className="space-y-6">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔄</div>
                  <h3 className="text-white text-xl mb-4">Pending Updates Coming Soon</h3>
                  <p className="text-slate-400 text-sm">
                    Changes from approved businesses awaiting your review.
                  </p>
                </div>
              </div>
            )}

            {/* Incomplete Tab */}
            {activeTab === 'incomplete' && (
              <div className="space-y-6">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⚠️</div>
                  <h3 className="text-white text-xl mb-4">Incomplete Listings Coming Soon</h3>
                  <p className="text-slate-400 text-sm">
                    Businesses that need to complete their profiles.
                  </p>
                </div>
              </div>
            )}

            {/* Rejected Tab */}
            {activeTab === 'rejected' && (
              <div className="space-y-6">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">❌</div>
                  <h3 className="text-white text-xl mb-4">Rejected Applications Coming Soon</h3>
                  <p className="text-slate-400 text-sm">
                    Previously rejected business applications.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal System */}
      <ModalComponent />
    </div>
  )
}
