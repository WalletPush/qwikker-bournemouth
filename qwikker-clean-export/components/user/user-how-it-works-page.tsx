'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface UserHowItWorksPageProps {
  walletPassId?: string
}

export function UserHowItWorksPage({ walletPassId }: UserHowItWorksPageProps = {}) {
  
  // Helper function to append wallet_pass_id to navigation URLs
  const getNavUrl = (href: string) => {
    if (!walletPassId) {
      return href
    }
    return `${href}?wallet_pass_id=${walletPassId}`
  }
  const [visibleStep, setVisibleStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleStep(prev => (prev + 1) % 4)
    }, 3000) // Slightly faster timing

    return () => clearInterval(timer)
  }, [])

  const steps = [
    {
      number: "01",
      title: "Discover Amazing Places",
      description: "Explore Bournemouth's best restaurants, cafes, bars, and hidden gems — all carefully curated by locals",
      icon: (
        <svg className="w-16 h-16 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      color: "from-emerald-500 to-teal-500",
      bgColor: "from-emerald-500/20 to-teal-500/20",
      borderColor: "border-emerald-500/30"
    },
    {
      number: "02", 
      title: "Chat with Your AI Guide",
      description: "Ask our intelligent AI anything about menus, deals, secret items, or get personalized recommendations",
      icon: (
        <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      color: "from-blue-500 to-cyan-500",
      bgColor: "from-blue-500/20 to-cyan-500/20",
      borderColor: "border-blue-500/30"
    },
    {
      number: "03",
      title: "Grab Exclusive Deals",
      description: "Access special offers and add them to your mobile wallet — deals you won't find anywhere else",
      icon: (
        <svg className="w-16 h-16 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      color: "from-orange-500 to-red-500",
      bgColor: "from-orange-500/20 to-red-500/20",
      borderColor: "border-orange-500/30"
    },
    {
      number: "04",
      title: "Unlock Secret Menus",
      description: "Discover hidden menu items and off-menu specialties that only insiders know about",
      icon: (
        <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      color: "from-purple-500 to-pink-500",
      bgColor: "from-purple-500/20 to-pink-500/20",
      borderColor: "border-purple-500/30"
    }
  ]

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/5 to-purple-500/10 rounded-3xl blur-3xl"></div>
          <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/60 rounded-3xl border border-slate-700/50 p-12">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-purple-400 rounded-2xl blur-xl opacity-40 animate-pulse"></div>
                <div className="relative p-6 bg-gradient-to-br from-emerald-500/20 to-purple-500/20 rounded-2xl border border-emerald-500/30">
                  <svg className="w-20 h-20 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <h1 className="text-5xl font-bold text-slate-100 mb-6">
              Welcome to <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">Qwikker</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Your intelligent companion for discovering Bournemouth's best dining experiences. 
              We connect you with amazing local businesses through AI-powered recommendations, 
              exclusive deals, and insider knowledge.
            </p>
          </div>
        </div>
      </div>

      {/* Animated Steps Section */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-100 mb-4">How Qwikker Works</h2>
          <p className="text-lg text-slate-300">Four simple steps to unlock Bournemouth's culinary secrets</p>
        </div>

        {/* Interactive Steps - Fixed Animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <Card 
              key={index}
              className={`relative overflow-hidden transition-all duration-700 cursor-pointer ${
                visibleStep === index 
                  ? `bg-gradient-to-br ${step.bgColor} border ${step.borderColor}` 
                  : 'bg-slate-800/50 border-slate-600/50 hover:border-slate-500/50'
              }`}
              style={{ 
                height: '380px', // Fixed height for all cards
                boxShadow: visibleStep === index 
                  ? '0 25px 50px -12px rgba(0, 208, 131, 0.15)' 
                  : '0 10px 25px -3px rgba(0, 0, 0, 0.3)'
              }}
              onClick={() => setVisibleStep(index)}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${step.color} transition-opacity duration-700 ${
                visibleStep === index ? 'opacity-10' : 'opacity-0'
              }`}></div>
              
              <CardContent className="relative p-6 text-center h-full">
                {/* Step Number - Absolutely Positioned - NO TRANSITIONS */}
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
                    visibleStep === index 
                      ? `bg-gradient-to-r ${step.color} text-black` 
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {step.number}
                  </div>
                </div>

                {/* Icon - Absolutely Positioned - NO TRANSITIONS */}
                <div className="absolute top-24 left-1/2 transform -translate-x-1/2">
                  <div className={`${visibleStep === index ? 'opacity-100' : 'opacity-60'}`}>
                    {step.icon}
                  </div>
                </div>

                {/* Title - Absolutely Positioned - NO TRANSITIONS */}
                <div className="absolute top-44 left-6 right-6">
                  <h3 className={`text-lg font-bold ${
                    visibleStep === index ? 'text-slate-100' : 'text-slate-300'
                  }`}>
                    {step.title}
                  </h3>
                </div>

                {/* Description - Absolutely Positioned - NO TRANSITIONS */}
                <div className="absolute top-56 left-6 right-6 bottom-6">
                  <p className={`text-sm leading-relaxed ${
                    visibleStep === index ? 'text-slate-200' : 'text-slate-400'
                  }`}>
                    {step.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border-emerald-700/50 hover:border-emerald-500/50 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-3">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091z" />
              </svg>
              AI-Powered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300">
              Our intelligent AI knows everything about local menus, ingredients, prices, and can make personalized recommendations based on your preferences.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-700/50 hover:border-blue-500/50 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-3">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              100% Free
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300">
              Qwikker is completely free for users. No subscriptions, no hidden fees. We're supported by our amazing business partners.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-700/50 hover:border-purple-500/50 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-3">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Local Focus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300">
              We're passionate about supporting local Bournemouth businesses and helping you discover the gems in your own backyard.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rewards Preview */}
      <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 border border-slate-700/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-purple-500/5 to-blue-500/5"></div>
        <CardContent className="relative p-12">
          <div className="text-center space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-100 mb-4">Unlock Achievements While You Explore</h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                The more you use Qwikker, the more you achieve. Unlock badges for trying new places, sharing with friends, and engaging with the community.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-emerald-400 mb-2">6</div>
                <div className="text-sm text-slate-400">Partner Venues</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">4</div>
                <div className="text-sm text-slate-400">Secret Menus</div>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">12</div>
                <div className="text-sm text-slate-400">Live Offers</div>
              </div>
              <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-orange-400 mb-2">17</div>
                <div className="text-sm text-slate-400">Total Badges</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <div className="text-center space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 mb-4">Ready to Start Your Adventure?</h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Join hundreds of Bournemouth food lovers who are already discovering amazing places with Qwikker
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black font-bold text-lg px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300">
            <Link href={getNavUrl("/user/discover")}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Start Discovering
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="border-slate-500 text-slate-300 hover:bg-slate-700 font-semibold text-lg px-8 py-4 rounded-xl">
            <Link href={getNavUrl("/user/chat")}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat with AI
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
