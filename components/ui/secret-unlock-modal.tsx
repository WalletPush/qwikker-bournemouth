'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SecretUnlockModalProps {
  isOpen: boolean
  onClose: () => void
  item: {
    name: string
    description: string
    price?: string
    hint?: string
  }
  business: {
    name?: string
    address?: string
    phone?: string
    image?: string
  }
}

export function SecretUnlockModal({ isOpen, onClose, item, business }: SecretUnlockModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 50)
      document.body.style.overflow = 'hidden'
    } else {
      setIsVisible(false)
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleDirections = () => {
    if (business.name && business.address) {
      window.open(`https://maps.google.com/search/${business.name} ${business.address}`, '_blank')
    }
  }

  const handleCall = () => {
    if (business.phone) {
      window.open(`tel:${business.phone}`, '_blank')
    }
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Card 
        className={`max-w-lg w-full bg-gradient-to-br from-purple-900/90 to-pink-900/90 border border-purple-500/30 shadow-2xl transition-all duration-500 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'
        }`}
      >
        <CardContent className="p-0">
          {/* Header with mystical background */}
          <div className="relative p-6 pb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 animate-pulse"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Secret Unlocked!</h3>
                  <p className="text-purple-200 text-sm">You've discovered a hidden gem</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-purple-300 hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-4">
            {/* Item Details */}
            <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-lg p-4 border border-slate-600/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white mb-1">{item.name}</h4>
                  <p className="text-slate-300 text-sm mb-2">{item.description}</p>
                  {item.hint && (
                    <p className="text-purple-300 text-xs italic">{item.hint}</p>
                  )}
                </div>
                {item.price && (
                  <span className="text-purple-400 font-bold text-lg ml-4">{item.price}</span>
                )}
              </div>
            </div>

            {/* How to Order */}
            <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-lg p-4 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="font-semibold text-emerald-300">How to Order</h4>
              </div>
              <p className="text-slate-300 text-sm">
                Simply ask your server for "<span className="text-white font-medium">{item.name}</span>" or show them this screen! 
                They'll know exactly what you mean. 😉
              </p>
            </div>

            {/* Business Info */}
            {business.name && (
              <div className="text-center py-2">
                <p className="text-slate-400 text-sm">Available at</p>
                <p className="text-white font-medium">{business.name}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {business.address && (
                <Button
                  onClick={handleDirections}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Directions
                </Button>
              )}
              {business.phone && (
                <Button
                  onClick={handleCall}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call Now
                </Button>
              )}
            </div>

            {/* Close Button */}
            <div className="text-center pt-2">
              <Button
                onClick={onClose}
                variant="outline"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                Close
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
