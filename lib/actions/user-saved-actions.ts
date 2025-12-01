'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface SavedItem {
  id: string
  item_type: 'business' | 'event' | 'offer' | 'secret_menu'
  item_id: string
  item_name?: string
  saved_at: string
}

/**
 * Get all saved items for a user
 */
export async function getUserSavedItems(walletPassId?: string): Promise<{
  success: boolean
  items?: SavedItem[]
  count?: number
  error?: string
}> {
  if (!walletPassId) {
    return { success: false, error: 'No wallet pass ID provided', items: [], count: 0 }
  }

  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('user_saved_items')
      .select('*')
      .eq('wallet_pass_id', walletPassId)
      .order('saved_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved items:', error)
      return { success: false, error: error.message, items: [], count: 0 }
    }

    return {
      success: true,
      items: data || [],
      count: data?.length || 0
    }
  } catch (error) {
    console.error('Error in getUserSavedItems:', error)
    return {
      success: false,
      error: 'Failed to fetch saved items',
      items: [],
      count: 0
    }
  }
}

/**
 * Save an item (business, event, offer, etc.)
 */
export async function saveItem(
  walletPassId: string,
  itemType: 'business' | 'event' | 'offer' | 'secret_menu',
  itemId: string,
  itemName?: string
): Promise<{
  success: boolean
  error?: string
}> {
  if (!walletPassId || !itemType || !itemId) {
    return { success: false, error: 'Missing required fields' }
  }

  try {
    const supabase = createServiceRoleClient()

    // Get user_id from wallet_pass_id
    const { data: user } = await supabase
      .from('app_users')
      .select('user_id')
      .eq('wallet_pass_id', walletPassId)
      .single()

    const { error } = await supabase
      .from('user_saved_items')
      .insert({
        user_id: user?.user_id,
        wallet_pass_id: walletPassId,
        item_type: itemType,
        item_id: itemId,
        item_name: itemName
      })

    if (error) {
      // If it's a unique constraint violation, item is already saved (not an error)
      if (error.code === '23505') {
        return { success: true }
      }
      console.error('Error saving item:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in saveItem:', error)
    return { success: false, error: 'Failed to save item' }
  }
}

/**
 * Unsave/remove an item
 */
export async function unsaveItem(
  walletPassId: string,
  itemType: 'business' | 'event' | 'offer' | 'secret_menu',
  itemId: string
): Promise<{
  success: boolean
  error?: string
}> {
  if (!walletPassId || !itemType || !itemId) {
    return { success: false, error: 'Missing required fields' }
  }

  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('user_saved_items')
      .delete()
      .eq('wallet_pass_id', walletPassId)
      .eq('item_type', itemType)
      .eq('item_id', itemId)

    if (error) {
      console.error('Error unsaving item:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in unsaveItem:', error)
    return { success: false, error: 'Failed to unsave item' }
  }
}

/**
 * Check if an item is saved
 */
export async function isItemSaved(
  walletPassId: string,
  itemType: 'business' | 'event' | 'offer' | 'secret_menu',
  itemId: string
): Promise<boolean> {
  if (!walletPassId || !itemType || !itemId) {
    return false
  }

  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('user_saved_items')
      .select('id')
      .eq('wallet_pass_id', walletPassId)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .maybeSingle()

    if (error) {
      console.error('Error checking if item is saved:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error in isItemSaved:', error)
    return false
  }
}

/**
 * Get count of saved items by type
 */
export async function getSavedItemsCountByType(walletPassId?: string): Promise<{
  businesses: number
  events: number
  offers: number
  secret_menus: number
  total: number
}> {
  if (!walletPassId) {
    return { businesses: 0, events: 0, offers: 0, secret_menus: 0, total: 0 }
  }

  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('user_saved_items')
      .select('item_type')
      .eq('wallet_pass_id', walletPassId)

    if (error) {
      console.error('Error fetching saved items count:', error)
      return { businesses: 0, events: 0, offers: 0, secret_menus: 0, total: 0 }
    }

    const counts = {
      businesses: 0,
      events: 0,
      offers: 0,
      secret_menus: 0,
      total: data?.length || 0
    }

    data?.forEach((item: any) => {
      if (item.item_type === 'business') counts.businesses++
      if (item.item_type === 'event') counts.events++
      if (item.item_type === 'offer') counts.offers++
      if (item.item_type === 'secret_menu') counts.secret_menus++
    })

    return counts
  } catch (error) {
    console.error('Error in getSavedItemsCountByType:', error)
    return { businesses: 0, events: 0, offers: 0, secret_menus: 0, total: 0 }
  }
}

