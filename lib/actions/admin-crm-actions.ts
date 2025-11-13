'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { BusinessCRMData } from '@/types/billing'

/**
 * Fetch comprehensive CRM data for admin dashboard
 * Includes business details, subscription info, billing history, and trial calculations
 */
export async function getBusinessCRMData(city: string): Promise<BusinessCRMData[]> {
  const supabaseAdmin = createAdminClient()

  try {
    // Fetch businesses with basic data first (billing tables might not exist yet)
    const { data: businesses, error } = await supabaseAdmin
      .from('business_profiles')
      .select(`
        id,
        business_name,
        first_name,
        last_name,
        business_category,
        business_type,
        business_address,
        business_town,
        business_postcode,
        email,
        phone,
        status,
        approved_at,
        admin_notes,
        logo,
        menu_url,
        business_images,
        offer_name,
        offer_type,
        additional_notes,
        updated_at,
        created_at
      `)
      .eq('city', city)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching business CRM data:', error)
      return []
    }

    // Separately fetch sync fields (these columns might not exist in all environments)
    let businessSyncData = new Map()
    try {
      const { data: syncData } = await supabaseAdmin
        .from('business_profiles')
        .select('id, last_ghl_sync, last_crm_sync, crm_sync_status, ghl_contact_id')
        .eq('city', city)
      
      if (syncData) {
        syncData.forEach(sync => {
          businessSyncData.set(sync.id, sync)
        })
      }
    } catch (syncError) {
      console.log('⚠️ Sync columns not available, using defaults')
    }

    if (!businesses) return []

    // Get business IDs for fetching related data
    const businessIds = businesses.map(b => b.id)

    // Fetch menus separately - now working correctly
    let menusByBusiness = new Map()
    try {
      const { data: allMenus, error: menusError } = await supabaseAdmin
        .from('menus')
        .select('*')

      if (allMenus && allMenus.length > 0) {
        // Match menus to businesses by business_id (proper foreign key relationship)
        businesses.forEach(business => {
          const matchingMenus = allMenus.filter(menu => menu.business_id === business.id)
          
          if (matchingMenus.length > 0) {
            menusByBusiness.set(business.id, matchingMenus.map(menu => ({
              id: menu.id,
              menu_name: menu.menu_name,
              menu_type: menu.menu_type || 'unknown',
              status: menu.status || 'unknown',
              uploaded_at: menu.created_at, // Use created_at since uploaded_at column doesn't exist
              admin_notes: menu.admin_notes,
              menu_url: menu.menu_url // Include the URL for direct access
            })))
          }
        })
      }

    } catch (error) {
      console.log('📄 MENUS ERROR:', error)
    }

    // Fetch events separately
    let eventsByBusiness = new Map()
    try {
      const { data: allEvents, error: eventsError } = await supabaseAdmin
        .from('business_events')
        .select('*')
        .in('business_id', businessIds)
        .order('event_date', { ascending: true })

      if (allEvents && allEvents.length > 0) {
        businesses.forEach(business => {
          const matchingEvents = allEvents.filter(event => event.business_id === business.id)
          if (matchingEvents.length > 0) {
            eventsByBusiness.set(business.id, matchingEvents)
          }
        })
      }
    } catch (error) {
      console.log('📅 EVENTS ERROR:', error)
    }

    // Fetch subscriptions data
    let subscriptionsByBusiness = new Map()
    try {
      const { data: subscriptions } = await supabaseAdmin
        .from('business_subscriptions')
        .select(`
          business_id,
          tier_id,
          status,
          is_in_free_trial,
          free_trial_start_date,
          free_trial_end_date,
          current_period_end,
          subscription_tiers!inner(tier_name, tier_display_name)
        `)
        .in('business_id', businessIds)

      if (subscriptions) {
        subscriptions.forEach(sub => {
          subscriptionsByBusiness.set(sub.business_id, {
            tier_id: sub.tier_id,
            tier_name: sub.subscription_tiers.tier_name,
            tier_display_name: sub.subscription_tiers.tier_display_name,
            status: sub.status,
            is_in_free_trial: sub.is_in_free_trial,
            free_trial_start_date: sub.free_trial_start_date,
            free_trial_end_date: sub.free_trial_end_date,
            current_period_end: sub.current_period_end
          })
        })
      }
    } catch (error) {
      console.log('⚠️ business_subscriptions table not available, using legacy trial calculation')
    }

    // Fetch pending changes count (business_changes table should exist)
    let pendingChangesByBusiness = new Map()
    try {
      const { data: pendingChanges } = await supabaseAdmin
        .from('business_changes')
        .select('business_id, id')
        .in('business_id', businessIds)
        .eq('status', 'pending')

      // Group pending changes by business
      pendingChanges?.forEach(change => {
        if (!pendingChangesByBusiness.has(change.business_id)) {
          pendingChangesByBusiness.set(change.business_id, 0)
        }
        pendingChangesByBusiness.set(change.business_id, pendingChangesByBusiness.get(change.business_id) + 1)
      })
    } catch (error) {
      console.log('business_changes table not found, skipping pending changes count')
    }

    // Transform data into CRM format
    const crmData: BusinessCRMData[] = businesses.map(business => {
      const pendingChangesCount = pendingChangesByBusiness.get(business.id) || 0

      // Parse secret menu items from additional_notes
      let secretMenuItems: Array<{
        itemName: string
        description?: string
        price?: string
        created_at: string
      }> | null = null

      if (business.additional_notes) {
        try {
          const notes = JSON.parse(business.additional_notes)
          if (notes.secret_menu_items && Array.isArray(notes.secret_menu_items)) {
            secretMenuItems = notes.secret_menu_items.map((item: any) => ({
              itemName: item.itemName || item.name || 'Unnamed Item',
              description: item.description || '',
              price: item.price || '',
              created_at: item.created_at || new Date().toISOString()
            }))
          }
        } catch (e) {
          console.error(`Error parsing additional_notes for business ${business.business_name}:`, e)
        }
      }

      // For now, default trial values (billing system not implemented yet)
      let trial_days_remaining: number | null = null
      let trial_status: 'active' | 'expired' | 'upgraded' | 'not_applicable' = 'not_applicable'
      let billing_starts_date: string | null = null

      // Calculate trial status from business_subscriptions table (proper source of truth)
      if (business.subscription) {
        const subscription = business.subscription
        
        // Check if on active trial
        if (subscription.is_in_free_trial && subscription.free_trial_end_date) {
          const trialEndDate = new Date(subscription.free_trial_end_date)
          const now = new Date()
          const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysRemaining > 0) {
            trial_days_remaining = daysRemaining
            trial_status = 'active'
            billing_starts_date = trialEndDate.toISOString()
          } else {
            trial_days_remaining = 0
            trial_status = 'expired'
            billing_starts_date = trialEndDate.toISOString()
          }
        } else if (subscription.status === 'active') {
          // Paid subscription - not on trial
          trial_status = 'upgraded'
          trial_days_remaining = null
          billing_starts_date = subscription.current_period_end || null
        }
      } else if (business.approved_at) {
        // Fallback to old calculation if no subscription exists (legacy businesses)
        const approvalDate = new Date(business.approved_at)
        const trialEndDate = new Date(approvalDate.getTime() + (90 * 24 * 60 * 60 * 1000)) // 90 days now
        const now = new Date()
        const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysRemaining > 0) {
          trial_days_remaining = daysRemaining
          trial_status = 'active'
          billing_starts_date = trialEndDate.toISOString()
        } else {
          trial_days_remaining = 0
          trial_status = 'expired'
          billing_starts_date = trialEndDate.toISOString()
        }
      }

      // Get sync data for this business
      const syncData = businessSyncData.get(business.id)
      
      return {
        id: business.id,
        business_name: business.business_name || 'Unnamed Business',
        first_name: business.first_name,
        last_name: business.last_name,
        business_category: business.business_category || 'Uncategorized',
        business_type: business.business_type,
        business_address: business.business_address || '',
        business_town: business.business_town || '',
        business_postcode: business.business_postcode || '',
        email: business.email || '',
        phone: business.phone || '',
        status: business.status as 'incomplete' | 'pending_review' | 'approved' | 'rejected',
        approved_at: business.approved_at,
        admin_notes: business.admin_notes,
        
        // GHL sync tracking (from database, fallback to null if columns don't exist)
        last_ghl_sync: syncData?.last_ghl_sync || syncData?.last_crm_sync || null,
        ghl_contact_id: syncData?.ghl_contact_id || null,
        
        // Business assets
        logo: business.logo,
        
        subscription: subscriptionsByBusiness.get(business.id) || null,
        tier: null,
        recent_payments: [], // Will be populated when billing system is implemented
        
        menu_url: business.menu_url,
        business_images: business.business_images as string[] | null,
        business_menus: menusByBusiness.get(business.id) || null,
        business_events: eventsByBusiness.get(business.id) || null,
        offer_name: business.offer_name,
        offer_type: business.offer_type,
        secret_menu_items: secretMenuItems,
        
        trial_days_remaining,
        trial_status,
        billing_starts_date,
        
        last_updated: business.updated_at || business.created_at,
        has_pending_changes: pendingChangesCount > 0,
        pending_changes_count: pendingChangesCount
      }
    })

    return crmData

  } catch (error) {
    console.error('Error in getBusinessCRMData:', error)
    return []
  }
}

