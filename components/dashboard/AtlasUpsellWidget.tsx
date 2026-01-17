'use client'

import { Lock, MapPin, Sparkles, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface AtlasUpsellWidgetProps {
  businessId: string
}

/**
 * Atlas Placement Upsell Widget
 * 
 * Shown ONLY to free_tier businesses to sell upgrading to unlock Atlas.
 * Benefits-focused, premium feel, no mention of lat/lng.
 */
export function AtlasUpsellWidget({ businessId }: AtlasUpsellWidgetProps) {
  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-400">
              <MapPin className="w-6 h-6" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Atlas Placement
                <Sparkles className="w-4 h-4 text-purple-400" />
              </h3>
              <p className="text-sm font-medium text-purple-400">
                Premium Feature
              </p>
            </div>
          </div>
          
          {/* Locked badge */}
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/50 flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Locked
          </span>
        </div>
        
        {/* Headline */}
        <div className="mb-4">
          <h4 className="text-base font-semibold text-white mb-2">
            Unlock QWIKKER Atlas
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            Upgrade your plan to get premium map placement, "near me" visibility, and real-time directions — so customers can find you instantly.
          </p>
        </div>
        
        {/* Benefits bullets */}
        <div className="space-y-2 mb-5">
          <div className="flex items-start gap-2.5 text-sm text-slate-300">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
            <span>Placement in QWIKKER Atlas (map discovery)</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-slate-300">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
            <span>Priority visibility in AI recommendations</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-slate-300">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
            <span>Real distance & directions for customers</span>
          </div>
        </div>
        
        {/* Note about verification */}
        <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <p className="text-xs text-slate-400">
            <span className="font-medium text-slate-300">Note:</span> Google verification is required for Atlas placement after upgrading.
          </p>
        </div>
        
        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard/billing"
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Upgrade to unlock Atlas</span>
          </Link>
          
          <Link
            href="/pricing"
            className="px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-600/50"
          >
            <span>See what's included</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
