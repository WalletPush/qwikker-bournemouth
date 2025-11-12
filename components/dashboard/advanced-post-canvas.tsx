'use client'

import React from 'react'

interface AdvancedPostCanvasProps {
  backgroundImage: string
  headline: string
  caption: string
  logoUrl?: string
  businessName?: string
  style: {
    layout: string // NEW: full-bleed, split-screen, corner-focus, center-burst, diagonal-slice, framed, collage
    imageEffect: string // NEW: blur-heavy, duotone, vignette-dark, high-contrast, desaturate, gradient-overlay, pattern-overlay
    textPlacement: string // overlay, side-panel, top-bar, bottom-bar, circular, diagonal
    textColor: string
    textEffect: string
    accentColor: string // For overlays, patterns, and design elements
  }
}

export function AdvancedPostCanvas({
  backgroundImage,
  headline,
  caption,
  logoUrl,
  businessName,
  style
}: AdvancedPostCanvasProps) {
  
  const getLayoutStyle = () => {
    switch (style.layout) {
      case 'split-screen':
        return {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr'
        }
      case 'corner-focus':
        return {
          clipPath: 'polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)'
        }
      case 'diagonal-slice':
        return {
          clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)'
        }
      case 'framed':
        return {
          padding: '5%',
          boxSizing: 'border-box' as const
        }
      case 'center-burst':
        return {
          clipPath: 'circle(70% at 50% 50%)'
        }
      default: // full-bleed
        return {}
    }
  }

  const getImageEffect = () => {
    const effects: string[] = []
    
    switch (style.imageEffect) {
      case 'blur-heavy':
        effects.push('blur(8px)', 'brightness(0.7)')
        break
      case 'duotone':
        effects.push('grayscale(100%)', 'contrast(1.2)', `hue-rotate(${Math.random() * 360}deg)`)
        break
      case 'vignette-dark':
        effects.push('brightness(0.8)', 'contrast(1.1)')
        break
      case 'high-contrast':
        effects.push('contrast(1.5)', 'saturate(1.3)')
        break
      case 'desaturate':
        effects.push('saturate(0.3)', 'brightness(1.1)')
        break
      case 'gradient-overlay':
        // Handled separately with overlay div
        break
      case 'pattern-overlay':
        // Handled separately with pattern div
        break
    }
    
    return effects.join(' ')
  }

  const getTextColorStyle = () => {
    const gradients: Record<string, string> = {
      'gradient-gold': 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
      'gradient-purple': 'linear-gradient(135deg, #a78bfa 0%, #e879f9 50%, #a78bfa 100%)',
      'gradient-sunset': 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #f97316 100%)',
      'gradient-ocean': 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #0ea5e9 100%)',
      'gradient-fire': 'linear-gradient(135deg, #ff0000 0%, #ff7b00 50%, #ffff00 100%)'
    }

    if (gradients[style.textColor]) {
      return {
        background: gradients[style.textColor],
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }
    }

    const colors: Record<string, string> = {
      'white': '#ffffff',
      'black': '#000000',
      'neon-green': '#00ff9d',
      'neon-pink': '#ff00ff',
      'neon-blue': '#00aaff',
      'hot-pink': '#ff006e',
      'electric-blue': '#00d4ff',
      'coral': '#ff7f50',
      'mint': '#3eb489',
      'lavender': '#e6e6fa',
      'crimson': '#dc143c'
    }

    return { color: colors[style.textColor] || '#ffffff' }
  }

  const getTextEffect = () => {
    const effects: Record<string, React.CSSProperties> = {
      'bold-shadow': { textShadow: '0 10px 40px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)' },
      'outline-glow': { 
        textShadow: '0 0 20px currentColor, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
        WebkitTextStroke: '1px rgba(0,0,0,0.5)'
      },
      '3d-pop': { textShadow: '3px 3px 0 rgba(0,0,0,0.3), 6px 6px 0 rgba(0,0,0,0.2), 9px 9px 0 rgba(0,0,0,0.1)' },
      'neon': { 
        textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor, 0 0 40px currentColor',
        filter: 'brightness(1.2)'
      },
      'metallic': {
        background: 'linear-gradient(to bottom, #e8e8e8, #a0a0a0, #e8e8e8)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 2px 5px rgba(0,0,0,0.5)'
      },
      'glass': {
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 2px 10px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)'
      }
    }
    return effects[style.textEffect] || effects['bold-shadow']
  }

  const renderOverlay = () => {
    if (style.imageEffect === 'gradient-overlay') {
      const gradients = [
        'linear-gradient(135deg, rgba(255,0,150,0.6) 0%, rgba(0,204,255,0.6) 100%)',
        'linear-gradient(135deg, rgba(255,165,0,0.7) 0%, rgba(255,0,0,0.7) 100%)',
        'linear-gradient(135deg, rgba(0,255,157,0.6) 0%, rgba(0,100,255,0.6) 100%)',
        'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)',
        'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 70%)'
      ]
      const randomGradient = gradients[Math.floor(Math.random() * gradients.length)]
      
      return (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ background: randomGradient }}
        />
      )
    }

    if (style.imageEffect === 'pattern-overlay') {
      const patterns = [
        'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)',
        'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
        'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.3) 100%)',
        'conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.1) 0deg, transparent 90deg, rgba(255,255,255,0.1) 180deg, transparent 270deg)'
      ]
      const randomPattern = patterns[Math.floor(Math.random() * patterns.length)]
      
      return (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ background: randomPattern }}
        />
      )
    }

    return null
  }

  const renderTextPlacement = () => {
    const textStyle = {
      ...getTextColorStyle(),
      ...getTextEffect(),
      fontSize: 'clamp(2rem, 6vw, 5rem)',
      fontWeight: 900,
      lineHeight: 1.1,
      letterSpacing: '-0.02em'
    }

    const placements: Record<string, JSX.Element> = {
      'overlay': (
        <div className="absolute inset-0 flex items-center justify-center p-12 text-center">
          <h1 style={textStyle}>{headline}</h1>
        </div>
      ),
      'side-panel': (
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-black/80 backdrop-blur-md flex items-center justify-center p-8">
          <h1 style={textStyle} className="text-center">{headline}</h1>
        </div>
      ),
      'top-bar': (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-8 pt-16">
          <h1 style={textStyle}>{headline}</h1>
        </div>
      ),
      'bottom-bar': (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-8 pb-16">
          <h1 style={textStyle}>{headline}</h1>
        </div>
      ),
      'diagonal': (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            background: 'linear-gradient(135deg, transparent 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.8) 60%, transparent 100%)',
            transform: 'rotate(-5deg) scale(1.2)'
          }}
        >
          <h1 style={{...textStyle, transform: 'rotate(5deg)'}}>{headline}</h1>
        </div>
      ),
      'circular': (
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="rounded-full bg-black/80 backdrop-blur-lg p-12 flex items-center justify-center"
            style={{ width: '70%', aspectRatio: '1' }}
          >
            <h1 style={textStyle} className="text-center">{headline}</h1>
          </div>
        </div>
      )
    }

    return placements[style.textPlacement] || placements['overlay']
  }

  return (
    <div className="relative w-full aspect-square overflow-hidden bg-black">
      {/* Background Image with Effects */}
      <div 
        className="absolute inset-0"
        style={getLayoutStyle()}
      >
        <img
          src={backgroundImage}
          alt="Background"
          className="w-full h-full object-cover"
          style={{ filter: getImageEffect() }}
        />
      </div>

      {/* Gradient/Pattern Overlay */}
      {renderOverlay()}

      {/* Text Content */}
      {renderTextPlacement()}

      {/* Business Logo */}
      {logoUrl && (
        <div className="absolute top-4 left-4 w-16 h-16 bg-black/60 backdrop-blur-md rounded-xl p-2 border border-white/20">
          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
        </div>
      )}

      {/* QWIKKER Logo + CTA */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <div className="bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5">
          <span className="text-white text-xs font-bold">Install QWIKKER Pass</span>
        </div>
        <div className="bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5">
          <img
            src="/Qwikker Logo web.svg"
            alt="QWIKKER"
            className="h-4 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
      </div>
    </div>
  )
}

