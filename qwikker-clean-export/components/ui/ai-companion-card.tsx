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
        <div className="text-center">
          {/* AI Avatar - Centered with subtle AI badge */}
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-[#00d083] to-emerald-400 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Title - Clean and Centered */}
          <div className="mb-2">
            <h3 className="font-semibold text-slate-100 text-sm sm:text-base mb-2">{title}</h3>
            <p className="text-slate-300 text-xs sm:text-sm mb-3 line-clamp-2">
              {description}
            </p>
          </div>
          
          {/* Prompt and Button - All Centered */}
          <p className="text-xs text-slate-400 italic mb-3">
            Try: "{prompts[0]}"
          </p>
          
          {/* Clean Centered Button */}
          <Button 
            asChild
            size="sm"
            className="bg-[#00d083] hover:bg-[#00b86f] active:bg-[#00a05c] text-black font-semibold text-xs px-6 py-2 h-8 transition-colors duration-150 shadow-sm border border-[#00d083]/20"
          >
            <Link href={getNavUrl('/user/chat')}>
              Ask AI
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
