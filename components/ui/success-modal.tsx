'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  buttonText?: string
  onButtonClick?: () => void
}

export function SuccessModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  buttonText = "Continue",
  onButtonClick 
}: SuccessModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 200)
  }

  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick()
    } else {
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md mx-4 shadow-2xl transform transition-all duration-200 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        {/* Success Icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mx-auto mb-6">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
          <p className="text-slate-300 leading-relaxed mb-8 whitespace-pre-line">{message}</p>
          
          <Button 
            onClick={handleButtonClick}
            className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold py-3"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
}

export function ErrorModal({ isOpen, onClose, title, message }: ErrorModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 200)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md mx-4 shadow-2xl transform transition-all duration-200 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        {/* Error Icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
          <p className="text-slate-300 leading-relaxed mb-8">{message}</p>
          
          <Button 
            onClick={handleClose}
            variant="outline"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  )
}
