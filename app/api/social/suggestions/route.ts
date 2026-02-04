/**
 * SOCIAL WIZARD v1 — COMPUTED SUGGESTIONS
 * GET /api/social/suggestions
 * 
 * Returns real-time suggestions based on business data
 * No DB table, computed on demand
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type SuggestionType = 'offer_expiring' | 'event_upcoming' | 'no_drafts' | 'new_review'

export interface Suggestion {
  type: SuggestionType
  title: string
  reason: string
  source_ref: Record<string, any> // {offer_id, event_id, etc.}
  cta: string
}

/**
 * GET - Compute suggestions
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const business_id = searchParams.get('business_id')

  if (!business_id) {
    return NextResponse.json({ 
      error: 'business_id required' 
    }, { status: 400 })
  }

  // Verify business membership
  const { data: membership } = await supabase
    .from('business_user_roles')
    .select('role')
    .eq('business_id', business_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const suggestions: Suggestion[] = []

  // 1. Check for expiring offers (within 7 days)
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  const { data: expiringOffers } = await supabase
    .from('business_offers')
    .select('id, offer_name, offer_end_date')
    .eq('business_id', business_id)
    .eq('status', 'approved')
    .gt('offer_end_date', new Date().toISOString())
    .lte('offer_end_date', sevenDaysFromNow.toISOString())

  if (expiringOffers && expiringOffers.length > 0) {
    expiringOffers.forEach(offer => {
      const daysLeft = Math.ceil(
        (new Date(offer.offer_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      suggestions.push({
        type: 'offer_expiring',
        title: `Offer ending in ${daysLeft} days`,
        reason: `"${offer.offer_name}" expires soon. Create a reminder post to boost last-minute engagement.`,
        source_ref: { offer_id: offer.id },
        cta: 'Generate draft'
      })
    })
  }

  // 2. Check for upcoming events (within 72 hours)
  const seventyTwoHoursFromNow = new Date()
  seventyTwoHoursFromNow.setHours(seventyTwoHoursFromNow.getHours() + 72)

  const { data: upcomingEvents } = await supabase
    .from('business_events')
    .select('id, event_name, event_date')
    .eq('business_id', business_id)
    .eq('status', 'approved')
    .gte('event_date', new Date().toISOString())
    .lte('event_date', seventyTwoHoursFromNow.toISOString())

  if (upcomingEvents && upcomingEvents.length > 0) {
    upcomingEvents.forEach(event => {
      const hoursLeft = Math.ceil(
        (new Date(event.event_date).getTime() - Date.now()) / (1000 * 60 * 60)
      )
      suggestions.push({
        type: 'event_upcoming',
        title: `Event in ${hoursLeft} hours`,
        reason: `"${event.event_name}" is coming soon. Create a countdown post to build excitement.`,
        source_ref: { event_id: event.id },
        cta: 'Generate draft'
      })
    })
  }

  // 3. Check for inactivity (no drafts in last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: recentDrafts } = await supabase
    .from('social_posts')
    .select('id')
    .eq('business_id', business_id)
    .gte('created_at', sevenDaysAgo.toISOString())
    .limit(1)

  if (!recentDrafts || recentDrafts.length === 0) {
    suggestions.push({
      type: 'no_drafts',
      title: 'No posts in 7 days',
      reason: 'Stay consistent! Create a post to keep your social presence active.',
      source_ref: {},
      cta: 'Generate draft'
    })
  }

  // 4. Check for new reviews (if reviews table exists and has recent entries)
  // TODO: Implement if reviews table is available
  // For now, skip this suggestion type

  console.log(`💡 Generated ${suggestions.length} suggestions for business ${business_id}`)

  return NextResponse.json({ 
    success: true, 
    suggestions 
  })
}
