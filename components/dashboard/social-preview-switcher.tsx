'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface SocialPreviewSwitcherProps {
  businessName: string
  businessLogo?: string
  postImage: string | React.ReactNode
  caption: string
  hashtags: string
  isLoading?: boolean
}

type Platform = 'instagram' | 'facebook'

export function SocialPreviewSwitcher({
  businessName,
  businessLogo,
  postImage,
  caption,
  hashtags,
  isLoading
}: SocialPreviewSwitcherProps) {
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [showFullCaption, setShowFullCaption] = useState(false)
  
  const truncatedCaption = caption.length > 125 ? caption.substring(0, 125) : caption
  const firstThreeHashtags = hashtags.split(' ').slice(0, 3).join(' ')

  return (
    <div className="space-y-4">
      {/* Platform Switcher */}
      <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg">
        <Button
          variant={platform === 'instagram' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setPlatform('instagram')}
          className={platform === 'instagram' ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : 'text-white'}
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          Instagram
        </Button>
        <Button
          variant={platform === 'facebook' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setPlatform('facebook')}
          className={platform === 'facebook' ? 'bg-blue-600 hover:bg-blue-700' : 'text-white'}
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Facebook
        </Button>
      </div>

      {/* Preview */}
      {platform === 'instagram' ? (
        <InstagramPreview
          businessName={businessName}
          businessLogo={businessLogo}
          postImage={postImage}
          caption={caption}
          hashtags={hashtags}
          isLoading={isLoading}
          showFullCaption={showFullCaption}
          onToggleCaption={() => setShowFullCaption(!showFullCaption)}
        />
      ) : (
        <FacebookPreview
          businessName={businessName}
          businessLogo={businessLogo}
          postImage={postImage}
          caption={caption}
          hashtags={hashtags}
          isLoading={isLoading}
        />
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-3">
        {platform === 'instagram' ? (
          <>
            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold h-12">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Post to Instagram
            </Button>
            <Button variant="outline" className="w-full border-purple-600 text-purple-400 hover:bg-purple-600/10 h-12">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule Instagram Post
            </Button>
          </>
        ) : (
          <>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Post to Facebook
            </Button>
            <Button variant="outline" className="w-full border-blue-600 text-blue-400 hover:bg-blue-600/10 h-12">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule Facebook Post
            </Button>
          </>
        )}
        
        <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 h-12">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Image
        </Button>
      </div>
    </div>
  )
}

// Instagram Preview Component
function InstagramPreview({ businessName, businessLogo, postImage, caption, hashtags, isLoading, showFullCaption, onToggleCaption }: any) {
  const truncatedCaption = caption.length > 125 ? caption.substring(0, 125) : caption
  const firstThreeHashtags = hashtags.split(' ').slice(0, 3).join(' ')

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-black rounded-3xl p-3 shadow-2xl">
        <div className="bg-white rounded-2xl overflow-hidden">
          {/* Status Bar */}
          <div className="bg-white px-6 pt-2 pb-1 flex items-center justify-between text-xs">
            <span className="font-semibold">9:41</span>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="2"/><rect x="22" y="9" width="2" height="6"/></svg>
            </div>
          </div>

          {/* Header */}
          <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              {businessLogo ? (
                <img src={businessLogo} alt={businessName} className="w-8 h-8 rounded-full object-cover border border-gray-200"/>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"/>
              )}
              <span className="font-semibold text-sm text-black">{businessName}</span>
              <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
            <button className="text-black text-xl leading-none">⋯</button>
          </div>

          {/* Post Image */}
          <div className="relative bg-black aspect-square">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                  <p className="text-white text-sm">Creating...</p>
                </div>
              </div>
            ) : typeof postImage === 'string' ? (
              <img src={postImage} alt="Post" className="w-full h-full object-cover"/>
            ) : (
              postImage
            )}
          </div>

          {/* Actions */}
          <div className="bg-white px-4 py-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button><svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></button>
                <button><svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></button>
                <button><svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>
              </div>
              <button><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg></button>
            </div>
            
            <div className="text-sm space-y-1">
              <p className="font-semibold text-black">1,247 likes</p>
              <p className="text-black">
                <span className="font-semibold mr-1">{businessName}</span>
                <span>{showFullCaption ? caption : truncatedCaption}</span>
                {caption.length > 125 && (
                  <button onClick={onToggleCaption} className="text-gray-500 ml-1">
                    {showFullCaption ? 'less' : '... more'}
                  </button>
                )}
              </p>
              {hashtags && <p className="text-blue-900">{showFullCaption ? hashtags : firstThreeHashtags}{hashtags.split(' ').length > 3 && !showFullCaption && '...'}</p>}
            </div>
            <p className="text-xs text-gray-400 uppercase">2 HOURS AGO</p>
          </div>

          {/* Nav Bar */}
          <div className="bg-white px-8 py-1.5 flex items-center justify-between border-t border-gray-100">
            {['🏠', '🔍', '➕', '❤️', '👤'].map((icon, i) => (
              <button key={i} className={`text-2xl ${i === 0 ? 'opacity-100' : 'opacity-40'}`}>{icon}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Facebook Preview Component
function FacebookPreview({ businessName, businessLogo, postImage, caption, hashtags, isLoading }: any) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <Card className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-center gap-3 border-b border-gray-200">
          {businessLogo ? (
            <img src={businessLogo} alt={businessName} className="w-10 h-10 rounded-full object-cover"/>
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-600"/>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-black">{businessName}</p>
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
            <p className="text-xs text-gray-500">2 hours ago · 🌍</p>
          </div>
          <button className="text-gray-500 text-2xl">⋯</button>
        </div>

        {/* Caption */}
        <div className="p-4 text-sm text-black whitespace-pre-wrap">
          {caption}
          {hashtags && <p className="text-blue-600 mt-2">{hashtags}</p>}
        </div>

        {/* Image */}
        <div className="relative bg-black" style={{aspectRatio: '16/9'}}>
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white">Creating...</p>
              </div>
            </div>
          ) : typeof postImage === 'string' ? (
            <img src={postImage} alt="Post" className="w-full h-full object-cover"/>
          ) : (
            <div className="w-full h-full">{postImage}</div>
          )}
        </div>

        {/* Reactions */}
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <span>👍 ❤️ 😮</span>
              <span>521</span>
            </div>
            <div className="flex gap-3">
              <span>42 Comments</span>
              <span>17 Shares</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-2 flex items-center justify-around border-t border-gray-200">
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-md flex-1 justify-center">
            <span className="text-xl">👍</span>
            <span className="text-sm font-semibold text-gray-600">Like</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-md flex-1 justify-center">
            <span className="text-xl">💬</span>
            <span className="text-sm font-semibold text-gray-600">Comment</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 rounded-md flex-1 justify-center">
            <span className="text-xl">↗️</span>
            <span className="text-sm font-semibold text-gray-600">Share</span>
          </button>
        </div>
      </Card>
    </div>
  )
}