/**
 * Update business subscription (upgrade/downgrade)
 */
export async function updateBusinessSubscription(
  businessId: string,
  tierId: string,
  billingCycle: 'monthly' | 'yearly'
) {
  const supabaseAdmin = createAdminClient()

  try {
    // Get the new tier information
    const { data: tier, error: tierError } = await supabaseAdmin
      .from('subscription_tiers')
      .select('*')
      .eq('id', tierId)
      .single()

    if (tierError || !tier) {
      return { success: false, error: 'Invalid subscription tier' }
    }

    // Get current subscription
    const { data: currentSub, error: currentSubError } = await supabaseAdmin
      .from('business_subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (currentSubError) {
      return { success: false, error: 'Could not find current subscription' }
    }

    // Calculate pricing
    const basePrice = billingCycle === 'yearly' ? tier.yearly_price : tier.monthly_price
    let discountedPrice = basePrice
    let hasLifetimeDiscount = false
    let lifetimeDiscountPercent = 0

    // Apply 20% lifetime discount if upgrading during free trial
    if (currentSub.is_in_free_trial && tier.tier_name !== 'free') {
      hasLifetimeDiscount = true
      lifetimeDiscountPercent = 20
      discountedPrice = basePrice * 0.8 // 20% off
    }

    // Update subscription
    const { data: updatedSub, error: updateError } = await supabaseAdmin
      .from('business_subscriptions')
      .update({
        tier_id: tierId,
        billing_cycle: billingCycle,
        base_price: basePrice,
        discounted_price: discountedPrice,
        has_lifetime_discount: hasLifetimeDiscount,
        lifetime_discount_percent: lifetimeDiscountPercent,
        upgraded_during_trial: currentSub.is_in_free_trial,
        status: currentSub.is_in_free_trial ? 'trial' : 'active',
        subscription_start_date: currentSub.is_in_free_trial ? currentSub.free_trial_end_date : new Date().toISOString()
      })
      .eq('id', currentSub.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return { success: false, error: 'Failed to update subscription' }
    }

    return { success: true, data: updatedSub }

  } catch (error) {
    console.error('Error in updateBusinessSubscription:', error)
    return { success: false, error: 'Internal server error' }
  }
}

