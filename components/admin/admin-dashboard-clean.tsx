'use client'

import { useState } from 'react'
import Image from 'next/image'
import { LogoutButton } from '@/components/logout-button'
import { BusinessTypeIcon } from '@/lib/utils/business-icons'

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
  offer_name: string
  offer_type: string
  offer_value: string
  status: string
  created_at: string
  updated_at: string
}

interface AdminDashboardProps {
  businesses: Business[]
  adminEmail: string
}

export function AdminDashboard({ businesses, adminEmail }: AdminDashboardProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [businessList, setBusinessList] = useState(businesses)
  const [activeTab, setActiveTab] = useState<'pending' | 'live' | 'changes'>('pending')
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      
      // Update the business list
      setBusinessList(prev => 
        prev.map(business => 
          business.id === businessId 
            ? { ...business, status: action === 'approve' ? 'approved' : 'rejected' }
            : business
        )
      )
      
      // Remove from pending list after a short delay to show the status change
      setTimeout(() => {
        setBusinessList(prev => prev.filter(business => business.id !== businessId))
      }, 1500)
      
    } catch (error) {
      console.error('Error updating business:', error)
      alert('Failed to update business status')
    } finally {
      setIsLoading(null)
    }
  }

  // Filter businesses by status
  const pendingBusinesses = businessList.filter(b => b.status === 'pending_review' || b.status === 'incomplete')
  const liveBusinesses = businessList.filter(b => b.status === 'approved')
  const changesAwaitingApproval = [] // TODO: Implement changes tracking

  const adminNavItems = [
    { 
      id: 'pending', 
      title: 'Pending Reviews', 
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      count: pendingBusinesses.length
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
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
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
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderBusinessCard = (business: Business, showActions: boolean) => (
    <div key={business.id} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl overflow-hidden hover:border-slate-600 transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <BusinessTypeIcon 
              businessType={business.business_type} 
              className="w-16 h-16 p-3 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-2 border-indigo-400/30 text-indigo-300 flex items-center justify-center"
            />
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                {business.business_name || 'Unnamed Business'}
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

  return (
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
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-scroll overflow-x-hidden scrollbar-hidden p-4 space-y-2">
          {adminNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as 'pending' | 'live' | 'changes')}
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
              {activeTab === 'live' && 'Live Listings'}
              {activeTab === 'changes' && 'Content Changes'}
            </h1>
            <p className="text-gray-400">
              {activeTab === 'pending' && 'Review and approve new business applications'}
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
  )
}
