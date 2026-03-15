'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export type NotificationType =
  | 'offer_claim'
  | 'loyalty_join'
  | 'stamp_earn'
  | 'redemption'
  | 'business_save'
  | 'change_approved'
  | 'change_rejected'
  | 'admin_message'

export interface BusinessNotification {
  id: string
  business_id: string
  type: NotificationType
  title: string
  message: string
  metadata: Record<string, unknown>
  read: boolean
  created_at: string
}

/**
 * Create a business notification. Fire-and-forget — failures are logged, never thrown.
 */
export async function createBusinessNotification(params: {
  businessId: string
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, unknown>
}) {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('business_notifications')
      .insert({
        business_id: params.businessId,
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata || {},
      })

    if (error) {
      console.error('[business-notifications] Insert failed:', error.message)
    }
  } catch (err) {
    console.error('[business-notifications] Unexpected error:', err)
  }
}

/**
 * Fetch notifications for a business, ordered newest-first.
 */
export async function getBusinessNotifications(
  businessId: string,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
): Promise<{ notifications: BusinessNotification[]; total: number }> {
  const supabase = createServiceRoleClient()
  const { limit = 50, offset = 0, unreadOnly = false } = options

  let query = supabase
    .from('business_notifications')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('[business-notifications] Fetch failed:', error.message)
    return { notifications: [], total: 0 }
  }

  return { notifications: (data || []) as BusinessNotification[], total: count || 0 }
}

/**
 * Get unread notification count for sidebar badge.
 */
export async function getUnreadNotificationCount(businessId: string): Promise<number> {
  const supabase = createServiceRoleClient()

  const { count, error } = await supabase
    .from('business_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('read', false)

  if (error) {
    console.error('[business-notifications] Count failed:', error.message)
    return 0
  }

  return count || 0
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(notificationId: string, businessId: string) {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('business_notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('business_id', businessId)

  if (error) {
    console.error('[business-notifications] Mark-read failed:', error.message)
  }
}

/**
 * Mark all notifications as read for a business.
 */
export async function markAllNotificationsRead(businessId: string) {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('business_notifications')
    .update({ read: true })
    .eq('business_id', businessId)
    .eq('read', false)

  if (error) {
    console.error('[business-notifications] Mark-all-read failed:', error.message)
  }
}
