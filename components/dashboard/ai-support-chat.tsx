'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AISupportChatProps {
  profile?: any
}

export function AISupportChat({ profile }: AISupportChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm your Qwikker Business Support Assistant. I can help you with:

• **Completing your business profile** - Get tips on what information to add
• **Optimizing your listing** - Best practices for photos, descriptions, and offers
• **Understanding analytics** - How to read your performance metrics
• **Managing offers** - Creating compelling deals that convert
• **Contact Centre** - Report bugs, message your city admin, or complete tasks
• **Technical support** - Troubleshooting any issues

Tip: The **Contact Centre** in your sidebar is the fastest way to report a bug or speak directly with your city admin!

What would you like help with today?`,
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/dashboard/ai-support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          profile: profile,
          conversationHistory: messages.slice(-5) // Last 5 messages for context
        }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "I'm sorry, I couldn't process your request right now. Please try again.",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('AI Support error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment, or contact support directly if the issue persists.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const quickActions = [
    { label: 'Report a bug', message: 'How do I report a bug or issue with the platform?' },
    { label: 'Complete my profile', message: 'What do I need to complete my business profile?' },
    { label: 'Contact my admin', message: 'How do I message my city admin directly?' },
    { label: 'Create better offers', message: 'What makes a good business offer that customers will use?' },
    { label: 'Understand analytics', message: 'Help me understand my business analytics and performance metrics' },
  ]

  if (!isOpen) {
    return (
      <div className="fixed bottom-0 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 border-b-0 rounded-t-lg hover:bg-slate-700 shadow-lg transition-all text-sm text-slate-300 hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Help
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 right-6 z-50">
      <Card className="w-96 h-[500px] bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-white text-sm">Support Assistant</CardTitle>
                <p className="text-xs text-slate-400">Always here to help</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex flex-col h-[400px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-slate-100 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="p-4 border-t border-slate-700">
              <p className="text-xs text-slate-400 mb-3">Quick actions:</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.slice(0, 3).map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInputMessage(action.message)
                      setTimeout(() => sendMessage(), 100)
                    }}
                    className="text-xs border-slate-600 text-slate-300 hover:text-white hover:border-slate-500"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your business dashboard..."
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
