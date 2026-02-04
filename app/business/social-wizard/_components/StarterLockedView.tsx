/**
 * STARTER LOCKED VIEW
 * Shown to Starter tier users
 */

'use client'

import { Sparkles, TrendingUp, Zap, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface StarterLockedViewProps {
  businessName: string
}

export function StarterLockedView({ businessName }: StarterLockedViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white">
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6 text-emerald-500">
            <Sparkles className="w-8 h-8" />
            <h1 className="text-4xl font-bold">Social Wizard</h1>
          </div>
          <p className="text-xl text-neutral-400">
            AI-powered social content creation for {businessName}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-8">
            <Zap className="w-12 h-12 text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold mb-3">AI Generation</h3>
            <p className="text-neutral-400">
              Generate premium social posts from your offers, events, and menu highlights with a single click.
            </p>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-8">
            <TrendingUp className="w-12 h-12 text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold mb-3">Smart Templates</h3>
            <p className="text-neutral-400">
              Beautiful visual templates that adapt to your content. Export ready-to-post images with your branding.
            </p>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-8">
            <Sparkles className="w-12 h-12 text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold mb-3">Campaign Packs</h3>
            <p className="text-neutral-400 mb-2">
              Generate 5-post campaign series instantly. Perfect for promotions.
            </p>
            <span className="text-xs text-orange-400 font-medium">Spotlight only</span>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-600/10 border border-emerald-500/20 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Unlock Social Wizard
          </h2>
          <p className="text-neutral-300 mb-8 max-w-2xl mx-auto">
            Upgrade to Featured or Spotlight tier to access AI-powered social content creation, 
            premium templates, and campaign generation.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/business/settings/subscription"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20"
            >
              View Upgrade Options
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/business/dashboard"
              className="inline-flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-8 py-4 rounded-lg font-medium transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
