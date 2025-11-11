'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PostTheme, ThemeThumbnail, type ThemeType } from './social-post-themes'

type PostType = 'offer' | 'secret-menu' | 'event' | 'general'

interface SocialPostBuilderProps {
  postType: PostType
  profile: any
  onClose: () => void
}

interface PostContent {
  headline: string
  caption: string
  hashtags: string
}

export function SocialPostBuilder({ postType, profile, onClose }: SocialPostBuilderProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('vibrant')
  const [backgroundImage, setBackgroundImage] = useState<string>('')
  const [postContent, setPostContent] = useState<PostContent>({
    headline: '',
    caption: '',
    hashtags: ''
  })

  // Auto-generate content when component mounts
  useEffect(() => {
    generateContent()
  }, [postType])

  const generateContent = async () => {
    setIsGenerating(true)
    
    try {
      // TODO: Call AI generation API
      // For now, use smart templates based on post type
      const generated = await generateSmartContent(postType, profile)
      setPostContent(generated)
      
      // Auto-select background from business photos
      if (profile?.business_images && profile.business_images.length > 0) {
        setBackgroundImage(profile.business_images[0])
      }
    } catch (error) {
      console.error('Error generating content:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = async () => {
    await generateContent()
  }

  const handleDownload = () => {
    // TODO: Implement download functionality
    console.log('Downloading post...')
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto backdrop-blur-sm">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                ✨ Create Your Post
              </h2>
              <p className="text-slate-400">
                {getPostTypeLabel(postType)}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              ✕ Close
            </Button>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* Left: Live Preview */}
            <div>
              <Card className="bg-slate-800/50 border-slate-700 sticky top-8">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Instagram Post Preview (1080x1080) */}
                  <div className="relative aspect-square bg-slate-900 rounded-lg overflow-hidden">
                    {isGenerating ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d083] mx-auto mb-4"></div>
                          <p className="text-slate-400">Generating your post...</p>
                        </div>
                      </div>
                    ) : (
                      <PostTheme
                        theme={selectedTheme}
                        headline={postContent.headline || 'Your headline will appear here'}
                        caption={postContent.caption || 'Your caption will appear here...'}
                        backgroundImage={backgroundImage || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1080'}
                        logoUrl={profile?.logo}
                        businessName={profile?.business_name}
                      />
                    )}
                  </div>
                  
                  {/* Size Info */}
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>Instagram Feed (1080×1080)</span>
                    <span>Theme: {selectedTheme}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Editor */}
            <div className="space-y-6">
              
              {/* Premium Badge */}
              <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">💎</div>
                    <div>
                      <p className="text-yellow-400 font-semibold text-sm">Premium Feature Active</p>
                      <p className="text-yellow-200/80 text-xs">AI-powered content generation for Spotlight members</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Content Editor */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Edit Your Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Headline */}
                  <div>
                    <Label htmlFor="headline" className="text-slate-300 mb-2 block">
                      Headline
                    </Label>
                    <Input
                      id="headline"
                      value={postContent.headline}
                      onChange={(e) => setPostContent({ ...postContent, headline: e.target.value })}
                      placeholder="Add a catchy headline..."
                      className="bg-slate-900 border-slate-600 text-white"
                      maxLength={100}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {postContent.headline.length}/100 characters
                    </p>
                  </div>

                  {/* Caption */}
                  <div>
                    <Label htmlFor="caption" className="text-slate-300 mb-2 block">
                      Caption
                    </Label>
                    <Textarea
                      id="caption"
                      value={postContent.caption}
                      onChange={(e) => setPostContent({ ...postContent, caption: e.target.value })}
                      placeholder="Write your caption..."
                      className="bg-slate-900 border-slate-600 text-white min-h-[120px]"
                      maxLength={2200}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {postContent.caption.length}/2,200 characters
                    </p>
                  </div>

                  {/* Hashtags */}
                  <div>
                    <Label htmlFor="hashtags" className="text-slate-300 mb-2 block">
                      Hashtags
                    </Label>
                    <Input
                      id="hashtags"
                      value={postContent.hashtags}
                      onChange={(e) => setPostContent({ ...postContent, hashtags: e.target.value })}
                      placeholder="#YourCity #YourBusiness #Trending"
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>

                  {/* AI Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerate}
                      disabled={isGenerating}
                      className="border-[#00d083] text-[#00d083] hover:bg-[#00d083] hover:text-black"
                    >
                      ✨ Regenerate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300"
                      disabled
                    >
                      😊 Add Emojis
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300"
                      disabled
                    >
                      ✂️ Make Shorter
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Theme Selector */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    🎨 Theme Templates
                    <span className="text-xs font-normal text-slate-400">(5 Premium Designs)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-sm mb-3">Choose your post layout style</p>
                  <div className="grid grid-cols-5 gap-2">
                    {(['vibrant', 'minimalist', 'split', 'bold', 'modern'] as ThemeType[]).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setSelectedTheme(theme)}
                        className={`aspect-square rounded-lg border-2 transition-all overflow-hidden ${
                          selectedTheme === theme
                            ? 'border-[#00d083] ring-2 ring-[#00d083]/50'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                        title={theme.charAt(0).toUpperCase() + theme.slice(1)}
                      >
                        <ThemeThumbnail theme={theme} />
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-xs text-slate-400">
                      Selected: <span className="text-[#00d083] font-semibold capitalize">{selectedTheme}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleDownload}
                  className="flex-1 bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold"
                >
                  ⬇️ Download Post
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                  disabled
                >
                  💾 Save Draft
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper Functions

function getPostTypeLabel(type: PostType): string {
  const labels = {
    'offer': 'Promotional Offer Post',
    'secret-menu': 'Secret Menu Item Post',
    'event': 'Event Announcement Post',
    'general': 'General Update Post'
  }
  return labels[type]
}

async function generateSmartContent(type: PostType, profile: any): Promise<PostContent> {
  // Smart template-based generation (will be replaced with AI later)
  await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate AI delay
  
  const city = profile?.city || 'your city'
  const businessName = profile?.business_name || 'Our Business'
  
  const templates = {
    'offer': {
      headline: `🎉 Special Offer at ${businessName}!`,
      caption: `We're excited to bring you an exclusive offer! 🌟\n\nVisit us and enjoy amazing savings. This limited-time offer is only available through the ${city} QWIKKER Pass.\n\n📍 ${businessName}\n⏰ Limited time only\n🎟 Download the QWIKKER Pass to claim!`,
      hashtags: `#${city.replace(/\s/g, '')} #LocalDeals #SpecialOffer #${businessName.replace(/\s/g, '')}`
    },
    'secret-menu': {
      headline: `🤫 Secret Menu Alert!`,
      caption: `Psst... we've got something special for our QWIKKER members! 👀\n\nAsk about our secret menu item - it's exclusive to ${city} QWIKKER Pass holders only. Trust us, you don't want to miss this! 🔥\n\n📍 ${businessName}\n🎟 Get the ${city} QWIKKER Pass to unlock!`,
      hashtags: `#SecretMenu #${city.replace(/\s/g, '')} #Exclusive #${businessName.replace(/\s/g, '')}`
    },
    'event': {
      headline: `🎊 Join Us for an Amazing Event!`,
      caption: `Something special is happening at ${businessName}! 🎉\n\nMark your calendars and join us for an unforgettable experience. Limited spots available!\n\n📍 ${businessName}\n📅 Coming soon\n🎟 QWIKKER Pass holders get priority access!`,
      hashtags: `#${city.replace(/\s/g, '')}Events #LocalEvents #${businessName.replace(/\s/g, '')}`
    },
    'general': {
      headline: `📣 News from ${businessName}`,
      caption: `Hey ${city}! We've got some exciting news to share! 🌟\n\nStay tuned for more updates and don't forget to follow us on the ${city} QWIKKER Pass for exclusive perks and insider access.\n\n📍 ${businessName}\n🎟 Download the QWIKKER Pass today!`,
      hashtags: `#${city.replace(/\s/g, '')} #LocalBusiness #${businessName.replace(/\s/g, '')}`
    }
  }
  
  return templates[type]
}

