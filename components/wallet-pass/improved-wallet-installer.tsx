'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ImprovedWalletInstallerProps {
  firstName: string
  lastName: string
  email: string
  city?: string
}

export function ImprovedWalletInstaller({ 
  firstName, 
  lastName, 
  email, 
  city = 'bournemouth' 
}: ImprovedWalletInstallerProps) {
  const [step, setStep] = useState<'ready' | 'creating' | 'downloading' | 'installing' | 'success' | 'error'>('ready')
  const [errorMessage, setErrorMessage] = useState('')
  const [passUrl, setPassUrl] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Detect device and location issues
  const [deviceInfo, setDeviceInfo] = useState({
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isInternational: false,
    connection: 'unknown'
  })

  useEffect(() => {
    const userAgent = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
    const isAndroid = /Android/i.test(userAgent)
    const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)
    
    // Detect international users (basic timezone check)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const isInternational = !timezone.includes('Europe/London') && !timezone.includes('GMT')
    
    // Detect connection type
    const connection = (navigator as any).connection?.effectiveType || 'unknown'
    
    setDeviceInfo({
      isIOS,
      isAndroid,
      isSafari,
      isInternational,
      connection
    })
  }, [])

  const handleInstallPass = async () => {
    try {
      setStep('creating')
      setErrorMessage('')

      // Create the wallet pass
      const response = await fetch('/api/walletpass/create-main-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, city })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create wallet pass')
      }

      setPassUrl(result.passUrl)
      setStep('downloading')

      // For international/slow connections, add extra delay
      const downloadDelay = deviceInfo.isInternational ? 5000 : 3000
      setCountdown(downloadDelay / 1000)

      // Countdown timer
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            setStep('installing')
            // Trigger download
            window.location.href = result.passUrl
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Auto-advance to success after download attempt
      setTimeout(() => {
        setStep('success')
      }, downloadDelay + 2000)

    } catch (error) {
      console.error('Wallet pass creation error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred')
      setStep('error')
    }
  }

  const handleTryAgain = () => {
    setStep('ready')
    setErrorMessage('')
    setPassUrl('')
  }

  const handleManualDownload = () => {
    if (passUrl) {
      window.open(passUrl, '_blank')
    }
  }

  const getDeviceWarnings = () => {
    const warnings = []
    
    if (deviceInfo.isInternational) {
      warnings.push('🌍 International location detected - download may take longer')
    }
    
    if (deviceInfo.connection === 'slow-2g' || deviceInfo.connection === '2g') {
      warnings.push('📶 Slow connection detected - please wait for download')
    }
    
    if (!deviceInfo.isIOS && !deviceInfo.isAndroid) {
      warnings.push('💻 Desktop detected - pass will open in browser')
    }

    return warnings
  }

  return (
    <Card className="max-w-md mx-auto bg-slate-800/80 border-slate-700/50">
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">
            Install Your Qwikker Pass
          </h3>
          <p className="text-gray-400 text-sm">
            {firstName} {lastName} • {city.charAt(0).toUpperCase() + city.slice(1)}
          </p>
        </div>

        {/* Device Warnings */}
        {getDeviceWarnings().length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="text-yellow-400 text-sm space-y-1">
              {getDeviceWarnings().map((warning, index) => (
                <div key={index}>{warning}</div>
              ))}
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex justify-center space-x-2 mb-4">
          {['ready', 'creating', 'downloading', 'installing', 'success'].map((stepName, index) => (
            <div
              key={stepName}
              className={`w-3 h-3 rounded-full ${
                stepName === step ? 'bg-[#00d083]' : 
                ['creating', 'downloading', 'installing', 'success'].indexOf(step) > index ? 'bg-[#00d083]/50' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Content based on step */}
        {step === 'ready' && (
          <div className="space-y-4">
            <p className="text-gray-300 text-sm text-center">
              Ready to create your personalized Qwikker wallet pass
            </p>
            <Button
              onClick={handleInstallPass}
              className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold"
            >
              Create Wallet Pass
            </Button>
          </div>
        )}

        {step === 'creating' && (
          <div className="text-center space-y-3">
            <div className="animate-spin w-8 h-8 border-4 border-[#00d083] border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-300">Creating your wallet pass...</p>
          </div>
        )}

        {step === 'downloading' && (
          <div className="text-center space-y-3">
            <div className="text-4xl font-bold text-[#00d083]">{countdown}</div>
            <p className="text-gray-300">
              {deviceInfo.isInternational ? 'Preparing download for international location...' : 'Preparing your wallet pass...'}
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-[#00d083] h-2 rounded-full transition-all duration-1000"
                style={{ width: `${100 - (countdown / (deviceInfo.isInternational ? 5 : 3)) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {step === 'installing' && (
          <div className="text-center space-y-3">
            <div className="animate-pulse text-[#00d083]">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2Z"/>
              </svg>
            </div>
            <p className="text-gray-300">
              {deviceInfo.isIOS ? 'Tap "Add" in the top right corner' : 'Opening wallet pass...'}
            </p>
            <Button
              onClick={handleManualDownload}
              variant="outline"
              size="sm"
              className="text-[#00d083] border-[#00d083]"
            >
              Manual Download
            </Button>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-3">
            <div className="text-[#00d083]">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
              </svg>
            </div>
            <p className="text-gray-300 font-semibold">Pass Installed Successfully!</p>
            <p className="text-gray-400 text-sm">
              You can now access your personalized Qwikker dashboard from your wallet
            </p>
            <Button
              onClick={() => window.location.href = `/user/dashboard?wallet_pass_id=${result.serialNumber || 'new'}`}
              className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold"
            >
              View Dashboard
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center space-y-3">
            <div className="text-red-400">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"/>
              </svg>
            </div>
            <p className="text-red-400 font-semibold">Installation Failed</p>
            <p className="text-gray-400 text-sm">{errorMessage}</p>
            <div className="space-y-2">
              <Button
                onClick={handleTryAgain}
                className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold"
              >
                Try Again
              </Button>
              <Button
                onClick={() => window.location.href = `/user/dashboard`}
                variant="outline"
                className="w-full text-gray-300 border-gray-600"
              >
                Continue Without Pass
              </Button>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 text-center mt-4">
          Having trouble? Try using Safari on iOS or Chrome on Android
        </div>
      </CardContent>
    </Card>
  )
}
