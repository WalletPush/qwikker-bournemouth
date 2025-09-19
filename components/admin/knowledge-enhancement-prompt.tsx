'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface KnowledgeEnhancementPromptProps {
  business: any
  isOpen: boolean
  onClose: () => void
  onEnhance: (type: string, data?: any) => void
}

export function KnowledgeEnhancementPrompt({
  business,
  isOpen,
  onClose,
  onEnhance
}: KnowledgeEnhancementPromptProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  if (!isOpen || !business) return null

  const handleEnhance = async (type: string, data?: any) => {
    setIsLoading(type)
    try {
      await onEnhance(type, data)
    } finally {
      setIsLoading(null)
    }
  }

  const hasWebsite = business.website_url
  const hasMenu = business.menu_url
  const hasImages = business.business_images && business.business_images.length > 0

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Enhance AI Knowledge</h3>
                <p className="text-slate-400 text-sm">{business.business_name} - {business.business_category}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Basic Info Added */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-400 font-semibold">Basic Information Added</span>
            </div>
            <p className="text-green-200 text-sm">
              Business details, contact info, and current offers have been automatically added to the AI knowledge base.
            </p>
          </div>

          {/* Enhancement Options */}
          <div className="space-y-4 mb-6">
            <h4 className="text-white font-semibold">Available Enhancements:</h4>

            {/* Website Scraping */}
            {hasWebsite && (
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mt-1">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h5 className="text-white font-medium">Scrape Business Website</h5>
                      <p className="text-slate-300 text-sm mb-2">
                        Extract current menu, offers, and information from: {business.website_url}
                      </p>
                      <span className="inline-flex items-center px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                        High Priority
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleEnhance('web_scrape', { url: business.website_url })}
                    disabled={isLoading === 'web_scrape'}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isLoading === 'web_scrape' ? 'Scraping...' : 'Scrape Website'}
                  </Button>
                </div>
              </div>
            )}

            {/* Menu Processing */}
            {hasMenu && (
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center mt-1">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h5 className="text-white font-medium">Process Menu Document</h5>
                      <p className="text-slate-300 text-sm mb-2">
                        Extract menu items and prices for detailed AI recommendations
                      </p>
                      <span className="inline-flex items-center px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">
                        High Priority
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleEnhance('pdf_process', { url: business.menu_url })}
                    disabled={isLoading === 'pdf_process'}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    {isLoading === 'pdf_process' ? 'Processing...' : 'Process Menu'}
                  </Button>
                </div>
              </div>
            )}

            {/* Image Analysis */}
            {hasImages && (
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mt-1">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h5 className="text-white font-medium">Analyze Business Photos</h5>
                      <p className="text-slate-300 text-sm mb-2">
                        Extract visual information from {business.business_images.length} uploaded photos
                      </p>
                      <span className="inline-flex items-center px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                        Medium Priority
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleEnhance('image_analysis', { images: business.business_images })}
                    disabled={isLoading === 'image_analysis'}
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    {isLoading === 'image_analysis' ? 'Analyzing...' : 'Analyze Photos'}
                  </Button>
                </div>
              </div>
            )}

            {/* No Enhancement Options */}
            {!hasWebsite && !hasMenu && !hasImages && (
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 text-center">
                <div className="w-12 h-12 bg-slate-600/50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h5 className="text-white font-medium mb-2">No automatic enhancements available</h5>
                <p className="text-slate-300 text-sm">
                  This business hasn't provided a website, menu, or photos. You can still manually add knowledge using the Knowledge Base tab.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Skip for Now
            </Button>
            <Button
              onClick={() => {
                // Navigate to Knowledge Base tab
                onClose()
                // This would trigger navigation to the knowledge base tab
              }}
              className="flex-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white"
            >
              Go to Knowledge Base
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
