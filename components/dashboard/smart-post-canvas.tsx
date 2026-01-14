'use client'

import React from 'react'

interface SmartPostCanvasProps {
  backgroundImage: string
  headline: string
  logoUrl?: string
  businessName?: string
  analysis: {
    textPlacement: string
    textColor: string
    textEffect: string
    overlayNeeded: boolean
    overlayStyle: {
      type: string
      color: string
      opacity: number
      direction: string
    }
    accentColor: string
    mood: string
  }
}

export function SmartPostCanvas({
  backgroundImage,
  headline,
  logoUrl,
  businessName,
  analysis
}: SmartPostCanvasProps) {
  
  const getTextPositionClasses = () => {
    const positions: Record<string, string> = {
      'top': 'items-start pt-16',
      'center': 'items-center',
      'bottom': 'items-end pb-16',
      'top-left': 'items-start justify-start pt-16 pl-8',
      'top-right': 'items-start justify-end pt-16 pr-8',
      'bottom-left': 'items-end justify-start pb-16 pl-8',
      'bottom-right': 'items-end justify-end pb-16 pr-8'
    }
    return positions[analysis.textPlacement] || 'items-center'
  }

  const getTextStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      color: analysis.textColor,
      fontSize: 'clamp(2rem, 7vw, 4.5rem)',
      fontWeight: 900,
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
      wordBreak: 'break-word',
      maxWidth: '90%'
    }

    // Apply text effects
    switch (analysis.textEffect) {
      case 'shadow':
        baseStyle.textShadow = '0 4px 20px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.6)'
        break
      case 'outline':
        baseStyle.textShadow = '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000'
        baseStyle.WebkitTextStroke = '1px rgba(0,0,0,0.3)'
        break
      case 'glow':
        baseStyle.textShadow = `0 0 20px ${analysis.accentColor}, 0 0 40px ${analysis.accentColor}, 0 0 60px ${analysis.accentColor}`
        baseStyle.filter = 'brightness(1.2)'
        break
      case 'solid-bg':
        // Will add background in JSX
        break
      default:
        baseStyle.textShadow = '0 4px 20px rgba(0,0,0,0.8)'
    }

    return baseStyle
  }

  const getOverlayStyle = (): React.CSSProperties => {
    if (!analysis.overlayNeeded) return {}

    const { type, color, opacity, direction } = analysis.overlayStyle

    switch (type) {
      case 'gradient':
        const gradients: Record<string, string> = {
          'top-to-bottom': `linear-gradient(to bottom, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}, transparent)`,
          'bottom-to-top': `linear-gradient(to top, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}, transparent)`,
          'left-to-right': `linear-gradient(to right, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}, transparent)`,
          'radial': `radial-gradient(circle at center, transparent 30%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 100%)`
        }
        return { background: gradients[direction] || gradients['radial'] }
      
      case 'solid':
        return { backgroundColor: `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` }
      
      case 'vignette':
        return { background: `radial-gradient(circle at center, transparent 40%, rgba(0,0,0,${opacity}) 100%)` }
      
      default:
        return {}
    }
  }

  return (
    <div className="relative w-full aspect-square overflow-hidden bg-black">
      {/* Background Image */}
      <img
        src={backgroundImage}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ display: 'block' }}
      />

      {/* Smart Overlay Based on Analysis */}
      {analysis.overlayNeeded && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={getOverlayStyle()}
        />
      )}

      {/* Text Content */}
      <div className={`absolute inset-0 flex flex-col justify-center px-8 ${getTextPositionClasses()}`}>
        {analysis.textEffect === 'solid-bg' ? (
          <div 
            className="inline-block px-6 py-4"
            style={{ 
              backgroundColor: `${analysis.accentColor}dd`,
              borderRadius: '12px'
            }}
          >
            <h1 
              className="font-black text-center"
              style={getTextStyle()}
            >
              {headline}
            </h1>
          </div>
        ) : (
          <h1 
            className="font-black text-center"
            style={getTextStyle()}
          >
            {headline}
          </h1>
        )}
      </div>

      {/* Business Logo - Top Left */}
      {logoUrl && (
        <div className="absolute top-4 left-4 w-16 h-16 bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-lg z-10">
          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
        </div>
      )}

      {/* QWIKKER Badge - Bottom Right */}
      <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 z-10">
        <img
          src="/qwikker-logo-web.svg"
          alt="QWIKKER"
          className="h-4 w-auto"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      </div>

      {/* CTA - Bottom Left */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg z-10">
        <span className="text-black text-xs font-bold">Install QWIKKER Pass</span>
      </div>
    </div>
  )
}

