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
    // Fetch businesses with ALL fields (some may not exist in all databases)
    const { data: businesses, error } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('city', city)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching business CRM data:', error)
      return []
    }

    // Separately fetch sync fields (only last_ghl_sync and ghl_contact_id exist)
    let businessSyncData = new Map()
    try {
      const { data: syncData } = await supabaseAdmin
        .from('business_profiles')
        .select('id, last_ghl_sync, ghl_contact_id')
        .eq('city', city)
      
      if (syncData) {
        syncData.forEach(sync => {
          businessSyncData.set(sync.id, sync)
        })
        console.log(`✅ Loaded sync data for ${syncData.length} businesses`)
      }
    } catch (syncError) {
      console.log('⚠️ Sync columns not available:', syncError)
    }

    if (!businesses) return []

    // Get business IDs for fetching related data
    const businessIds = businesses.map(b => b.id)
    
    // CRITICAL: business_subscriptions.business_id actually stores the auth user_id (profiles.id)
    // So we need to search by business.user_id if it exists, otherwise fall back to business.id
    const userIds = businesses.map(b => b.user_id || b.id).filter(Boolean)
    
    console.log('🔍 Building userIds for subscription lookup:', {
      sample_business_id: businesses[0]?.id,
      sample_user_id: businesses[0]?.user_id,
      using: 'user_id || id'
    })

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

    // Fetch offers separately
    let offersByBusiness = new Map()
    try {
      const { data: allOffers, error: offersError } = await supabaseAdmin
        .from('business_offers')
        .select('*')
        .in('business_id', businessIds)
        .order('created_at', { ascending: false })

      if (allOffers && allOffers.length > 0) {
        businesses.forEach(business => {
          const matchingOffers = allOffers.filter(offer => offer.business_id === business.id)
          if (matchingOffers.length > 0) {
            offersByBusiness.set(business.id, matchingOffers)
          }
        })
      }
    } catch (error) {
      console.log('💰 OFFERS ERROR:', error)
    }

    // Fetch subscriptions data (GET LATEST ONLY!)
    let subscriptionsByBusiness = new Map()
    try {
      // CRITICAL: Fetch subscriptions by BOTH user_id AND profile.id
      // Some old subscriptions use profile.id, newer ones use user_id (correct)
      const allPossibleIds = [...new Set([...userIds, ...businessIds])]
      
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('business_subscriptions')
        .select(`
          business_id,
          tier_id,
          status,
          is_in_free_trial,
          free_trial_start_date,
          free_trial_end_date,
          current_period_end,
          updated_at
        `)
        .in('business_id', allPossibleIds) // Search by both user_id AND profile.id!
        .order('updated_at', { ascending: false }) // GET LATEST SUBSCRIPTION FIRST!

      if (subError) {
        console.log('⚠️ Error fetching subscriptions:', subError)
      }

      console.log(`📦 Fetched ${subscriptions?.length || 0} subscription records from business_subscriptions table`)
      console.log(`🔑 Looking for user_ids:`, userIds)

      if (subscriptions && subscriptions.length > 0) {
        // Fetch tier names separately
        const tierIds = subscriptions.map(s => s.tier_id)
        const { data: tiers } = await supabaseAdmin
          .from('subscription_tiers')
          .select('id, tier_name, tier_display_name')
          .in('id', tierIds)

        const tierMap = new Map(tiers?.map(t => [t.id, t]) || [])

        // Map subscriptions by user_id (ONLY TAKE FIRST/LATEST ONE per user!)
        const subscriptionsByUserId = new Map()
        subscriptions.forEach(sub => {
          const tier = tierMap.get(sub.tier_id)
          if (tier) {
            // Only set if not already set (first one is latest due to ORDER BY updated_at DESC)
            if (!subscriptionsByUserId.has(sub.business_id)) {
              subscriptionsByUserId.set(sub.business_id, { // sub.business_id is actually user_id
                tier_id: sub.tier_id,
                tier_name: tier.tier_name,
                tier_display_name: tier.tier_display_name,
                status: sub.status,
                is_in_free_trial: sub.is_in_free_trial,
                free_trial_start_date: sub.free_trial_start_date,
                free_trial_end_date: sub.free_trial_end_date,
                current_period_end: sub.current_period_end,
                updated_at: sub.updated_at
              })
              console.log('✅ Loaded LATEST subscription for user_id:', sub.business_id, tier.tier_display_name, 'updated:', sub.updated_at)
            } else {
              console.log('⏩ Skipping older subscription for user_id:', sub.business_id, 'tier:', tier.tier_display_name, 'updated:', sub.updated_at)
            }
          }
        })
        
        // Now map to business IDs using BOTH user_id (correct) and profile.id (legacy fallback)
        console.log('🔗 Mapping subscriptions to businesses...')
        businesses.forEach(business => {
          // Try user_id first (correct architecture)
          if (business.user_id && subscriptionsByUserId.has(business.user_id)) {
            const sub = subscriptionsByUserId.get(business.user_id)
            subscriptionsByBusiness.set(business.id, sub)
            console.log(`  ✅ Mapped ${business.business_name}: user_id=${business.user_id} → business_id=${business.id}, tier=${sub.tier_display_name}`)
          }
          // Fall back to profile.id (for legacy subscriptions)
          else if (subscriptionsByUserId.has(business.id)) {
            const sub = subscriptionsByUserId.get(business.id)
            subscriptionsByBusiness.set(business.id, sub)
            console.log(`  ⚠️ Mapped ${business.business_name} via LEGACY profile.id=${business.id}, tier=${sub.tier_display_name} (subscription needs migration!)`)
          }
          else {
            console.log(`  ❌ NO MATCH for ${business.business_name}: user_id=${business.user_id}, profile_id=${business.id}`)
          }
        })
      }
    } catch (error) {
      console.error('❌ ERROR fetching business_subscriptions:', error)
      console.log('⚠️ business_subscriptions table not available, using legacy trial calculation')
    }
    
    console.log(`📊 Subscription Summary: ${subscriptionsByBusiness.size} businesses have subscriptions out of ${businesses.length} total`)

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
        
        console.log(`🔍 Trial calculation for ${business.business_name}:`, {
          is_in_free_trial: subscription.is_in_free_trial,
          status: subscription.status,
          free_trial_end_date: subscription.free_trial_end_date,
          tier_name: subscription.tier_name
        })
        
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
        } else if (subscription.status === 'active' || subscription.status === 'trial') {
          // Paid subscription - not on trial (or trial tier without free trial flag)
          console.log(`✅ ${business.business_name}: Setting trial_days_remaining=null (status=${subscription.status})`)
          trial_status = 'upgraded'
          trial_days_remaining = null // CRITICAL: Set to null to prevent "Free Trial" display
          billing_starts_date = subscription.current_period_end || null
        } else {
          console.log(`⚠️ ${business.business_name}: UNHANDLED subscription state!`, {
            status: subscription.status,
            is_in_free_trial: subscription.is_in_free_trial,
            free_trial_end_date: subscription.free_trial_end_date
          })
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
        user_id: business.user_id, // CRITICAL: Need this for subscription updates!
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
        logo: business.logo,
        business_tagline: business.business_tagline || '',
        business_description: business.business_description || '',
        business_hours: business.business_hours || '',
        business_hours_structured: business.business_hours_structured || null,
        website_url: business.website_url || '',
        website: business.website_url || '', // CRM card looks for 'website' field
        instagram_handle: business.instagram_handle || '',
        facebook_url: business.facebook_url || '',
        status: business.status as 'incomplete' | 'pending_review' | 'approved' | 'rejected',
        approved_at: business.approved_at,
        created_at: business.created_at,
        updated_at: business.updated_at,
        admin_notes: business.admin_notes,
        
        // GHL sync tracking (from database)
        last_ghl_sync: syncData?.last_ghl_sync || null,
        last_crm_sync: syncData?.last_ghl_sync || null, // Use last_ghl_sync as last_crm_sync
        crm_sync_status: syncData?.last_ghl_sync ? 'synced' : 'pending',
        ghl_contact_id: syncData?.ghl_contact_id || null,
        
        // Subscription: Use business_subscriptions if available, otherwise null (use legacy trial calculation)
        subscription: subscriptionsByBusiness.get(business.id) || null,
        tier: null,
        recent_payments: [], // Will be populated when billing system is implemented
        
        menu_url: business.menu_url,
        business_images: business.business_images as string[] | null,
        business_menus: menusByBusiness.get(business.id) || null,
        business_events: eventsByBusiness.get(business.id) || null,
        business_offers: offersByBusiness.get(business.id) || [],
        offer_name: business.offer_name,
        offer_type: business.offer_type,
        offer_image: business.offer_image,
        offer_start_date: business.offer_start_date,
        offer_end_date: business.offer_end_date,
        offer_terms: business.offer_terms,
        secret_menu_items: secretMenuItems,
        
        trial_days_remaining,
        trial_status,
        billing_starts_date,
        
        plan: business.plan || 'starter',
        features: business.features || { social_wizard: false, loyalty_cards: false, analytics: false, push_notifications: false },
        
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

/**
 * Update business tier and features (SERVER-SIDE with service role)
 * Bypasses RLS to avoid infinite recursion on city_admins policy
 */
export async function updateBusinessTier(params: {
  businessId: string
  userId: string
  city: string
  selectedTier: 'trial' | 'starter' | 'featured' | 'spotlight'
  features: {
    social_wizard: boolean
    loyalty_cards: boolean
    analytics: boolean
    push_notifications: boolean
  }
  trialDays?: number
}) {
  const supabaseAdmin = createAdminClient()
  const { businessId, userId, city, selectedTier, features, trialDays } = params

  try {
    console.log('🚀 SERVER ACTION: updateBusinessTier', { businessId, userId, city, selectedTier, features, trialDays })

    // 1. Get tier ID
    const { data: tierData, error: tierError } = await supabaseAdmin
      .from('subscription_tiers')
      .select('id')
      .eq('tier_name', selectedTier === 'trial' ? 'starter' : selectedTier)
      .single()

    if (tierError || !tierData) {
      console.error('❌ Tier lookup failed:', tierError)
      return { success: false, error: `Tier '${selectedTier}' not found` }
    }

    console.log('✅ Tier ID found:', tierData.id)

    // 2. Calculate trial dates if needed
    const now = new Date()
    const isTrial = selectedTier === 'trial'
    const trialStartDate = isTrial ? now.toISOString() : null
    const trialEndDate = isTrial ? new Date(now.getTime() + (trialDays || 90) * 24 * 60 * 60 * 1000).toISOString() : null

    // 3. Update business_profiles (plan only, no features column)
    const { error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .update({
        plan: selectedTier === 'trial' ? 'featured' : selectedTier,
        updated_at: now.toISOString()
      })
      .eq('id', businessId)

    if (profileError) {
      console.error('❌ Profile update failed:', profileError)
      return { success: false, error: profileError.message }
    }

    console.log('✅ Profile updated')

    // 4. Update or Insert business_subscriptions (manual check since no unique constraint)
    const subscriptionData: any = {
      business_id: businessId, // Use businessId (profile.id) to match foreign key constraint
      tier_id: tierData.id,
      status: selectedTier === 'trial' ? 'trial' : 'active',
      is_in_free_trial: isTrial, // FALSE for paid tiers, TRUE for trial
      // CRITICAL: When upgrading from trial to paid, clear trial dates
      free_trial_start_date: isTrial ? trialStartDate : null,
      free_trial_end_date: isTrial ? trialEndDate : null,
      updated_at: now.toISOString()
    }
    
    console.log('📝 Subscription data to save:', {
      tier: selectedTier,
      isTrial,
      is_in_free_trial: subscriptionData.is_in_free_trial,
      free_trial_end_date: subscriptionData.free_trial_end_date
    })

    // Check if subscription exists (search by businessId/profile.id)
    const { data: existingSub, error: checkError } = await supabaseAdmin
      .from('business_subscriptions')
      .select('id')
      .eq('business_id', businessId)
      .maybeSingle()

    let subscriptionError

    if (existingSub) {
      // Update existing subscription
      console.log('✅ Updating existing subscription:', existingSub.id)
      const { error } = await supabaseAdmin
        .from('business_subscriptions')
        .update(subscriptionData)
        .eq('business_id', businessId)
      subscriptionError = error
    } else {
      // Insert new subscription
      console.log('✅ Creating new subscription')
      const { error } = await supabaseAdmin
        .from('business_subscriptions')
        .insert(subscriptionData)
      subscriptionError = error
    }

    if (subscriptionError) {
      console.error('❌ Subscription update failed:', subscriptionError)
      return { success: false, error: subscriptionError.message }
    }

    console.log('✅ Subscription updated successfully')

    return {
      success: true,
      message: `Business tier updated to ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}`
    }

  } catch (error: any) {
    console.error('❌ updateBusinessTier error:', error)
    return {
      success: false,
      error: error?.message || 'Unknown error occurred'
    }
  }
}
