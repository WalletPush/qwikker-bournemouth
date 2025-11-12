'use client'

import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import html2canvas from 'html2canvas'

interface SimplePostEditorProps {
  backgroundImage: string
  headline: string
  logoUrl?: string
  businessName?: string
}

export function SimplePostEditor({
  backgroundImage,
  headline,
  logoUrl,
  businessName
}: SimplePostEditorProps) {
  const postRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (!postRef.current) return

    try {
      const canvas = await html2canvas(postRef.current, {
        width: 1080,
        height: 1080,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000'
      })

      const link = document.createElement('a')
      link.download = `qwikker-post-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Failed to generate image. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="flex justify-center">
        <div
          ref={postRef}
          className="relative w-[1080px] h-[1080px] overflow-hidden bg-black"
          style={{
            transform: 'scale(0.4)',
            transformOrigin: 'top center',
            width: '1080px',
            height: '1080px'
          }}
        >
          {/* Background Image */}
          <img
            src={backgroundImage}
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
          />

          {/* Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/20 to-black/40" />

          {/* Business Logo - Top Left */}
          {logoUrl && (
            <div className="absolute top-12 left-12">
              <img
                src={logoUrl}
                alt={businessName}
                className="w-32 h-32 object-contain drop-shadow-2xl"
                crossOrigin="anonymous"
              />
            </div>
          )}

          {/* Headline - Center */}
          <div className="absolute inset-0 flex items-center justify-center px-24">
            <h1
              className="text-[120px] font-black text-white text-center leading-tight"
              style={{
                textShadow: '0 8px 24px rgba(0,0,0,0.8), 0 4px 8px rgba(0,0,0,0.9)',
                fontFamily: 'Arial Black, sans-serif'
              }}
            >
              {headline}
            </h1>
          </div>

          {/* Bottom Bar with QWIKKER Logo & CTA */}
          <div className="absolute bottom-0 inset-x-0 h-24 bg-black/60 backdrop-blur-sm flex items-center justify-between px-12">
            <div className="text-white text-2xl font-bold">
              Install QWIKKER Pass
            </div>
            <img
              src="/qwikker-logo-white.svg"
              alt="QWIKKER"
              className="h-12 opacity-90"
              crossOrigin="anonymous"
            />
          </div>
        </div>
      </div>

      {/* Download Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleDownload}
          size="lg"
          className="bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Post (1080x1080)
        </Button>
      </div>
    </div>
  )
}

