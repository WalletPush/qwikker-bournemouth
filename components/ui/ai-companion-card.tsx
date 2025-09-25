'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface AiCompanionCardProps {
  title?: string
  description?: string
  prompts: string[]
  walletPassId?: string
  className?: string
}

export function AiCompanionCard({ 
  title = "Ask Your AI Local Guide", 
  description = "Get personalized recommendations from our AI that knows every venue, dish, and secret in the city",
  prompts,
  walletPassId,
  className = ""
}: AiCompanionCardProps) {
  
  const getNavUrl = (href: string) => {
    if (!walletPassId) return href
    return `${href}?wallet_pass_id=${walletPassId}`
  }

  return (
    <Card className={`bg-gradient-to-r from-[#00d083]/10 to-emerald-500/5 border-[#00d083]/30 hover:border-[#00d083]/50 transition-all duration-200 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* AI Avatar - Smaller */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00d083] to-emerald-400 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091z" />
              </svg>
            </div>
          </div>
          
          {/* Content - Compact */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-100 text-sm sm:text-base">{title}</h3>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full animate-pulse"></div>
                <span className="text-xs text-[#00d083] font-medium hidden sm:inline">AI</span>
              </div>
            </div>
            
            <p className="text-slate-300 text-xs sm:text-sm mb-2 line-clamp-2">
              {description}
            </p>
            
            {/* Single prompt hint */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400 italic flex-1 truncate">
                Try: "{prompts[0]}"
              </span>
              
              {/* Compact CTA Button - More Visible */}
              <Button 
                asChild
                size="sm"
                className="bg-[#00d083] hover:bg-[#00b86f] active:bg-[#00a05c] text-black font-semibold text-xs px-4 py-2 h-8 shrink-0 transition-colors duration-150 shadow-sm border border-[#00d083]/20"
              >
                <Link href={getNavUrl('/user/chat')} className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Ask AI</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
