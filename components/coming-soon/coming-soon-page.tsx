'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ComingSoonPageProps {
  city: string
  qrCode?: string
  qrType?: string
  qrDetails?: {
    qr_code: string
    qr_type: string
    physical_format: string
    city: string
  }
}

export function ComingSoonPage({ city, qrCode, qrType, qrDetails }: ComingSoonPageProps) {
  useEffect(() => {
    // Update analytics with client-side device info
    if (qrCode && qrDetails) {
      updateAnalytics()
    }
  }, [qrCode, qrDetails])

  const updateAnalytics = async () => {
    try {
      const deviceType = getDeviceType()
      
      // Update the analytics record with client-side info
      await fetch('/api/qr/analytics/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_code: qrCode,
          device_type: deviceType,
          user_agent: navigator.userAgent
        })
      })
    } catch (error) {
      console.error('Error updating QR analytics:', error)
    }
  }

  const getDeviceType = (): string => {
    const userAgent = navigator.userAgent
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet'
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile'
    return 'desktop'
  }

  const getQRTypeMessage = (type?: string) => {
    switch (type) {
      case 'window_sticker':
        return 'This business is setting up their Qwikker profile'
      case 'offers':
        return 'This business is preparing exclusive offers for Qwikker members'
      case 'secret_menu':
        return 'This business is creating secret menu items for Qwikker members'
      default:
        return 'This business is joining the Qwikker network'
    }
  }

  const getQRTypeIcon = (type?: string) => {
    switch (type) {
      case 'window_sticker':
        return (
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      case 'offers':
        return (
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        )
      case 'secret_menu':
        return (
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      default:
        return (
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
    }
  }

  const cityDisplayName = city.charAt(0).toUpperCase() + city.slice(1)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-[#00d083] rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 text-center">
        {/* Qwikker Logo */}
        <div className="w-20 h-20 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-2xl flex items-center justify-center mb-8 animate-pulse">
          <span className="text-3xl font-bold text-black">Q</span>
        </div>

        {/* QR Type Icon */}
        <div className="text-[#00d083] mb-6">
          {getQRTypeIcon(qrDetails?.qr_type || qrType)}
        </div>

        {/* Main Message */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 max-w-4xl">
          Coming Soon to Qwikker
        </h1>
        
        <p className="text-xl text-slate-300 mb-2 max-w-2xl">
          {getQRTypeMessage(qrDetails?.qr_type || qrType)}
        </p>

        <p className="text-lg text-slate-400 mb-8">
          Join the {cityDisplayName} community and be the first to know when they're live!
        </p>

        {/* QR Code Info (if available) */}
        {qrDetails && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-8 max-w-md">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Badge className="bg-[#00d083] text-black">
                QR Code: {qrDetails.qr_code}
              </Badge>
            </div>
            <p className="text-slate-400 text-sm">
              {qrDetails.physical_format} • {cityDisplayName}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Button 
            onClick={() => window.location.href = `https://${city}.qwikker.com/join`}
            className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold px-8 py-4 text-lg rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#00d083]/20"
          >
            Get Your Qwikker Pass
          </Button>
          
          <Button
            onClick={() => window.location.href = `https://${city}.qwikker.com/user/dashboard`}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-4 text-lg rounded-xl"
          >
            Explore {cityDisplayName}
          </Button>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Discover Local</h3>
            <p className="text-slate-400 text-sm">Find amazing local businesses and hidden gems in {cityDisplayName}</p>
          </div>

          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Exclusive Offers</h3>
            <p className="text-slate-400 text-sm">Access member-only deals and discounts from your favorite places</p>
          </div>

          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Secret Menus</h3>
            <p className="text-slate-400 text-sm">Unlock hidden menu items and exclusive experiences</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-slate-500 text-sm">
            Qwikker • Discover Local • {cityDisplayName}
          </p>
          {qrCode && (
            <p className="text-slate-600 text-xs mt-2">
              Scan ID: {qrCode} • This business will be available soon
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
