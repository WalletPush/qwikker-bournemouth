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
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-16">
          {/* Headline - Bold with AI STYLES (sized to fit) */}
          <h1 
            className={`text-7xl font-black ${getTextColorClass(textColor)} text-center leading-[0.9] tracking-tight max-w-4xl px-8`}
            style={getTextEffect(textEffect)}
          >
            {headline}
          </h1>
        </div>
        
      {/* Business Logo - top left, BIGGER */}
      {logoUrl && (
        <div className="absolute top-8 left-8 w-24 h-24 rounded-xl bg-black/30 backdrop-blur-md p-3 border border-white/20">
          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
        </div>
      )}
      
      {/* QWIKKER Logo - ALWAYS VISIBLE - bottom right corner */}
      <div className="absolute bottom-6 right-6 z-50 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg">
        <img 
          src="/Qwikker Logo web.svg" 
          alt="QWIKKER" 
          className="h-5 w-auto"
          style={{ 
            filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
            minWidth: '80px',
            maxWidth: '100px'
          }}
        />
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
        
        {/* Content area */}
        <div className="absolute inset-0 p-16 flex flex-col justify-between">
          {/* Top: Business logo - BIGGER */}
          {logoUrl && (
            <div className="w-24 h-24">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          
          {/* Center: Main content */}
          <div className="max-w-4xl px-8">
            <h1 className="text-7xl font-black text-black leading-[0.85] tracking-tighter">
              {headline}
            </h1>
          </div>
          
          {/* Bottom: Business name */}
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-gray-500">{businessName}</span>
          </div>
        </div>
        
        {/* QWIKKER Logo - ALWAYS VISIBLE - bottom right corner */}
        <div className="absolute bottom-6 right-6 z-50 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg">
          <img 
            src="/Qwikker Logo web.svg" 
            alt="QWIKKER" 
            className="h-5 w-auto"
            style={{ 
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
              minWidth: '80px',
              maxWidth: '100px'
            }}
          />
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
        <div className="w-1/2 bg-gradient-to-br from-slate-950 to-slate-900 p-12 flex flex-col justify-center relative">
          {/* Headline - ONLY text on image */}
          <h1 className="text-6xl font-black text-white leading-tight px-6">
            {headline}
          </h1>
          
          {/* Business logo - top of right panel - BIGGER */}
          {logoUrl && (
            <div className="w-24 h-24 rounded-lg bg-white/10 p-3 mb-auto">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          
          {/* QWIKKER logo - ALWAYS VISIBLE - bottom right corner */}
          <div className="absolute bottom-6 right-6 z-50 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg">
            <img 
              src="/Qwikker Logo web.svg" 
              alt="QWIKKER" 
              className="h-5 w-auto"
              style={{ 
                filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                minWidth: '80px',
                maxWidth: '100px'
              }}
            />
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
        
        {/* Content centered */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-20 text-center">
          {/* MASSIVE headline - ONLY text (sized to fit) */}
          <h1 
            className="text-8xl font-black text-white leading-[0.85] tracking-tighter max-w-5xl uppercase px-12"
            style={{ 
              textShadow: '0 20px 80px rgba(0,0,0,1)',
              WebkitTextStroke: '3px rgba(0,0,0,0.5)'
            }}
          >
            {headline}
          </h1>
        </div>
        
        {/* Business logo - top left corner */}
        {logoUrl && (
          <div className="absolute top-8 left-8 w-16 h-16 rounded-xl bg-white/10 backdrop-blur-md p-2">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        
        {/* QWIKKER Logo - ALWAYS VISIBLE - bottom right corner */}
        <div className="absolute bottom-6 right-6 z-50 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg">
          <img 
            src="/Qwikker Logo web.svg" 
            alt="QWIKKER" 
            className="h-5 w-auto"
            style={{ 
              filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
              minWidth: '80px',
              maxWidth: '100px'
            }}
          />
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
        
        {/* Content at bottom */}
        <div className="absolute inset-0 p-14 flex flex-col justify-end">
          {/* Headline - ONLY text on image */}
          <h1 
            className="text-6xl font-black text-white leading-tight max-w-4xl px-6"
            style={{ 
              textShadow: '0 10px 40px rgba(0,0,0,1)',
              letterSpacing: '-0.02em'
            }}
          >
            {headline}
          </h1>
          
          {/* Bottom bar */}
          <div className="flex items-center justify-between pt-6 border-t border-white/20">
            <span className="text-sm font-bold text-white/60">{businessName}</span>
          </div>
        </div>
        
        {/* Business logo - top left - BIGGER */}
        {logoUrl && (
          <div className="absolute top-8 left-8 w-24 h-24 rounded-2xl bg-black/30 backdrop-blur-xl p-3 border border-white/10">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        
        {/* QWIKKER Logo - ALWAYS VISIBLE - bottom right corner */}
        <div className="absolute bottom-6 right-6 z-50 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg">
          <img 
            src="/Qwikker Logo web.svg" 
            alt="QWIKKER" 
            className="h-5 w-auto"
            style={{ 
              filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
              minWidth: '80px',
              maxWidth: '100px'
            }}
          />
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

