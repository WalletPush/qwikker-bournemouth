'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface InstagramPreviewProps {
  businessName: string
  businessLogo?: string
  postImage: string | React.ReactNode
  caption: string
  hashtags: string
  likes?: number
  isLoading?: boolean
}

export function InstagramPreview({
  businessName,
  businessLogo,
  postImage,
  caption,
  hashtags,
  likes = 1247,
  isLoading
}: InstagramPreviewProps) {
  const [showFullCaption, setShowFullCaption] = React.useState(false)
  const truncatedCaption = caption.length > 125 ? caption.substring(0, 125) : caption
  const firstThreeHashtags = hashtags.split(' ').slice(0, 3).join(' ')

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Phone Frame */}
      <div className="bg-black rounded-[3rem] p-4 shadow-2xl">
        {/* Screen */}
        <div className="bg-white rounded-[2.5rem] overflow-hidden">
          {/* Status Bar */}
          <div className="bg-white px-6 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
            <div className="text-xs font-semibold">9:41</div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
              </svg>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="7" width="20" height="10" rx="2"/>
                <rect x="22" y="9" width="2" height="6"/>
              </svg>
            </div>
          </div>

          {/* Instagram Header */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-3">
              {businessLogo ? (
                <img 
                  src={businessLogo} 
                  alt={businessName}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              )}
              <span className="font-semibold text-sm text-black">{businessName}</span>
              <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <button className="text-black text-xl font-bold leading-none">⋯</button>
          </div>

          {/* Post Image */}
          <div className="relative bg-black" style={{ aspectRatio: '1/1' }}>
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-white text-sm">Creating your post...</p>
                </div>
              </div>
            ) : typeof postImage === 'string' ? (
              <img 
                src={postImage} 
                alt="Post" 
                className="w-full h-full object-cover"
              />
            ) : (
              postImage
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-white px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <button className="hover:opacity-50 transition">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                  </svg>
                </button>
                <button className="hover:opacity-50 transition">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </button>
                <button className="hover:opacity-50 transition">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                </button>
              </div>
              <button className="hover:opacity-50 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                </svg>
              </button>
            </div>

            {/* Likes */}
            <div className="mb-2">
              <p className="font-semibold text-sm text-black">{likes.toLocaleString()} likes</p>
            </div>

            {/* Caption */}
            <div className="text-sm text-black space-y-1">
              <p>
                <span className="font-semibold mr-2">{businessName}</span>
                <span className="whitespace-pre-wrap">
                  {showFullCaption ? caption : truncatedCaption}
                  {caption.length > 125 && !showFullCaption && '...'}
                </span>
                {caption.length > 125 && (
                  <button 
                    onClick={() => setShowFullCaption(!showFullCaption)}
                    className="text-gray-500 ml-1"
                  >
                    {showFullCaption ? 'less' : 'more'}
                  </button>
                )}
              </p>
              {hashtags && (
                <p className="text-blue-900">
                  {showFullCaption ? hashtags : firstThreeHashtags}
                  {hashtags.split(' ').length > 3 && !showFullCaption && '...'}
                </p>
              )}
            </div>

            {/* Post Time */}
            <p className="text-xs text-gray-400 mt-2 uppercase">2 hours ago</p>
          </div>

          {/* Bottom Navigation */}
          <div className="bg-white px-8 py-2 flex items-center justify-between border-t border-gray-100">
            <button className="p-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
            </button>
            <button className="p-2 opacity-50">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
            <button className="p-2 opacity-50">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="5"/>
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                <path d="M17.5 6.5h.01"/>
              </svg>
            </button>
            <button className="p-2 opacity-50">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            </button>
            <button className="p-2 opacity-50">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

