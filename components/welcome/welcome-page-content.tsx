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
  const [showLoadingSequence, setShowLoadingSequence] = useState(false)
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0)
  const [loadingComplete, setLoadingComplete] = useState(false)
  const router = useRouter()

  const { wallet_pass_id } = searchParams

  const loadingSteps = [
    { 
      text: 'Grabbing your exclusive offers...',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      text: 'Fetching secret menus...',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      )
    },
    { 
      text: 'Personalizing recommendations...',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    },
    { 
      text: 'Syncing your wallet pass...',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      text: 'Preparing your dashboard...',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      )
    }
  ]

  const features = [
    {
      title: 'Exclusive Offers',
      description: 'Access member-only deals at local businesses',
      detail: 'Discover hidden discounts and special promotions',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Secret Menus',
      description: 'Unlock hidden items at your favorite spots',
      detail: 'Find specialty dishes and off-menu creations',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      )
    },
    {
      title: 'AI Discovery',
      description: 'Get personalized local recommendations',
      detail: 'Smart suggestions based on your preferences',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    },
    {
      title: 'Mobile Wallet',
      description: 'Your digital pass is ready to use',
      detail: 'Show your pass to redeem exclusive offers',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    }
  ]

  useEffect(() => {
    // Initial animation sequence - reduced delays
    const timer1 = setTimeout(() => setIsVisible(true), 200)
    const timer2 = setTimeout(() => setLogoAnimated(true), 600)
    const timer3 = setTimeout(() => setFeaturesVisible(true), 900)
    const timer4 = setTimeout(() => setShowButton(true), 1200)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
    }
  }, [])

  // Loading sequence effect
  useEffect(() => {
    if (!showLoadingSequence) return

    const stepInterval = setInterval(() => {
      setCurrentLoadingStep((prev) => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1
        } else {
          clearInterval(stepInterval)
          setTimeout(() => setLoadingComplete(true), 1000)
          return prev
        }
      })
    }, 1500)

    return () => clearInterval(stepInterval)
  }, [showLoadingSequence, loadingSteps.length])

  const handleGetStarted = () => {
    setShowLoadingSequence(true)
    setCurrentLoadingStep(0)
    setLoadingComplete(false)
  }

  const handleAccessDashboard = () => {
    const dashboardUrl = `/user/dashboard${wallet_pass_id ? `?wallet_pass_id=${wallet_pass_id}` : ''}`
    router.push(dashboardUrl)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black relative overflow-hidden">
      {/* Very subtle background elements */}
      <div className="absolute inset-0">
        {/* Minimal dark orbs */}
        <div className="absolute top-1/4 left-1/6 w-72 h-72 bg-[#00d083]/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/6 w-80 h-80 bg-gray-900/20 rounded-full blur-3xl"></div>
        
        {/* Extremely subtle texture */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        
        {!showLoadingSequence ? (
          <>
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
          
                  <p className="text-2xl md:text-3xl text-slate-300 font-light mb-12">
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
                  <h2 className="text-3xl font-light text-slate-200 mb-12">What awaits you</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                      <div 
                        key={index} 
                        className="group relative animate-fade-in-up h-full"
                        style={{
                          animationDelay: `${index * 150}ms`
                        }}
                      >
                        {/* Animated background glow */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#00d083] to-green-400 rounded-2xl opacity-0 group-hover:opacity-15 blur-sm transition-all duration-500"></div>
                        
                        {/* Main card - fixed height */}
                        <div className="relative bg-black/40 backdrop-blur-sm border border-slate-800/60 rounded-xl p-6 hover:bg-black/60 hover:border-[#00d083]/40 transition-all duration-500 hover:shadow-lg hover:shadow-[#00d083]/10 text-center h-64 flex flex-col justify-between">
                    
                            {/* Centered icon at top */}
                            <div className="relative mb-4 flex justify-center">
                              <div className="w-16 h-16 bg-gradient-to-r from-[#00d083] to-green-400 rounded-2xl flex items-center justify-center group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 text-white shadow-lg shadow-[#00d083]/30">
                                {feature.icon}
                              </div>
                              {/* Floating dot animation */}
                              <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#00d083] rounded-full opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-300"></div>
                            </div>
                    
                            {/* Content section */}
                            <div className="flex-1 flex flex-col justify-center">
                              <h3 className="text-xl font-semibold text-slate-100 mb-3 group-hover:text-[#00d083] transition-colors duration-300">{feature.title}</h3>
                              <p className="text-slate-500 text-sm leading-relaxed group-hover:text-slate-400 transition-colors duration-300">{feature.description}</p>
                            </div>
                    
                            {/* Animated progress bar at bottom */}
                            <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-[#00d083] to-green-400 rounded-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-700 ease-out"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
        </div>
          </>
        ) : (
          /* Loading Sequence */
          <div className="max-w-2xl mx-auto">
            <div className="mb-12">
              <Image
                src="/Qwikker Logo web.svg"
                alt="Qwikker"
                width={280}
                height={112}
                className="mx-auto drop-shadow-2xl"
                priority
              />
            </div>

            {!loadingComplete ? (
              <div className="space-y-8">
                <h2 className="text-4xl font-bold text-slate-100 mb-12">Loading Your Dashboard</h2>
                
                <div className="space-y-6">
                  {loadingSteps.map((step, index) => (
                    <div 
                      key={index}
                      className={`flex items-center gap-4 p-6 rounded-2xl transition-all duration-500 ${
                        index <= currentLoadingStep 
                          ? 'bg-black/40 border border-[#00d083]/30 translate-x-0 opacity-100' 
                          : 'bg-black/20 border border-slate-800/30 translate-x-4 opacity-40'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                        index <= currentLoadingStep 
                          ? 'bg-[#00d083] text-white' 
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {index < currentLoadingStep ? (
                          step.icon
                        ) : index === currentLoadingStep ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <div className="w-4 h-4 bg-slate-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-lg font-medium transition-colors duration-500 ${
                          index <= currentLoadingStep ? 'text-slate-100' : 'text-slate-600'
                        }`}>
                          {step.text}
                        </p>
                      </div>
                      {index < currentLoadingStep && (
                        <div className="text-[#00d083] text-2xl">✓</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Dashboard Complete */
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-[#00d083] to-green-400 rounded-full flex items-center justify-center mx-auto mb-8">
                  <div className="text-4xl text-white">✓</div>
                </div>
                <h2 className="text-5xl font-bold text-slate-100 mb-4">Dashboard Complete!</h2>
                <p className="text-xl text-slate-400 mb-12">Your personalized experience is ready</p>
                
                <button
                  onClick={handleAccessDashboard}
                  className="bg-gradient-to-r from-[#00d083] to-green-400 text-white font-semibold py-4 px-12 rounded-2xl text-lg shadow-lg hover:shadow-[#00d083]/60 transition-shadow duration-200"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

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
