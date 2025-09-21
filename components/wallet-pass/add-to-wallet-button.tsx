'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface AddToWalletButtonProps {
  className?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
  city?: string
}

export function AddToWalletButton({ 
  className = '', 
  size = 'default', 
  variant = 'default',
  city = 'bournemouth' 
}: AddToWalletButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleAddToWallet = async () => {
    setIsLoading(true)
    
    try {
      // Detect device type
      const userAgent = navigator.userAgent
      const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
      const isAndroid = /Android/i.test(userAgent)
      const isMobile = isIOS || isAndroid
      
      if (isMobile) {
        // Redirect to wallet pass creation form
        window.location.href = `https://${city}.qwikker.com/join`
      } else {
        // Desktop - show QR code or redirect to form
        window.open(`https://${city}.qwikker.com/join`, '_blank')
      }
    } catch (error) {
      console.error('Error adding to wallet:', error)
      alert('Unable to add to wallet. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleAddToWallet}
      disabled={isLoading}
      size={size}
      variant={variant}
      className={`${className} ${variant === 'default' ? 'bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold' : ''}`}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
          Adding...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add to Wallet
        </>
      )}
    </Button>
  )
}
