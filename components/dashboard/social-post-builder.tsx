'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PostTheme, ThemeThumbnail, type ThemeType } from './social-post-themes-v2'
import { DynamicPostTheme } from './dynamic-post-theme'
import { AdvancedPostCanvas } from './advanced-post-canvas'
import { SmartPostCanvas } from './smart-post-canvas'
import { InstagramPreview } from './instagram-preview'
import { FabricPostEditor } from './fabric-post-editor'
import { SocialPreviewSwitcher } from './social-preview-switcher'
import { createClient } from '@/lib/supabase/client'

type PostType = 'offer' | 'secret-menu' | 'event' | 'general'
type ImageSource = 'content' | 'business' | 'abstract'

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

interface PostStyle {
  textColor: string
  textEffect: string
  layout: string
  mood: string
}

interface ContentItem {
  id: string
  title: string
  description?: string
  image_url?: string
  terms?: string
  location?: string
  event_date?: string
}

export function SocialPostBuilder({ postType, profile, onClose }: SocialPostBuilderProps) {
  console.log('🎨 Social Post Builder - Profile:', { 
    hasLogo: !!profile?.logo, 
    logoUrl: profile?.logo,
    businessName: profile?.business_name 
  })
  
  const [step, setStep] = useState<'select' | 'generate' | 'edit'>('select')
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('vibrant')
  const [backgroundImage, setBackgroundImage] = useState<string>('')
  const [imageSource, setImageSource] = useState<ImageSource>('content')
  
  // Content selection
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  
  // Business photos
  const [businessPhotos, setBusinessPhotos] = useState<string[]>([])
  
  const [postContent, setPostContent] = useState<PostContent>({
    headline: '',
    caption: '',
    hashtags: ''
  })
  
  const [postStyle, setPostStyle] = useState<any>({
    textColor: 'white',
    textEffect: 'bold-shadow',
    textPosition: 'center',
    textSize: 'large',
    fontStyle: 'ultra-bold',
    backgroundOverlay: 'dark-gradient',
    accentElement: 'none'
  })
  const [imageAnalysis, setImageAnalysis] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Fetch available content when component mounts (only on select step)
  useEffect(() => {
    if (step === 'select') {
      fetchContentItems()
      fetchBusinessPhotos()
    }
  }, [postType, step])

  const fetchContentItems = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      let items: ContentItem[] = []

      // General update doesn't need content selection - skip to creation
      if (postType === 'general') {
        setIsLoading(false)
        setStep('generate')
        setSelectedContent({
          id: 'general',
          title: 'General Update',
          description: 'Create a custom post for your business'
        })
        return
      }

      if (postType === 'offer') {
        console.log('🔍 Fetching offers for business:', { 
          businessId: profile?.id, 
          businessName: profile?.business_name 
        })
        
        const { data, error, count } = await supabase
          .from('business_offers')
          .select('id, offer_name, offer_value, offer_type, offer_terms, offer_image, status', { count: 'exact' })
          .eq('business_id', profile?.id)
          .eq('status', 'approved') // RLS policy requires status = 'approved'
        
        console.log('📊 Offers query result:', { 
          hasError: !!error,
          errorObject: error,
          dataCount: data?.length || 0,
          totalCount: count,
          hasData: !!data,
          businessId: profile?.id
        })
        
        if (error) {
          console.error('❌ Offers error:', JSON.stringify(error, null, 2))
          console.error('Error code:', error.code)
          console.error('Error message:', error.message)
        }
        
        if (data) {
          console.log('📋 Offers found:', data.map(o => ({ 
            id: o.id,
            name: o.offer_name,
            value: o.offer_value,
            status: o.status
          })))
        }
        
        items = (data || []).map(offer => ({
          id: offer.id,
          title: offer.offer_name,
          description: offer.offer_value, // "20% off", "Buy 2 get 1 free", etc.
          image_url: offer.offer_image,
          terms: offer.offer_terms
        }))
      } else if (postType === 'secret-menu') {
        const { data, error } = await supabase
          .from('secret_menu_items')
          .select('id, item_name, additional_notes, item_image_url')
          .eq('business_id', profile?.id)
          .eq('is_active', true)
        
        if (error) {
          console.error('❌ Secret menu error:', error)
          console.error('Error details:', { message: error.message, details: error.details, hint: error.hint })
        }
        
        items = (data || []).map(item => ({
          id: item.id,
          title: item.item_name,
          description: item.additional_notes,
          image_url: item.item_image_url
        }))
      } else if (postType === 'event') {
        // Try both event_date and start_date to support different schemas
        const { data, error } = await supabase
          .from('business_events')
          .select('*')
          .eq('business_id', profile?.id)
        
        if (error) {
          console.error('Events error:', error)
        } else {
          console.log('📅 Raw events data:', data)
          
          // Filter future events and map
          const now = new Date().toISOString().split('T')[0]
          items = (data || [])
            .filter(event => {
              const eventDate = event.event_date || event.start_date
              return eventDate && eventDate >= now
            })
            .map(event => ({
              id: event.id,
              title: event.event_name,
              description: event.event_description,
              image_url: event.image_url,
              location: event.location,
              event_date: event.event_date || event.start_date
            }))
            .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''))
          
          console.log(`📊 Mapped ${items.length} future events`)
        }
      }

      console.log(`📊 Fetched ${items.length} ${postType} items`)
      setContentItems(items)
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBusinessPhotos = async () => {
    // Collect ALL available business photos
    const photos: string[] = []
    
    console.log('📸 Fetching business photos from profile:', {
      business_images: profile?.business_images,
      offer_image: profile?.offer_image,
      logo: profile?.logo
    })
    
    // 1. Business gallery images
    if (profile?.business_images && Array.isArray(profile.business_images)) {
      photos.push(...profile.business_images.filter(img => img && typeof img === 'string'))
    }
    
    // 2. Legacy offer image (if exists and not already included)
    if (profile?.offer_image && !photos.includes(profile.offer_image)) {
      photos.push(profile.offer_image)
    }
    
    // Remove duplicates using Set
    const uniquePhotos = Array.from(new Set(photos))
    
    console.log('📸 Business photos collected:', { 
      total: uniquePhotos.length,
      rawCount: photos.length,
      duplicatesRemoved: photos.length - uniquePhotos.length,
      photos: uniquePhotos
    })
    
    setBusinessPhotos(uniquePhotos)
  }

  const generateAIContent = async () => {
    if (!selectedContent) return

    setIsGenerating(true)
    setIsAnalyzing(true)
    
    try {
      // Step 1: Analyze the image with Claude Vision
      console.log('🔍 Analyzing image:', backgroundImage)
      const analysisResponse = await fetch('/api/social-wizard/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: backgroundImage,
          businessName: profile?.business_name,
          offerText: selectedContent.title
        })
      })

      const analysis = await analysisResponse.json()
      console.log('🎨 Image analysis complete:', analysis)
      setImageAnalysis(analysis)
      setIsAnalyzing(false)

      // Step 2: Generate copy with AI
      console.log('✍️ Generating content for theme:', selectedTheme)
      console.log('🖼️ Using background image:', backgroundImage)
      
      const response = await fetch('/api/social-wizard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postType,
          content: selectedContent,
          businessName: profile?.business_name,
          city: profile?.city,
          businessType: profile?.business_type,
          theme: selectedTheme, // Pass the selected theme to AI
          timestamp: Date.now() // Force unique generation each time
        })
      })

      const generated = await response.json()
      
      console.log('🤖 AI Response:', generated)
      
      if (generated.error) {
        console.error('❌ API Error:', generated.error)
        alert(`Failed to generate: ${generated.error}`)
        return
      }
      
      setPostContent({
        headline: generated.headline,
        caption: generated.caption,
        hashtags: generated.hashtags
      })
      
      // Set style from AI response
      if (generated.style) {
        setPostStyle(generated.style)
        console.log('🎨 AI generated style:', generated.style)
      }
      
      // Don't override backgroundImage - user already selected it!
      // Only set if not already set
      if (!backgroundImage) {
        if (imageSource === 'content' && selectedContent.image_url) {
          setBackgroundImage(selectedContent.image_url)
        } else if (imageSource === 'business' && businessPhotos.length > 0) {
          setBackgroundImage(businessPhotos[0])
        } else if (imageSource === 'abstract') {
          setBackgroundImage('https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1080')
        }
      }
      
      console.log('✅ Using selected background image:', backgroundImage)

      // Move to generate step
      setStep('generate')
    } catch (error) {
      console.error('Error generating content:', error)
      alert('Failed to generate post. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = async () => {
    setIsGenerating(true)
    
    // Add a small delay so user sees it's regenerating
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Force a fresh generation
    await generateAIContent()
  }

  const handleDownload = () => {
    // TODO: Implement download functionality
    console.log('Downloading post...')
  }

  // STEP 1: Content Selection
  if (step === 'select') {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto backdrop-blur-sm">
        <div className="min-h-screen px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <svg className="w-8 h-8 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Select Your Content
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

            <div className="space-y-6">
              {/* Step 1: Select Content */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">
                    Step 1: Choose {getContentLabel(postType)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d083] mx-auto mb-4"></div>
                      <p className="text-slate-400">Loading your content...</p>
                    </div>
                  ) : contentItems.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-400 mb-4">
                        You don't have any {getContentLabel(postType).toLowerCase()} yet.
                      </p>
                      <Button 
                        variant="outline" 
                        className="border-[#00d083] text-[#00d083]"
                        onClick={() => {
                          const routes = {
                            'offer': '/dashboard/offers',
                            'secret-menu': '/dashboard/secret-menu',
                            'event': '/dashboard/events',
                            'general': '/dashboard'
                          }
                          window.location.href = routes[postType as keyof typeof routes]
                        }}
                      >
                        Create {getContentLabel(postType)}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contentItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedContent(item)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            selectedContent?.id === item.id
                              ? 'border-[#00d083] bg-[#00d083]/10'
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                              {item.description && (
                                <p className="text-slate-400 text-sm line-clamp-2">{item.description}</p>
                              )}
                              {item.event_date && (
                                <p className="text-[#00d083] text-sm mt-1">
                                  📅 {new Date(item.event_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 2: Select Image Source */}
              {selectedContent && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Step 2: Choose Image Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Use Content Image */}
                      {selectedContent.image_url && (
                        <button
                          onClick={() => {
                            setImageSource('content')
                            setBackgroundImage(selectedContent.image_url)
                          }}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            imageSource === 'content'
                              ? 'border-[#00d083] bg-[#00d083]/10'
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <img
                            src={selectedContent.image_url}
                            alt="Content"
                            className="w-full aspect-square object-cover rounded-lg mb-3"
                          />
                          <p className="text-white text-sm font-semibold text-center">
                            Use {getContentLabel(postType)} Image
                          </p>
                        </button>
                      )}

                      {/* ALL Business Photos */}
                      {businessPhotos.map((photo, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            console.log('📸 Selected business photo #' + (index + 1) + ':', photo)
                            setImageSource('business')
                            setBackgroundImage(photo)
                          }}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            backgroundImage === photo
                              ? 'border-[#00d083] bg-[#00d083]/10'
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <img
                            src={photo}
                            alt={`Business photo ${index + 1}`}
                            className="w-full aspect-square object-cover rounded-lg mb-3"
                          />
                          <p className="text-white text-sm font-semibold text-center">
                            Business Photo {index + 1}
                          </p>
                        </button>
                      ))}

                      {/* Show placeholder if no business photos */}
                      {businessPhotos.length === 0 && (
                        <div className="p-4 rounded-lg border-2 border-slate-600 opacity-50">
                          <div className="w-full aspect-square bg-slate-700 rounded-lg mb-3 flex items-center justify-center">
                            <span className="text-4xl">🏢</span>
                          </div>
                          <p className="text-slate-400 text-sm text-center">
                            No business photos
                          </p>
                        </div>
                      )}

                      {/* AI Abstract */}
                      <button
                        onClick={() => {
                          setImageSource('abstract')
                          setBackgroundImage('https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1080')
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          imageSource === 'abstract'
                            ? 'border-[#00d083] bg-[#00d083]/10'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        <div className="w-full aspect-square bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 rounded-lg mb-3"></div>
                        <p className="text-white text-sm font-semibold text-center">
                          AI Abstract Background
                        </p>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Theme Selector - BEFORE GENERATION */}
              {selectedContent && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Step 3: Choose Your Style
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-3">
                      {(['vibrant', 'minimalist', 'split', 'bold', 'modern'] as ThemeType[]).map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setSelectedTheme(theme)}
                          className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                            selectedTheme === theme
                              ? 'border-[#00d083] ring-2 ring-[#00d083]/50'
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <div className="aspect-square">
                            <ThemeThumbnail theme={theme} />
                          </div>
                          <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-sm px-2 py-1">
                            <p className="text-white text-xs font-semibold text-center capitalize">
                              {theme}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-slate-400 text-sm mt-3">
                      AI will generate content optimized for this style
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Generate Button */}
              {selectedContent && (
                <Button
                  onClick={generateAIContent}
                  disabled={isGenerating}
                  className="w-full bg-[#00d083] hover:bg-[#00b86f] text-black font-bold text-lg py-6"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-3"></div>
                      Generating with AI...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Post with AI
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // STEP 3: Advanced Fabric Editor
  if (step === 'edit') {
    console.log('🎨 Rendering Fabric Editor with:', {
      backgroundImage,
      headline: postContent.headline,
      logoUrl: profile?.logo,
      hasAnalysis: !!imageAnalysis
    })
    
    return (
      <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
        <div className="min-h-screen px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Advanced Post Editor</h2>
                <p className="text-slate-400">Drag, resize, and perfect your post design</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('generate')}
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  ← Back to Preview
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  ✕ Close
                </Button>
              </div>
            </div>

            {/* Editor Layout */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left: Fabric Editor */}
              <div>
                <FabricPostEditor
                  key={backgroundImage} // Force re-render when image changes
                  backgroundImage={backgroundImage || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1080'}
                  headline={postContent.headline || 'Your headline'}
                  logoUrl={profile?.logo}
                  businessName={profile?.business_name}
                  analysis={imageAnalysis}
                  onExport={(imageData) => {
                    console.log('Image exported:', imageData)
                    // TODO: Save to state or upload
                  }}
                />
              </div>

              {/* Right: Preview & Actions */}
              <div className="space-y-6">
                <SocialPreviewSwitcher
                  businessName={profile?.business_name || 'yourbusiness'}
                  businessLogo={profile?.logo}
                  postImage={backgroundImage || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1080'}
                  caption={postContent.caption || 'Your caption...'}
                  hashtags={postContent.hashtags || `#${profile?.city?.replace(/\s/g, '')} #${profile?.business_name?.replace(/\s/g, '')}`}
                  isLoading={false}
                />

                {/* Caption Editor */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Caption & Hashtags</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-slate-300 mb-2 block">Caption</Label>
                      <Textarea
                        value={postContent.caption}
                        onChange={(e) => setPostContent({ ...postContent, caption: e.target.value })}
                        placeholder="Write your caption..."
                        className="bg-slate-900 border-slate-600 text-white min-h-[120px]"
                        maxLength={2200}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {postContent.caption.length}/2200 characters
                      </p>
                    </div>

                    <div>
                      <Label className="text-slate-300 mb-2 block">Hashtags</Label>
                      <Input
                        value={postContent.hashtags}
                        onChange={(e) => setPostContent({ ...postContent, hashtags: e.target.value })}
                        placeholder="#YourHashtags #Here"
                        className="bg-slate-900 border-slate-600 text-white"
                      />
                    </div>

                    <Button
                      onClick={handleRegenerate}
                      variant="outline"
                      className="w-full border-[#00d083] text-[#00d083] hover:bg-[#00d083]/10"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate Caption & Hashtags
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // STEP 2: Edit & Preview (Generate step)
  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto backdrop-blur-sm">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <svg className="w-8 h-8 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Your Post
              </h2>
              <p className="text-slate-400">
                {selectedContent?.title}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('select')}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                ← Back
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                ✕ Close
              </Button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* Left: Professional Preview with Platform Switcher */}
            <div className="space-y-6 sticky top-8">
              <SocialPreviewSwitcher
                businessName={profile?.business_name || 'yourbusiness'}
                businessLogo={profile?.logo}
                postImage={backgroundImage || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1080'}
                caption={postContent.caption || 'Your caption will appear here...'}
                hashtags={postContent.hashtags || `#${profile?.city?.replace(/\s/g, '')} #${profile?.business_name?.replace(/\s/g, '')}`}
                isLoading={isGenerating || isAnalyzing}
              />

              {/* REMOVE OLD CARD - DELETE EVERYTHING FROM HERE */}
              <Card className="bg-white border-slate-300 overflow-hidden sticky top-8 max-w-xs mx-auto shadow-xl" style={{display: 'none'}}>
                <CardContent className="p-0">
                  {/* Instagram Header */}
                  <div className="flex items-center justify-between p-3 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      {profile?.logo ? (
                        <img src={profile.logo} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-gray-300" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300" />
                      )}
                      <span className="text-black font-semibold text-sm">{profile?.business_name || 'yourbusiness'}</span>
                    </div>
                    <button className="text-black font-bold text-xl">⋯</button>
                  </div>

                  {/* Advanced Generative Canvas */}
                  <div className="w-full">
                    {isGenerating ? (
                      <div className="aspect-square flex items-center justify-center bg-slate-900">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d083] mx-auto mb-4"></div>
                          <p className="text-slate-400">Generating your post...</p>
                        </div>
                      </div>
                    ) : (
                      <AdvancedPostCanvas
                        backgroundImage={backgroundImage || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1080'}
                        headline={postContent.headline || 'Your headline will appear here'}
                        caption={postContent.caption || 'Your caption will appear here'}
                        logoUrl={profile?.logo}
                        businessName={profile?.business_name}
                        style={postStyle}
                      />
                    )}
                  </div>

                  {/* Instagram Actions */}
                  <div className="flex items-center justify-between p-3 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                      <button className="text-2xl">♡</button>
                      <button className="text-2xl">💬</button>
                      <button className="text-2xl">✈️</button>
                    </div>
                    <button className="text-2xl">🔖</button>
                  </div>

                  {/* Instagram Caption - TRUNCATED like real Instagram */}
                  <div className="p-3 bg-white">
                    <div className="text-sm">
                      <span className="font-semibold text-black mr-1">{profile?.business_name || 'yourbusiness'}</span>
                      <span className="text-black">
                        {(() => {
                          const caption = postContent.caption || 'Your caption will appear here...'
                          const maxLength = 80
                          if (caption.length > maxLength) {
                            return (
                              <>
                                {caption.slice(0, maxLength)}...{' '}
                                <button className="text-gray-400">more</button>
                              </>
                            )
                          }
                          return caption
                        })()}
                      </span>
                    </div>
                    {postContent.hashtags && (
                      <div className="text-sm text-blue-600 mt-1">
                        {postContent.hashtags.split(' ').slice(0, 3).join(' ')}
                        {postContent.hashtags.split(' ').length > 3 && '...'}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-2 uppercase">2 hours ago</div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={() => setStep('edit')}
                  className="w-full bg-[#00d083] hover:bg-[#00b870] text-white font-semibold h-12"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Open Advanced Editor
                </Button>
                <Button
                  onClick={() => setStep('select')}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Change Background
                </Button>
              </div>
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
                      {(postContent.headline || '').length}/100 characters
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
                      {(postContent.caption || '').length}/2,200 characters
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
                      className="border-[#00d083] text-[#00d083] hover:bg-[#00d083] hover:text-black flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate
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

              {/* Current Style Display */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    Current Style
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold capitalize mb-1">{selectedTheme}</p>
                      <p className="text-slate-400 text-xs">Want a different vibe?</p>
                    </div>
                    <Button
                      onClick={() => setStep('select')}
                      variant="outline"
                      className="border-[#00d083] text-[#00d083] hover:bg-[#00d083]/10 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Try Different Style
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleDownload}
                  className="flex-1 bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Post
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300 flex items-center gap-2"
                  disabled
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Draft
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

function getContentLabel(type: PostType): string {
  const labels = {
    'offer': 'an Offer',
    'secret-menu': 'a Secret Menu Item',
    'event': 'an Event',
    'general': 'Content Type'
  }
  return labels[type]
}

