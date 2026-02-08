'use client'

import { useEffect, useState, useRef } from 'react'

interface StreamingTextProps {
  htmlContent: string
  speed?: number // milliseconds per word
  onComplete?: () => void
  onUpdate?: () => void // Called on each chunk to trigger scroll
  skipStreaming?: boolean // If true, show content immediately (for old messages)
}

export function StreamingText({ htmlContent, speed = 80, onComplete, onUpdate, skipStreaming = false }: StreamingTextProps) {
  const [displayedHtml, setDisplayedHtml] = useState(skipStreaming ? htmlContent : '')
  const [currentIndex, setCurrentIndex] = useState(skipStreaming ? Infinity : 0)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasCalledComplete = useRef(false)
  
  // 🚨 FIX: If skipStreaming is true, show content immediately and call onComplete ONCE
  useEffect(() => {
    if (skipStreaming && onComplete && !hasCalledComplete.current) {
      hasCalledComplete.current = true
      onComplete()
    }
  }, [skipStreaming]) // onComplete excluded to prevent infinite loops (ref ensures single call)
  
  useEffect(() => {
    // Skip streaming logic if skipStreaming is true
    if (skipStreaming) return
    
    // Split HTML into chunks (words + tags)
    const chunks: string[] = []
    let currentChunk = ''
    let insideTag = false
    
    for (let i = 0; i < htmlContent.length; i++) {
      const char = htmlContent[i]
      
      if (char === '<') {
        // Start of HTML tag
        if (currentChunk && !insideTag) {
          chunks.push(currentChunk)
          currentChunk = ''
        }
        insideTag = true
        currentChunk += char
      } else if (char === '>') {
        // End of HTML tag
        currentChunk += char
        chunks.push(currentChunk)
        currentChunk = ''
        insideTag = false
      } else if (char === ' ' && !insideTag) {
        // Space between words
        currentChunk += char
        chunks.push(currentChunk)
        currentChunk = ''
      } else {
        currentChunk += char
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk)
    }
    
    // Stream chunks
    if (currentIndex < chunks.length) {
      const timer = setTimeout(() => {
        setDisplayedHtml(prev => prev + chunks[currentIndex])
        setCurrentIndex(prev => prev + 1)
        
        // Trigger scroll update for parent component
        if (onUpdate) {
          onUpdate()
        }
      }, speed)
      
      return () => clearTimeout(timer)
    } else if (currentIndex === chunks.length && onComplete && !hasCalledComplete.current) {
      hasCalledComplete.current = true
      onComplete()
    }
  }, [currentIndex, htmlContent, speed, skipStreaming]) // onComplete/onUpdate excluded to prevent infinite loops
  
  // Reset when content changes (but not if skipStreaming is true)
  useEffect(() => {
    if (!skipStreaming) {
      setDisplayedHtml('')
      setCurrentIndex(0)
    }
    // Reset completion tracking when content changes
    hasCalledComplete.current = false
  }, [htmlContent, skipStreaming])
  
  return (
    <div 
      ref={containerRef}
      className="text-sm leading-relaxed whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: displayedHtml }}
    />
  )
}
