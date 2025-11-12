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
    { id: 'headline', type: 'headline', x: 10, y: 40, width: 80, height: 25, content: headline },
    { id: 'business-logo', type: 'business-logo', x: 3, y: 3, width: 12, height: 12 },
    { id: 'qwikker-logo', type: 'qwikker-logo', x: 75, y: 87, width: 20, height: 8 },
    { id: 'cta', type: 'cta', x: 3, y: 87, width: 40, height: 8, content: 'Install QWIKKER Pass' }
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
            className="flex items-center justify-center p-6 bg-transparent"
          >
            <h1
              className="font-black leading-tight text-center break-words w-full"
              style={{
                color: textColor.startsWith('linear-gradient') ? undefined : textColor,
                background: textColor.startsWith('linear-gradient') ? textColor : undefined,
                WebkitBackgroundClip: textColor.startsWith('linear-gradient') ? 'text' : undefined,
                WebkitTextFillColor: textColor.startsWith('linear-gradient') ? 'transparent' : undefined,
                ...getTextStyle(style?.textEffect || 'bold-shadow'),
                fontSize: 'clamp(1.5rem, 5vw, 4rem)',
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
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
    <div>
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full aspect-square bg-black overflow-hidden"
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
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />

        {/* Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />

        {/* Draggable Elements */}
        {elements.map(renderElement)}
      </div>
    </div>
  )
}

