'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShareButton } from '@/components/ui/share-button'
import { AiCompanionCard } from '@/components/ui/ai-companion-card'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Calendar, Clock, MapPin, Users, ExternalLink, Heart, Bookmark } from 'lucide-react'
import { saveItem, unsaveItem, getUserSavedItems } from '@/lib/actions/user-saved-actions'
import { FilterChipGroup, FilterPanel } from '@/components/user/filter-panel'

interface UserEventsPageProps {
  events?: any[]
  walletPassId?: string
  city: string
}

export function UserEventsPage({ events = [], walletPassId: propWalletPassId, city }: UserEventsPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('upcoming')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const searchParams = useSearchParams()
  const urlWalletPassId = searchParams.get('wallet_pass_id')
  const walletPassId = propWalletPassId || urlWalletPassId
  const selectedEventId = searchParams.get('event') // For hero card deep linking
  
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set())
  const [interestedEvents, setInterestedEvents] = useState<Set<string>>(new Set())
  const [heroEventId, setHeroEventId] = useState<string | null>(null)
  
  // Load saved/interested events — DB takes priority when walletPassId exists, localStorage for anonymous
  useEffect(() => {
    const userId = walletPassId || 'anonymous-user'

    if (walletPassId) {
      getUserSavedItems(walletPassId).then(result => {
        if (result.success && result.items) {
          const dbSaved = new Set(
            result.items.filter(i => i.item_type === 'event').map(i => i.item_id)
          )
          setSavedEvents(dbSaved)
          // Sync to localStorage so it stays consistent
          localStorage.setItem(`qwikker-saved-events-${userId}`, JSON.stringify([...dbSaved]))
        }
      }).catch(() => {
        // DB unavailable — fall back to localStorage
        const savedEventsData = localStorage.getItem(`qwikker-saved-events-${userId}`)
        if (savedEventsData) setSavedEvents(new Set(JSON.parse(savedEventsData)))
      })
    } else {
      const savedEventsData = localStorage.getItem(`qwikker-saved-events-${userId}`)
      const interestedEventsData = localStorage.getItem(`qwikker-interested-events-${userId}`)
      if (savedEventsData) setSavedEvents(new Set(JSON.parse(savedEventsData)))
      if (interestedEventsData) setInterestedEvents(new Set(JSON.parse(interestedEventsData)))
    }
  }, [walletPassId])

  // Open hero card from URL parameter
  useEffect(() => {
    if (selectedEventId) {
      setHeroEventId(selectedEventId)
    }
  }, [selectedEventId])

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
  
  const toggleSaved = (eventId: string, eventName?: string) => {
    const userId = walletPassId || 'anonymous-user'

    setSavedEvents(prev => {
      const newSaved = new Set(prev)
      const isSaving = !newSaved.has(eventId)
      if (isSaving) {
        newSaved.add(eventId)
      } else {
        newSaved.delete(eventId)
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(`qwikker-saved-events-${userId}`, JSON.stringify([...newSaved]))
      }
      // Persist to DB fire-and-forget (only when logged in via wallet pass)
      if (walletPassId) {
        if (isSaving) {
          saveItem(walletPassId, 'event', eventId, eventName).catch(() => {})
        } else {
          unsaveItem(walletPassId, 'event', eventId).catch(() => {})
        }
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
          className="fixed inset-0 bg-black/80 z-50 overflow-y-auto backdrop-blur-sm lg:pl-64"
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
                        ? 'bg-emerald-500 hover:bg-emerald-600'
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
                    onClick={() => toggleSaved(heroEvent.id, heroEvent.event_name)}
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="rounded-2xl border border-[#00d083]/25 bg-gradient-to-br from-[#00d083]/12 via-zinc-900 to-zinc-950 px-4 py-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#00d083] font-semibold mb-1">
            Events
          </p>
          <h1 className="text-3xl font-bold text-white tracking-tight">{city}</h1>
          <p className="text-sm text-zinc-300 mt-1.5">{upcomingEvents.length} upcoming</p>
        </div>

        <FilterPanel
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          activeCount={
            (selectedFilter !== 'upcoming' ? 1 : 0) + (selectedCategory !== 'all' ? 1 : 0)
          }
          summary={[
            selectedFilter !== 'upcoming'
              ? (
                  [
                    { id: 'today', label: 'Today' },
                    { id: 'this_week', label: 'This week' },
                    { id: 'free', label: 'Free' },
                    { id: 'saved', label: 'Saved' },
                    { id: 'interested', label: 'Interested' },
                  ].find((t) => t.id === selectedFilter)?.label ?? selectedFilter
                )
              : null,
            selectedCategory !== 'all' ? getEventTypeLabel(selectedCategory) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          onClear={() => {
            setSelectedFilter('upcoming')
            setSelectedCategory('all')
          }}
        >
          <FilterChipGroup label="When">
            {[
              { id: 'upcoming', label: 'All', count: upcomingEvents.length, on: 'bg-violet-400 text-black border-violet-300' },
              { id: 'today', label: 'Today', count: todayEvents.length, on: 'bg-sky-400 text-black border-sky-300' },
              { id: 'this_week', label: 'This week', count: thisWeekEvents.length, on: 'bg-cyan-400 text-black border-cyan-300' },
              {
                id: 'free',
                label: 'Free',
                count: upcomingEvents.filter((e) => e.price_info?.toLowerCase().includes('free')).length,
                on: 'bg-[#00d083] text-black border-[#00d083]',
              },
              { id: 'saved', label: 'Saved', count: savedEventsList.length, on: 'bg-amber-400 text-black border-amber-300' },
              {
                id: 'interested',
                label: 'Interested',
                count: interestedEventsList.length,
                on: 'bg-rose-400 text-black border-rose-300',
              },
            ].map((tab) => {
              const isActive = selectedFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${
                    isActive ? tab.on : 'bg-zinc-800 text-zinc-100 border-zinc-500'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1 opacity-80">{tab.count}</span>
                </button>
              )
            })}
          </FilterChipGroup>

          {eventTypes.length > 2 && (
            <FilterChipGroup label="Type">
              {eventTypes.map((type) => {
                const isActive = selectedCategory === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedCategory(type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      isActive
                        ? type === 'all'
                          ? 'bg-white text-black border-white'
                          : 'bg-[#00d083] text-black border-[#00d083]'
                        : 'bg-zinc-800 text-zinc-100 border-zinc-500'
                    }`}
                  >
                    {type === 'all' ? 'All types' : getEventTypeLabel(type)}
                  </button>
                )
              })}
            </FilterChipGroup>
          )}
        </FilterPanel>

        <AiCompanionCard
          title="Ask Qwikker"
          prompts={[
            'What events are happening this weekend?',
            'Find me live music events',
            'Show me food and drink events',
          ]}
          walletPassId={walletPassId}
          className="border-[#00d083]/25 bg-gradient-to-r from-[#00d083]/10 via-zinc-900 to-zinc-800"
        />

        {/* Events Grid */}
        <div data-events-results className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredEvents.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-zinc-700/80 bg-gradient-to-b from-zinc-800 to-zinc-900 px-4 py-12 text-center shadow-md shadow-black/30">
              <div className="w-14 h-14 rounded-full bg-[#00d083]/15 border border-[#00d083]/30 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-7 h-7 text-[#00d083]" />
              </div>
              {selectedFilter === 'saved' ? (
                <>
                  <h3 className="text-lg font-semibold text-white mb-1">No saved events yet</h3>
                  <p className="text-sm text-zinc-400">
                    Bookmark events you like and they&apos;ll show up here
                  </p>
                </>
              ) : selectedFilter === 'interested' ? (
                <>
                  <h3 className="text-lg font-semibold text-white mb-1">Nothing marked interested</h3>
                  <p className="text-sm text-zinc-400">
                    Tap Interested on an event to keep track of it
                  </p>
                </>
              ) : events.length === 0 && selectedFilter === 'upcoming' ? (
                <>
                  <h3 className="text-lg font-semibold text-white mb-1">Events coming soon</h3>
                  <p className="text-sm text-zinc-400">
                    Live gigs and exclusives appear as partners activate them
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-white mb-1">No matches for this filter</h3>
                  <p className="text-sm text-zinc-400">Try another chip or check back soon</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFilter('upcoming')
                      setSelectedCategory('all')
                    }}
                    className="mt-4 text-xs font-semibold text-[#00d083] border border-[#00d083]/40 bg-[#00d083]/10 px-4 py-2 rounded-full"
                  >
                    Show all events
                  </button>
                </>
              )}
            </div>
          ) : (
            filteredEvents.map((event) => (
              <Card 
                key={event.id}
                className="bg-gradient-to-br from-zinc-800 via-zinc-800 to-zinc-800/95 border-zinc-600/90 shadow-md shadow-black/30 ring-1 ring-white/5 sm:hover:border-[#00d083]/45 transition-colors duration-200 overflow-hidden group cursor-pointer p-0 gap-0 active:border-[#00d083]/40"
                onClick={() => handleOpenHeroCard(event.id)}
              >
                {/* Event Image */}
                {event.event_image && (
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={event.event_image}
                      alt={event.event_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSaved(event.id, event.event_name)
                        }}
                        className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                          savedEvents.has(event.id)
                            ? 'bg-[#00d083] text-black'
                            : 'bg-black/50 text-white hover:bg-black/70'
                        }`}
                      >
                        <Bookmark className="w-4 h-4" fill={savedEvents.has(event.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                )}

                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-violet-500/20 text-violet-200 border border-violet-400/30">
                      {getEventTypeLabel(event.event_type)}
                    </span>
                    {event.is_today && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#00d083]/20 text-[#9dffc0] border border-[#00d083]/35">
                        Today
                      </span>
                    )}
                    {event.is_happening_soon && !event.is_today && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-400/30">
                        Soon
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1.5 line-clamp-2 tracking-tight">
                    {event.event_name}
                  </h3>

                  <Link 
                    href={`/user/business/${event.business_name?.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    className="text-sm text-[#00d083] hover:text-[#9dffc0] mb-3 block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    @ {event.business_name}
                  </Link>

                  {event.event_short_description && (
                    <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                      {event.event_short_description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <Calendar className="w-4 h-4 text-[#00d083]" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                    
                    {event.event_start_time && (
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <Clock className="w-4 h-4 text-violet-300" />
                        <span>
                          {formatTime(event.event_start_time)}
                          {event.event_end_time && ` - ${formatTime(event.event_end_time)}`}
                        </span>
                      </div>
                    )}

                    {event.custom_location && (
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <MapPin className="w-4 h-4 text-rose-300" />
                        <span className="line-clamp-1">{event.custom_location}</span>
                      </div>
                    )}

                    {event.price_info && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200 bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 rounded-full">
                        {event.price_info}
                      </div>
                    )}

                    {event.requires_booking && event.max_attendees && (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Users className="w-4 h-4" />
                        <span>Limited to {event.max_attendees} attendees</span>
                      </div>
                    )}
                  </div>

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
                          ? 'bg-[#00d083] hover:bg-[#00b86f] text-black'
                          : 'border-zinc-600 text-zinc-300 hover:bg-zinc-800'
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
                        className="bg-[#00d083] hover:bg-[#00b86f] text-black"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}

                    <div onClick={(e) => e.stopPropagation()}>
                      <ShareButton
                        size="sm"
                        variant="outline"
                        className="border-zinc-600"
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

