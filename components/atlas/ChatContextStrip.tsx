/**
 * ChatContextStrip Component
 * 
 * Shows last user query + AI response at top of Atlas
 * Keeps user oriented ("what was I looking for?")
 */

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'

interface ChatContextStripProps {
  userQuery?: string
  aiResponse?: string
  onEditQuery?: (query: string) => void
}

export function ChatContextStrip({ userQuery, aiResponse, onEditQuery }: ChatContextStripProps) {
  const [expanded, setExpanded] = useState(false)

  if (!userQuery && !aiResponse) return null

  return (
    <div className="absolute top-40 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 pointer-events-none z-10">
      <div className="pointer-events-auto bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Collapsed View */}
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MessageCircle className="w-4 h-4 text-[#00d083] flex-shrink-0" />
              <span className="text-sm text-white/60 truncate">
                {userQuery || 'Your last request'}
              </span>
              {onEditQuery && userQuery && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditQuery(userQuery)
                  }}
                  className="ml-auto p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                  title="Edit search"
                >
                  <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
          </button>
        )}

        {/* Expanded View */}
        {expanded && (
          <div className="p-4 space-y-3">
            {/* User Query */}
            {userQuery && (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#00d083]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-[#00d083] font-medium">You</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">{userQuery}</p>
              </div>
            )}

            {/* AI Response */}
            {aiResponse && (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-3 h-3 text-white/60" />
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{aiResponse}</p>
              </div>
            )}

            {/* Collapse Button */}
            <button
              onClick={() => setExpanded(false)}
              className="w-full pt-2 flex items-center justify-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              <ChevronUp className="w-3 h-3" />
              <span>Collapse</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
