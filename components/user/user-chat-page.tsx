'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BusinessCarousel } from '@/components/ui/business-carousel'
import { useState, useEffect, useRef } from 'react'
import React from 'react'
import Link from 'next/link'

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: string
  sources?: Array<{
    type: 'business' | 'city'
    businessName?: string
    content: string
    similarity: number
  }>
  quickReplies?: string[]
  businessCarousel?: Array<{
    id: string
    business_name: string
    business_tagline?: string
    business_category?: string
    business_tier: 'free_trial' | 'featured' | 'qwikker_picks' | 'recommended'
    business_address?: string
    business_town?: string
    logo?: string
    business_images?: string[]
    rating?: number
    offers_count?: number
  }>
  walletActions?: Array<{
    type: 'add_to_wallet'
    offerId: string
    offerName: string
    businessName: string
    businessId: string
  }>
}

export function UserChatPage({ currentUser }: { currentUser?: any }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Session storage key for chat memory
  const chatSessionKey = `qwikker-chat-session-${currentUser?.wallet_pass_id || 'guest'}`

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat history from session storage or initialize with welcome message
  useEffect(() => {
    try {
      // Try to load existing session
      const savedMessages = sessionStorage.getItem(chatSessionKey)
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages)
        // Only restore if messages are from today (session-based, not persistent)
        const latestMessage = parsedMessages[parsedMessages.length - 1]
        const messageDate = new Date(latestMessage.timestamp).toDateString()
        const today = new Date().toDateString()
        
        if (messageDate === today && parsedMessages.length > 0) {
          console.log('🔄 Restoring chat session with', parsedMessages.length, 'messages')
          setMessages(parsedMessages)
          return
        }
      }
    } catch (error) {
      console.log('📝 No valid chat session found, starting fresh')
    }

    // Create fresh welcome message if no valid session
    const userName = currentUser?.name?.split(' ')[0] || 'Explorer'
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'ai',
      content: `Hey ${userName}! 👋 I'm your local Bournemouth guide and I'm here to make your experience amazing. I know all the best spots, current deals, and can even add offers straight to your wallet! What are you in the mood for?`,
      timestamp: new Date().toISOString(),
      quickReplies: [
        "Show me Qwikker Picks",
        "Find restaurants",
        "Current deals"
      ]
    }
    setMessages([welcomeMessage])
  }, [currentUser, chatSessionKey])

  // Save messages to session storage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(chatSessionKey, JSON.stringify(messages))
      } catch (error) {
        console.log('💾 Could not save chat session:', error)
      }
    }
  }, [messages, chatSessionKey])

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isTyping) return

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    try {
      // Call the real AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          walletPassId: currentUser?.wallet_pass_id,
          conversationHistory: messages.slice(-6).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        })
      })

      const data = await response.json()

      // Add AI response
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response || "I'm having trouble accessing my knowledge base right now. Please try again in a moment!",
        timestamp: new Date().toISOString(),
        sources: data.sources || [],
        quickReplies: data.quickReplies || [],
        businessCarousel: data.businessCarousel,
        walletActions: data.walletActions
      }

      setMessages(prev => [...prev, aiMessage])

        } catch (error) {
      console.error('❌ AI Chat error:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm experiencing some technical difficulties right now. Please try again in a moment!",
        timestamp: new Date().toISOString(),
        quickReplies: ['Try again', 'Show me offers', 'Find restaurants']
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleShowOffers = async (businessId: string, businessName: string) => {
    // Add a user message asking for offers
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: `Show me offers from ${businessName}`,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    try {
      // Call the AI API to get offers for this specific business
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Show me all current offers and deals from ${businessName}. Include details like discount amount, terms, and expiry dates. Ask if I want to add any to my wallet.`,
          walletPassId: currentUser?.wallet_pass_id,
          conversationHistory: messages.slice(-4).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        })
      })

      const data = await response.json()

      // Add AI response with offers
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response || `Here are the current offers from ${businessName}!`,
        timestamp: new Date().toISOString(),
        sources: data.sources || [],
        quickReplies: ['Add to wallet', 'Tell me more', 'Show other businesses']
      }

      setMessages(prev => [...prev, aiMessage])

    } catch (error) {
      console.error('❌ Error fetching offers:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Sorry, I couldn't fetch the offers from ${businessName} right now. You can visit their page directly or try again in a moment!`,
        timestamp: new Date().toISOString(),
        quickReplies: ['Try again', 'Show other businesses']
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleAddToWallet = async (offerId: string, offerName: string, businessName: string) => {
    if (!currentUser?.wallet_pass_id) {
      alert('You need to sign up through the GHL form first to get your Qwikker wallet pass')
      return
    }

    try {
      const response = await fetch('/api/ai/add-to-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userWalletPassId: currentUser.wallet_pass_id,
          offerId: offerId,
          businessName: businessName
        })
      })

      const result = await response.json()

      if (result.success) {
        // Add success message to chat
        const successMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: `🎉 Perfect! "${offerName}" has been added to your wallet pass! It expires in 12 hours, so make sure to use it soon. Check your wallet to see the details!`,
          timestamp: new Date().toISOString(),
          quickReplies: ['Show me more offers', 'Find restaurants', 'What else is available?']
        }
        setMessages(prev => [...prev, successMessage])
      } else {
        // Add error message to chat
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: `Sorry, I couldn't add that offer to your wallet right now. ${result.error || 'Please try again in a moment.'}`,
          timestamp: new Date().toISOString(),
          quickReplies: ['Try again', 'Show me other offers', 'Contact support']
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('❌ Wallet action error:', error)
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: "I'm having trouble adding that to your wallet right now. Please try again in a moment!",
        timestamp: new Date().toISOString(),
        quickReplies: ['Try again', 'Show me other offers', 'Contact support']
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleQuickReply = (reply: string) => {
    handleSendMessage(reply)
  }


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(inputValue)
    }
  }

  // Helper function to process AI response and make business names clickable
  const processAIResponse = (content: string, sources: any[] = []) => {
    let processedContent = content

    // Extract business names from sources
    const businessNames = sources
      .filter(source => source.type === 'business' && source.businessName)
      .map(source => source.businessName)

    // Convert **text** to bold and make business names clickable
    processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, (match, text) => {
      // Check if this bold text is a business name
      const isBusinessName = businessNames.some(name => 
        text.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(text.toLowerCase())
      )
      
      if (isBusinessName) {
        // Find the actual business name
        const businessName = businessNames.find(name => 
          text.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(text.toLowerCase())
        )
        // Return as clickable business link
        return `<strong class="business-link cursor-pointer text-[#00d083] hover:text-[#00b86f] underline" data-business="${businessName}">${text}</strong>`
      } else {
        // Just return as bold
        return `<strong>${text}</strong>`
      }
    })

    return processedContent
  }

  // Handle business name clicks
  const handleBusinessClick = (businessName: string) => {
    // Convert business name to slug format (lowercase, spaces to hyphens)
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const url = `/user/business/${slug}${currentUser?.wallet_pass_id ? `?wallet_pass_id=${currentUser.wallet_pass_id}` : ''}`
    window.location.href = url
  }

  // Clear chat session
  const handleClearChat = () => {
    try {
      sessionStorage.removeItem(chatSessionKey)
      // Reinitialize with welcome message
      const userName = currentUser?.name?.split(' ')[0] || 'Explorer'
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Hey ${userName}! 👋 I'm your local Bournemouth guide and I'm here to make your experience amazing. I know all the best spots, current deals, and can even add offers straight to your wallet! What are you in the mood for?`,
        timestamp: new Date().toISOString(),
        quickReplies: [
          "Show me Qwikker Picks",
          "Find restaurants",
          "Current deals"
        ]
      }
      setMessages([welcomeMessage])
      console.log('🗑️ Chat session cleared')
    } catch (error) {
      console.log('❌ Could not clear chat session:', error)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out both;
        }
      `}</style>
      
      {/* Header */}
      <div className="mb-6 text-center relative">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="relative">
            <div className="p-3 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.091zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00d083] via-blue-400 to-purple-400 bg-clip-text text-transparent">
              AI Companion
            </h1>
            <p className="text-slate-400 text-sm">Your local Bournemouth guide</p>
          </div>
        </div>
        
        {/* Clear Chat Button - Only show if there are multiple messages */}
        {messages.length > 1 && (
          <button
            onClick={handleClearChat}
            className="absolute top-0 right-0 p-2 text-slate-500 hover:text-slate-300 transition-colors duration-200 opacity-60 hover:opacity-100"
            title="Start new conversation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Chat Container with Rounded Edges */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-3xl border border-slate-600/50 shadow-2xl overflow-hidden backdrop-blur-sm">
        
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                
                {/* Message Bubble */}
                <div className={`rounded-2xl px-4 py-3 shadow-lg ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black shadow-[#00d083]/20' 
                    : 'bg-gradient-to-r from-slate-700/90 to-slate-600/90 text-slate-100 border border-slate-600/50'
                }`}>
                  {message.type === 'ai' ? (
                    <div 
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: processAIResponse(message.content, message.sources) 
                      }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement
                        if (target.classList.contains('business-link')) {
                          const businessName = target.getAttribute('data-business')
                          if (businessName) {
                            handleBusinessClick(businessName)
                          }
                        }
                      }}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                
                {/* Business Carousel */}
                {message.businessCarousel && message.businessCarousel.length > 0 && (
                  <div className="mt-3 -mx-2 sm:mx-0">
                    <BusinessCarousel 
                      businesses={message.businessCarousel}
                      currentUser={currentUser}
                      className="w-full"
                      onShowOffers={handleShowOffers}
                    />
                  </div>
                )}

                {/* Wallet Actions */}
                {message.walletActions && message.walletActions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-400 mb-2 px-2">🎫 Add to wallet:</p>
                    <div className="flex flex-col gap-2">
                      {message.walletActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => handleAddToWallet(action.offerId, action.offerName, action.businessName)}
                          className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-[#00d083]/20 flex items-center justify-between group"
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-semibold">{action.offerName}</span>
                            <span className="text-xs opacity-80">at {action.businessName}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs mr-2 opacity-80">Add to Wallet</span>
                            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Simplified Quick Replies - Only show for AI messages and limit to 3 */}
                {message.type === 'ai' && message.quickReplies && message.quickReplies.length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2 justify-start">
                      {message.quickReplies.slice(0, 3).map((reply, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickReply(reply)}
                          className="bg-slate-700/40 hover:bg-[#00d083]/20 text-slate-300 hover:text-[#00d083] px-3 py-1.5 rounded-full text-xs transition-all duration-200 border border-slate-600/30 hover:border-[#00d083]/50"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Timestamp */}
                <p className="text-xs text-slate-400 mt-2 px-2">
                  {new Date(message.timestamp).toLocaleTimeString('en-GB', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
          
          {/* Enhanced Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-gradient-to-r from-slate-700/90 to-slate-600/90 border border-slate-600/50 rounded-2xl px-4 py-3 shadow-lg animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-2.5 h-2.5 bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-full animate-bounce shadow-lg shadow-[#00d083]/50"></div>
                    <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full animate-bounce shadow-lg shadow-blue-400/50" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2.5 h-2.5 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full animate-bounce shadow-lg shadow-purple-400/50" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-[#00d083] text-sm font-medium">Qwikker is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-600/50 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
          <div className="flex gap-3 bg-slate-800/50 rounded-2xl p-2 border border-slate-600/50 focus-within:border-[#00d083]/50 transition-all duration-300 focus-within:shadow-lg focus-within:shadow-[#00d083]/10">
            <div className="flex-1">
              <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me about restaurants, deals, menus, or anything local..."
                className="w-full bg-transparent px-4 py-3 text-slate-100 placeholder-slate-400 focus:outline-none text-sm resize-none min-h-[44px] max-h-32"
                  disabled={isTyping}
                rows={1}
                style={{
                  height: 'auto',
                  minHeight: '44px'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px'
                }}
              />
              </div>
              <Button 
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isTyping}
              className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black px-4 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 self-end"
              >
                {isTyping ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </Button>
            </div>
            
          {/* Status Bar */}
          <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="bg-slate-700/50 px-2 py-1 rounded text-slate-400 border border-slate-600/50">Enter</kbd>
                to send
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Qwikker Online
              </span>
            </div>
            
            {/* Report Issue Button */}
            <button
              onClick={() => {
                // You can implement this to open a modal, send to support, etc.
                const email = 'support@qwikker.com'
                const subject = 'AI Chat Issue Report'
                const body = `Hi Qwikker team,\n\nI'd like to report an issue with the AI chat:\n\n[Please describe the issue here]\n\nUser: ${currentUser?.name || 'Anonymous'}\nTime: ${new Date().toISOString()}\n\nThanks!`
                window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
              }}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-400 transition-colors duration-200 opacity-60 hover:opacity-100"
              title="Report an issue with the AI chat"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-xs">Report issue</span>
            </button>
          </div>
        </div>
        
      </div>
    </div>
  )
}