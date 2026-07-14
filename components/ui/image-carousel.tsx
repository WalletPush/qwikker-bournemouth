'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ImageTransform } from '@/types/profiles'

interface ImageCarouselProps {
  images: string[]
  alt: string
  className?: string
  showArrows?: boolean
  showDots?: boolean
  imageTransforms?: ImageTransform[]
  /**
   * 'cover' (default) fills the frame and crops overflow.
   * 'contain' shows the WHOLE image (no cropping) over a blurred fill of the
   * same image, so nothing gets cut off — used for the business detail hero.
   */
  fit?: 'cover' | 'contain'
}

export function ImageCarousel({ 
  images, 
  alt, 
  className = '', 
  showArrows = true, 
  showDots = false,
  fit = 'cover'
}: ImageCarouselProps) {
  const isContain = fit === 'contain'
  const objectFitClass = isContain ? 'object-contain' : 'object-cover object-center'
  // Inline styles guarantee the fit/size regardless of stale or unlayered global
  // CSS (e.g. an `img { height: auto }` reset that would otherwise defeat object-fit).
  const mainImgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: isContain ? 'contain' : 'cover',
    objectPosition: 'center',
  }
  const backdropImgStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  // Reset loading state when image changes
  useEffect(() => {
    setImageLoading(true)
    setImageError(false)
    
    // Fallback: hide spinner after 3 seconds even if onLoad doesn't fire
    const timeout = setTimeout(() => {
      setImageLoading(false)
    }, 3000)
    
    return () => clearTimeout(timeout)
  }, [currentIndex, images])

  // If no images or only one image, show simple image
  if (!images || images.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center ${className}`}>
        <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 11h6" />
        </svg>
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 relative overflow-hidden">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-700">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-500 border-t-slate-300"></div>
          </div>
        )}
        {isContain && !imageError && (
          <img
            src={images[0]}
            alt=""
            aria-hidden="true"
            className="scale-110 blur-2xl opacity-50"
            style={backdropImgStyle}
          />
        )}
        <img 
          src={images[0]} 
          alt={alt}
          style={mainImgStyle}
          className={`relative transition-opacity duration-300 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={() => setImageLoading(false)}
          onError={(e) => {
            setImageError(true)
            setImageLoading(false)
          }}
        />
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-700">
            <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
    )
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToImage = (index: number) => {
    setCurrentIndex(index)
  }

  return (
    <div className="relative group w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 overflow-hidden">
      {/* Loading State */}
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-700 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-500 border-t-slate-300"></div>
        </div>
      )}

      {/* Blurred backdrop fill (contain mode) so the full image shows without bars */}
      {isContain && !imageError && (
        <img
          src={images[currentIndex]}
          alt=""
          aria-hidden="true"
          className="scale-110 blur-2xl opacity-50"
          style={backdropImgStyle}
        />
      )}

      {/* Main Image */}
      <img 
        src={images[currentIndex]} 
        alt={`${alt} - Image ${currentIndex + 1}`}
        style={mainImgStyle}
        className={`relative transition-opacity duration-300 ${
          imageLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setImageLoading(false)}
        onError={() => {
          setImageError(true)
          setImageLoading(false)
        }}
      />
      
      {/* Error State */}
      {imageError && !imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-700">
          <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* Navigation Arrows */}
      {showArrows && images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              prevImage()
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              nextImage()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {currentIndex + 1}/{images.length}
        </div>
      )}

      {/* Dots Indicator */}
      {showDots && images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                goToImage(index)
              }}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
