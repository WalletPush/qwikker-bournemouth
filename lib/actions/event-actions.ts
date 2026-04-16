'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncEventToKnowledgeBase, archiveEventInKnowledgeBase } from '@/lib/ai/embeddings'
import { sendFranchiseEmail, getFranchiseBaseUrl, getFranchiseSupportEmail } from '@/lib/email/send-franchise-email'
import { getRequestCityFallback } from '@/lib/utils/city-detection'
import { createEventApprovalEmail, createChangeRejectionEmail } from '@/lib/email/templates/business-notifications'

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
      .select('id, user_id, plan, status')
      .eq('id', input.business_id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Business not found' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== profile.user_id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Enforce tier-based event limits
    const { getMaxEvents } = await import('@/lib/utils/subscription-helpers')
    const tier = profile.status === 'claimed_free' ? 'claimed_free' : (profile.plan || 'starter')
    const maxEvents = getMaxEvents(tier)
    const { count: existingCount } = await supabase
      .from('business_events')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', input.business_id)
      .in('status', ['pending', 'approved', 'active'])

    if ((existingCount ?? 0) >= maxEvents) {
      return { success: false, error: `Event limit reached for your plan (${maxEvents} events). Upgrade to create more.` }
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

    // 📢 SEND SLACK NOTIFICATION: Event created
    try {
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('business_name, city')
        .eq('id', input.business_id)
        .single()

      if (businessProfile) {
        const { sendCitySlackNotification } = await import('@/lib/utils/dynamic-notifications')
        
        await sendCitySlackNotification({
          title: `📅 New Event Created: ${input.event_name}`,
          message: `${businessProfile.business_name} has created a new event!\n\n**Event Details:**\n• Type: ${input.event_type}\n• Date: ${input.event_date}\n• Time: ${input.event_start_time || 'Not specified'}\n• Description: ${input.event_description}`,
          city: businessProfile.city || await getRequestCityFallback(),
          type: 'offer_created', // Reusing this type since there's no event-specific type
          data: { 
            businessName: businessProfile.business_name, 
            eventName: input.event_name,
            eventType: input.event_type,
            eventDate: input.event_date
          }
        })
        
        console.log(`📢 Slack notification sent for event creation: ${input.event_name}`)
      }
    } catch (error) {
      console.error('⚠️ Slack notification error (non-critical):', error)
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

    // Archive in knowledge base if it was approved (prevent it from appearing in chat)
    if (event.status === 'approved') {
      await archiveEventInKnowledgeBase(eventId)
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
    revalidatePath('/user/events')

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

    // Archive in knowledge base if it was previously approved (prevent it from appearing in chat)
    await archiveEventInKnowledgeBase(eventId)

    // Delete the event from the database
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
    revalidatePath('/user/events')

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
    console.log('🎯 approveEvent called for eventId:', eventId)
    
    // Use service role client for admin actions (bypasses RLS)
    console.log('🔧 Creating service role client...')
    const supabase = createServiceRoleClient()
    console.log('✅ Service role client created')

    // Approve the event
    console.log('📝 Updating event status to approved...')
    const { data, error } = await supabase
      .from('business_events')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()

    if (error) {
      console.error('❌ Error approving event in database:', error)
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      console.error('❌ No event found with ID:', eventId)
      return { success: false, error: 'Event not found' }
    }

    console.log('✅ Event approved in database:', data)

    console.log('🔄 Revalidating paths...')
    revalidatePath('/admin')
    revalidatePath('/user/events')
    revalidatePath('/dashboard/events')
    console.log('✅ Paths revalidated')

    // Add to knowledge base for AI chat
    console.log('📚 Syncing event to knowledge base...')
    const syncResult = await syncEventToKnowledgeBase(eventId)
    console.log('📚 Knowledge base sync result:', syncResult)

    if (!syncResult.success) {
      console.error('⚠️ Knowledge base sync failed, but event was approved:', syncResult.error)
    }

    const approvedEvent = data[0]

    // 📧 Send event approval email (franchise-aware)
    try {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('email, first_name, business_name, city')
        .eq('id', approvedEvent.business_id)
        .single()

      if (biz?.email) {
        const city = biz.city || await getRequestCityFallback()
        const baseUrl = getFranchiseBaseUrl(city)
        const template = createEventApprovalEmail({
          firstName: biz.first_name || 'Business Owner',
          businessName: biz.business_name || 'Your Business',
          eventName: approvedEvent.event_name,
          city,
          dashboardUrl: `${baseUrl}/dashboard/events`
        })
        const emailResult = await sendFranchiseEmail({ city, to: biz.email, template })
        if (emailResult.success) {
          console.log(`📧 Event approval email sent to ${biz.email}`)
        } else {
          console.error(`❌ Failed to send event approval email: ${emailResult.error}`)
        }
      }
    } catch (emailError) {
      console.error('⚠️ Event approval email error (non-critical):', emailError)
    }

    // In-app notification
    if (approvedEvent?.business_id) {
      const { createBusinessNotification } = await import('@/lib/actions/business-notification-actions')
      await createBusinessNotification({
        businessId: approvedEvent.business_id,
        type: 'change_approved',
        title: 'Event approved',
        message: `Your event "${approvedEvent.event_name}" has been approved and is now live`,
        metadata: { eventId, eventName: approvedEvent.event_name },
      })
    }

    console.log('🎉 Event approval complete!')
    return { success: true }
  } catch (error) {
    console.error('❌ EXCEPTION in approveEvent:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error details:', errorMessage)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack')
    return { success: false, error: `Failed to approve event: ${errorMessage}` }
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
    // Use service role client for admin actions (bypasses RLS)
    const supabase = createServiceRoleClient()

    // Fetch event details before rejecting (need business_id + event_name for email)
    const { data: eventData } = await supabase
      .from('business_events')
      .select('business_id, event_name')
      .eq('id', eventId)
      .single()

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

    // Archive in knowledge base if it was previously approved
    await archiveEventInKnowledgeBase(eventId)

    // 📧 Send event rejection email (franchise-aware)
    if (eventData) {
      try {
        const { data: biz } = await supabase
          .from('business_profiles')
          .select('email, first_name, business_name, city')
          .eq('id', eventData.business_id)
          .single()

        if (biz?.email) {
          const city = biz.city || await getRequestCityFallback()
          const baseUrl = getFranchiseBaseUrl(city)
          const template = createChangeRejectionEmail({
            firstName: biz.first_name || 'Business Owner',
            businessName: biz.business_name || 'Your Business',
            changeType: 'event',
            changeName: eventData.event_name,
            rejectionReason,
            city,
            dashboardUrl: `${baseUrl}/dashboard/events`,
            supportEmail: await getFranchiseSupportEmail(city)
          })
          const emailResult = await sendFranchiseEmail({ city, to: biz.email, template })
          if (emailResult.success) {
            console.log(`📧 Event rejection email sent to ${biz.email}`)
          } else {
            console.error(`❌ Failed to send event rejection email: ${emailResult.error}`)
          }
        }
      } catch (emailError) {
        console.error('⚠️ Event rejection email error (non-critical):', emailError)
      }

      // In-app notification
      if (eventData.business_id) {
        const { createBusinessNotification } = await import('@/lib/actions/business-notification-actions')
        await createBusinessNotification({
          businessId: eventData.business_id,
          type: 'change_rejected',
          title: 'Event not approved',
          message: `Your event "${eventData.event_name}" was not approved`,
          metadata: { eventId, eventName: eventData.event_name, reason: rejectionReason },
        })
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in rejectEvent:', error)
    return { success: false, error: 'Failed to reject event' }
  }
}

