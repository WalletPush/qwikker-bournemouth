'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShareButton } from '@/components/ui/share-button'
import { AiCompanionCard } from '@/components/ui/ai-companion-card'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Calendar, Clock, MapPin, Users, ExternalLink, Heart, Bookmark } from 'lucide-react'

interface UserEventsPageProps {
  events?: any[]
  walletPassId?: string
  city: string
}

export function UserEventsPage({ events = [], walletPassId: propWalletPassId, city }: UserEventsPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('upcoming')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const searchParams = useSearchParams()
  const urlWalletPassId = searchParams.get('wallet_pass_id')
  const walletPassId = propWalletPassId || urlWalletPassId
  const selectedEventId = searchParams.get('event') // For hero card deep linking
  
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set())
  const [interestedEvents, setInterestedEvents] = useState<Set<string>>(new Set())
  const [heroEventId, setHeroEventId] = useState<string | null>(null)
  
  // Load from localStorage after component mounts
  useEffect(() => {
    const userId = walletPassId || 'anonymous-user'
    
    const savedEventsData = localStorage.getItem(`qwikker-saved-events-${userId}`)
    const interestedEventsData = localStorage.getItem(`qwikker-interested-events-${userId}`)
    
    if (savedEventsData) {
      setSavedEvents(new Set(JSON.parse(savedEventsData)))
    }
    if (interestedEventsData) {
      setInterestedEvents(new Set(JSON.parse(interestedEventsData)))
    }
  }, [walletPassId])

  // Open hero card from URL parameter
  useEffect(() => {
    if (selectedEventId) {
      setHeroEventId(selectedEventId)
    }
  }, [selectedEventId])

  // Helper function to scroll to results
  const scrollToResults = () => {
    setTimeout(() => {
      const resultsSection = document.querySelector('[data-events-results]')
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }
  
  // Get unique event types
  const eventTypes = ['all', ...Array.from(new Set(events.map(e => e.event_type).filter(Boolean)))]
  
  // Filter events
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  const upcomingEvents = events.filter(e => new Date(e.event_date) >= today)
  const thisWeekEvents = upcomingEvents.filter(e => new Date(e.event_date) <= nextWeek)
  const todayEvents = upcomingEvents.filter(e => new Date(e.event_date).toDateString() === today.toDateString())
  
  // Filter saved/interested to only show upcoming events (exclude expired)
  const savedEventsList = upcomingEvents.filter(e => savedEvents.has(e.id))
  const interestedEventsList = upcomingEvents.filter(e => interestedEvents.has(e.id))
  
  // Filter counts
  const getFilters = () => [
    { id: 'upcoming', label: 'All Events', count: upcomingEvents.length },
    { id: 'today', label: 'Today', count: todayEvents.length },
    { id: 'this_week', label: 'This Week', count: thisWeekEvents.length },
    { id: 'saved', label: 'My Saved', count: savedEventsList.length },
    { id: 'interested', label: "I'm Interested", count: interestedEventsList.length },
    { id: 'free', label: 'Free Events', count: upcomingEvents.filter(e => e.price_info?.toLowerCase().includes('free')).length },
  ]

  const toggleSaved = (eventId: string) => {
    const userId = walletPassId || 'anonymous-user'
    
    setSavedEvents(prev => {
      const newSaved = new Set(prev)
      if (newSaved.has(eventId)) {
        newSaved.delete(eventId)
      } else {
        newSaved.add(eventId)
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(`qwikker-saved-events-${userId}`, JSON.stringify([...newSaved]))
      }
      return newSaved
    })
  }

  const toggleInterested = (eventId: string) => {
    const userId = walletPassId || 'anonymous-user'
    
    setInterestedEvents(prev => {
      const newInterested = new Set(prev)
      if (newInterested.has(eventId)) {
        newInterested.delete(eventId)
      } else {
        newInterested.add(eventId)
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(`qwikker-interested-events-${userId}`, JSON.stringify([...newInterested]))
      }
      return newInterested
    })
  }

  // Apply filters
  let filteredEvents = events
  if (selectedFilter === 'upcoming') {
    filteredEvents = upcomingEvents
  } else if (selectedFilter === 'today') {
    filteredEvents = todayEvents
  } else if (selectedFilter === 'this_week') {
    filteredEvents = thisWeekEvents
  } else if (selectedFilter === 'saved') {
    filteredEvents = savedEventsList
  } else if (selectedFilter === 'interested') {
    filteredEvents = interestedEventsList
  } else if (selectedFilter === 'live_music') {
    filteredEvents = events.filter(e => e.event_type === 'live_music')
  } else if (selectedFilter === 'workshop') {
    filteredEvents = events.filter(e => e.event_type === 'workshop')
  } else if (selectedFilter === 'tasting') {
    filteredEvents = events.filter(e => e.event_type === 'tasting')
  } else if (selectedFilter === 'free') {
    filteredEvents = events.filter(e => e.price_info?.toLowerCase().includes('free'))
  }

  // Apply category filter
  if (selectedCategory !== 'all') {
    filteredEvents = filteredEvents.filter(e => e.event_type === selectedCategory)
  }

  // Sort by date (earliest first)
  filteredEvents = filteredEvents.sort((a, b) => 
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const isToday = date.toDateString() === today.toDateString()
    const isTomorrow = date.toDateString() === new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString()
    
    if (isToday) return 'Today'
    if (isTomorrow) return 'Tomorrow'
    
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return null
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      live_music: 'Live Music',
      workshop: 'Workshop',
      tasting: 'Tasting',
      special_occasion: 'Special',
      sports_viewing: 'Sports',
      quiz_night: 'Quiz',
      comedy: 'Comedy',
      open_mic: 'Open Mic',
      themed_night: 'Themed',
      holiday_event: 'Holiday',
      class: 'Class',
      other: 'Event'
    }
    return labels[type] || type
  }

  const handleOpenHeroCard = (eventId: string) => {
    setHeroEventId(eventId)
    // Update URL without reload
    const params = new URLSearchParams(window.location.search)
    params.set('event', eventId)
    window.history.pushState({}, '', `?${params.toString()}`)
  }

  const handleCloseHeroCard = () => {
    setHeroEventId(null)
    // Remove event parameter from URL
    const params = new URLSearchParams(window.location.search)
    params.delete('event')
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    window.history.pushState({}, '', newUrl)
  }

  const heroEvent = heroEventId ? events.find(e => e.id === heroEventId) : null

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* Hero Card Modal - Full Screen Overlay */}
      {heroEvent && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 overflow-y-auto backdrop-blur-sm"
          onClick={handleCloseHeroCard}
        >
          <div className="min-h-screen px-4 py-8">
            <div 
              className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={handleCloseHeroCard}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Hero Image */}
              {heroEvent.event_image && (
                <div className="relative h-80 rounded-t-2xl overflow-hidden">
                  <img
                    src={heroEvent.event_image}
                    alt={heroEvent.event_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  {/* Event Type Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-blue-500/90 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg">
                      {getEventTypeLabel(heroEvent.event_type)}
                    </span>
                  </div>

                  {/* Date Badge */}
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-2xl font-bold">{new Date(heroEvent.event_date).getDate()}</div>
                        <div className="text-xs uppercase">{new Date(heroEvent.event_date).toLocaleDateString('en-GB', { month: 'short' })}</div>
                      </div>
                      {heroEvent.event_start_time && (
                        <div className="border-l border-slate-500 pl-3">
                          <div className="text-sm font-semibold">{formatTime(heroEvent.event_start_time)}</div>
                          {heroEvent.event_end_time && (
                            <div className="text-xs text-slate-300">to {formatTime(heroEvent.event_end_time)}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Event Content */}
              <div className="p-8">
                {/* Event Name & Business */}
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-white mb-2">{heroEvent.event_name}</h1>
                  <Link 
                    href={`/user/business/${heroEvent.business_name?.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    @ {heroEvent.business_name}
                  </Link>
                </div>

                {/* Event Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-6 bg-slate-800/50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Date</div>
                      <div className="text-white font-medium">{formatDate(heroEvent.event_date)}</div>
                    </div>
                  </div>

                  {heroEvent.event_start_time && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Time</div>
                        <div className="text-white font-medium">
                          {formatTime(heroEvent.event_start_time)}
                          {heroEvent.event_end_time && ` - ${formatTime(heroEvent.event_end_time)}`}
                        </div>
                      </div>
                    </div>
                  )}

                  {heroEvent.custom_location_name && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Location</div>
                        <div className="text-white font-medium">{heroEvent.custom_location_name}</div>
                      </div>
                    </div>
                  )}

                  {heroEvent.price_info && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">💰</span>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Price</div>
                        <div className="text-white font-medium">{heroEvent.price_info}</div>
                      </div>
                    </div>
                  )}

                  {heroEvent.requires_booking && heroEvent.max_attendees && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Capacity</div>
                        <div className="text-white font-medium">Limited to {heroEvent.max_attendees} attendees</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Full Description */}
                {heroEvent.event_description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">About This Event</h3>
                    <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {heroEvent.event_description}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => toggleInterested(heroEvent.id)}
                    className={`flex-1 min-w-[200px] ${
                      interestedEvents.has(heroEvent.id)
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <Heart 
                      className="w-5 h-5 mr-2" 
                      fill={interestedEvents.has(heroEvent.id) ? 'currentColor' : 'none'} 
                    />
                    {interestedEvents.has(heroEvent.id) ? "You're Interested" : "I'm Interested"}
                  </Button>

                  {heroEvent.booking_url && (
                    <Button
                      onClick={() => {
                        let url = heroEvent.booking_url.trim()
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                          url = `https://${url}`
                        }
                        window.open(url, '_blank')
                      }}
                      className="flex-1 min-w-[200px] bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Get Tickets
                    </Button>
                  )}

                  <Button
                    onClick={() => toggleSaved(heroEvent.id)}
                    variant="outline"
                    className={`border-slate-600 ${
                      savedEvents.has(heroEvent.id)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Bookmark 
                      className="w-5 h-5 mr-2" 
                      fill={savedEvents.has(heroEvent.id) ? 'currentColor' : 'none'} 
                    />
                    {savedEvents.has(heroEvent.id) ? 'Saved' : 'Save Event'}
                  </Button>

                  <ShareButton
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                    title={`${heroEvent.event_name} at ${heroEvent.business_name}`}
                    text={`Check out this event: ${heroEvent.event_name} at ${heroEvent.business_name} on ${formatDate(heroEvent.event_date)}`}
                    url={typeof window !== 'undefined' ? window.location.href : ''}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with Icon */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-6 mb-6">
            <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/30">
              <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-5xl font-bold text-purple-400 mb-2">
                Upcoming Events
              </h1>
              <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full" />
            </div>
          </div>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Discover live music, workshops, tastings, and special occasions around {city}
          </p>
        </div>

        {/* Clickable Filter Cards - Mobile First */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
          <Card 
            className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
              selectedFilter === 'upcoming' 
                ? 'bg-gradient-to-br from-purple-600/30 to-purple-500/30 border-purple-400/50 ring-2 ring-purple-400/30' 
                : 'bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-700/30 hover:border-purple-600/50'
            }`}
            onClick={() => {
              setSelectedFilter('upcoming')
              scrollToResults()
            }}
          >
            <p className="text-base sm:text-lg font-semibold text-purple-300 mb-1">All Events</p>
            <p className="text-lg font-bold text-purple-400">{upcomingEvents.length}</p>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
              selectedFilter === 'today' 
                ? 'bg-gradient-to-br from-blue-600/30 to-blue-500/30 border-blue-400/50 ring-2 ring-blue-400/30' 
                : 'bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-blue-700/30 hover:border-blue-600/50'
            }`}
            onClick={() => {
              setSelectedFilter('today')
              scrollToResults()
            }}
          >
            <p className="text-base sm:text-lg font-semibold text-blue-300 mb-1">Today</p>
            <p className="text-lg font-bold text-blue-400">{todayEvents.length}</p>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
              selectedFilter === 'this_week' 
                ? 'bg-gradient-to-br from-cyan-600/30 to-cyan-500/30 border-cyan-400/50 ring-2 ring-cyan-400/30' 
                : 'bg-gradient-to-br from-cyan-900/20 to-cyan-800/20 border-cyan-700/30 hover:border-cyan-600/50'
            }`}
            onClick={() => {
              setSelectedFilter('this_week')
              scrollToResults()
            }}
          >
            <p className="text-base sm:text-lg font-semibold text-cyan-300 mb-1">This Week</p>
            <p className="text-lg font-bold text-cyan-400">{thisWeekEvents.length}</p>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
              selectedFilter === 'free' 
                ? 'bg-gradient-to-br from-green-600/30 to-green-500/30 border-green-400/50 ring-2 ring-green-400/30' 
                : 'bg-gradient-to-br from-green-900/20 to-green-800/20 border-green-700/30 hover:border-green-600/50'
            }`}
            onClick={() => {
              setSelectedFilter('free')
              scrollToResults()
            }}
          >
            <p className="text-base sm:text-lg font-semibold text-green-300 mb-1">Free Events</p>
            <p className="text-lg font-bold text-green-400">{events.filter(e => e.price_info?.toLowerCase().includes('free')).length}</p>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
              selectedFilter === 'saved' 
                ? 'bg-gradient-to-br from-amber-600/30 to-amber-500/30 border-amber-400/50 ring-2 ring-amber-400/30' 
                : 'bg-gradient-to-br from-amber-900/20 to-amber-800/20 border-amber-700/30 hover:border-amber-600/50'
            }`}
            onClick={() => {
              setSelectedFilter('saved')
              scrollToResults()
            }}
          >
            <p className="text-base sm:text-lg font-semibold text-amber-300 mb-1">My Saved</p>
            <p className="text-lg font-bold text-amber-400">{savedEventsList.length}</p>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-colors duration-200 text-center p-3 sm:p-4 ${
              selectedFilter === 'interested' 
                ? 'bg-gradient-to-br from-pink-600/30 to-pink-500/30 border-pink-400/50 ring-2 ring-pink-400/30' 
                : 'bg-gradient-to-br from-pink-900/20 to-pink-800/20 border-pink-700/30 hover:border-pink-600/50'
            }`}
            onClick={() => {
              setSelectedFilter('interested')
              scrollToResults()
            }}
          >
            <p className="text-base sm:text-lg font-semibold text-pink-300 mb-1">Interested</p>
            <p className="text-lg font-bold text-pink-400">{interestedEventsList.length}</p>
          </Card>
        </div>

        {/* AI Companion Card */}
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-6 mb-6 text-center">
          <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-purple-200 mb-2">Find Your Perfect Event</h3>
            <p className="text-slate-300 text-sm mb-4">
              Skip the searching - just tell our AI what you're looking for! From live music to workshops, tastings to special occasions, we'll find the perfect events for you instantly.
            </p>
            <p className="text-slate-400 text-xs italic mb-3">Try: "What events are happening this weekend?"</p>
            <Link 
              href={`/user/chat${walletPassId ? `?wallet_pass_id=${walletPassId}` : ''}`}
              className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Ask AI
            </Link>
          </div>
        </div>

        {/* Category Filter */}
        {eventTypes.length > 2 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 justify-center">
              {eventTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedCategory(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selectedCategory === type
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
                  }`}
                >
                  {type === 'all' ? 'All Types' : getEventTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Events Grid */}
        <div data-events-results className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.length === 0 ? (
            <div className="col-span-full">
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
                  <p className="text-slate-400">
                    {selectedFilter === 'saved' 
                      ? "You haven't saved any events yet" 
                      : selectedFilter === 'interested'
                      ? "You haven't marked any events as interested yet"
                      : `No ${selectedFilter} events at the moment`}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <Card 
                key={event.id}
                className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all duration-300 overflow-hidden group cursor-pointer"
                onClick={() => handleOpenHeroCard(event.id)}
              >
                {/* Event Image */}
                {event.event_image && (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={event.event_image}
                      alt={event.event_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSaved(event.id)
                        }}
                        className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                          savedEvents.has(event.id)
                            ? 'bg-blue-500 text-white'
                            : 'bg-black/50 text-white hover:bg-black/70'
                        }`}
                      >
                        <Bookmark className="w-4 h-4" fill={savedEvents.has(event.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                )}

                <CardContent className="p-4">
                  {/* Event Type Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {getEventTypeLabel(event.event_type)}
                    </span>
                    {event.is_today && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                        Today!
                      </span>
                    )}
                    {event.is_happening_soon && !event.is_today && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        Soon
                      </span>
                    )}
                  </div>

                  {/* Event Name */}
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                    {event.event_name}
                  </h3>

                  {/* Business Name */}
                  <Link 
                    href={`/user/business/${event.business_name?.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    className="text-sm text-blue-400 hover:text-blue-300 mb-3 block"
                  >
                    @ {event.business_name}
                  </Link>

                  {/* Short Description */}
                  {event.event_short_description && (
                    <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                      {event.event_short_description}
                    </p>
                  )}

                  {/* Event Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                    
                    {event.event_start_time && (
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span>
                          {formatTime(event.event_start_time)}
                          {event.event_end_time && ` - ${formatTime(event.event_end_time)}`}
                        </span>
                      </div>
                    )}

                    {event.custom_location && (
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <MapPin className="w-4 h-4 text-red-400" />
                        <span className="line-clamp-1">{event.custom_location}</span>
                      </div>
                    )}

                    {event.price_info && (
                      <div className="flex items-center gap-2 text-sm font-medium text-green-400">
                        💰 {event.price_info}
                      </div>
                    )}

                    {event.requires_booking && event.max_attendees && (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Users className="w-4 h-4" />
                        <span>Limited to {event.max_attendees} attendees</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleInterested(event.id)
                      }}
                      variant={interestedEvents.has(event.id) ? 'default' : 'outline'}
                      size="sm"
                      className={`flex-1 ${
                        interestedEvents.has(event.id)
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                          : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Heart 
                        className="w-4 h-4 mr-1" 
                        fill={interestedEvents.has(event.id) ? 'currentColor' : 'none'} 
                      />
                      {interestedEvents.has(event.id) ? 'Interested' : "I'm Interested"}
                    </Button>

                    {event.booking_url && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          let url = event.booking_url.trim()
                          if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            url = `https://${url}`
                          }
                          window.open(url, '_blank')
                        }}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}

                    <div onClick={(e) => e.stopPropagation()}>
                      <ShareButton
                        size="sm"
                        variant="outline"
                        className="border-slate-700"
                        title={`${event.event_name} at ${event.business_name}`}
                        text={`Check out this event: ${event.event_name} at ${event.business_name} on ${formatDate(event.event_date)}`}
                        url={typeof window !== 'undefined' ? window.location.href : ''}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

