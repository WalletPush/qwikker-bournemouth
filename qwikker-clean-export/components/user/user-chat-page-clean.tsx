'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function UserChatPageClean({ currentUser }: { currentUser?: any }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize chat with personalized welcome
  useEffect(() => {
    if (!isInitialized) {
      const userName = currentUser?.name || 'Explorer'
      const userLevel = currentUser?.level || 1
      const userTier = currentUser?.tier || 'explorer'
      
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Hey ${userName}! 👋 Welcome back, Level ${userLevel} ${userTier.charAt(0).toUpperCase() + userTier.slice(1)}! I'm your local guide for Bournemouth. What are you in the mood for today?`,
        timestamp: new Date().toISOString()
      }
      
      setMessages([welcomeMessage])
      setIsInitialized(true)
    }
  }, [currentUser, isInitialized])

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    // Simulate realistic AI response with real business data
    setTimeout(() => {
      const query = text.toLowerCase()
      let response = ""
      
      if (query.includes('coffee') || query.includes('cafe')) {
        response = "Perfect! I found some amazing coffee spots for you:\n\n☕ **Artisan Coffee Co.** - Locally roasted, ethically sourced\n📍 42 Old Christchurch Rd • 4.9★ • 0.5 miles\n🔥 Currently has 2 offers!\n\n☕ **The Seaside Bistro** - Fresh coffee with ocean views\n📍 15 Pier Approach • 4.8★ • 0.3 miles\n🤫 Has secret menu items!"
      } else if (query.includes('dinner') || query.includes('restaurant') || query.includes('food')) {
        response = "Great choice! Here are some fantastic dinner options:\n\n🍔 **Jerry's Burgers** - Best burgers in Bournemouth\n📍 123 High Street • 4.7★ • 0.2 miles\n🤫 Has secret menu items!\n🔥 50% off burgers today!\n\n🍽️ **The Seaside Bistro** - Fresh seafood with ocean views\n📍 15 Pier Approach • 4.8★ • 0.3 miles\n⭐ Qwikker Pick!"
      } else if (query.includes('secret') || query.includes('hidden')) {
        response = "Ooh, you want the insider secrets! 🤫\n\n**Jerry's Burgers** has a secret item:\n🍔 **The Underground Burger** - £14.75\nDouble beef, secret sauce, crispy onions\n\nJust ask your server for \"The Underground\" or show them this message!"
      } else if (query.includes('offers') || query.includes('deals')) {
        response = "Here are the hottest deals right now:\n\n🔥 **Jerry's Burgers** - 50% off all burgers\n⏰ Valid until tomorrow\n\n🔥 **Artisan Coffee Co.** - Buy 2 get 1 free\n⏰ Ends today at 6pm\n\nWant me to help you claim any of these?"
      } else {
        response = "I'd love to help you discover Bournemouth! I know about:\n\n☕ Amazing coffee spots\n🍽️ Great restaurants\n🤫 Secret menu items\n🔥 Current offers\n⭐ Qwikker picks\n\nWhat sounds good to you?"
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1200)
  }

  const quickSuggestions = [
    "Great coffee",
    "Dinner spots", 
    "Secret menus",
    "Current offers",
    "Open now",
    "Best rated"
  ]

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Compact Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/30 bg-slate-800/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI Local Guide</h2>
            <p className="text-xs text-slate-400">Discover Bournemouth's best</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-green-400 text-xs">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
          Online
        </div>
      </div>

      {/* Messages Area - WhatsApp Style */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-900/20">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] sm:max-w-[70%] ${
              message.type === 'user' 
                ? 'bg-[#00d083] text-black rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl' 
                : 'bg-slate-800/80 text-slate-100 rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl'
            } px-3 py-2 shadow-lg relative`}>
              <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.type === 'user' ? 'text-black/60' : 'text-slate-400'
              }`}>
                {new Date(message.timestamp).toLocaleTimeString('en-GB', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800/60 rounded-2xl px-4 py-2.5 shadow-lg">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-700/30 bg-slate-800/20">
        {/* Quick Suggestions - Only show for first message */}
        {messages.length === 1 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-2 justify-center">
              {quickSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(suggestion)}
                  className="px-3 py-1.5 bg-slate-700/40 hover:bg-[#00d083]/20 text-slate-400 hover:text-[#00d083] rounded-full text-xs transition-all duration-200 border border-slate-600/30 hover:border-[#00d083]/30"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
              placeholder="Ask about restaurants, offers, secret menus..."
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-[#00d083]/50 focus:ring-1 focus:ring-[#00d083]/20"
              disabled={isTyping}
            />
          </div>
          <Button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isTyping}
            className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05f] text-black px-4 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  )
}
