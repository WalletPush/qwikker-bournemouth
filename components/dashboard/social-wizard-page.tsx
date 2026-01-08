'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { SocialPostBuilder } from './social-post-builder'

type PostType = 'offer' | 'secret-menu' | 'event' | 'general' | null

interface SocialWizardPageProps {
  profile?: any
}

export function SocialWizardPage({ profile }: SocialWizardPageProps) {
  const [selectedPostType, setSelectedPostType] = useState<PostType>(null)

  // If a post type is selected, show the builder
  if (selectedPostType) {
    return (
      <SocialPostBuilder
        postType={selectedPostType}
        profile={profile}
        onClose={() => setSelectedPostType(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">Social Wizard</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Create stunning, on-brand social media posts for Instagram and Facebook
        </p>
      </div>

      {/* Post Type Selection */}
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-2">What would you like to create?</h2>
          <p className="text-slate-400">Choose a post type to get started with tailored templates</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Offer Post */}
          <Card 
            className="bg-slate-800/50 border-slate-700 hover:border-[#00d083] transition-all duration-200 cursor-pointer group"
            onClick={() => setSelectedPostType('offer')}
          >
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-white group-hover:text-[#00d083] transition-colors">
                    Promote an Offer
                  </CardTitle>
                  <p className="text-sm text-slate-400 mt-2">
                    Create eye-catching posts for your exclusive deals and discounts
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Perfect for limited-time promotions
              </div>
            </CardContent>
          </Card>

          {/* Secret Menu Post */}
          <Card 
            className="bg-slate-800/50 border-slate-700 hover:border-[#00d083] transition-all duration-200 cursor-pointer group"
            onClick={() => setSelectedPostType('secret-menu')}
          >
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-white group-hover:text-[#00d083] transition-colors">
                    Share a Secret Item
                  </CardTitle>
                  <p className="text-sm text-slate-400 mt-2">
                    Tease your exclusive menu items to build intrigue and loyalty
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Create FOMO and exclusivity
              </div>
            </CardContent>
          </Card>

          {/* Event Post */}
          <Card 
            className="bg-slate-800/50 border-slate-700 hover:border-[#00d083] transition-all duration-200 cursor-pointer group"
            onClick={() => setSelectedPostType('event')}
          >
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-white group-hover:text-[#00d083] transition-colors">
                    Announce an Event
                  </CardTitle>
                  <p className="text-sm text-slate-400 mt-2">
                    Spread the word about upcoming events, live music, and special occasions
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Drive attendance and engagement
              </div>
            </CardContent>
          </Card>

          {/* General Update Post */}
          <Card 
            className="bg-slate-800/50 border-slate-700 hover:border-[#00d083] transition-all duration-200 cursor-pointer group"
            onClick={() => setSelectedPostType('general')}
          >
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <CardTitle className="text-white group-hover:text-[#00d083] transition-colors">
                    General Update
                  </CardTitle>
                  <p className="text-sm text-slate-400 mt-2">
                    Share news, updates, or behind-the-scenes content with your followers
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Stay connected with your audience
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <Card className="max-w-5xl mx-auto bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-slate-600">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#00d083]/10 rounded-full">
              <svg className="w-6 h-6 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">More features coming soon!</h3>
              <p className="text-sm text-slate-400">
                Post scheduling, AI copy assistant, theme templates, and performance analytics are on the way.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

