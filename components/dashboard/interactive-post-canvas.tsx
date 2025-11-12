'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface CanvasElement {
  id: string
  type: 'headline' | 'business-logo' | 'qwikker-logo' | 'cta'
  x: number
  y: number
  width: number
  height: number
  content?: string
  locked?: boolean
}

interface InteractivePostCanvasProps {
  backgroundImage: string
  headline: string
  logoUrl?: string
  businessName?: string
  style: any
  onElementsChange?: (elements: CanvasElement[]) => void
  onRegenerateBackground?: () => void
}

export function InteractivePostCanvas({
  backgroundImage,
  headline,
  logoUrl,
  businessName,
  style,
  onElementsChange,
  onRegenerateBackground
}: InteractivePostCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [elements, setElements] = useState<CanvasElement[]>([
    { id: 'headline', type: 'headline', x: 50, y: 50, width: 80, height: 20, content: headline },
    { id: 'business-logo', type: 'business-logo', x: 5, y: 5, width: 15, height: 15 },
    { id: 'qwikker-logo', type: 'qwikker-logo', x: 80, y: 90, width: 15, height: 5 },
    { id: 'cta', type: 'cta', x: 5, y: 90, width: 30, height: 5, content: 'Install QWIKKER Pass' }
  ])
  
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [selected, setSelected] = useState<string | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (canvasRef.current) {
      setCanvasSize({
        width: canvasRef.current.offsetWidth,
        height: canvasRef.current.offsetHeight
      })
    }
  }, [])

  useEffect(() => {
    // Update headline content when it changes
    setElements(prev => prev.map(el => 
      el.id === 'headline' ? { ...el, content: headline } : el
    ))
  }, [headline])

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    const element = elements.find(el => el.id === elementId)
    if (!element || element.locked) return

    setDragging(elementId)
    setSelected(elementId)
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const elementX = (element.x / 100) * rect.width
    const elementY = (element.y / 100) * rect.height
    
    setDragOffset({
      x: e.clientX - elementX,
      y: e.clientY - elementY
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - dragOffset.x) / rect.width) * 100
    const y = ((e.clientY - dragOffset.y) / rect.height) * 100

    // Constrain to canvas bounds
    const element = elements.find(el => el.id === dragging)
    if (!element) return

    const constrainedX = Math.max(0, Math.min(100 - element.width, x))
    const constrainedY = Math.max(0, Math.min(100 - element.height, y))

    setElements(prev => prev.map(el =>
      el.id === dragging ? { ...el, x: constrainedX, y: constrainedY } : el
    ))

    if (onElementsChange) {
      const updatedElements = elements.map(el =>
        el.id === dragging ? { ...el, x: constrainedX, y: constrainedY } : el
      )
      onElementsChange(updatedElements)
    }
  }

  const handleMouseUp = () => {
    setDragging(null)
  }

  const getTextColorClass = (color: string) => {
    const colors: Record<string, string> = {
      'white': '#ffffff',
      'black': '#000000',
      'gradient-gold': 'linear-gradient(to right, #fbbf24, #f59e0b, #d97706)',
      'neon-green': '#00ff9d',
      'hot-pink': '#ff006e',
      'electric-blue': '#00d4ff'
    }
    return colors[color] || '#ffffff'
  }

  const getTextStyle = (effect: string): React.CSSProperties => {
    const effects: Record<string, React.CSSProperties> = {
      'bold-shadow': { textShadow: '0 10px 40px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)' },
      'outline-glow': { textShadow: '0 0 20px currentColor, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' },
      '3d-pop': { textShadow: '3px 3px 0 rgba(0,0,0,0.3), 6px 6px 0 rgba(0,0,0,0.2), 9px 9px 0 rgba(0,0,0,0.1)' },
      'neon': { textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor' }
    }
    return effects[effect] || effects['bold-shadow']
  }

  const renderElement = (element: CanvasElement) => {
    const isSelected = selected === element.id
    const isDragging = dragging === element.id

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${element.x}%`,
      top: `${element.y}%`,
      width: `${element.width}%`,
      height: `${element.height}%`,
      cursor: element.locked ? 'default' : isDragging ? 'grabbing' : 'grab',
      border: isSelected ? '2px solid #00d083' : '2px solid transparent',
      boxShadow: isSelected ? '0 0 0 4px rgba(0, 208, 131, 0.2)' : 'none',
      transition: isDragging ? 'none' : 'border 0.2s, box-shadow 0.2s',
      zIndex: isDragging ? 1000 : isSelected ? 100 : element.type === 'headline' ? 50 : 10
    }

    switch (element.type) {
      case 'headline':
        const textColor = getTextColorClass(style?.textColor || 'white')
        return (
          <div
            key={element.id}
            style={baseStyle}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            className="flex items-center justify-center p-4"
          >
            <h1
              className="text-4xl font-black leading-tight text-center break-words"
              style={{
                color: textColor.startsWith('linear-gradient') ? undefined : textColor,
                background: textColor.startsWith('linear-gradient') ? textColor : undefined,
                WebkitBackgroundClip: textColor.startsWith('linear-gradient') ? 'text' : undefined,
                WebkitTextFillColor: textColor.startsWith('linear-gradient') ? 'transparent' : undefined,
                ...getTextStyle(style?.textEffect || 'bold-shadow'),
                fontSize: 'clamp(1.5rem, 4vw, 3rem)'
              }}
            >
              {element.content}
            </h1>
          </div>
        )

      case 'business-logo':
        return logoUrl ? (
          <div
            key={element.id}
            style={baseStyle}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            className="bg-black/50 backdrop-blur-md rounded-xl p-2 border border-white/20"
          >
            <img src={logoUrl} alt="Business Logo" className="w-full h-full object-contain" />
          </div>
        ) : null

      case 'qwikker-logo':
        return (
          <div
            key={element.id}
            style={baseStyle}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1 flex items-center justify-center"
          >
            <img
              src="/Qwikker Logo web.svg"
              alt="QWIKKER"
              className="h-full w-auto"
              style={{ filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
            />
          </div>
        )

      case 'cta':
        return (
          <div
            key={element.id}
            style={baseStyle}
            onMouseDown={(e) => handleMouseDown(e, element.id)}
            className="bg-gradient-to-t from-black/80 via-black/60 to-transparent px-4 py-2 flex items-center justify-center"
          >
            <span className="text-white text-sm font-bold drop-shadow-lg whitespace-nowrap">
              {element.content}
            </span>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative aspect-square bg-black rounded-lg overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setSelected(null)}
        style={{ touchAction: 'none' }}
      >
        {/* Background Image */}
        <img
          src={backgroundImage}
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />

        {/* Draggable Elements */}
        {elements.map(renderElement)}

        {/* Instructions Overlay */}
        {!dragging && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full pointer-events-none">
            💡 Drag elements to reposition
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <Button
          onClick={onRegenerateBackground}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Change Background
        </Button>
        <Button
          onClick={() => {
            // Reset to default positions
            setElements([
              { id: 'headline', type: 'headline', x: 50, y: 50, width: 80, height: 20, content: headline },
              { id: 'business-logo', type: 'business-logo', x: 5, y: 5, width: 15, height: 15 },
              { id: 'qwikker-logo', type: 'qwikker-logo', x: 80, y: 90, width: 15, height: 5 },
              { id: 'cta', type: 'cta', x: 5, y: 90, width: 30, height: 5, content: 'Install QWIKKER Pass' }
            ])
          }}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset Layout
        </Button>
      </div>

      {/* Selected Element Info */}
      {selected && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-white text-sm font-semibold mb-2">
            Selected: {elements.find(el => el.id === selected)?.type.replace('-', ' ').toUpperCase()}
          </p>
          <p className="text-slate-400 text-xs">
            Drag to reposition • Click outside to deselect
          </p>
        </div>
      )}
    </div>
  )
}

