'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useElegantModal } from '@/components/ui/elegant-modal'
import {
  createEvent,
  updateEvent,
  deleteEvent,
  cancelEvent,
  getBusinessEvents,
  BusinessEvent
} from '@/lib/actions/event-actions'
import { Calendar, Clock, MapPin, Users, ExternalLink, Plus, Pencil, Trash2, X, XCircle } from 'lucide-react'

const EVENT_TYPE_OPTIONS = [
  { value: 'live_music', label: 'Live Music' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'tasting', label: 'Tasting Event' },
  { value: 'special_occasion', label: 'Special Occasion' },
  { value: 'sports_viewing', label: 'Sports Viewing' },
  { value: 'quiz_night', label: 'Quiz Night' },
  { value: 'comedy', label: 'Comedy Night' },
  { value: 'open_mic', label: 'Open Mic' },
  { value: 'themed_night', label: 'Themed Night' },
  { value: 'holiday_event', label: 'Holiday Event' },
  { value: 'class', label: 'Class/Course' },
  { value: 'other', label: 'Other' },
]

const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'first_friday', label: 'First Friday of Month' },
  { value: 'last_saturday', label: 'Last Saturday of Month' },
]

interface EventsPageProps {
  businessId: string
  businessName: string
}

export function EventsPage({ businessId, businessName }: EventsPageProps) {
  const router = useRouter()
  const [events, setEvents] = useState<BusinessEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<BusinessEvent | null>(null)
  
  const { showConfirm, ModalComponent } = useElegantModal()
  const formRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    event_name: '',
    event_type: '',
    event_description: '',
    event_short_description: '',
    event_date: '',
    event_start_time: '',
    event_end_time: '',
    is_recurring: false,
    recurrence_pattern: '',
    recurrence_end_date: '',
    requires_booking: false,
    booking_url: '',
    booking_phone: '',
    max_attendees: '',
    price_info: '',
    custom_location: '',
    custom_address: '',
  })

  const [eventImageFile, setEventImageFile] = useState<File | null>(null)
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null)

  // Load events on mount
  useEffect(() => {
    loadEvents()
  }, [businessId])

  const loadEvents = async () => {
    setIsLoadingEvents(true)
    const result = await getBusinessEvents(businessId)
    if (result.success && result.events) {
      setEvents(result.events)
    }
    setIsLoadingEvents(false)
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const startCreateEvent = () => {
    setFormData({
      event_name: '',
      event_type: '',
      event_description: '',
      event_short_description: '',
      event_date: '',
      event_start_time: '',
      event_end_time: '',
      is_recurring: false,
      recurrence_pattern: '',
      recurrence_end_date: '',
      requires_booking: false,
      booking_url: '',
      booking_phone: '',
      max_attendees: '',
      price_info: '',
      custom_location: '',
      custom_address: '',
    })
    setEditingEvent(null)
    setEventImageFile(null)
    setEventImagePreview(null)
    setShowCreateForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const startEditEvent = (event: BusinessEvent) => {
    setFormData({
      event_name: event.event_name,
      event_type: event.event_type,
      event_description: event.event_description,
      event_short_description: event.event_short_description || '',
      event_date: event.event_date,
      event_start_time: event.event_start_time || '',
      event_end_time: event.event_end_time || '',
      is_recurring: event.is_recurring,
      recurrence_pattern: event.recurrence_pattern || '',
      recurrence_end_date: event.recurrence_end_date || '',
      requires_booking: event.requires_booking,
      booking_url: event.booking_url || '',
      booking_phone: event.booking_phone || '',
      max_attendees: event.max_attendees?.toString() || '',
      price_info: event.price_info || '',
      custom_location: event.custom_location || '',
      custom_address: event.custom_address || '',
    })
    setEventImagePreview(event.event_image || null)
    setEditingEvent(event)
    setShowCreateForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please upload a valid image file (JPEG, PNG, or WebP)' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be smaller than 5MB' })
      return
    }

    setEventImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setEventImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      // Upload image if provided
      let eventImageUrl = eventImagePreview
      if (eventImageFile) {
        const formDataImg = new FormData()
        formDataImg.append('file', eventImageFile)
        formDataImg.append('upload_preset', 'qwikker_unsigned')
        formDataImg.append('cloud_name', 'djctnst0t')

        const response = await fetch(
          'https://api.cloudinary.com/v1_1/djctnst0t/image/upload',
          {
            method: 'POST',
            body: formDataImg,
          }
        )

        if (!response.ok) {
          throw new Error('Failed to upload image')
        }

        const data = await response.json()
        eventImageUrl = data.secure_url
      }

      const eventData = {
        business_id: businessId,
        event_name: formData.event_name,
        event_type: formData.event_type,
        event_description: formData.event_description,
        event_short_description: formData.event_short_description || undefined,
        event_date: formData.event_date,
        event_start_time: formData.event_start_time || undefined,
        event_end_time: formData.event_end_time || undefined,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern || undefined : undefined,
        recurrence_end_date: formData.is_recurring ? formData.recurrence_end_date || undefined : undefined,
        requires_booking: formData.requires_booking,
        booking_url: formData.booking_url || undefined,
        booking_phone: formData.booking_phone || undefined,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : undefined,
        price_info: formData.price_info || undefined,
        event_image: eventImageUrl || undefined,
        custom_location: formData.custom_location || undefined,
        custom_address: formData.custom_address || undefined,
      }

      let result
      if (editingEvent) {
        result = await updateEvent(editingEvent.id, eventData)
      } else {
        result = await createEvent(eventData)
      }

      if (result.success) {
        setMessage({
          type: 'success',
          text: editingEvent 
            ? 'Event updated successfully! It will be reviewed by admin.'
            : 'Event created successfully! It will be reviewed by admin.'
        })
        setShowCreateForm(false)
        setEditingEvent(null)
        await loadEvents()
        router.refresh()
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save event' })
      }
    } catch (error) {
      console.error('Error saving event:', error)
      setMessage({ type: 'error', text: 'An error occurred while saving the event' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    const confirmed = await showConfirm(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.'
    )

    if (!confirmed) return

    setIsLoading(true)
    const result = await deleteEvent(eventId)
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Event deleted successfully' })
      await loadEvents()
      router.refresh()
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete event' })
    }
    setIsLoading(false)
  }

  const handleCancelEvent = async (eventId: string) => {
    const reason = await showConfirm(
      'Cancel Event',
      'Please provide a reason for cancelling this event:',
      true
    )

    if (!reason) return

    setIsLoading(true)
    const result = await cancelEvent(eventId, reason)
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Event cancelled successfully' })
      await loadEvents()
      router.refresh()
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to cancel event' })
    }
    setIsLoading(false)
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return null
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const upcomingEvents = events.filter(e => new Date(e.event_date) >= new Date() && e.status !== 'cancelled' && e.status !== 'completed')
  const pastEvents = events.filter(e => new Date(e.event_date) < new Date() || e.status === 'completed' || e.status === 'cancelled')

  return (
    <div className="space-y-6">
      {ModalComponent}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Events</h2>
          <p className="text-slate-400 mt-1">
            Create and manage events for {businessName}
          </p>
        </div>
        <Button
          onClick={startCreateEvent}
          disabled={isLoading}
          className="bg-[#00d083] hover:bg-[#00b86f] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.text}
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card ref={formRef} className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false)
                  setEditingEvent(null)
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event_name" className="text-slate-300">Event Name *</Label>
                    <Input
                      id="event_name"
                      value={formData.event_name}
                      onChange={(e) => handleInputChange('event_name', e.target.value)}
                      placeholder="e.g., Live Jazz Night"
                      required
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="event_type" className="text-slate-300">Event Type *</Label>
                    <select
                      id="event_type"
                      value={formData.event_type}
                      onChange={(e) => handleInputChange('event_type', e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white"
                    >
                      <option value="">Select type...</option>
                      {EVENT_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="event_short_description" className="text-slate-300">Short Description (for cards)</Label>
                  <Input
                    id="event_short_description"
                    value={formData.event_short_description}
                    onChange={(e) => handleInputChange('event_short_description', e.target.value)}
                    placeholder="Brief 1-2 sentence summary"
                    maxLength={150}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="event_description" className="text-slate-300">Full Description *</Label>
                  <Textarea
                    id="event_description"
                    value={formData.event_description}
                    onChange={(e) => handleInputChange('event_description', e.target.value)}
                    placeholder="Detailed description of your event..."
                    required
                    rows={4}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="space-y-4 border-t border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#00d083]" />
                  Date & Time
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="event_date" className="text-slate-300">Event Date *</Label>
                    <Input
                      id="event_date"
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => handleInputChange('event_date', e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="event_start_time" className="text-slate-300">Start Time</Label>
                    <Input
                      id="event_start_time"
                      type="time"
                      value={formData.event_start_time}
                      onChange={(e) => handleInputChange('event_start_time', e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="event_end_time" className="text-slate-300">End Time</Label>
                    <Input
                      id="event_end_time"
                      type="time"
                      value={formData.event_end_time}
                      onChange={(e) => handleInputChange('event_end_time', e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                </div>

                {/* Recurring Event */}
                <div className="flex items-center gap-2">
                  <input
                    id="is_recurring"
                    type="checkbox"
                    checked={formData.is_recurring}
                    onChange={(e) => handleInputChange('is_recurring', e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  <Label htmlFor="is_recurring" className="text-slate-300 cursor-pointer">
                    This is a recurring event
                  </Label>
                </div>

                {formData.is_recurring && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-[#00d083]">
                    <div>
                      <Label htmlFor="recurrence_pattern" className="text-slate-300">Recurrence Pattern</Label>
                      <select
                        id="recurrence_pattern"
                        value={formData.recurrence_pattern}
                        onChange={(e) => handleInputChange('recurrence_pattern', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white"
                      >
                        <option value="">Select pattern...</option>
                        {RECURRENCE_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="recurrence_end_date" className="text-slate-300">Recurrence End Date</Label>
                      <Input
                        id="recurrence_end_date"
                        type="date"
                        value={formData.recurrence_end_date}
                        onChange={(e) => handleInputChange('recurrence_end_date', e.target.value)}
                        min={formData.event_date}
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Booking Info */}
              <div className="space-y-4 border-t border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#00d083]" />
                  Booking & Registration
                </h3>

                <div className="flex items-center gap-2">
                  <input
                    id="requires_booking"
                    type="checkbox"
                    checked={formData.requires_booking}
                    onChange={(e) => handleInputChange('requires_booking', e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  <Label htmlFor="requires_booking" className="text-slate-300 cursor-pointer">
                    Requires booking/registration
                  </Label>
                </div>

                {formData.requires_booking && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6 border-l-2 border-[#00d083]">
                    <div>
                      <Label htmlFor="booking_url" className="text-slate-300">Booking URL</Label>
                      <Input
                        id="booking_url"
                        type="url"
                        value={formData.booking_url}
                        onChange={(e) => handleInputChange('booking_url', e.target.value)}
                        placeholder="https://..."
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="booking_phone" className="text-slate-300">Booking Phone</Label>
                      <Input
                        id="booking_phone"
                        type="tel"
                        value={formData.booking_phone}
                        onChange={(e) => handleInputChange('booking_phone', e.target.value)}
                        placeholder="01202 123456"
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="max_attendees" className="text-slate-300">Max Attendees</Label>
                      <Input
                        id="max_attendees"
                        type="number"
                        value={formData.max_attendees}
                        onChange={(e) => handleInputChange('max_attendees', e.target.value)}
                        placeholder="50"
                        min="1"
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="price_info" className="text-slate-300">Price Information</Label>
                  <Input
                    id="price_info"
                    value={formData.price_info}
                    onChange={(e) => handleInputChange('price_info', e.target.value)}
                    placeholder="e.g., Free, £10 per person, £5-15"
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
              </div>

              {/* Custom Location */}
              <div className="space-y-4 border-t border-slate-700 pt-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#00d083]" />
                  <h3 className="text-lg font-semibold text-white">Location</h3>
                  <span className="text-sm text-slate-400">(Leave blank to use business address)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="custom_location" className="text-slate-300">Location Name</Label>
                    <Input
                      id="custom_location"
                      value={formData.custom_location}
                      onChange={(e) => handleInputChange('custom_location', e.target.value)}
                      placeholder="e.g., Bournemouth Pavilion"
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="custom_address" className="text-slate-300">Custom Address</Label>
                    <Input
                      id="custom_address"
                      value={formData.custom_address}
                      onChange={(e) => handleInputChange('custom_address', e.target.value)}
                      placeholder="e.g., 123 High Street"
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Event Image */}
              <div className="space-y-4 border-t border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-white">Event Image</h3>
                
                <div>
                  <Label htmlFor="event_image" className="text-slate-300">Upload Event Poster/Image</Label>
                  <Input
                    id="event_image"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>

                {eventImagePreview && (
                  <div className="relative w-full max-w-md">
                    <img
                      src={eventImagePreview}
                      alt="Event preview"
                      className="w-full rounded-lg border border-slate-600"
                    />
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#00d083] hover:bg-[#00b86f] text-white"
                >
                  {isLoading ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingEvent(null)
                  }}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events */}
      {isLoadingEvents ? (
        <div className="text-center py-12 text-slate-400">Loading events...</div>
      ) : (
        <>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Upcoming Events ({upcomingEvents.length})</h3>
            
            {upcomingEvents.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center text-slate-400">
                  No upcoming events. Create your first event to get started!
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {upcomingEvents.map((event) => (
                  <Card key={event.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        {/* Event Image */}
                        {event.event_image && (
                          <div className="flex-shrink-0">
                            <img
                              src={event.event_image}
                              alt={event.event_name}
                              className="w-32 h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <h4 className="text-lg font-semibold text-white mb-1">{event.event_name}</h4>
                              <p className="text-sm text-slate-400">
                                {EVENT_TYPE_OPTIONS.find(t => t.value === event.event_type)?.label || event.event_type}
                              </p>
                            </div>
                            {getStatusBadge(event.status)}
                          </div>

                          {event.event_short_description && (
                            <p className="text-slate-300 mb-3">{event.event_short_description}</p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(event.event_date)}
                            </div>
                            
                            {event.event_start_time && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatTime(event.event_start_time)}
                                {event.event_end_time && ` - ${formatTime(event.event_end_time)}`}
                              </div>
                            )}

                            {event.price_info && (
                              <div className="text-[#00d083] font-medium">
                                {event.price_info}
                              </div>
                            )}
                          </div>

                          {event.status === 'rejected' && event.rejected_reason && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded p-3 mb-3">
                              <p className="text-sm text-red-400">
                                <strong>Rejection Reason:</strong> {event.rejected_reason}
                              </p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2">
                            {event.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditEvent(event)}
                                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                  <Pencil className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteEvent(event.id)}
                                  className="border-red-600 text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </>
                            )}
                            {event.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelEvent(event.id)}
                                className="border-orange-600 text-orange-400 hover:bg-orange-500/10"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Cancel Event
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Past/Cancelled Events */}
          {pastEvents.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-400">Past & Cancelled Events ({pastEvents.length})</h3>
              
              <div className="grid grid-cols-1 gap-4">
                {pastEvents.map((event) => (
                  <Card key={event.id} className="bg-slate-800/30 border-slate-700 opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-slate-300 mb-1">{event.event_name}</h4>
                          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                            <span>{formatDate(event.event_date)}</span>
                            {event.event_start_time && <span>{formatTime(event.event_start_time)}</span>}
                          </div>
                        </div>
                        {getStatusBadge(event.status)}
                      </div>
                      {event.cancellation_reason && (
                        <div className="mt-2 text-sm text-orange-400">
                          Cancelled: {event.cancellation_reason}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

