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
  const [showModal, setShowModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

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
          style={{ transform: `translateX(-${currentIndex * (280 + 12)}px)` }}
        >
          {events.map((event) => (
            <div 
              key={event.id}
              className="flex-shrink-0 w-[280px]"
            >
              <Card 
                className={`h-full ${getEventTypeStyling(event.event_type)} transition-all duration-200 hover:shadow-2xl cursor-pointer`}
                onClick={() => {
                  setSelectedEvent(event)
                  setShowModal(true)
                }}
              >
                <CardContent className="p-0 h-full">
                  {/* Compact Image */}
                  <div className="relative h-[140px] bg-slate-700 rounded-t-lg overflow-hidden">
                    {event.image_url ? (
                      <img 
                        src={event.image_url} 
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-indigo-900/30">
                        <svg className="w-12 h-12 text-purple-400/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Event Type Badge */}
                    <div className="absolute top-2 right-2 z-10">
                      {getEventTypeBadge(event.event_type)}
                    </div>
                  </div>

                  {/* Compact Info */}
                  <div className="p-3">
                    {/* Title */}
                    <h3 className="font-bold text-base text-white mb-1 line-clamp-2 leading-snug">
                      {event.title}
                    </h3>
                    
                    {/* Business */}
                    <p className="text-xs text-purple-300 mb-2 flex items-center gap-1">
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="line-clamp-1">{event.business_name}</span>
                    </p>
                    
                    {/* Description - NEW */}
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                    
                    {/* Date & Time - Compact */}
                    <div className="flex items-center gap-1 text-xs text-slate-300 mb-1">
                      <svg className="w-3 h-3 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="line-clamp-1">{formatDate(event.start_date)}</span>
                      {event.start_time && <span className="text-slate-400">• {event.start_time.substring(0, 5)}</span>}
                    </div>
                    
                    {/* Location - Compact */}
                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
                      <svg className="w-3 h-3 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="line-clamp-1">{event.location}</span>
                    </div>

                    {/* Action Buttons - NEW */}
                    <div className="space-y-1.5">
                <Button 
                  variant="outline"
                  className="w-full border-purple-500 text-purple-300 hover:bg-purple-500 hover:text-white text-xs font-semibold py-2 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('🔵 More Info clicked:', event.title)
                    setSelectedEvent(event)
                    setShowModal(true)
                    console.log('🔵 State set:', { showModal: true, event: event.title })
                  }}
                >
                  More Info
                </Button>
                      <Button 
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold py-2 shadow-md hover:shadow-lg transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Navigate to events page with hero card open
                          const walletPassId = currentUser?.wallet_pass_id
                          const baseUrl = '/user/events'
                          const params = new URLSearchParams()
                          if (walletPassId) params.set('wallet_pass_id', walletPassId)
                          params.set('event', event.id)
                          window.location.href = `${baseUrl}?${params.toString()}`
                        }}
                      >
                        View Event
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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

      {/* Modal - Compact Fixed Size */}
      {showModal && selectedEvent && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => {
            setShowModal(false)
            setSelectedEvent(null)
          }}
        >
          <div 
            className="bg-slate-900 rounded-lg relative"
            style={{ width: '500px', maxHeight: '600px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                setShowModal(false)
                setSelectedEvent(null)
              }}
              className="absolute top-2 right-2 z-10 w-8 h-8 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white font-bold text-xl"
            >
              ×
            </button>

            {/* Image - SMALL */}
            {selectedEvent.image_url && (
              <img 
                src={selectedEvent.image_url} 
                alt={selectedEvent.title}
                style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                className="rounded-t-lg"
              />
            )}

            {/* Scrollable Content */}
            <div style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
              <h2 className="text-white text-xl font-bold mb-2">{selectedEvent.title}</h2>
              <p className="text-purple-400 text-sm mb-3">📍 {selectedEvent.business_name}</p>
              
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">{selectedEvent.description}</p>
              
              <div className="space-y-2 mb-4 text-sm text-white">
                <div>📅 {formatDate(selectedEvent.start_date)}</div>
                {selectedEvent.start_time && (
                  <div>
                    🕐 {selectedEvent.start_time.substring(0, 5)}
                    {selectedEvent.end_time && ` - ${selectedEvent.end_time.substring(0, 5)}`}
                  </div>
                )}
                <div>📍 {selectedEvent.location}</div>
              </div>

              <div className="flex gap-2">
                {selectedEvent.ticket_url && (
                  <a 
                    href={selectedEvent.ticket_url.startsWith('http') ? selectedEvent.ticket_url : `https://${selectedEvent.ticket_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ flex: 1 }}
                  >
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                      Get Tickets
                    </Button>
                  </a>
                )}
                <Button 
                  variant="outline"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const walletPassId = currentUser?.wallet_pass_id
                    const params = new URLSearchParams()
                    if (walletPassId) params.set('wallet_pass_id', walletPassId)
                    params.set('event', selectedEvent.id)
                    window.location.href = `/user/events?${params.toString()}`
                  }}
                >
                  Full Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
       
