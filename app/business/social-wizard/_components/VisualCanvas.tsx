/**
 * VISUAL CANVAS
 * Fabric.js-based canvas for composing social post images
 * Loaded dynamically to avoid SSR issues
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useSocialWizardStore } from '@/lib/social-wizard/store'
import { Upload, Image as ImageIcon } from 'lucide-react'

// Template IDs
const TEMPLATES = [
  { id: 'offer_card', label: 'Offer Card' },
  { id: 'event_card', label: 'Event Card' },
  { id: 'menu_spotlight', label: 'Menu Spotlight' },
  { id: 'general', label: 'General' }
]

// Built-in placeholder backgrounds (solid colors until images are added)
const PLACEHOLDER_BACKGROUNDS = [
  '#1a1a1a', // Dark gray
  '#0f172a', // Dark blue
  '#171717'  // Charcoal
]

export function VisualCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fabricCanvas, setFabricCanvas] = useState<any>(null)
  const [fabricLib, setFabricLib] = useState<any>(null) // Store fabric library
  const [selectedBg, setSelectedBg] = useState<string>(PLACEHOLDER_BACKGROUNDS[0])
  
  const { currentDraft, setMediaUrl, setTemplateId, setCanvasReady } = useSocialWizardStore()

  // Dynamically import Fabric.js (avoid SSR)
  useEffect(() => {
    let mounted = true

    async function initFabric() {
      if (!canvasRef.current) return

      try {
        const fabricModule = await import('fabric')
        const fabric = fabricModule.default || fabricModule
        
        if (!mounted || !fabric || !fabric.Canvas) {
          console.error('Fabric module not loaded correctly')
          return
        }

        setFabricLib(fabric) // Store fabric library for helper functions

        const canvas = new fabric.Canvas(canvasRef.current, {
          width: 600,
          height: 600,
          backgroundColor: '#1a1a1a'
        })

        setFabricCanvas(canvas)
        setCanvasReady(true)

        // Load initial background
        loadBackgroundWithFabric(fabric, canvas, selectedBg)

        // Add QWIKKER watermark
        addWatermarkWithFabric(fabric, canvas)

        // Add default text overlay
        addTextOverlayWithFabric(fabric, canvas, 'Your Caption Here', 'premium')

      } catch (error) {
        console.error('Failed to load Fabric.js:', error)
      }
    }

    initFabric()

    return () => {
      mounted = false
      if (fabricCanvas) {
        fabricCanvas.dispose()
      }
    }
  }, []) // Only run once on mount

  // Update text when caption changes
  useEffect(() => {
    if (!fabricCanvas || !currentDraft.caption) return

    const textObjects = fabricCanvas.getObjects().filter((obj: any) => obj.type === 'textbox')
    if (textObjects.length > 0) {
      textObjects[0].set('text', currentDraft.caption.slice(0, 100)) // Max 100 chars for display
      fabricCanvas.renderAll()
    }
  }, [fabricCanvas, currentDraft.caption])

  function loadBackgroundWithFabric(fabric: any, canvas: any, urlOrColor: string) {
    // If it's a color (starts with #), use solid color
    if (urlOrColor.startsWith('#')) {
      canvas.backgroundColor = urlOrColor
      canvas.renderAll()
      return
    }
    
    // Otherwise load image
    fabric.FabricImage.fromURL(urlOrColor, { crossOrigin: 'anonymous' }).then((img: any) => {
      if (!img) {
        console.warn('Failed to load image, using fallback color')
        canvas.backgroundColor = '#1a1a1a'
        canvas.renderAll()
        return
      }
      img.set({
        scaleX: 600 / (img.width || 600),
        scaleY: 600 / (img.height || 600),
        selectable: false,
        evented: false
      })
      canvas.backgroundImage = img
      canvas.renderAll()
    }).catch((err: any) => {
      console.warn('Failed to load background image:', err)
      canvas.backgroundColor = '#1a1a1a'
      canvas.renderAll()
    })
  }

  function addWatermarkWithFabric(fabric: any, canvas: any) {
    const watermark = new fabric.FabricText('QWIKKER', {
      left: 20,
      top: 560,
      fontSize: 16,
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      fill: 'rgba(255, 255, 255, 0.4)',
      selectable: false,
      evented: false
    })
    canvas.add(watermark)
  }

  function addTextOverlayWithFabric(fabric: any, canvas: any, text: string, template: string) {
    // Remove existing text overlays
    const existingText = canvas.getObjects().filter((obj: any) => obj.type === 'textbox')
    existingText.forEach((obj: any) => canvas.remove(obj))

    // Add new text based on template
    const textbox = new fabric.Textbox(text, {
      left: 50,
      top: template === 'event_card' ? 100 : 250,
      width: 500,
      fontSize: template === 'offer_card' ? 40 : 32,
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      fill: '#ffffff',
      textAlign: 'center',
      shadow: new fabric.Shadow({
        color: 'rgba(0, 0, 0, 0.8)',
        blur: 8,
        offsetX: 2,
        offsetY: 2
      }),
      editable: true
    })

    canvas.add(textbox)
    canvas.renderAll()
  }

  function handleBgChange(url: string) {
    setSelectedBg(url)
    if (fabricLib && fabricCanvas) {
      loadBackgroundWithFabric(fabricLib, fabricCanvas, url)
    }
  }

  function handleTemplateChange(templateId: string) {
    setTemplateId(templateId)
    if (fabricLib && fabricCanvas) {
      addTextOverlayWithFabric(fabricLib, fabricCanvas, currentDraft.caption || 'Your Caption Here', templateId)
    }
  }

  function handleExport() {
    if (!fabricCanvas) return
    
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2 // 2x resolution
    })

    // Download
    const link = document.createElement('a')
    link.download = `qwikker-post-${Date.now()}.png`
    link.href = dataURL
    link.click()
  }

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Template
        </label>
        <div className="flex gap-2">
          {TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => handleTemplateChange(template.id)}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
                currentDraft.template_id === template.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="bg-neutral-800 rounded-lg p-4 flex items-center justify-center">
        <canvas ref={canvasRef} className="border border-neutral-700 rounded" />
      </div>

      {/* Background Selector */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Background
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PLACEHOLDER_BACKGROUNDS.map((bg, index) => (
            <button
              key={bg}
              onClick={() => handleBgChange(bg)}
              className={`aspect-square rounded-lg border-2 transition-all overflow-hidden ${
                selectedBg === bg
                  ? 'border-orange-500'
                  : 'border-neutral-700 hover:border-neutral-600'
              }`}
            >
              <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-neutral-600" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Custom Background */}
      <button className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
        <Upload className="w-4 h-4" />
        Upload Custom Background
      </button>
    </div>
  )
}
