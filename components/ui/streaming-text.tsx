'use client'

import { useEffect, useState, useRef } from 'react'

interface StreamingTextProps {
  htmlContent: string
  speed?: number
  onComplete?: () => void
  onUpdate?: () => void
  skipStreaming?: boolean
}

export function StreamingText({ htmlContent, speed = 80, onComplete, onUpdate, skipStreaming = false }: StreamingTextProps) {
  const [displayedHtml, setDisplayedHtml] = useState(skipStreaming ? htmlContent : '')
  const containerRef = useRef<HTMLDivElement>(null)
  const hasCalledComplete = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevContentRef = useRef(htmlContent)

  useEffect(() => {
    if (skipStreaming) {
      setDisplayedHtml(htmlContent)
      if (onComplete && !hasCalledComplete.current) {
        hasCalledComplete.current = true
        onComplete()
      }
      return
    }

    // Content changed -- restart streaming from scratch
    if (prevContentRef.current !== htmlContent) {
      prevContentRef.current = htmlContent
      hasCalledComplete.current = false
    }

    // Split HTML into chunks (words + tags)
    const chunks: string[] = []
    let currentChunk = ''
    let insideTag = false

    for (let i = 0; i < htmlContent.length; i++) {
      const char = htmlContent[i]

      if (char === '<') {
        if (currentChunk && !insideTag) {
          chunks.push(currentChunk)
          currentChunk = ''
        }
        insideTag = true
        currentChunk += char
      } else if (char === '>') {
        currentChunk += char
        chunks.push(currentChunk)
        currentChunk = ''
        insideTag = false
      } else if (char === ' ' && !insideTag) {
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

    // Stream chunks one at a time
    let index = 0
    let accumulated = ''

    const tick = () => {
      if (index < chunks.length) {
        accumulated += chunks[index]
        index++
        setDisplayedHtml(accumulated)
        onUpdate?.()
        timerRef.current = setTimeout(tick, speed)
      } else if (!hasCalledComplete.current) {
        hasCalledComplete.current = true
        onComplete?.()
      }
    }

    // Start streaming
    setDisplayedHtml('')
    timerRef.current = setTimeout(tick, speed)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [htmlContent, skipStreaming, speed]) // onComplete/onUpdate excluded to prevent infinite loops

  return (
    <div
      ref={containerRef}
      className="text-sm leading-relaxed whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: displayedHtml }}
    />
  )
}
