'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface SyncStatusBadgeProps {
  businessId: string
  businessName: string
  supabaseStatus?: 'synced' | 'pending' | 'failed'
  ghlStatus?: 'synced' | 'pending' | 'failed'
  lastSync?: string
  errors?: string[]
  onForceSync?: (businessId: string) => void
}

export function SyncStatusBadge({
  businessId,
  businessName,
  supabaseStatus = 'synced',
  ghlStatus = 'synced',
  lastSync,
  errors = [],
  onForceSync
}: SyncStatusBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'pending':
        return (
          <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      default:
        return null
    }
  }

  const handleForceSync = async () => {
    if (!onForceSync) return
    
    setIsSyncing(true)
    try {
      await onForceSync(businessId)
    } finally {
      setIsSyncing(false)
    }
  }

  const formatLastSync = (timestamp?: string) => {
    if (!timestamp) return 'Via Workflow'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`
    return date.toLocaleDateString()
  }

  const hasErrors = errors.length > 0
  const hasFailures = supabaseStatus === 'failed' || ghlStatus === 'failed'
  const isPending = supabaseStatus === 'pending' || ghlStatus === 'pending'

  return (
    <div className="relative inline-block">
      {/* Compact Status Badge */}
      <div 
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-colors duration-200 ${
          hasFailures 
            ? 'bg-red-500/20 text-red-400 border-red-500/30' 
            : isPending
            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
            : 'bg-green-500/20 text-green-400 border-green-500/30'
        }`}
        onClick={(e) => {
          e.stopPropagation()
          setIsExpanded(!isExpanded)
        }}
      >
        {/* Status Icons */}
        <div className="flex items-center gap-1">
          <span className="text-xs opacity-75">DB:</span>
          {getStatusIcon(supabaseStatus)}
          <span className="text-xs opacity-75 ml-1">GHL:</span>
          {getStatusIcon(ghlStatus)}
        </div>
        
        {/* Last Sync Time */}
        <span className="opacity-75">
          {formatLastSync(lastSync)}
        </span>
        
        {/* Error Count */}
        {hasErrors && (
          <span className="bg-red-500 text-white text-xs px-1 rounded-full">
            {errors.length}
          </span>
        )}
        
        {/* Expand Icon */}
        <svg 
          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded Details - Portal to prevent overflow issues */}
      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg p-5 shadow-2xl z-[9999] min-w-[320px] max-w-sm">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-white">Sync Status</h4>
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(false)
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Clean Force Sync Button */}
            <div className="mb-4">
              <Button
                onClick={handleForceSync}
                disabled={isSyncing}
                className="w-full text-sm px-4 py-2 bg-[#00d083] hover:bg-[#00b86f] text-white border-0 rounded-lg font-medium transition-all"
              >
                {isSyncing ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Syncing to GHL...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Force Sync to GHL</span>
                  </div>
                )}
              </Button>
            </div>

            {/* System Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Supabase:</span>
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getStatusColor(supabaseStatus)}`}>
                  {getStatusIcon(supabaseStatus)}
                  <span className="capitalize">{supabaseStatus}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">GoHighLevel:</span>
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getStatusColor(ghlStatus)}`}>
                  {getStatusIcon(ghlStatus)}
                  <span className="capitalize">{ghlStatus}</span>
                </div>
              </div>
            </div>

            {/* Last Sync */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Last Sync:</span>
              <span className="text-slate-400">{formatLastSync(lastSync)}</span>
            </div>

            {/* Errors */}
            {hasErrors && (
              <div className="space-y-1">
                <span className="text-sm text-red-400 font-medium">Errors:</span>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-300 bg-red-500/10 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
