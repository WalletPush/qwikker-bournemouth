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
    { text: 'Grabbing your exclusive offers...' },
    { text: 'Fetching secret menus...' },
    { text: 'Personalizing recommendations...' },
    { text: 'Syncing your wallet pass...' },
    { text: 'Preparing your dashboard...' }
  ]

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#00d083]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-slate-700/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-[#00d083]/3 to-transparent rounded-full animate-spin-slow"></div>
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
              
              <p className="text-2xl md:text-3xl text-[#00d083] font-medium mb-12 animate-pulse">
                Time to unlock your city
              </p>

              {/* Call to Action - AT THE TOP */}
              <div className={`transform transition-all duration-1000 delay-500 mb-16 ${
                showButton ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}>
                <Button
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-[#00d083] to-green-400 hover:from-green-500 hover:to-[#00d083] text-white font-semibold py-6 px-16 rounded-3xl text-2xl shadow-2xl transform hover:scale-110 transition-all duration-300 hover:shadow-[#00d083]/60 relative overflow-hidden group"
                >
                  <span className="relative z-10">Enter Your Dashboard</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-[#00d083] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Button>
              </div>
            </div>

            {/* Better Feature Cards */}
            <div className={`transform transition-all duration-1000 delay-700 ${
              featuresVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}>
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-light text-white mb-12">What awaits you</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {features.map((feature, index) => (
                    <div key={index} className="group relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#00d083]/10 to-transparent rounded-xl blur-sm group-hover:blur-none transition-all duration-300"></div>
                      <div className="relative bg-slate-900/40 border border-slate-700/30 rounded-xl p-6 hover:border-[#00d083]/40 transition-all duration-300">
                        <div className="w-8 h-8 bg-[#00d083] rounded-lg flex items-center justify-center mb-4">
                          <div className="w-4 h-4 bg-white rounded-sm"></div>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
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
                <h2 className="text-4xl font-bold text-white mb-12">Loading Your Dashboard</h2>
                
                <div className="space-y-6">
                  {loadingSteps.map((step, index) => (
                    <div 
                      key={index}
                      className={`flex items-center gap-4 p-6 rounded-2xl transition-all duration-500 ${
                        index <= currentLoadingStep 
                          ? 'bg-slate-800/50 border border-[#00d083]/30 translate-x-0 opacity-100' 
                          : 'bg-slate-900/20 border border-slate-700/20 translate-x-4 opacity-40'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                        index <= currentLoadingStep 
                          ? 'bg-[#00d083] text-white' 
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {index < currentLoadingStep ? (
                          <div className="w-6 h-6 bg-white rounded-full"></div>
                        ) : index === currentLoadingStep ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <div className="w-4 h-4 bg-slate-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-lg font-medium transition-colors duration-500 ${
                          index <= currentLoadingStep ? 'text-white' : 'text-slate-500'
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
                <h2 className="text-5xl font-bold text-white mb-4">Dashboard Complete!</h2>
                <p className="text-xl text-slate-300 mb-12">Your personalized experience is ready</p>
                
                <Button
                  onClick={handleAccessDashboard}
                  className="bg-gradient-to-r from-[#00d083] to-green-400 hover:from-green-500 hover:to-[#00d083] text-white font-semibold py-6 px-16 rounded-3xl text-2xl shadow-2xl transform hover:scale-110 transition-all duration-300 hover:shadow-[#00d083]/60 animate-pulse"
                >
                  Access Your Dashboard
                </Button>
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
