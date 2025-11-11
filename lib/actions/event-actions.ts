'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncEventToKnowledgeBase, removeEventFromKnowledgeBase } from '@/lib/ai/embeddings'

export interface BusinessEvent {
  id: string
  business_id: string
  event_name: string
  event_type: string
  event_description: string
  event_short_description?: string
  event_date: string
  event_start_time?: string
  event_end_time?: string
  is_recurring: boolean
  recurrence_pattern?: string
  requires_booking: boolean
  booking_url?: string
  price_info?: string
  event_image?: string
  custom_location_name?: string
  custom_location_address?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed'
  approved_by?: string
  approved_at?: string
  rejected_reason?: string
  cancelled_reason?: string
  created_at: string
  updated_at: string
}

export interface CreateEventInput {
  business_id: string
  event_name: string
  event_type: string
  event_description: string
  event_short_description?: string
  event_date: string
  event_start_time?: string
  event_end_time?: string
  is_recurring?: boolean
  recurrence_pattern?: string
  requires_booking?: boolean
  booking_url?: string
  price_info?: string
  event_image?: string
  custom_location_name?: string
  custom_location_address?: string
}

/**
 * Get all events for a business
 */
export async function getBusinessEvents(businessId: string): Promise<{
  success: boolean
  events?: BusinessEvent[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('business_events')
      .select('*')
      .eq('business_id', businessId)
      .order('event_date', { ascending: true })

    if (error) {
      console.error('Error fetching business events:', error)
      return { success: false, error: error.message }
    }

    return { success: true, events: data || [] }
  } catch (error) {
    console.error('Error in getBusinessEvents:', error)
    return { success: false, error: 'Failed to fetch events' }
  }
}

/**
 * Get upcoming approved events for users
 */
export async function getUpcomingEvents(city?: string, limit?: number): Promise<{
  success: boolean
  events?: any[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('upcoming_events_with_business')
      .select('*')
      .gte('event_date', new Date().toISOString().split('T')[0])

    if (city) {
      query = query.eq('city', city.toLowerCase())
    }

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching upcoming events:', error)
      return { success: false, error: error.message }
    }

    return { success: true, events: data || [] }
  } catch (error) {
    console.error('Error in getUpcomingEvents:', error)
    return { success: false, error: 'Failed to fetch upcoming events' }
  }
}

/**
 * Create a new event
 */
export async function createEvent(input: CreateEventInput): Promise<{
  success: boolean
  event?: BusinessEvent
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Verify user owns this business
    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('id, user_id')
      .eq('id', input.business_id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Business not found' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== profile.user_id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Create the event
    const { data, error } = await supabase
      .from('business_events')
      .insert({
        ...input,
        is_recurring: input.is_recurring || false,
        requires_booking: input.requires_booking || false,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating event:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/events')
    revalidatePath('/admin')

    return { success: true, event: data }
  } catch (error) {
    console.error('Error in createEvent:', error)
    return { success: false, error: 'Failed to create event' }
  }
}

/**
 * Update an existing event
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<CreateEventInput>
): Promise<{
  success: boolean
  event?: BusinessEvent
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Verify ownership
    const { data: event, error: fetchError } = await supabase
      .from('business_events')
      .select('business_id')
      .eq('id', eventId)
      .single()

    if (fetchError || !event) {
      return { success: false, error: 'Event not found' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('user_id')
      .eq('id', event.business_id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Business not found' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== profile.user_id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Update the event
    const { data, error } = await supabase
      .from('business_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single()

    if (error) {
      console.error('Error updating event:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/events')
    revalidatePath('/admin')

    return { success: true, event: data }
  } catch (error) {
    console.error('Error in updateEvent:', error)
    return { success: false, error: 'Failed to update event' }
  }
}

/**
 * Delete an event (only pending events)
 */
export async function deleteEvent(eventId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Verify ownership and status
    const { data: event, error: fetchError } = await supabase
      .from('business_events')
      .select('business_id, status')
      .eq('id', eventId)
      .single()

    if (fetchError || !event) {
      return { success: false, error: 'Event not found' }
    }

    if (event.status !== 'pending') {
      return { success: false, error: 'Only pending events can be deleted' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('user_id')
      .eq('id', event.business_id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Business not found' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== profile.user_id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Delete the event
    const { error } = await supabase
      .from('business_events')
      .delete()
      .eq('id', eventId)

    if (error) {
      console.error('Error deleting event:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/events')
    revalidatePath('/admin')

    return { success: true }
  } catch (error) {
    console.error('Error in deleteEvent:', error)
    return { success: false, error: 'Failed to delete event' }
  }
}

/**
 * Cancel an approved event
 */
export async function cancelEvent(
  eventId: string,
  cancellationReason: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Verify ownership
    const { data: event, error: fetchError } = await supabase
      .from('business_events')
      .select('business_id, status')
      .eq('id', eventId)
      .single()

    if (fetchError || !event) {
      return { success: false, error: 'Event not found' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('user_id')
      .eq('id', event.business_id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Business not found' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== profile.user_id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Cancel the event
    const { error } = await supabase
      .from('business_events')
      .update({
        status: 'cancelled',
        cancelled_reason: cancellationReason
      })
      .eq('id', eventId)

    if (error) {
      console.error('Error cancelling event:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/events')
    revalidatePath('/admin')
    revalidatePath('/user/events')

    // Remove from knowledge base if it was previously approved
    await removeEventFromKnowledgeBase(eventId)

    return { success: true }
  } catch (error) {
    console.error('Error in cancelEvent:', error)
    return { success: false, error: 'Failed to cancel event' }
  }
}

/**
 * Admin: Approve an event
 */
export async function approveEvent(eventId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: admin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!admin) {
      return { success: false, error: 'Admin access required' }
    }

    // Approve the event
    const { error } = await supabase
      .from('business_events')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', eventId)

    if (error) {
      console.error('Error approving event:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    revalidatePath('/user/events')

    // Add to knowledge base for AI chat
    await syncEventToKnowledgeBase(eventId)

    return { success: true }
  } catch (error) {
    console.error('Error in approveEvent:', error)
    return { success: false, error: 'Failed to approve event' }
  }
}

/**
 * Admin: Reject an event
 */
export async function rejectEvent(
  eventId: string,
  rejectionReason: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data: admin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!admin) {
      return { success: false, error: 'Admin access required' }
    }

    // Reject the event
    const { error } = await supabase
      .from('business_events')
      .update({
        status: 'rejected',
        rejected_reason: rejectionReason
      })
      .eq('id', eventId)

    if (error) {
      console.error('Error rejecting event:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin')

    // Remove from knowledge base if it was previously approved
    await removeEventFromKnowledgeBase(eventId)

    return { success: true }
  } catch (error) {
    console.error('Error in rejectEvent:', error)
    return { success: false, error: 'Failed to reject event' }
  }
}

