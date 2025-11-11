import React from 'react'

export type ThemeType = 'vibrant' | 'minimalist' | 'split' | 'bold' | 'modern'

interface PostThemeProps {
  theme: ThemeType
  headline: string
  caption: string
  backgroundImage: string
  logoUrl?: string
  businessName?: string
  style?: {
    textColor: string
    textEffect: string
    layout: string
    mood: string
  }
}

export function PostTheme({ theme, headline, caption, backgroundImage, logoUrl, businessName, style }: PostThemeProps) {
  // NOTE: Caption is NOT shown on the image - it's for the Instagram post text below!
  // Only the HEADLINE appears on the image
  
  // Apply AI-generated styles
  const getTextColorClass = (color: string) => {
    const colors: Record<string, string> = {
      'white': 'text-white',
      'black': 'text-black',
      'gradient-gold': 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent',
      'neon-green': 'text-[#00ff9d]',
      'hot-pink': 'text-[#ff006e]',
      'electric-blue': 'text-[#00d4ff]'
    }
    return colors[color] || 'text-white'
  }
  
  const getTextEffect = (effect: string) => {
    const effects: Record<string, React.CSSProperties> = {
      'bold-shadow': { textShadow: '0 10px 40px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)' },
      'outline-glow': { textShadow: '0 0 20px currentColor, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000', WebkitTextStroke: '1px rgba(0,0,0,0.5)' },
      '3d-pop': { textShadow: '3px 3px 0 rgba(0,0,0,0.3), 6px 6px 0 rgba(0,0,0,0.2), 9px 9px 0 rgba(0,0,0,0.1)' },
      'neon': { textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor, 0 0 40px currentColor' },
      'vintage': { textShadow: '2px 2px 0 rgba(139,69,19,0.5), 4px 4px 0 rgba(0,0,0,0.3)', filter: 'sepia(0.3)' },
      'graffiti': { textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 10px currentColor', transform: 'skew(-2deg)' }
    }
    return effects[effect] || effects['bold-shadow']
  }
  
  const textColor = style?.textColor || 'white'
  const textEffect = style?.textEffect || 'bold-shadow'
  
  const themes = {
    // 1. VIBRANT - Bold centered design
    vibrant: (
      <div className="relative w-full h-full overflow-hidden bg-black">
        {/* Background with heavy blur */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center blur-md scale-110 opacity-40"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-pink-900/50 to-orange-900/60" />
        
        {/* Business Logo - top left - SAFE ZONE */}
        {logoUrl && (
          <div className="absolute top-8 left-8 w-20 h-20 rounded-xl bg-black/50 backdrop-blur-md p-2.5 border border-white/20 z-40">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        
        {/* Content - SAFE ZONES */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-16" style={{ paddingTop: '7rem', paddingBottom: '6rem' }}>
          <h1 
            className={`text-7xl font-black ${getTextColorClass(textColor)} text-center leading-[0.9] tracking-tight max-w-4xl`}
            style={getTextEffect(textEffect)}
          >
            {headline}
          </h1>
        </div>
        
        {/* CTA + QWIKKER Logo - Bottom */}
        <div className="absolute bottom-0 inset-x-0 z-50">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
            <span className="text-white text-sm font-bold drop-shadow-lg">📱 Install QWIKKER Pass</span>
            <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <img 
                src="/Qwikker Logo web.svg" 
                alt="QWIKKER" 
                className="h-4 w-auto"
                style={{ 
                  filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                  minWidth: '70px',
                  maxWidth: '90px'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),

    // 2. MINIMALIST - Clean and modern
    minimalist: (
      <div className="relative w-full h-full overflow-hidden bg-white">
        {/* Subtle background pattern */}
        <div 
          className="absolute top-0 right-0 w-2/5 h-2/5 bg-cover bg-center opacity-8"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
        
        {/* Business Logo - top left - SAFE ZONE */}
        {logoUrl && (
          <div className="absolute top-8 left-8 w-20 h-20 z-40">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        
        {/* Content - SAFE ZONES */}
        <div className="absolute inset-0 flex items-center justify-center px-16" style={{ paddingTop: '7rem', paddingBottom: '6rem' }}>
          <div className="max-w-4xl">
            <h1 className="text-7xl font-black text-black leading-[0.85] tracking-tighter">
              {headline}
            </h1>
          </div>
        </div>
        
        {/* CTA + QWIKKER Logo - Bottom */}
        <div className="absolute bottom-0 inset-x-0 z-50">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-t from-white via-white/90 to-transparent">
            <span className="text-black text-sm font-bold">📱 Install QWIKKER Pass</span>
            <div className="bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-200">
              <img 
                src="/Qwikker Logo web.svg" 
                alt="QWIKKER" 
                className="h-4 w-auto"
                style={{ 
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  minWidth: '70px',
                  maxWidth: '90px'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),

    // 3. SPLIT - Image + Content side by side
    split: (
      <div className="relative w-full h-full overflow-hidden flex">
        {/* Left: Full image */}
        <div className="w-1/2 relative">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        </div>
        
        {/* Right: Content on dark */}
        <div className="w-1/2 bg-gradient-to-br from-slate-950 to-slate-900 relative">
          {/* Business logo - top left - SAFE ZONE */}
          {logoUrl && (
            <div className="absolute top-8 left-8 w-20 h-20 rounded-lg bg-white/10 backdrop-blur-md p-2.5 z-40">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          
          {/* Content - SAFE ZONES */}
          <div className="absolute inset-0 flex items-center justify-center px-12" style={{ paddingTop: '7rem', paddingBottom: '6rem' }}>
            <h1 className="text-6xl font-black text-white leading-tight">
              {headline}
            </h1>
          </div>
          
          {/* CTA + QWIKKER Logo - Bottom */}
          <div className="absolute bottom-0 inset-x-0 z-50">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
              <span className="text-white text-sm font-bold drop-shadow-lg">📱 Install QWIKKER Pass</span>
              <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <img 
                  src="/Qwikker Logo web.svg" 
                  alt="QWIKKER" 
                  className="h-4 w-auto"
                  style={{ 
                    filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                    minWidth: '70px',
                    maxWidth: '90px'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    ),

    // 4. BOLD - Massive impact
    bold: (
      <div className="relative w-full h-full overflow-hidden bg-black">
        {/* Background image - darkened */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
        
        {/* Business logo - top left - SAFE ZONE */}
        {logoUrl && (
          <div className="absolute top-8 left-8 w-20 h-20 rounded-xl bg-black/50 backdrop-blur-md p-2.5 border border-white/20 z-40">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        
        {/* Content - SAFE ZONES */}
        <div className="absolute inset-0 flex items-center justify-center text-center px-16" style={{ paddingTop: '7rem', paddingBottom: '6rem' }}>
          <h1 
            className="text-8xl font-black text-white leading-[0.85] tracking-tighter max-w-5xl uppercase"
            style={{ 
              textShadow: '0 20px 80px rgba(0,0,0,1)',
              WebkitTextStroke: '3px rgba(0,0,0,0.5)'
            }}
          >
            {headline}
          </h1>
        </div>
        
        {/* CTA + QWIKKER Logo - Bottom */}
        <div className="absolute bottom-0 inset-x-0 z-50">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
            <span className="text-white text-sm font-bold drop-shadow-lg">📱 Install QWIKKER Pass</span>
            <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <img 
                src="/Qwikker Logo web.svg" 
                alt="QWIKKER" 
                className="h-4 w-auto"
                style={{ 
                  filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                  minWidth: '70px',
                  maxWidth: '90px'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),

    // 5. MODERN - Sleek gradient
    modern: (
      <div className="relative w-full h-full overflow-hidden">
        {/* Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
        
        {/* Gradient overlay - bottom heavy */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        
        {/* Business logo - top left - SAFE ZONE */}
        {logoUrl && (
          <div className="absolute top-8 left-8 w-20 h-20 rounded-2xl bg-black/50 backdrop-blur-xl p-2.5 border border-white/10 z-40">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        
        {/* Content - SAFE ZONES */}
        <div className="absolute inset-0 flex items-center justify-center px-16" style={{ paddingTop: '7rem', paddingBottom: '6rem' }}>
          <h1 
            className="text-6xl font-black text-white leading-tight max-w-4xl"
            style={{ 
              textShadow: '0 10px 40px rgba(0,0,0,1)',
              letterSpacing: '-0.02em'
            }}
          >
            {headline}
          </h1>
        </div>
        
        {/* CTA + QWIKKER Logo - Bottom */}
        <div className="absolute bottom-0 inset-x-0 z-50">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
            <span className="text-white text-sm font-bold drop-shadow-lg">📱 Install QWIKKER Pass</span>
            <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <img 
                src="/Qwikker Logo web.svg" 
                alt="QWIKKER" 
                className="h-4 w-auto"
                style={{ 
                  filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                  minWidth: '70px',
                  maxWidth: '90px'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return themes[theme] || themes.vibrant
}

// Theme preview thumbnails
export function ThemeThumbnail({ theme }: { theme: ThemeType }) {
  const styles = {
    vibrant: 'bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600',
    minimalist: 'bg-white border-2 border-gray-300',
    split: 'bg-gradient-to-r from-slate-400 to-slate-900',
    bold: 'bg-black',
    modern: 'bg-gradient-to-t from-black via-slate-700 to-slate-400'
  }

  return (
    <div className={`w-full h-full rounded-md ${styles[theme]} flex items-center justify-center p-2`}>
      <span className="text-[10px] font-bold text-white capitalize tracking-wide">{theme}</span>
    </div>
  )
}

