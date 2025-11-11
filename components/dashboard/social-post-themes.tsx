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
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-pink-900/50 to-orange-900/60" />
        
        {/* Content - Centered */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
          {/* Logo at top */}
          {logoUrl && (
            <div className="mb-8">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-20 h-20 object-contain rounded-full bg-white/10 backdrop-blur-md p-3 border-2 border-white/30"
              />
            </div>
          )}
          
          {/* Main Headline - HUGE */}
          <h1 className="text-6xl font-black text-white mb-6 leading-tight tracking-tight drop-shadow-2xl">
            {headline}
          </h1>
          
          {/* Subtext - First line of caption */}
          <p className="text-2xl font-semibold text-white/95 max-w-2xl leading-relaxed drop-shadow-lg">
            {caption.split('\n')[0]}
          </p>
          
          {/* QWIKKER Badge */}
          <div className="absolute bottom-8 right-8 bg-[#00d083] text-black px-4 py-2 rounded-full font-bold text-sm shadow-xl">
            QWIKKER
          </div>
        </div>
      </div>
    ),

    // 2. MINIMALIST - Clean white background with bold black text
    minimalist: (
      <div className="relative w-full h-full overflow-hidden bg-white">
        {/* Small background image in corner */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 opacity-20">
          <img 
            src={backgroundImage} 
            alt="Background" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Content */}
        <div className="absolute inset-0 p-12 flex flex-col justify-between">
          {/* Logo */}
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
          <div className="max-w-2xl">
            <h1 className="text-7xl font-black text-black mb-6 leading-none tracking-tighter">
              {headline}
            </h1>
            <p className="text-2xl text-gray-800 font-medium leading-snug">
              {caption.split('\n')[0]}
            </p>
          </div>
          
          {/* Bottom bar with QWIKKER */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">{businessName}</span>
            <div className="bg-[#00d083] text-white px-4 py-2 rounded-full font-bold text-sm">
              QWIKKER
            </div>
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
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/50" />
        </div>
        
        {/* Right side - Content */}
        <div className="w-1/2 bg-gradient-to-br from-slate-900 to-slate-800 p-10 flex flex-col justify-center">
          {/* Logo */}
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
          
          {/* Caption */}
          <p className="text-lg text-white/90 leading-relaxed mb-8">
            {caption.split('\n')[0]}
          </p>
          
          {/* QWIKKER Badge */}
          <div className="inline-block bg-[#00d083] text-black px-4 py-2 rounded-full font-bold text-sm self-start">
            QWIKKER
          </div>
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
        <div className="absolute inset-0 bg-black/70" />
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-16 text-center">
          {/* Super bold headline */}
          <h1 
            className="text-8xl font-black text-white mb-8 leading-none tracking-tighter uppercase"
            style={{ textShadow: '0 8px 32px rgba(0,0,0,0.8)' }}
          >
            {headline.split(' ').slice(0, 3).join(' ')}
          </h1>
          
          {/* Accent line */}
          <div className="w-32 h-2 bg-[#00d083] mb-8" />
          
          {/* Subtitle */}
          <p className="text-3xl font-bold text-white/95 max-w-3xl">
            {caption.split('\n')[0]}
          </p>
          
          {/* Logo and Badge at bottom */}
          <div className="absolute bottom-12 left-0 right-0 flex items-center justify-between px-12">
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-16 h-16 object-contain rounded-full bg-white/20 backdrop-blur-md p-2"
              />
            )}
            <div className="bg-[#00d083] text-black px-5 py-2 rounded-full font-black text-base shadow-2xl">
              QWIKKER
            </div>
          </div>
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
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-900/70 to-transparent" />
        
        {/* Content - Bottom left heavy */}
        <div className="absolute inset-0 p-12 flex flex-col justify-end">
          {/* Logo at top left */}
          {logoUrl && (
            <div className="absolute top-12 left-12">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-20 h-20 object-contain rounded-2xl bg-white/10 backdrop-blur-xl p-3 border border-white/20"
              />
            </div>
          )}
          
          {/* Main headline - Bottom left */}
          <div className="max-w-3xl mb-4">
            <h1 className="text-7xl font-black text-white leading-tight mb-6" style={{ letterSpacing: '-0.03em' }}>
              {headline}
            </h1>
            <p className="text-2xl text-white/90 font-medium leading-relaxed">
              {caption.split('\n')[0]}
            </p>
          </div>
          
          {/* Bottom row */}
          <div className="flex items-center justify-between pt-6 border-t border-white/20">
            <span className="text-sm font-semibold text-white/70">{businessName}</span>
            <div className="bg-[#00d083] text-black px-5 py-2 rounded-full font-black text-sm">
              QWIKKER
            </div>
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

