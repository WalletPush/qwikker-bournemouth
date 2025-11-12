'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Canvas, Textbox, Image as FabricImage, Rect, Group, Text, Shadow, Gradient } from 'fabric'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

interface FabricPostEditorProps {
  backgroundImage: string
  headline: string
  logoUrl?: string
  businessName?: string
  analysis?: any
  onExport?: (imageData: string) => void
}

export function FabricPostEditor({
  backgroundImage,
  headline,
  logoUrl,
  businessName,
  analysis,
  onExport
}: FabricPostEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<Canvas | null>(null)
  const [selectedObject, setSelectedObject] = useState<any>(null)
  const [textColor, setTextColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState(80)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!canvasRef.current) return

    // Initialize Fabric canvas
    const canvas = new Canvas(canvasRef.current, {
      width: 1080,
      height: 1080,
      backgroundColor: '#000'
    })

    fabricCanvasRef.current = canvas

    // Load and setup the canvas
    setupCanvas(canvas)

    // Handle selection
    canvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0] || null)
    })
    canvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0] || null)
    })
    canvas.on('selection:cleared', () => {
      setSelectedObject(null)
    })

    return () => {
      canvas.dispose()
    }
  }, [])

  // Update when props change
  useEffect(() => {
    if (fabricCanvasRef.current && !isLoading) {
      updateCanvasContent()
    }
  }, [backgroundImage, headline, logoUrl])

  const setupCanvas = async (canvas: Canvas) => {
    try {
      console.log('🎨 Setting up Fabric canvas with:', { backgroundImage, headline, logoUrl })
      
      // 1. Add background image directly to the canvas (not as background property)
      const bgImage = await loadImage(backgroundImage)
      console.log('✅ Background image loaded:', bgImage.width, 'x', bgImage.height)
      
      const scaleX = 1080 / (bgImage.width || 1080)
      const scaleY = 1080 / (bgImage.height || 1080)
      
      bgImage.set({
        left: 0,
        top: 0,
        scaleX,
        scaleY,
        selectable: false,
        evented: false
      })
      
      // Add as a regular object, not background
      canvas.add(bgImage)
      canvas.sendToBack(bgImage) // Send to back so text appears on top
      console.log('✅ Background image added to canvas')

      // 2. Add subtle vignette overlay
      const vignette = new Rect({
        left: 0,
        top: 0,
        width: 1080,
        height: 1080,
        fill: 'rgba(0,0,0,0.3)',
        selectable: false,
        evented: false
      })
      canvas.add(vignette)
      console.log('✅ Vignette overlay added')

      // 3. Add headline text (editable)
      const text = new Textbox(headline, {
        left: 540,
        top: 500,
        width: 880,
        fontSize: 80,
        fontFamily: 'Arial Black, sans-serif',
        fontWeight: 900,
        fill: '#ffffff',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        shadow: new Shadow({
          color: 'rgba(0,0,0,0.8)',
          blur: 20,
          offsetX: 0,
          offsetY: 4
        }),
        editable: true
      })
      console.log('✅ Adding headline text:', headline)
      canvas.add(text)
      canvas.bringToFront(text) // Ensure text is on top
      canvas.setActiveObject(text)

      // 4. Add business logo (draggable)
      if (logoUrl) {
        const logo = await loadImage(logoUrl)
        logo.set({
          left: 80,
          top: 80,
          scaleX: 100 / (logo.width || 100),
          scaleY: 100 / (logo.height || 100),
          hasControls: true,
          hasBorders: true
        })
        canvas.add(logo)
      }

      // 5. Add QWIKKER badge (draggable)
      const qwikkerBadge = await createQwikkerBadge()
      qwikkerBadge.set({
        left: 950,
        top: 1000
      })
      canvas.add(qwikkerBadge)

      // 6. Add CTA button (draggable)
      const ctaButton = await createCTAButton()
      ctaButton.set({
        left: 80,
        top: 1000
      })
      canvas.add(ctaButton)

      console.log('✅ Canvas setup complete! Objects:', canvas._objects?.length || 0)
      setIsLoading(false)
      canvas.renderAll()
    } catch (error) {
      console.error('❌ Error setting up canvas:', error)
      setIsLoading(false)
    }
  }

  const updateCanvasContent = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    // Update text
    const textObject = canvas._objects?.find((obj: any) => obj.type === 'textbox')
    if (textObject) {
      textObject.set('text', headline)
      canvas.renderAll()
    }
  }

  const loadImage = (url: string): Promise<FabricImage> => {
    return new Promise((resolve, reject) => {
      FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img: any) => {
        if (img) resolve(img)
        else reject(new Error('Failed to load image'))
      })
    })
  }

  const createQwikkerBadge = async (): Promise<Group> => {
    const rect = new Rect({
      width: 120,
      height: 40,
      fill: 'rgba(0,0,0,0.8)',
      rx: 8,
      ry: 8
    })

    const text = new Text('QWIKKER', {
      fontSize: 14,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#ffffff',
      left: 10,
      top: 12
    })

    return new Group([rect, text], {
      selectable: true,
      hasControls: false
    })
  }

  const createCTAButton = async (): Promise<Group> => {
    const rect = new Rect({
      width: 200,
      height: 44,
      fill: 'rgba(255,255,255,0.95)',
      rx: 10,
      ry: 10
    })

    const text = new Text('Install QWIKKER Pass', {
      fontSize: 13,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#000000',
      left: 20,
      top: 14
    })

    return new Group([rect, text], {
      selectable: true,
      hasControls: false
    })
  }

  // Editor controls
  const handleTextColorChange = (color: string) => {
    if (selectedObject && selectedObject.type === 'textbox') {
      (selectedObject as Textbox).set('fill', color)
      fabricCanvasRef.current?.renderAll()
      setTextColor(color)
    }
  }

  const handleFontSizeChange = (size: number[]) => {
    if (selectedObject && selectedObject.type === 'textbox') {
      (selectedObject as Textbox).set('fontSize', size[0])
      fabricCanvasRef.current?.renderAll()
      setFontSize(size[0])
    }
  }

  const handleAddText = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const text = new Textbox('New Text', {
      left: 540,
      top: 300,
      width: 600,
      fontSize: 60,
      fontFamily: 'Arial Black',
      fontWeight: 900,
      fill: '#ffffff',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      shadow: new Shadow({
        color: 'rgba(0,0,0,0.8)',
        blur: 20
      })
    })

    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
  }

  const handleDelete = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !selectedObject) return

    canvas.remove(selectedObject)
    canvas.renderAll()
    setSelectedObject(null)
  }

  const handleExport = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1
    })

    if (onExport) {
      onExport(dataURL)
    }

    // Also trigger download
    const link = document.createElement('a')
    link.download = `${businessName || 'post'}-${Date.now()}.png`
    link.href = dataURL
    link.click()
  }

  return (
    <div className="space-y-4">
      {/* Canvas */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d083] mx-auto mb-4"></div>
              <p className="text-white">Loading editor...</p>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} />
      </div>

      {/* Editor Controls */}
      {!isLoading && (
        <div className="bg-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleAddText}
              size="sm"
              className="bg-[#00d083] hover:bg-[#00b870] text-white"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Text
            </Button>
            
            {selectedObject && (
              <Button 
                onClick={handleDelete}
                size="sm"
                variant="destructive"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </Button>
            )}

            <div className="flex-1" />

            <Button 
              onClick={handleExport}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </Button>
          </div>

          {/* Text controls (only show when text is selected) */}
          {selectedObject && selectedObject.type === 'textbox' && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
              <div>
                <Label className="text-white text-sm mb-2 block">Text Color</Label>
                <Input
                  type="color"
                  value={textColor}
                  onChange={(e) => handleTextColorChange(e.target.value)}
                  className="h-10 cursor-pointer"
                />
              </div>
              <div>
                <Label className="text-white text-sm mb-2 block">Font Size: {fontSize}px</Label>
                <Slider
                  value={[fontSize]}
                  onValueChange={handleFontSizeChange}
                  min={20}
                  max={200}
                  step={5}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <p className="text-slate-400 text-xs text-center">
            💡 Tip: Click and drag elements to move them. Use corner handles to resize.
          </p>
        </div>
      )}
    </div>
  )
}

