'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ElegantModal } from '@/components/ui/elegant-modal'

interface LoyaltyPageClientProps {
  profile: any
}

export function LoyaltyPageClient({ profile }: LoyaltyPageClientProps) {
  const [showModal, setShowModal] = useState(true)
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)
  
  // Check if feature is enabled (either through tier or manual override)
  const hasAccess = profile?.features?.loyalty_cards === true || profile?.plan === 'spotlight' || profile?.plan === 'pro'

  const features = [
    {
      id: 'custom-cards',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
      title: 'Custom Loyalty Cards',
      description: 'Design stunning digital loyalty cards that match your brand perfectly',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'landing-pages',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: 'AI Landing Page Builder',
      description: 'Create beautiful landing pages with AI assistance in minutes',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'built-in-pos',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Built-in POS System',
      description: 'Manage loyalty programs without external software - everything in one place',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'fully-customizable',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      title: '100% Customizable',
      description: 'Colors, fonts, layouts - make it yours with complete design freedom',
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 'multi-use',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      title: 'Multi-Purpose',
      description: 'Perfect for loyalty programs, events, birthday clubs, VIP memberships and more',
      color: 'from-yellow-500 to-amber-500'
    },
    {
      id: 'qr-integration',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      title: 'Integrated QR Codes',
      description: 'Seamlessly works with your existing QR code system for easy redemption',
      color: 'from-indigo-500 to-purple-500'
    }
  ]

  const handleLaunchPortal = () => {
    // TODO: Replace with actual loyalty portal URL
    window.open('https://loyalty.qwikker.com', '_blank')
  }

  return (
    <div className="space-y-8">
      {/* Show upgrade modal for users without access */}
      {!hasAccess && (
        <ElegantModal
          isOpen={showModal}
          onClose={() => {
            window.location.href = '/dashboard'
          }}
          title="Loyalty Program"
          description="Create a digital loyalty program to build repeat customers and increase revenue."
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
              <h4 className="font-medium text-purple-400 mb-3">Build Customer Loyalty</h4>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Custom loyalty cards & landing pages</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Built-in POS system - no external software needed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>AI-assisted design tools</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>100% customizable for your brand</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">
              Available on Spotlight • Perfect for events, loyalty, birthdays & more
            </p>
          </div>
        </ElegantModal>
      )}

      {/* Header Section */}
      <div className={!hasAccess && showModal ? "blur-[8px] select-none pointer-events-none" : ""}>
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Loyalty Portal
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-10">
            Access the Qwikker Loyalty System to create custom loyalty programs, design branded cards, and manage rewards with our built-in POS.
          </p>
          
          {/* Launch Button */}
          <Button
            onClick={handleLaunchPortal}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-12 py-6 text-lg font-semibold rounded-xl shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transition-all duration-300 hover:scale-105"
          >
            Launch Loyalty Portal
          </Button>
          <p className="text-sm text-slate-400 mt-4">
            Opens in new tab • Seamlessly integrated with your Qwikker account
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature) => (
            <Card 
              key={feature.id}
              className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all duration-300 hover:scale-105 cursor-pointer group"
              onClick={() => setSelectedFeature(feature.id)}
            >
              <CardHeader className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} p-4 mb-4 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <CardTitle className="text-white text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Use Cases */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Perfect For Any Occasion</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              'Loyalty Programs',
              'Special Events',
              'Birthday Clubs',
              'VIP Memberships',
              'Reward Systems'
            ].map((label, index) => (
              <div 
                key={index}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center hover:border-slate-600 transition-all duration-300"
              >
                <p className="text-slate-300 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  External Portal Access
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  The Qwikker Loyalty System is a separate web application that gives you enterprise-grade tools with zero complexity. 
                  Click the button above to access your loyalty portal and start building custom programs in minutes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
