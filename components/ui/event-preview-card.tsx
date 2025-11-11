'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Clock, MapPin, Users, ExternalLink, Heart, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface EventPreviewCardProps {
  event: {
    event_name: string
    event_type: string
    event_description: string
    event_short_description?: string
    event_date: string
    event_start_time?: string
    event_end_time?: string
    event_image?: string
    price_info?: string
    requires_booking?: boolean
    booking_url?: string
    custom_location_name?: string
    custom_location_address?: string
    is_recurring?: boolean
    recurrence_pattern?: string
  }
  businessName: string
}

export function EventPreviewCard({ event, businessName }: EventPreviewCardProps) {
  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'live_music': 'Live Music',
      'workshop': 'Workshop',
      'tasting': 'Tasting Event',
      'special_occasion': 'Special Occasion',
      'sports_viewing': 'Sports Viewing',
      'quiz_night': 'Quiz Night',
      'comedy': 'Comedy Night',
      'open_mic': 'Open Mic',
      'themed_night': 'Themed Night',
      'holiday_event': 'Holiday Event',
      'class': 'Class/Course',
      'other': 'Other'
    }
    return labels[type] || type
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const isToday = date.toDateString() === today.toDateString()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const isTomorrow = date.toDateString() === tomorrow.toDateString()
    
    if (isToday) return 'Today'
    if (isTomorrow) return 'Tomorrow'
    
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    })
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const isToday = new Date(event.event_date).toDateString() === new Date().toDateString()
  const customLocation = event.custom_location_name 
    ? event.custom_location_address 
      ? `${event.custom_location_name}, ${event.custom_location_address}`
      : event.custom_location_name
    : null

  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all duration-300 overflow-hidden group max-w-md mx-auto">
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
              disabled
              className="p-2 rounded-full bg-black/50 text-white cursor-not-allowed"
            >
              <Bookmark className="w-4 h-4" />
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
          {isToday && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
              Today!
            </span>
          )}
        </div>

        {/* Event Name */}
        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
          {event.event_name}
        </h3>

        {/* Business Name */}
        <div className="text-sm text-blue-400 mb-3">
          @ {businessName}
        </div>

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
            {event.is_recurring && event.recurrence_pattern && (
              <span className="text-xs text-slate-500">
                • Repeats {event.recurrence_pattern.replace(/_/g, ' ')}
              </span>
            )}
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

          {customLocation && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <MapPin className="w-4 h-4 text-red-400" />
              <span className="line-clamp-1">{customLocation}</span>
            </div>
          )}

          {event.price_info && (
            <div className="flex items-center gap-2 text-sm font-medium text-green-400">
              💰 {event.price_info}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            disabled
            variant="outline"
            size="sm"
            className="flex-1 border-slate-700 text-slate-300 cursor-not-allowed"
          >
            <Heart className="w-4 h-4 mr-1" />
            I'm Interested
          </Button>

          {event.requires_booking && event.booking_url && (
            <Button
              disabled
              size="sm"
              className="flex-shrink-0 bg-blue-500 text-white cursor-not-allowed"
            >
              Get Tickets
              <ExternalLink className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

