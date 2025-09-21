'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Business {
  id: string
  business_name: string
  slug: string
  business_category: string
  business_address: string
  distance_km?: number
  has_qr_type?: boolean
}

interface UniversalQRRouterProps {
  qrType: 'explore' | 'offers' | 'secret'
  nearbyBusinesses: Business[]
  allBusinesses: Business[]
  userLocation: { lat: number; lng: number } | null
}

export function UniversalQRRouter({ 
  qrType, 
  nearbyBusinesses, 
  allBusinesses, 
  userLocation 
}: UniversalQRRouterProps) {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Auto-select if only one nearby business
    if (nearbyBusinesses.length === 1) {
      handleBusinessSelect(nearbyBusinesses[0])
      return
    }

    // If no location provided, try to get it
    if (!userLocation && nearbyBusinesses.length === 0) {
      getCurrentLocation()
    }
  }, [])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location not supported by your browser')
      return
    }

    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        
        // Redirect with location to retry server-side lookup
        window.location.href = `/intent?type=${qrType}&lat=${lat}&lng=${lng}`
      },
      (error) => {
        setIsGettingLocation(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied. Please select your business manually.')
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable.')
            break
          case error.TIMEOUT:
            setLocationError('Location request timed out.')
            break
          default:
            setLocationError('An unknown location error occurred.')
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  const handleBusinessSelect = async (business: Business) => {
    setSelectedBusiness(business)

    try {
      // Log the selection
      await supabase
        .from('universal_qr_analytics')
        .insert({
          qr_type: qrType,
          business_id: business.id,
          routing_method: nearbyBusinesses.length > 0 ? 'business_selection' : 'manual_selection',
          scan_result: 'business_selected',
          latitude: userLocation?.lat,
          longitude: userLocation?.lng,
          city: 'bournemouth' // TODO: Make dynamic
        })

      // Redirect to appropriate page
      switch (qrType) {
        case 'explore':
          router.push(`/user/business/${business.slug}`)
          break
        case 'offers':
          router.push(`/user/offers?business=${business.slug}`)
          break
        case 'secret':
          router.push(`/user/secret-menu?business=${business.slug}`)
          break
      }
    } catch (error) {
      console.error('Error logging QR selection:', error)
      // Still redirect even if logging fails
      switch (qrType) {
        case 'explore':
          router.push(`/user/business/${business.slug}`)
          break
        case 'offers':
          router.push(`/user/offers?business=${business.slug}`)
          break
        case 'secret':
          router.push(`/user/secret-menu?business=${business.slug}`)
          break
      }
    }
  }

  const getQRTypeInfo = () => {
    switch (qrType) {
      case 'explore':
        return {
          title: 'Explore Business',
          description: 'View business profile and menu',
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
          color: 'blue'
        }
      case 'offers':
        return {
          title: 'View Offers',
          description: 'See exclusive member offers',
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          ),
          color: 'orange'
        }
      case 'secret':
        return {
          title: 'Secret Menu',
          description: 'Access hidden menu items',
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ),
          color: 'purple'
        }
    }
  }

  const qrInfo = getQRTypeInfo()

  if (isGettingLocation) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d083] mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Finding nearby businesses...</h2>
          <p className="text-slate-400">Getting your location to show relevant options</p>
        </div>
      </div>
    )
  }

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

      <div className="relative z-10 p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-12">
          <div className="w-16 h-16 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-black">Q</span>
          </div>
          
          <div className={`text-${qrInfo.color}-400 mb-4`}>
            {qrInfo.icon}
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {qrInfo.title}
          </h1>
          
          <p className="text-slate-300 text-lg mb-6">
            {qrInfo.description}
          </p>

          {nearbyBusinesses.length > 0 && (
            <Badge className="bg-[#00d083] text-black mb-6">
              {nearbyBusinesses.length} nearby business{nearbyBusinesses.length !== 1 ? 'es' : ''} found
            </Badge>
          )}
        </div>

        {/* Location Error */}
        {locationError && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-yellow-300 font-medium">Location Access</p>
                <p className="text-yellow-200 text-sm">{locationError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nearby Businesses */}
        {nearbyBusinesses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Nearby Businesses
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nearbyBusinesses.map((business) => (
                <Card 
                  key={business.id} 
                  className="bg-slate-800/50 border-slate-700 cursor-pointer hover:bg-slate-800/70 transition-all duration-200 hover:border-[#00d083]/30"
                  onClick={() => handleBusinessSelect(business)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">{business.business_name}</h3>
                        <Badge variant="secondary" className="text-xs mb-2">{business.business_category}</Badge>
                        <p className="text-slate-400 text-sm">{business.business_address}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {business.distance_km !== undefined && (
                        <div className="flex items-center gap-1 text-[#00d083] text-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {business.distance_km}km away
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleBusinessSelect(business)
                        }}
                      >
                        Select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Businesses (if no nearby or as fallback) */}
        {(nearbyBusinesses.length === 0 || allBusinesses.length > nearbyBusinesses.length) && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {nearbyBusinesses.length === 0 ? 'All Businesses' : 'More Businesses'}
            </h2>
            
            {allBusinesses.length === 0 ? (
              <Card className="bg-slate-800/30 border-slate-700">
                <CardContent className="p-8 text-center">
                  <div className="text-slate-400 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold mb-2">No businesses available</h3>
                  <p className="text-slate-400 mb-4">
                    No businesses have been assigned to this QR code type yet.
                  </p>
                  <Button
                    onClick={() => router.push('/user/dashboard')}
                    className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold"
                  >
                    Explore Qwikker
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allBusinesses
                  .filter(business => !nearbyBusinesses.some(nearby => nearby.id === business.id))
                  .map((business) => (
                    <Card 
                      key={business.id} 
                      className="bg-slate-800/30 border-slate-700 cursor-pointer hover:bg-slate-800/50 transition-all duration-200 hover:border-slate-600"
                      onClick={() => handleBusinessSelect(business)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-white font-semibold mb-1">{business.business_name}</h3>
                            <Badge variant="secondary" className="text-xs mb-2">{business.business_category}</Badge>
                            <p className="text-slate-400 text-sm">{business.business_address}</p>
                          </div>
                        </div>
                        
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleBusinessSelect(business)
                            }}
                          >
                            Select
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Location Access Button */}
        {!userLocation && !isGettingLocation && nearbyBusinesses.length === 0 && (
          <div className="text-center mt-8">
            <Button
              onClick={getCurrentLocation}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 py-3"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Find Nearby Businesses
            </Button>
            <p className="text-slate-400 text-sm mt-2">
              Allow location access to see businesses near you
            </p>
          </div>
        )}
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
