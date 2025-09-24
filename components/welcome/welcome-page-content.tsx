'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

interface WelcomePageContentProps {
  searchParams: {
    wallet_pass_id?: string
    name?: string
  }
}

export function WelcomePageContent({ searchParams }: WelcomePageContentProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [logoAnimated, setLogoAnimated] = useState(false)
  const [featuresVisible, setFeaturesVisible] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const router = useRouter()

  const { wallet_pass_id } = searchParams

  const features = [
    {
      title: 'Exclusive Offers',
      description: 'Access member-only deals at local businesses',
      detail: 'Discover hidden discounts and special promotions'
    },
    {
      title: 'Secret Menus',
      description: 'Unlock hidden items at your favorite spots',
      detail: 'Find specialty dishes and off-menu creations'
    },
    {
      title: 'AI Discovery',
      description: 'Get personalized local recommendations',
      detail: 'Smart suggestions based on your preferences'
    },
    {
      title: 'Mobile Wallet',
      description: 'Your digital pass is ready to use',
      detail: 'Show your pass to redeem exclusive offers'
    }
  ]

  useEffect(() => {
    // Elegant animation sequence
    const timer1 = setTimeout(() => setIsVisible(true), 200)
    const timer2 = setTimeout(() => setLogoAnimated(true), 800)
    const timer3 = setTimeout(() => setFeaturesVisible(true), 1400)
    const timer4 = setTimeout(() => setShowButton(true), 2200)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
    }
  }, [])

  const handleGetStarted = () => {
    const dashboardUrl = `/user/dashboard${wallet_pass_id ? `?wallet_pass_id=${wallet_pass_id}` : ''}`
    router.push(dashboardUrl)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#00d083]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-slate-700/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-[#00d083]/3 to-transparent rounded-full animate-spin-slow"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        
        {/* Logo Section */}
        <div className={`transform transition-all duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className={`mb-12 relative transform transition-all duration-1000 ${
            logoAnimated ? 'scale-100' : 'scale-95'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-[#00d083]/20 to-transparent rounded-full blur-3xl"></div>
            <Image
              src="/Qwikker Logo web.svg"
              alt="Qwikker"
              width={280}
              height={112}
              className="relative z-10 drop-shadow-2xl mx-auto"
              priority
            />
          </div>
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-light text-white mb-6 tracking-wide">
            Welcome to the future of
            <span className="block text-[#00d083] font-medium mt-2">local discovery</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-3xl leading-relaxed">
            Your digital pass has been created. Discover exclusive member offers, 
            hidden menus, and personalized local experiences powered by AI.
          </p>
        </div>

        {/* Features Grid */}
        <div className={`transform transition-all duration-1000 delay-300 ${
          featuresVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 max-w-6xl">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-8 hover:bg-slate-800/50 hover:border-[#00d083]/30 transition-all duration-500 hover:transform hover:scale-105"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-[#00d083] to-green-400 rounded-xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform duration-300">
                  <div className="w-6 h-6 bg-white rounded opacity-80"></div>
                </div>
                <h3 className="text-xl font-medium text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 mb-2 leading-relaxed">{feature.description}</p>
                <p className="text-slate-500 text-sm">{feature.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Wallet Showcase */}
        <div className={`transform transition-all duration-1000 delay-500 ${
          featuresVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        } mb-16`}>
          <div className="relative max-w-sm mx-auto">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl border border-slate-600/50 shadow-2xl p-2 backdrop-blur-sm">
              <div className="bg-black rounded-2xl p-6 min-h-[400px] flex items-center justify-center">
                <div className="bg-gradient-to-r from-[#00d083] to-green-400 rounded-2xl p-6 w-full max-w-xs shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-white font-semibold text-lg">Qwikker</div>
                      <div className="text-white/70 text-sm">Digital Pass</div>
                    </div>
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="text-white/60 text-sm mb-6">
                    Bournemouth Explorer
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-white/80 text-xs">Ready to use</div>
                    <div className="text-white/60 text-xs">Show to redeem</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className={`transform transition-all duration-1000 delay-700 ${
          showButton ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <Button
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-[#00d083] to-green-400 hover:from-green-500 hover:to-[#00d083] text-white font-medium py-4 px-12 rounded-2xl text-lg shadow-2xl transform hover:scale-105 transition-all duration-300 hover:shadow-[#00d083]/30"
          >
            Get Started
          </Button>
          
          <p className="text-slate-500 text-sm mt-6">
            Your personalized experience is loading
          </p>
        </div>

        {/* Minimal Floating Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-[#00d083]/30 rounded-full animate-float"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${8 + Math.random() * 4}s`
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  )
}
