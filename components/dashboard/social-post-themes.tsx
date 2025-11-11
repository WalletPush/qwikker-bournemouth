import React from 'react'

export type ThemeType = 'vibrant' | 'minimalist' | 'split' | 'bold' | 'modern'

interface PostThemeProps {
  theme: ThemeType
  headline: string
  caption: string
  backgroundImage: string
  logoUrl?: string
  businessName?: string
}

export function PostTheme({ theme, headline, caption, backgroundImage, logoUrl, businessName }: PostThemeProps) {
  const themes = {
    // 1. VIBRANT - Bold text centered with gradient background
    vibrant: (
      <div className="relative w-full h-full overflow-hidden">
        {/* Background with blur */}
        <img 
          src={backgroundImage} 
          alt="Background" 
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm"
        />
        
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/70 via-pink-900/60 to-orange-900/70" />
        
        {/* Content - Centered */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
          {/* Business Logo at top */}
          {logoUrl && (
            <div className="mb-8">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-20 h-20 object-contain rounded-full bg-white/10 backdrop-blur-md p-3 border-2 border-white/30"
              />
            </div>
          )}
          
          {/* Main Headline */}
          <h1 className="text-6xl font-black text-white mb-6 leading-tight tracking-tight max-w-4xl" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}>
            {headline}
          </h1>
          
          {/* Subtext - ONLY first sentence */}
          <p className="text-xl font-semibold text-white/90 max-w-2xl leading-relaxed" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
            {caption.split('.')[0]}.
          </p>
          
          {/* QWIKKER Logo - SMALL */}
          <img 
            src="/Qwikker Logo web.svg" 
            alt="QWIKKER" 
            className="absolute bottom-6 right-6 h-6 opacity-90"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }}
          />
        </div>
      </div>
    ),

    // 2. MINIMALIST - Clean white background with bold black text
    minimalist: (
      <div className="relative w-full h-full overflow-hidden bg-white">
        {/* Small background image in corner */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 opacity-15">
          <img 
            src={backgroundImage} 
            alt="Background" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Content */}
        <div className="absolute inset-0 p-12 flex flex-col justify-between">
          {/* Business Logo */}
          {logoUrl && (
            <div className="w-16 h-16">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          )}
          
          {/* Main Content - Left aligned */}
          <div className="max-w-3xl">
            <h1 className="text-6xl font-black text-black mb-5 leading-none tracking-tighter">
              {headline}
            </h1>
            <p className="text-lg text-gray-800 font-medium leading-snug">
              {caption.split('.')[0]}.
            </p>
          </div>
          
          {/* Bottom bar with QWIKKER Logo */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">{businessName}</span>
            <img 
              src="/Qwikker Logo web.svg" 
              alt="QWIKKER" 
              className="h-6 opacity-80"
            />
          </div>
        </div>
      </div>
    ),

    // 3. SPLIT - Image left, text right
    split: (
      <div className="relative w-full h-full overflow-hidden flex">
        {/* Left side - Image */}
        <div className="w-1/2 relative">
          <img 
            src={backgroundImage} 
            alt="Background" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/30" />
        </div>
        
        {/* Right side - Content */}
        <div className="w-1/2 bg-gradient-to-br from-slate-900 to-slate-800 p-10 flex flex-col justify-center relative">
          {/* Business Logo */}
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="w-16 h-16 object-contain mb-8 rounded-lg bg-white/10 p-2"
            />
          )}
          
          {/* Headline */}
          <h1 className="text-5xl font-black text-white mb-6 leading-tight">
            {headline}
          </h1>
          
          {/* Caption - ONLY first sentence */}
          <p className="text-base text-white/85 leading-relaxed">
            {caption.split('.')[0]}.
          </p>
          
          {/* QWIKKER Logo - bottom right */}
          <img 
            src="/Qwikker Logo web.svg" 
            alt="QWIKKER" 
            className="absolute bottom-6 right-6 h-6 opacity-80"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }}
          />
        </div>
      </div>
    ),

    // 4. BOLD - Full background with huge centered text
    bold: (
      <div className="relative w-full h-full overflow-hidden">
        {/* Full background */}
        <img 
          src={backgroundImage} 
          alt="Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Strong dark overlay */}
        <div className="absolute inset-0 bg-black/80" />
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
          {/* Business logo top left */}
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="absolute top-8 left-8 w-16 h-16 object-contain rounded-xl bg-white/10 backdrop-blur-md p-2"
            />
          )}
          
          {/* Super bold headline */}
          <h1 
            className="text-7xl font-black text-white mb-6 leading-none tracking-tight uppercase max-w-4xl"
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}
          >
            {headline}
          </h1>
          
          {/* Accent line */}
          <div className="w-24 h-1.5 bg-[#00d083] mb-6" />
          
          {/* Subtitle - ONLY first line */}
          <p className="text-xl font-semibold text-white/90 max-w-2xl leading-relaxed" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
            {caption.split('\n')[0]}
          </p>
          
          {/* QWIKKER Logo - SMALL bottom right */}
          <img 
            src="/Qwikker Logo web.svg" 
            alt="QWIKKER" 
            className="absolute bottom-6 right-6 h-6 opacity-90"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }}
          />
        </div>
      </div>
    ),

    // 5. MODERN - Gradient overlay with stylish text
    modern: (
      <div className="relative w-full h-full overflow-hidden">
        {/* Background */}
        <img 
          src={backgroundImage} 
          alt="Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Gradient overlay - diagonal */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-900/75 to-transparent" />
        
        {/* Content - Bottom left heavy */}
        <div className="absolute inset-0 p-12 flex flex-col justify-end">
          {/* Business Logo at top left */}
          {logoUrl && (
            <div className="absolute top-10 left-10">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-18 h-18 object-contain rounded-2xl bg-white/10 backdrop-blur-xl p-3 border border-white/20"
              />
            </div>
          )}
          
          {/* Main headline - Bottom left */}
          <div className="max-w-4xl mb-4">
            <h1 className="text-6xl font-black text-white leading-tight mb-5" style={{ letterSpacing: '-0.02em', textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}>
              {headline}
            </h1>
            <p className="text-lg text-white/85 font-medium leading-relaxed">
              {caption.split('.')[0]}.
            </p>
          </div>
          
          {/* Bottom row with QWIKKER Logo */}
          <div className="flex items-center justify-between pt-6 border-t border-white/20">
            <span className="text-sm font-semibold text-white/70">{businessName}</span>
            <img 
              src="/Qwikker Logo web.svg" 
              alt="QWIKKER" 
              className="h-6 opacity-80"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }}
            />
          </div>
        </div>
      </div>
    )
  }

  return themes[theme] || themes.vibrant
}

// Theme preview thumbnails for selector
export function ThemeThumbnail({ theme }: { theme: ThemeType }) {
  const styles = {
    vibrant: 'bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600',
    minimalist: 'bg-white border-2 border-gray-300',
    split: 'bg-gradient-to-r from-slate-700 to-slate-900',
    bold: 'bg-black',
    modern: 'bg-gradient-to-tr from-slate-900 via-slate-700 to-slate-500'
  }

  return (
    <div className={`w-full h-full rounded-lg ${styles[theme]} flex items-center justify-center`}>
      <span className="text-xs font-bold text-white capitalize">{theme}</span>
    </div>
  )
}

