'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ImageTransform {
  x: number
  y: number
  scale: number
}

interface SimpleImageEditorProps {
  imageUrl: string
  businessName: string
  businessCategory: string
  businessTown?: string
  businessTier: 'free_trial' | 'featured' | 'qwikker_picks' | 'recommended'
  onSave: (transform: ImageTransform) => void
  onCancel: () => void
}

export function SimpleImageEditor({
  imageUrl,
  businessName,
  businessCategory,
  businessTown,
  businessTier,
  onSave,
  onCancel
}: SimpleImageEditorProps) {
  const [transform, setTransform] = useState<ImageTransform>({ x: 50, y: 50, scale: 0.8 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

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
            QWIKKER PICK
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

  // Fixed drag handling with global events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDragStart({
        x: e.clientX - rect.left - transform.x,
        y: e.clientY - rect.top - transform.y
      })
    }
  }

  // Global mouse events for better dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return
      
      const rect = containerRef.current.getBoundingClientRect()
      setTransform(prev => ({
        ...prev,
        x: e.clientX - rect.left - dragStart.x,
        y: e.clientY - rect.top - dragStart.y
      }))
    }

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, dragStart])

  // Simple zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY * -0.001
    const newScale = Math.max(0.1, Math.min(3, transform.scale + delta))
    setTransform(prev => ({ ...prev, scale: newScale }))
  }

  // Simple controls
  const resetImage = () => {
    setTransform({ x: 100, y: 50, scale: 0.8 })
  }

  const centerImage = () => {
    setTransform(prev => ({ ...prev, x: 150, y: 100 }))
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Position Your Business Image</h2>
          <Button variant="outline" onClick={onCancel} className="text-slate-300">
            Cancel
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Simple Editor */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Image Editor</h3>
            
            <div className="bg-slate-800 rounded-lg p-4">
              <div 
                ref={containerRef}
                className="relative w-full h-[350px] bg-slate-700 rounded-lg overflow-hidden border-2 border-slate-500"
                onWheel={handleWheel}
              >
                <img
                  src={imageUrl}
                  alt="Business"
                  className={`absolute select-none transition-opacity ${isDragging ? 'cursor-grabbing opacity-80' : 'cursor-grab'}`}
                  style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: '0 0',
                    maxWidth: 'none',
                    maxHeight: 'none'
                  }}
                  onMouseDown={handleMouseDown}
                  draggable={false}
                />
                
                {/* Visual feedback */}
                {isDragging && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    Dragging...
                  </div>
                )}
                
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {Math.round(transform.scale * 100)}% • {Math.round(transform.x)}, {Math.round(transform.y)}
                </div>
                
                {/* Simple grid */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  <div className="w-full h-full border-2 border-dashed border-white/30"></div>
                  <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-white/30"></div>
                  <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-white/30"></div>
                </div>
              </div>

              {/* Simple controls */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={resetImage}>
                    Reset
                  </Button>
                  <Button size="sm" variant="outline" onClick={centerImage}>
                    Center
                  </Button>
                </div>
                
                <div className="text-xs text-slate-400">
                  Scale: {Math.round(transform.scale * 100)}%
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-400 bg-slate-700/50 p-3 rounded">
                <p>Drag image to move • Scroll to zoom • Use grid lines to align</p>
              </div>
            </div>
          </div>

          {/* Business Card Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Preview</h3>
            
            <div className="flex justify-center">
              <Card className={`w-[280px] h-[320px] ${getTierStyling(businessTier)}`}>
                <CardContent className="p-0 h-full flex flex-col">
                  {/* Image with transform applied */}
                  <div className="relative h-[160px] bg-slate-700 rounded-t-lg overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={businessName}
                      className="absolute w-full h-full object-cover"
                      style={{
                        transform: `translate(${transform.x * 0.45}px, ${transform.y * 0.45}px) scale(${transform.scale})`,
                        transformOrigin: '0 0'
                      }}
                    />
                    
                    <div className="absolute top-2 right-2 z-20">
                      {getTierBadge(businessTier)}
                    </div>
                  </div>

                  {/* Business Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg text-white mb-1 line-clamp-1">
                      {businessName}
                    </h3>
                    <p className="text-slate-300 text-sm mb-2">
                      {businessCategory}
                    </p>
                    {businessTown && (
                      <p className="text-slate-400 text-xs mb-3 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {businessTown}
                      </p>
                    )}
                    
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

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-700">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(transform)} className="bg-[#00d083] hover:bg-[#00b86f] text-black font-medium">
            Save Position
          </Button>
        </div>
      </div>
    </div>
  )
}
