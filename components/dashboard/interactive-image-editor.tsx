'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ImageTransform {
  x: number
  y: number
  scale: number
}

interface InteractiveImageEditorProps {
  imageUrl: string
  businessName: string
  businessCategory: string
  businessTown?: string
  businessTier: 'free_trial' | 'featured' | 'qwikker_picks' | 'recommended'
  onSave: (transform: ImageTransform) => void
  onCancel: () => void
}

export function InteractiveImageEditor({
  imageUrl,
  businessName,
  businessCategory,
  businessTown,
  businessTier,
  onSave,
  onCancel
}: InteractiveImageEditorProps) {
  const [transform, setTransform] = useState<ImageTransform>({ x: 0, y: 0, scale: 1 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, scale: 1 })
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  const getTierStyling = (tier: string) => {
    switch (tier) {
      case 'qwikker_picks':
        return 'bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-500/30'
      case 'featured':
        return 'bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-[#00d083]/30'
      case 'recommended':
        return 'bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-blue-500/30'
      default:
        return 'bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-600'
    }
  }

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'qwikker_picks':
        return (
          <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs px-2 py-1 rounded-full font-bold shadow-lg">
            ⭐ QWIKKER PICK
          </span>
        )
      case 'featured':
        return (
          <span className="bg-gradient-to-r from-[#00d083] to-[#00b86f] text-black text-xs px-2 py-1 rounded-full font-bold shadow-lg">
            FEATURED
          </span>
        )
      case 'recommended':
        return (
          <span className="bg-gradient-to-r from-blue-400 to-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
            RECOMMENDED
          </span>
        )
      default:
        return null
    }
  }

  // Initialize image to fit and center
  const initializeImage = useCallback(() => {
    if (!imageLoaded || !containerRef.current || !imageRef.current) return
    
    const container = containerRef.current
    const img = imageRef.current
    
    // Get actual container dimensions
    const containerWidth = container.offsetWidth
    const containerHeight = container.offsetHeight
    
    // Get actual image dimensions
    const imgWidth = img.naturalWidth
    const imgHeight = img.naturalHeight
    
    if (!containerWidth || !containerHeight || !imgWidth || !imgHeight) {
      console.log('Missing dimensions:', { containerWidth, containerHeight, imgWidth, imgHeight })
      return
    }
    
    // Calculate scale to fit image in container with some padding
    const padding = 20
    const availableWidth = containerWidth - padding * 2
    const availableHeight = containerHeight - padding * 2
    
    const scaleX = availableWidth / imgWidth
    const scaleY = availableHeight / imgHeight
    const fitScale = Math.min(scaleX, scaleY, 1) // Don't scale up beyond 100%
    
    // Center the image
    const scaledWidth = imgWidth * fitScale
    const scaledHeight = imgHeight * fitScale
    const centerX = (containerWidth - scaledWidth) / 2
    const centerY = (containerHeight - scaledHeight) / 2
    
    console.log('Initializing image:', {
      containerWidth, containerHeight,
      imgWidth, imgHeight,
      fitScale, centerX, centerY
    })
    
    setTransform({
      x: centerX,
      y: centerY,
      scale: fitScale
    })
  }, [imageLoaded])

  useEffect(() => {
    if (imageLoaded) {
      // Small delay to ensure container is rendered
      const timer = setTimeout(initializeImage, 50)
      return () => clearTimeout(timer)
    }
  }, [imageLoaded, initializeImage])

  // Handle image dragging
  const handleImageMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!containerRef.current) return
    
    setIsDragging(true)
    const rect = containerRef.current.getBoundingClientRect()
    setDragStart({
      x: e.clientX - rect.left - transform.x,
      y: e.clientY - rect.top - transform.y
    })
  }, [transform])

  // Handle resize corner dragging
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      scale: transform.scale
    })
  }, [transform.scale])

  // Global mouse move handler
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const newX = e.clientX - rect.left - dragStart.x
      const newY = e.clientY - rect.top - dragStart.y
      
      setTransform(prev => ({ ...prev, x: newX, y: newY }))
    }
    
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x
      const deltaY = e.clientY - resizeStart.y
      const avgDelta = (deltaX + deltaY) / 2
      const scaleDelta = avgDelta * 0.005 // Sensitivity
      const newScale = Math.max(0.2, Math.min(5, resizeStart.scale + scaleDelta))
      
      setTransform(prev => ({ ...prev, scale: newScale }))
    }
  }, [isDragging, isResizing, dragStart, resizeStart])

  // Global mouse up handler
  const handleGlobalMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
  }, [])

  // Add global event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, isResizing, handleGlobalMouseMove, handleGlobalMouseUp])

  const resetTransform = () => {
    setTransform({ x: 0, y: 0, scale: 1 })
  }

  const centerImage = () => {
    if (!containerRef.current || !imageRef.current) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    const containerWidth = containerRect.width || 400
    const containerHeight = containerRect.height || 400
    
    const img = imageRef.current
    const imgWidth = img.naturalWidth || img.width || 400
    const imgHeight = img.naturalHeight || img.height || 300
    
    // Center the image at current scale
    const scaledWidth = imgWidth * transform.scale
    const scaledHeight = imgHeight * transform.scale
    const centerX = (containerWidth - scaledWidth) / 2
    const centerY = (containerHeight - scaledHeight) / 2
    
    setTransform(prev => ({ ...prev, x: centerX, y: centerY }))
  }

  const handleSave = () => {
    onSave(transform)
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl p-6 max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Perfect Your Business Card Image</h2>
          <Button variant="outline" onClick={onCancel} className="text-slate-300">
            ✕ Cancel
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Direct Manipulation Editor */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Direct Image Editor</h3>
            
            <div className="bg-slate-800 rounded-lg p-4">
              <div 
                ref={containerRef}
                className="relative w-full h-[400px] bg-gradient-to-br from-slate-700 to-slate-600 rounded-lg border-2 border-slate-500"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                {/* The actual draggable image */}
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Business image"
                  className="absolute select-none"
                  style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: '0 0',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    maxWidth: 'none',
                    maxHeight: 'none'
                  }}
                  onLoad={() => {
                    console.log('Image loaded:', imageUrl)
                    setImageLoaded(true)
                  }}
                  onError={(e) => {
                    console.error('Image failed to load:', imageUrl, e)
                  }}
                  onMouseDown={handleImageMouseDown}
                  draggable={false}
                />
                
                {/* Resize handles - only show when image is loaded */}
                {imageLoaded && (
                  <>
                    {/* Corner resize handle */}
                    <div
                      className="absolute bg-blue-500 border-2 border-white rounded-full w-6 h-6 cursor-nw-resize hover:bg-blue-400 transition-colors shadow-lg flex items-center justify-center"
                      style={{
                        right: '10px',
                        bottom: '10px',
                        transform: isResizing ? 'scale(1.2)' : 'scale(1)'
                      }}
                      onMouseDown={handleResizeMouseDown}
                      title="Drag to resize"
                    >
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    
                    {/* Visual feedback for current scale */}
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {Math.round(transform.scale * 100)}%
                    </div>
                  </>
                )}
                
                {/* Grid overlay for positioning help */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="border border-white/40" />
                    ))}
                  </div>
                </div>

                {/* Loading state */}
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-sm">Loading image...</div>
                  </div>
                )}

                {/* Debug info */}
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  Debug: {imageLoaded ? 'Loaded' : 'Loading'} | Scale: {transform.scale.toFixed(2)}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={initializeImage} className="text-xs">
                    Fit to Container
                  </Button>
                  <Button size="sm" variant="outline" onClick={centerImage} className="text-xs">
                    Center
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetTransform} className="text-xs">
                    Reset (100%)
                  </Button>
                </div>
                
                <div className="text-xs text-slate-400">
                  Scale: {Math.round(transform.scale * 100)}% | Position: {Math.round(transform.x)}, {Math.round(transform.y)}
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-400 bg-slate-700/50 p-3 rounded space-y-1">
                <p><strong>Drag image</strong> to reposition</p>
                <p><strong>Drag blue corner</strong> to resize (maintains aspect ratio)</p>
                <p><strong>Use grid lines</strong> for perfect alignment</p>
              </div>
            </div>
          </div>

          {/* Live Business Card Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Live Preview</h3>
            <p className="text-sm text-slate-400">This is exactly how customers will see your business card</p>
            
            <div className="flex justify-center">
              <Card className={`w-[280px] h-[320px] ${getTierStyling(businessTier)} transition-all duration-200`}>
                <CardContent className="p-0 h-full flex flex-col">
                  {/* Business Image with Applied Transform */}
                  <div className="relative h-[160px] bg-slate-700 rounded-t-lg overflow-hidden">
                    <div className="w-full h-full relative">
                      <img
                        src={imageUrl}
                        alt={businessName}
                        className="absolute"
                        style={{
                          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                          transformOrigin: '0 0'
                        }}
                      />
                    </div>
                    
                    {/* Tier Badge - Top Right */}
                    <div className="absolute top-2 right-2 z-20">
                      {getTierBadge(businessTier)}
                    </div>
                  </div>

                  {/* Business Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    {/* Business Name */}
                    <h3 className="font-bold text-lg text-white mb-1 line-clamp-1">
                      {businessName}
                    </h3>
                    
                    {/* Category */}
                    <p className="text-slate-300 text-sm mb-2">
                      {businessCategory}
                    </p>
                    
                    {/* Location */}
                    {businessTown && (
                      <p className="text-slate-400 text-xs mb-3 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {businessTown}
                      </p>
                    )}
                    
                    {/* Rating and Offers */}
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-white text-sm font-medium">4.8</span>
                        <span className="text-slate-400 text-xs">(124)</span>
                      </div>
                      
                      <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                        3 OFFERS
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-700">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-[#00d083] hover:bg-[#00b86f] text-black font-medium">
            Save Perfect Position
          </Button>
        </div>
      </div>
    </div>
  )
}
