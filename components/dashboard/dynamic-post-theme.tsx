import React from 'react'

interface DynamicPostThemeProps {
  headline: string
  backgroundImage: string
  logoUrl?: string
  businessName?: string
  style: {
    textColor: string
    textEffect: string
    textPosition: string
    textSize: string
    fontStyle: string
    backgroundOverlay: string
    accentElement: string
  }
}

export function DynamicPostTheme({ 
  headline, 
  backgroundImage, 
  logoUrl, 
  businessName, 
  style 
}: DynamicPostThemeProps) {
  
  // Text Color Mapping
  const getTextColorClass = (color: string) => {
    const colors: Record<string, string> = {
      'white': 'text-white',
      'black': 'text-black',
      'gradient-gold': 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent',
      'gradient-purple': 'bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent',
      'gradient-sunset': 'bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent',
      'neon-green': 'text-[#00ff9d]',
      'neon-pink': 'text-[#ff006e]',
      'neon-blue': 'text-[#00d4ff]',
      'hot-pink': 'text-[#ff006e]',
      'electric-blue': 'text-[#00d4ff]',
      'coral': 'text-[#ff6b6b]',
      'mint': 'text-[#4ecdc4]',
      'lavender': 'text-[#c7b3ff]',
      'crimson': 'text-[#dc143c]'
    }
    return colors[color] || 'text-white'
  }

  // Text Effect Mapping
  const getTextEffect = (effect: string): React.CSSProperties => {
    const effects: Record<string, React.CSSProperties> = {
      'bold-shadow': { textShadow: '0 10px 40px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)' },
      'outline-glow': { textShadow: '0 0 20px currentColor, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' },
      '3d-pop': { textShadow: '3px 3px 0 rgba(0,0,0,0.3), 6px 6px 0 rgba(0,0,0,0.2), 9px 9px 0 rgba(0,0,0,0.1)' },
      'neon': { textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor, 0 0 40px currentColor' },
      'vintage': { textShadow: '2px 2px 0 rgba(139,69,19,0.5), 4px 4px 0 rgba(0,0,0,0.3)', filter: 'sepia(0.3)' },
      'graffiti': { textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 10px currentColor', transform: 'skew(-2deg)' },
      'double-stroke': { WebkitTextStroke: '3px rgba(0,0,0,0.8)', paintOrder: 'stroke fill' },
      'glitch': { textShadow: '2px 2px #ff00de, -2px -2px #00ff9d', animation: 'glitch 0.5s infinite' },
      'metallic': { background: 'linear-gradient(180deg, #fff 0%, #ddd 50%, #fff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 4px 6px rgba(0,0,0,0.4)' },
      'glass': { backdropFilter: 'blur(10px)', textShadow: '0 0 20px rgba(255,255,255,0.5)', opacity: 0.95 },
      'fire': { textShadow: '0 0 20px #ff6600, 0 0 40px #ff3300, 0 0 60px #ff0000' },
      'ice': { textShadow: '0 0 20px #00d4ff, 0 0 40px #0099cc, 0 0 60px #0066ff', filter: 'brightness(1.2)' }
    }
    return effects[effect] || effects['bold-shadow']
  }

  // Text Position Mapping
  const getPositionClass = (position: string) => {
    const positions: Record<string, string> = {
      'top-center': 'items-start justify-center pt-16',
      'center': 'items-center justify-center',
      'bottom-center': 'items-end justify-center pb-16',
      'top-left': 'items-start justify-start pt-12 pl-12',
      'top-right': 'items-start justify-end pt-12 pr-12',
      'bottom-left': 'items-end justify-start pb-12 pl-12',
      'bottom-right': 'items-end justify-end pb-12 pr-12',
      'diagonal-topleft': 'items-start justify-start pt-20 pl-8',
      'diagonal-topright': 'items-start justify-end pt-20 pr-8'
    }
    return positions[position] || 'items-center justify-center'
  }

  // Text Size Mapping
  const getSizeClass = (size: string) => {
    const sizes: Record<string, string> = {
      'massive': 'text-9xl',
      'large': 'text-7xl',
      'medium': 'text-6xl',
      'compact': 'text-5xl'
    }
    return sizes[size] || 'text-7xl'
  }

  // Font Style Mapping
  const getFontStyleClass = (fontStyle: string) => {
    const styles: Record<string, string> = {
      'ultra-bold': 'font-black',
      'bold': 'font-bold',
      'black': 'font-black',
      'condensed': 'font-bold tracking-tighter',
      'wide': 'font-bold tracking-wider',
      'italic-bold': 'font-bold italic'
    }
    return styles[fontStyle] || 'font-black'
  }

  // Background Overlay Mapping
  const getOverlayStyle = (overlay: string) => {
    const overlays: Record<string, string> = {
      'dark-gradient': 'bg-gradient-to-b from-black/60 via-black/40 to-black/70',
      'light-gradient': 'bg-gradient-to-b from-white/30 via-transparent to-black/50',
      'blur-heavy': 'backdrop-blur-xl bg-black/30',
      'blur-light': 'backdrop-blur-sm bg-black/20',
      'vignette': 'bg-radial-gradient from-transparent via-transparent to-black/80',
      'split-tone': 'bg-gradient-to-br from-purple-900/50 to-orange-900/50',
      'duotone': 'bg-gradient-to-r from-blue-900/60 to-pink-900/60',
      'none': ''
    }
    return overlays[overlay] || 'bg-gradient-to-b from-transparent to-black/60'
  }

  // Accent Element Rendering
  const renderAccentElement = (accent: string) => {
    if (accent === 'none') return null
    
    const accents: Record<string, JSX.Element> = {
      'corner-badge': (
        <div className="absolute top-8 right-8 bg-[#00d083] text-black px-4 py-2 rounded-full font-bold text-sm">
          EXCLUSIVE
        </div>
      ),
      'side-stripe': (
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-[#00d083] via-yellow-400 to-pink-500" />
      ),
      'top-banner': (
        <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-r from-[#00d083] to-blue-500 opacity-80" />
      ),
      'bottom-banner': (
        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-r from-purple-600 to-pink-600 opacity-80" />
      ),
      'geometric-shapes': (
        <>
          <div className="absolute top-10 right-10 w-20 h-20 border-4 border-[#00d083]/30 rotate-45" />
          <div className="absolute bottom-10 left-10 w-16 h-16 bg-[#00d083]/20 rounded-full" />
        </>
      ),
      'confetti': (
        <>
          <div className="absolute top-20 left-1/4 w-3 h-3 bg-[#00d083] rounded-full animate-pulse" />
          <div className="absolute top-40 right-1/3 w-2 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="absolute bottom-32 left-1/3 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </>
      )
    }
    
    return accents[accent] || null
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Background Image */}
      <img 
        src={backgroundImage} 
        alt="Background" 
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Background Overlay */}
      <div className={`absolute inset-0 ${getOverlayStyle(style.backgroundOverlay)}`} />
      
      {/* Accent Elements */}
      {renderAccentElement(style.accentElement)}
      
      {/* Business Logo - top left - SAFE ZONE */}
      {logoUrl && (
        <div className="absolute top-8 left-8 w-20 h-20 rounded-xl bg-black/50 backdrop-blur-md p-2.5 border border-white/20 z-40">
          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
        </div>
      )}
      
      {/* Content Container with SAFE ZONES (avoid logo areas) */}
      <div className={`absolute inset-0 flex ${getPositionClass(style.textPosition)}`}>
        <div 
          className="px-16 py-16 max-w-4xl"
          style={{
            paddingTop: '7rem', // Safe zone for business logo
            paddingBottom: '6rem' // Safe zone for QWIKKER logo + CTA
          }}
        >
          <h1 
            className={`
              ${getSizeClass(style.textSize)} 
              ${getFontStyleClass(style.fontStyle)} 
              ${getTextColorClass(style.textColor)}
              leading-[0.95] 
              tracking-tight
              break-words
              hyphens-auto
            `}
            style={{
              ...getTextEffect(style.textEffect),
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              wordBreak: 'break-word'
            }}
          >
            {headline}
          </h1>
        </div>
      </div>
      
      {/* CTA + QWIKKER Logo - Bottom section - ALWAYS VISIBLE */}
      <div className="absolute bottom-0 inset-x-0 z-50">
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
          {/* CTA Text - Left */}
          <span className="text-white text-xs sm:text-sm font-bold drop-shadow-lg whitespace-nowrap">
            Install QWIKKER Pass
          </span>
          
          {/* QWIKKER Logo - Right */}
          <div className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg flex-shrink-0">
            <img 
              src="/Qwikker Logo web.svg" 
              alt="QWIKKER" 
              className="h-3.5 w-auto"
              style={{ 
                filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                minWidth: '60px',
                maxWidth: '80px'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

