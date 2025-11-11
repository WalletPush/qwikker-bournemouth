'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface Event {
  id: string
  title: string
  description: string
  event_type: string
  start_date: string
  start_time?: string
  end_date?: string
  end_time?: string
  location: string
  ticket_url?: string
  image_url?: string
  business_name: string
  business_id: string
}

interface EventCarouselProps {
  events: Event[]
  currentUser?: any
  className?: string
}

export function EventCarousel({ events, currentUser, className = '' }: EventCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const getEventTypeBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      'Music': 'bg-gradient-to-r from-purple-500 to-pink-500',
      'Food & Drink': 'bg-gradient-to-r from-orange-500 to-red-500',
      'Sports': 'bg-gradient-to-r from-blue-500 to-cyan-500',
      'Arts & Culture': 'bg-gradient-to-r from-indigo-500 to-purple-500',
      'Nightlife': 'bg-gradient-to-r from-pink-500 to-rose-500',
      'Other': 'bg-gradient-to-r from-slate-500 to-slate-600'
    }
    
    const colorClass = typeColors[type] || typeColors['Other']
    return <span className={`${colorClass} text-white text-xs font-bold px-2 py-1 rounded-full`}>{type}</span>
  }

  const getEventTypeStyling = (type: string) => {
    const styleMap: Record<string, string> = {
      'Music': 'border-2 border-purple-500 shadow-lg shadow-purple-500/20 bg-gradient-to-br from-slate-800 to-slate-900',
      'Food & Drink': 'border-2 border-orange-500 shadow-lg shadow-orange-500/20 bg-gradient-to-br from-slate-800 to-slate-900',
      'Sports': 'border-2 border-blue-500 shadow-lg shadow-blue-500/20 bg-gradient-to-br from-slate-800 to-slate-900',
      'Arts & Culture': 'border-2 border-indigo-500 shadow-lg shadow-indigo-500/20 bg-gradient-to-br from-slate-800 to-slate-900',
      'Nightlife': 'border-2 border-pink-500 shadow-lg shadow-pink-500/20 bg-gradient-to-br from-slate-800 to-slate-900',
      'Other': 'border border-slate-700 bg-slate-800'
    }
    
    return styleMap[type] || styleMap['Other']
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    })
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % events.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length)
  }

  if (!events.length) return null

  return (
    <div className={`relative ${className}`}>
      {/* Carousel Container */}
      <div className="overflow-hidden px-2">
        <div 
          className="flex transition-transform duration-300 ease-in-out gap-3"
          style={{ transform: `translateX(-${currentIndex * (320 + 12)}px)` }}
        >
          {events.map((event) => (
            <Card 
              key={event.id} 
              className={`flex-shrink-0 w-[320px] h-[420px] ${getEventTypeStyling(event.event_type)} transition-all duration-300 hover:scale-[1.02]`}
            >
              <CardContent className="p-0 h-full flex flex-col">
                {/* Event Image - BIGGER */}
                <div className="relative h-[200px] bg-slate-700 rounded-t-lg overflow-hidden">
                  {event.image_url ? (
                    <img 
                      src={event.image_url} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-indigo-900/40">
                      <svg className="w-20 h-20 text-purple-400/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Gradient Overlay at bottom of image */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent"></div>
                  
                  {/* Event Type Badge - Top Right */}
                  <div className="absolute top-3 right-3 z-20">
                    {getEventTypeBadge(event.event_type)}
                  </div>
                </div>

                {/* Event Info */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Event Title - BIGGER */}
                  <h3 className="font-bold text-xl text-white mb-2 line-clamp-2 leading-tight">
                    {event.title}
                  </h3>
                  
                  {/* Business Name */}
                  <p className="text-purple-300 text-sm mb-3 font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {event.business_name}
                  </p>
                  
                  {/* Date & Time - BETTER STYLING */}
                  <div className="flex flex-col gap-2 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-300">
                      <div className="p-1.5 bg-purple-600/20 rounded">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-semibold">{formatDate(event.start_date)}</span>
                        {event.start_time && <span className="text-slate-400 ml-1">• {event.start_time.substring(0, 5)}</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-300">
                      <div className="p-1.5 bg-purple-600/20 rounded">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                  </div>

                  {/* Action Button - ONLY if ticket URL exists */}
                  {event.ticket_url && (
                    <div className="mt-auto">
                      <a 
                        href={event.ticket_url.startsWith('http') ? event.ticket_url : `https://${event.ticket_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full"
                      >
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-200">
                          Get Tickets
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Navigation Arrows - Only show if more than 1 event */}
      {events.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full shadow-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full shadow-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots Indicator - Only show if more than 1 event */}
      {events.length > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          {events.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-purple-500' : 'bg-slate-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

