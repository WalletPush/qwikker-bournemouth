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
  const [currentFeature, setCurrentFeature] = useState(0)
  const [showButton, setShowButton] = useState(false)
  const router = useRouter()

  const { wallet_pass_id, name } = searchParams
  const userName = name ? decodeURIComponent(name) : 'Explorer'

  const features = [
    {
      icon: '🎯',
      title: 'Exclusive Offers',
      description: 'Access deals only available to Qwikker members',
      demo: 'Up to 50% off local favorites'
    },
    {
      icon: '🔍',
      title: 'Secret Menus',
      description: 'Unlock hidden items at your favorite spots',
      demo: 'Hidden dishes & specialty drinks'
    },
    {
      icon: '🤖',
      title: 'AI Assistant',
      description: 'Get personalized recommendations instantly',
      demo: 'Ask me anything about Bournemouth!'
    },
    {
      icon: '📱',
      title: 'Mobile Wallet',
      description: 'Your pass is ready in your wallet app',
      demo: 'Tap to pay & redeem offers'
    }
  ]

  useEffect(() => {
    // Initial animation sequence
    const timer1 = setTimeout(() => setIsVisible(true), 300)
    const timer2 = setTimeout(() => setShowButton(true), 2000)

    // Feature cycling animation
    const featureInterval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length)
    }, 3000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearInterval(featureInterval)
    }
  }, [features.length])

  const handleGetStarted = () => {
    const dashboardUrl = `/user/dashboard${wallet_pass_id ? `?wallet_pass_id=${wallet_pass_id}` : ''}`
    router.push(dashboardUrl)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#00d083]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-[#00d083]/5 to-transparent rounded-full animate-spin-slow"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        
        {/* Logo Section */}
        <div className={`transform transition-all duration-1000 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00d083] to-purple-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <Image
              src="/Qwikker Logo web.svg"
              alt="Qwikker"
              width={200}
              height={80}
              className="relative z-10 drop-shadow-2xl"
              priority
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-white via-[#00d083] to-white bg-clip-text text-transparent animate-gradient-x">
            Welcome to Qwikker, {userName}!
          </h1>
          
          <p className="text-xl text-slate-300 mb-8 max-w-2xl">
            Your mobile wallet pass is ready! Get ready to discover exclusive offers, 
            secret menus, and amazing local experiences in Bournemouth.
          </p>
        </div>

        {/* Features Showcase */}
        <div className={`transform transition-all duration-1000 delay-500 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 max-w-6xl">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 transform transition-all duration-500 ${
                  currentFeature === index 
                    ? 'scale-105 border-[#00d083]/50 bg-[#00d083]/5 shadow-xl shadow-[#00d083]/20' 
                    : 'hover:scale-105 hover:border-slate-600/50'
                }`}
              >
                <div className="text-4xl mb-4 animate-bounce">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm mb-3">{feature.description}</p>
                <div className={`text-[#00d083] text-sm font-medium transition-opacity duration-300 ${
                  currentFeature === index ? 'opacity-100' : 'opacity-60'
                }`}>
                  {feature.demo}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phone Mockup with Wallet Pass */}
        <div className={`transform transition-all duration-1000 delay-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        } mb-12`}>
          <div className="relative">
            <div className="w-64 h-96 bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl border-4 border-slate-600 shadow-2xl mx-auto relative overflow-hidden">
              {/* Phone Screen */}
              <div className="absolute inset-2 bg-black rounded-2xl overflow-hidden">
                {/* Wallet Pass Animation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-gradient-to-r from-[#00d083] to-green-400 rounded-xl p-4 w-48 h-28 shadow-lg animate-pulse">
                    <div className="text-white text-sm font-bold mb-1">Qwikker Pass</div>
                    <div className="text-white/80 text-xs mb-2">{userName}</div>
                    <div className="text-white/60 text-xs">Bournemouth Explorer</div>
                    <div className="absolute bottom-2 right-2 text-white/40 text-xs">Ready to use!</div>
                  </div>
                </div>
              </div>
              {/* Phone Details */}
              <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-slate-600 rounded-full"></div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-12 border-2 border-slate-600 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className={`transform transition-all duration-1000 delay-1000 ${
          showButton ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <Button
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-[#00d083] to-green-400 hover:from-green-500 hover:to-[#00d083] text-white font-bold py-4 px-8 rounded-2xl text-xl shadow-2xl transform hover:scale-105 transition-all duration-300 hover:shadow-[#00d083]/50 animate-pulse"
          >
            🚀 CLICK TO START SAVING
          </Button>
          
          <p className="text-slate-400 text-sm mt-4 animate-bounce">
            Your personalized dashboard awaits!
          </p>
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-[#00d083] rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  )
}
