'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { getAdminActivity, AdminActivity } from '@/lib/actions/admin-activity-actions'

interface DashboardOverviewProps {
  city: string
  pendingCount: number
  updatesCount: number
  liveCount: number
  incompleteCount: number
  onNavigateToTab: (tab: string) => void
}

export function AdminDashboardOverview({ 
  city, 
  pendingCount, 
  updatesCount, 
  liveCount, 
  incompleteCount,
  onNavigateToTab 
}: DashboardOverviewProps) {
  const [currentTime, setCurrentTime] = useState<string>('')
  const [recentActivity, setRecentActivity] = useState<AdminActivity[]>([])
  const [isLoadingActivity, setIsLoadingActivity] = useState(true)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }))
    }
    
    updateTime()
    const interval = setInterval(updateTime, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])

  const priorityActions = [
    {
      title: 'Pending Reviews',
      count: pendingCount,
      description: 'New business applications awaiting approval',
      action: () => onNavigateToTab('pending'),
      priority: 'high',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Pending Updates',
      count: updatesCount,
      description: 'Business changes requiring review',
      action: () => onNavigateToTab('updates'),
      priority: 'medium',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      title: 'Incomplete Profiles',
      count: incompleteCount,
      description: 'Businesses need to complete setup',
      action: () => onNavigateToTab('incomplete'),
      priority: 'low',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    }
  ]

  const quickActions = [
    {
      title: 'QR Management',
      description: 'Generate & manage QR codes',
      action: () => onNavigateToTab('qr-management'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'City Analytics',
      description: 'View performance metrics',
      action: () => onNavigateToTab('analytics'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'CRM Contacts',
      description: 'Manage business relationships',
      action: () => onNavigateToTab('contacts'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'AI Testing',
      description: 'Test knowledge base accuracy',
      action: () => onNavigateToTab('ai-test'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      color: 'from-orange-500 to-red-500'
    }
  ]

  // Load real activity data
  useEffect(() => {
    async function loadActivity() {
      setIsLoadingActivity(true)
      try {
        const activities = await getAdminActivity(5)
        setRecentActivity(activities)
      } catch (error) {
        console.error('Error loading admin activity:', error)
        setRecentActivity([])
      } finally {
        setIsLoadingActivity(false)
      }
    }
    
    loadActivity()
    
    // Refresh activity every 30 seconds
    const interval = setInterval(loadActivity, 30000)
    return () => clearInterval(interval)
  }, [])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500/50 bg-red-500/5'
      case 'medium': return 'border-yellow-500/50 bg-yellow-500/5'
      case 'low': return 'border-blue-500/50 bg-blue-500/5'
      default: return 'border-slate-500/50 bg-slate-500/5'
    }
  }

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400'
      case 'medium': return 'text-yellow-400'
      case 'low': return 'text-blue-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Welcome back, Admin
            </h1>
            <p className="text-lg text-indigo-300">
              {city} Admin Dashboard
            </p>
            {currentTime && (
              <p className="text-sm text-slate-400 mt-1">
                {currentTime}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-slate-400">Active Businesses</p>
              <p className="text-2xl font-bold text-white">{liveCount}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Actions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          Priority Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {priorityActions.map((action, index) => (
            <Card 
              key={index}
              className={`p-4 sm:p-6 bg-slate-800/50 border cursor-pointer hover:bg-slate-700/50 transition-all duration-200 ${getPriorityColor(action.priority)}`}
              onClick={action.action}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${getPriorityTextColor(action.priority)} bg-current/10`}>
                  {action.icon}
                </div>
                {action.count > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                    {action.count}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-white mb-1">{action.title}</h3>
              <p className="text-sm text-slate-400">{action.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Card 
              key={index}
              className="p-4 sm:p-6 bg-slate-800/50 border border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition-all duration-200 group"
              onClick={action.action}
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                <div className="text-white">
                  {action.icon}
                </div>
              </div>
              <h3 className="font-semibold text-white mb-1">{action.title}</h3>
              <p className="text-sm text-slate-400">{action.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recent Activity
        </h2>
        <Card className="p-4 sm:p-6 bg-slate-800/50 border border-slate-700/50">
          <div className="space-y-4">
            {isLoadingActivity ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-slate-400">
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Loading recent activity...
                </div>
              </div>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => {
                const getIcon = (iconType: string) => {
                  switch (iconType) {
                    case 'plus':
                      return (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )
                    case 'check':
                      return (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )
                    case 'x':
                      return (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )
                    case 'edit':
                      return (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      )
                    case 'clock':
                      return (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )
                    default:
                      return (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )
                  }
                }

                return (
                  <div key={activity.id || index} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-700/30 transition-colors">
                    <div className={`w-8 h-8 ${activity.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <div className="text-white">
                        {getIcon(activity.iconType)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{activity.message}</p>
                      <p className="text-sm text-slate-400">{activity.time}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-slate-400 text-sm">No recent activity</p>
                  <p className="text-slate-500 text-xs mt-1">New business applications and updates will appear here</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