/**
 * Process payment for a business
 */
export async function recordPayment(
  businessId: string,
  amount: number,
  paymentMethod: string,
  externalPaymentId?: string
) {
  const supabaseAdmin = createAdminClient()

  try {
    // Get current subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('business_subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError || !subscription) {
      return { success: false, error: 'Subscription not found' }
    }

    // Calculate billing period
    const now = new Date()
    const periodStart = now
    const periodEnd = new Date(now)
    
    if (subscription.billing_cycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    }

    // Record payment
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('billing_history')
      .insert({
        business_id: businessId,
        subscription_id: subscription.id,
        amount: amount,
        currency: 'GBP',
        payment_method: paymentMethod,
        billing_period_start: periodStart.toISOString(),
        billing_period_end: periodEnd.toISOString(),
        status: 'paid',
        payment_date: now.toISOString(),
        external_payment_id: externalPaymentId,
        invoice_number: `INV-${Date.now()}`
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error recording payment:', paymentError)
      return { success: false, error: 'Failed to record payment' }
    }

    // Update subscription and profile
    await supabaseAdmin
      .from('business_subscriptions')
      .update({
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        status: 'active'
      })
      .eq('id', subscription.id)

    await supabaseAdmin
      .from('business_profiles')
      .update({
        last_payment_date: now.toISOString(),
        next_billing_date: periodEnd.toISOString()
      })
      .eq('id', businessId)

    return { success: true, data: payment }

  } catch (error) {
    console.error('Error in recordPayment:', error)
    return { success: false, error: 'Internal server error' }
  }
}
