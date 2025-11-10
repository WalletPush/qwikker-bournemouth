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
  
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set())
  const [interestedEvents, setInterestedEvents] = useState<Set<string>>(new Set())
  
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
  const savedEventsList = events.filter(e => savedEvents.has(e.id))
  const interestedEventsList = events.filter(e => interestedEvents.has(e.id))
  
  // Filter counts
  const getFilters = () => [
    { id: 'upcoming', label: 'Upcoming', count: upcomingEvents.length },
    { id: 'today', label: 'Today', count: todayEvents.length },
    { id: 'this_week', label: 'This Week', count: thisWeekEvents.length },
    { id: 'saved', label: 'My Saved', count: savedEvents.size },
    { id: 'interested', label: "I'm Interested", count: interestedEvents.size },
    { id: 'live_music', label: '🎵 Live Music', count: events.filter(e => e.event_type === 'live_music').length },
    { id: 'workshop', label: '🎨 Workshops', count: events.filter(e => e.event_type === 'workshop').length },
    { id: 'tasting', label: '🍷 Tastings', count: events.filter(e => e.event_type === 'tasting').length },
    { id: 'free', label: 'Free Events', count: events.filter(e => e.price_info?.toLowerCase().includes('free')).length },
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
      live_music: '🎵 Live Music',
      workshop: '🎨 Workshop',
      tasting: '🍷 Tasting',
      special_occasion: '🎉 Special',
      sports_viewing: '⚽ Sports',
      quiz_night: '🧠 Quiz',
      comedy: '😂 Comedy',
      open_mic: '🎤 Open Mic',
      themed_night: '🎭 Themed',
      holiday_event: '🎄 Holiday',
      class: '📚 Class',
      other: '📅 Event'
    }
    return labels[type] || type
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Events in {city}</h1>
          <p className="text-slate-400">
            Discover live music, workshops, tastings, and more happening around you
          </p>
        </div>

        {/* AI Companion Card */}
        <div className="mb-6">
          <AiCompanionCard 
            message="Looking for something to do? I can help you discover upcoming events, find live music, workshops, and special occasions happening around {city}!"
            walletPassId={walletPassId}
          />
        </div>

        {/* Filters */}
        <Card className="bg-slate-900 border-slate-800 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {getFilters().map(filter => (
                <button
                  key={filter.id}
                  onClick={() => {
                    setSelectedFilter(filter.id)
                    scrollToResults()
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedFilter === filter.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {filter.label}
                  <span className="ml-2 text-xs opacity-75">({filter.count})</span>
                </button>
              ))}
            </div>

            {/* Category Filter */}
            {eventTypes.length > 2 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-sm text-slate-400 mb-2">Filter by type:</p>
                <div className="flex flex-wrap gap-2">
                  {eventTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedCategory(type)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedCategory === type
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {type === 'all' ? 'All' : getEventTypeLabel(type)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Events Grid */}
        <div data-events-results className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.length === 0 ? (
            <div className="col-span-full">
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="py-12 text-center">
                  <div className="text-6xl mb-4">📅</div>
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
                className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all duration-300 overflow-hidden group"
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
                        onClick={() => toggleSaved(event.id)}
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
                      onClick={() => toggleInterested(event.id)}
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
                        onClick={() => window.open(event.booking_url, '_blank')}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}

                    <ShareButton
                      size="sm"
                      variant="outline"
                      className="border-slate-700"
                      title={`${event.event_name} at ${event.business_name}`}
                      text={`Check out this event: ${event.event_name} at ${event.business_name} on ${formatDate(event.event_date)}`}
                      url={typeof window !== 'undefined' ? window.location.href : ''}
                    />
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

