'use client'

import { useState } from 'react'
import { ElegantModal } from '@/components/ui/elegant-modal'
import { SocialWizardPage } from './social-wizard-page'

interface SocialWizardPageClientProps {
  profile: any
}

export function SocialWizardPageClient({ profile }: SocialWizardPageClientProps) {
  const [showModal, setShowModal] = useState(true)
  
  // Check if user has Spotlight subscription
  const hasSpotlightAccess = profile?.plan === 'spotlight'

  return (
    <div className="space-y-6">
      {/* Show upgrade modal for non-Spotlight users */}
      {!hasSpotlightAccess && (
        <ElegantModal
          isOpen={showModal}
          onClose={() => {
            window.location.href = '/dashboard'
          }}
          title="Social Wizard"
          description="Create stunning, on-brand social media posts in seconds with AI-powered design."
          type="info"
          size="md"
          actions={[
            {
              label: 'Upgrade to Spotlight',
              onClick: () => {
                window.location.href = '/dashboard/settings'
              },
              variant: 'default',
              className: 'bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold'
            }
          ]}
        >
          <div className="space-y-4">
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <h4 className="font-medium text-purple-400 mb-3">Premium Social Media Tool</h4>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>AI-generated posts for offers, events & updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Professional themes & brand-matched design</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Auto-generated captions & hashtags</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Download perfect 1080x1080 posts instantly</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">
              Exclusive to Spotlight • Save hours on social media content
            </p>
          </div>
        </ElegantModal>
      )}

      {/* Content - blurred for non-Spotlight users */}
      <div className={!hasSpotlightAccess && showModal ? "blur-[8px] select-none pointer-events-none" : ""}>
        <SocialWizardPage profile={profile} />
      </div>
    </div>
  )
}

