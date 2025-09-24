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
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Card 
        className={`modal-content max-w-md w-full bg-slate-800/95 border border-slate-700/50 shadow-2xl transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        <CardContent className="p-0">
          {/* Clean Header */}
          <div className="relative p-6 pb-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Secret Unlocked!</h3>
                  <p className="text-slate-400 text-sm">You've discovered a hidden gem</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700/50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Item Details */}
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-white mb-1">{item.name}</h4>
                  <p className="text-slate-300 text-sm">{item.description}</p>
                </div>
                {item.price && (
                  <span className="text-purple-400 font-semibold text-lg ml-4">{item.price}</span>
                )}
              </div>
            </div>

            {/* How to Order */}
            <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/20">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h4 className="font-medium text-white text-sm">How to Order</h4>
              </div>
              <p className="text-slate-300 text-sm">
                Simply ask your server for "<span className="text-white font-medium">{item.name}</span>" or show them this screen!
              </p>
            </div>

            {/* Business Info */}
            {business.name && (
              <div className="text-center py-2 border-t border-slate-700/50">
                <p className="text-slate-400 text-xs">Available at</p>
                <p className="text-white font-medium text-sm">{business.name}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {business.address && (
                <Button
                  onClick={handleDirections}
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  Directions
                </Button>
              )}
              {business.phone && (
                <Button
                  onClick={handleCall}
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call
                </Button>
              )}
              <Button
                onClick={onClose}
                size="sm"
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700/50 text-xs"
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
