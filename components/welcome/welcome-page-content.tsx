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
    // Initial animation sequence
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
          <div className={`mb-8 relative transform transition-all duration-1000 ${
            logoAnimated ? 'scale-100' : 'scale-95'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-[#00d083]/20 to-transparent rounded-full blur-3xl"></div>
            <Image
              src="/Qwikker Logo web.svg"
              alt="Qwikker"
              width={320}
              height={128}
              className="relative z-10 drop-shadow-2xl mx-auto"
              priority
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-white via-[#00d083] to-white bg-clip-text text-transparent mb-8 tracking-tight">
            Your pass is ready
          </h1>
          
          <p className="text-2xl md:text-3xl text-[#00d083] font-medium mb-12 animate-pulse">
            Time to unlock your city
          </p>

          {/* Call to Action */}
          <div className={`transform transition-all duration-1000 delay-500 mb-16 ${
            showButton ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <button
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-[#00d083] to-green-400 text-white font-semibold py-4 px-12 rounded-2xl text-lg shadow-lg hover:shadow-[#00d083]/60 transition-shadow duration-200"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Animated Feature Cards */}
        <div className={`transform transition-all duration-1000 delay-700 ${
          featuresVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-light text-white mb-12">What awaits you</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="group relative animate-fade-in-up"
                  style={{
                    animationDelay: `${index * 150}ms`
                  }}
                >
                  {/* Animated background glow */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#00d083] to-green-400 rounded-2xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
                  
                  {/* Main card */}
                  <div className="relative bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/60 hover:border-[#00d083]/50 transition-all duration-500 hover:shadow-lg hover:shadow-[#00d083]/20">
                    
                    {/* Animated icon */}
                    <div className="relative mb-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-[#00d083] to-green-400 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                        <div className="w-5 h-5 bg-white rounded-sm opacity-90"></div>
                      </div>
                      {/* Floating dot animation */}
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#00d083] rounded-full opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-300"></div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-[#00d083] transition-colors duration-300">{feature.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors duration-300">{feature.description}</p>
                    
                    {/* Animated progress bar */}
                    <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#00d083] to-green-400 rounded-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-700 ease-out"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Minimal Floating Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-1 h-1 bg-[#00d083]/20 rounded-full animate-float" style={{ left: '25%', top: '30%', animationDelay: '0s', animationDuration: '8s' }}></div>
          <div className="absolute w-1 h-1 bg-[#00d083]/20 rounded-full animate-float" style={{ left: '75%', top: '20%', animationDelay: '2s', animationDuration: '10s' }}></div>
          <div className="absolute w-1 h-1 bg-[#00d083]/20 rounded-full animate-float" style={{ left: '60%', top: '70%', animationDelay: '4s', animationDuration: '9s' }}></div>
          <div className="absolute w-1 h-1 bg-[#00d083]/20 rounded-full animate-float" style={{ left: '40%', top: '60%', animationDelay: '6s', animationDuration: '11s' }}></div>
          <div className="absolute w-1 h-1 bg-[#00d083]/20 rounded-full animate-float" style={{ left: '80%', top: '80%', animationDelay: '8s', animationDuration: '12s' }}></div>
        </div>
      </div>
    </div>
  )
}
