'use client'

import { useState } from 'react'

interface Business {
  id: string
  business_name: string
  status: string
}

interface AdminDashboardProps {
  businesses: Business[]
  crmData: any[]
  adminEmail: string
  city: string
  cityDisplayName: string
  pendingChangesCount: number
  pendingChanges: any[]
}

export function AdminDashboard({ 
  businesses, 
  adminEmail, 
  cityDisplayName 
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'live' | 'incomplete'>('pending')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🛠️ Admin Dashboard - {cityDisplayName}
          </h1>
          <p className="text-slate-400">
            Welcome back, {adminEmail}
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'pending'
                ? 'bg-[#00d083] text-black'
                : 'bg-slate-700 text-white'
            }`}
          >
            Pending ({businesses.filter(b => b.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'live'
                ? 'bg-[#00d083] text-black'
                : 'bg-slate-700 text-white'
            }`}
          >
            Live ({businesses.filter(b => b.status === 'approved').length})
          </button>
          <button
            onClick={() => setActiveTab('incomplete')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'incomplete'
                ? 'bg-[#00d083] text-black'
                : 'bg-slate-700 text-white'
            }`}
          >
            Incomplete ({businesses.filter(b => b.status === 'incomplete').length})
          </button>
        </div>

        <div className="bg-slate-800 rounded-xl p-6">
          {activeTab === 'pending' && (
            <div>
              <h2 className="text-white text-xl mb-4">Pending Reviews</h2>
              <div className="space-y-4">
                {businesses
                  .filter(b => b.status === 'pending')
                  .map(business => (
                    <div key={business.id} className="bg-slate-700 p-4 rounded-lg">
                      <h3 className="text-white font-semibold">{business.business_name}</h3>
                      <p className="text-slate-400">Status: {business.status}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'live' && (
            <div>
              <h2 className="text-white text-xl mb-4">Live Listings</h2>
              <div className="space-y-4">
                {businesses
                  .filter(b => b.status === 'approved')
                  .map(business => (
                    <div key={business.id} className="bg-slate-700 p-4 rounded-lg">
                      <h3 className="text-white font-semibold">{business.business_name}</h3>
                      <p className="text-slate-400">Status: {business.status}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
