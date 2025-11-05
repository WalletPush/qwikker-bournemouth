'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SubmissionNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'image' | 'menu' | 'offer' | 'profile'
  count?: number
  businessStatus?: 'incomplete' | 'pending_review' | 'approved'
}

export function SubmissionNotificationModal({
  isOpen,
  onClose,
  type,
  count = 1,
  businessStatus = 'approved'
}: SubmissionNotificationModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      document.body.style.overflow = 'hidden'
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        handleClose()
      }, 5000)
      return () => {
        clearTimeout(timer)
        document.body.style.overflow = 'unset'
      }
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 300) // Wait for animation to complete
  }

  if (!isOpen) return null

  const getContent = () => {
    const isApprovedBusiness = businessStatus === 'approved'
    
    switch (type) {
      case 'image':
        return {
          iconBg: isApprovedBusiness ? 'bg-yellow-500' : 'bg-green-500',
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          title: isApprovedBusiness ? 'Images Submitted for Review!' : 'Images Uploaded Successfully!',
          message: isApprovedBusiness 
            ? `${count} image${count > 1 ? 's' : ''} submitted for admin approval. You'll be notified once they're reviewed and live on your business card.`
            : `${count} image${count > 1 ? 's' : ''} uploaded and added to your business profile! They're now visible to customers.`,
          actionText: isApprovedBusiness ? 'Pending Admin Review' : 'Live Now'
        }
      
      case 'menu':
        return {
          iconBg: 'bg-blue-500',
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          title: 'Menu Submitted for Review!',
          message: `Your menu has been submitted for admin approval. Once approved, it will be added to our AI knowledge base for customer inquiries.`,
          actionText: 'Pending Admin Review'
        }
      
      case 'offer':
        return {
          iconBg: 'bg-purple-500',
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          ),
          title: 'Offer Submitted for Review!',
          message: `Your offer has been submitted for admin approval. Once approved, it will be visible to customers and available for claiming.`,
          actionText: 'Pending Admin Review'
        }
      
      case 'profile':
        return {
          iconBg: 'bg-cyan-500',
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 11h6" />
            </svg>
          ),
          title: 'Profile Changes Submitted!',
          message: `Your profile updates have been submitted for admin approval. Changes will be visible once reviewed.`,
          actionText: 'Pending Admin Review'
        }
      
      default:
        return {
          iconBg: 'bg-green-500',
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: 'Submission Successful!',
          message: 'Your submission has been received.',
          actionText: 'Success'
        }
    }
  }

  const content = getContent()

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <Card 
        className={`w-full max-w-md bg-slate-800/95 border border-slate-700/50 shadow-2xl transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-10 h-10 ${content.iconBg} rounded-full flex items-center justify-center`}>
                {content.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">{content.title}</h3>
                <p className="text-slate-300 text-sm">{content.message}</p>
              </div>
              <button 
                onClick={handleClose}
                className="flex-shrink-0 text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700/50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/30">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                content.iconBg === 'bg-yellow-500' ? 'bg-yellow-400' :
                content.iconBg === 'bg-green-500' ? 'bg-green-400' :
                content.iconBg === 'bg-blue-500' ? 'bg-blue-400' :
                content.iconBg === 'bg-purple-500' ? 'bg-purple-400' :
                'bg-cyan-400'
              }`} />
              <span className="text-sm font-medium text-slate-300">{content.actionText}</span>
            </div>

            {/* Auto-close progress bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-700/30 rounded-full h-1">
                <div 
                  className="h-1 bg-slate-400 rounded-full transition-all duration-5000 ease-linear"
                  style={{ 
                    width: isVisible ? '0%' : '100%',
                    animation: isVisible ? 'shrink 5s linear' : 'none'
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 text-center">Auto-closing in 5 seconds...</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Got it
              </Button>
              
              {businessStatus === 'approved' && (
                <Button
                  onClick={() => {
                    window.open('mailto:admin@qwikker.com?subject=Question about my submission', '_blank')
                    handleClose()
                  }}
                  size="sm"
                  className="bg-slate-700 hover:bg-slate-600 text-white"
                >
                  Contact Admin
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}
