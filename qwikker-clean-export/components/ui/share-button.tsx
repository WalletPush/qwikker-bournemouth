'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ShareButtonProps {
  title: string
  text: string
  url: string
  onShare?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ShareButton({ 
  title, 
  text, 
  url, 
  onShare, 
  className = '',
  size = 'md'
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    setIsSharing(true)
    
    // Track the share action
    if (onShare) {
      onShare()
    }

    try {
      // Try native sharing first (mobile)
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url
        })
      } else {
        // Fallback to clipboard
        const shareText = `${text}\n\n${url}`
        await navigator.clipboard.writeText(shareText)
        
        // Show temporary feedback
        const originalText = document.activeElement?.textContent
        if (document.activeElement) {
          (document.activeElement as HTMLElement).textContent = 'Copied!'
          setTimeout(() => {
            if (document.activeElement && originalText) {
              (document.activeElement as HTMLElement).textContent = originalText
            }
          }, 2000)
        }
      }
    } catch (error) {
      console.log('Share failed:', error)
      // Fallback: just copy URL
      try {
        await navigator.clipboard.writeText(url)
        alert('Link copied to clipboard!')
      } catch (clipboardError) {
        console.log('Clipboard failed:', clipboardError)
      }
    }
    
    setIsSharing(false)
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm', 
    lg: 'px-4 py-2 text-base'
  }

  return (
    <Button
      onClick={handleShare}
      disabled={isSharing}
      variant="outline"
      size={size}
      className={`${className} border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors ${sizeClasses[size]}`}
    >
      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
      </svg>
      {isSharing ? 'Sharing...' : 'Share'}
    </Button>
  )
}
