/**
 * SOCIAL WIZARD SHELL
 * Main layout: 3-column dark mode interface
 */

'use client'

import { useEffect } from 'react'
import { useSocialWizardStore } from '@/lib/social-wizard/store'
import { ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { AiStudioPanel } from './AiStudioPanel'
import { PostEditorPanel } from './PostEditorPanel'
import { RightPanel } from './RightPanel'

interface SocialWizardShellProps {
  businessId: string
  businessName: string
  tier: string
}

export function SocialWizardShell({
  businessId,
  businessName,
  tier
}: SocialWizardShellProps) {
  const setBusinessContext = useSocialWizardStore(state => state.setBusinessContext)

  useEffect(() => {
    setBusinessContext(businessId, businessName, tier)
  }, [businessId, businessName, tier, setBusinessContext])

  return (
    <div className="h-screen bg-neutral-950 text-white flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link
            href="/business/dashboard"
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Exit</span>
          </Link>
          <div className="h-6 w-px bg-neutral-700" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h1 className="text-lg font-bold">Social Wizard</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-400">{businessName}</span>
          <div className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-xs font-medium text-orange-500 uppercase">
            {tier}
          </div>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* Left Panel: AI Studio */}
        <div className="col-span-3 border-r border-neutral-800 overflow-y-auto">
          <AiStudioPanel />
        </div>

        {/* Center Panel: Post Editor */}
        <div className="col-span-6 overflow-y-auto bg-neutral-900/30">
          <PostEditorPanel />
        </div>

        {/* Right Panel: Suggestions + Drafts */}
        <div className="col-span-3 border-l border-neutral-800 overflow-y-auto">
          <RightPanel />
        </div>
      </div>
    </div>
  )
}
