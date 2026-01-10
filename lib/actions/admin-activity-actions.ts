'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCity } from '@/lib/utils/franchise-areas'

export interface AdminActivity {
  id: string
  type: 'application' | 'update' | 'approval' | 'rejection' | 'signup' | 'trial_expiry' | 'pass_install' | 'offer_claim' | 'business_visit' | 'claim_request'
  message: string
  time: string
  timestamp: Date // Add actual timestamp for accurate sorting
  business_name?: string
  user_name?: string
  iconType: string
  color: string
}

export async function getAdminActivity(city: string, limit: number = 10): Promise<AdminActivity[]> {
  try {
    const supabase = createServiceRoleClient()
    const activities: AdminActivity[] = []
    
    // 🎯 SIMPLIFIED FRANCHISE SYSTEM: Get franchise city
    const franchiseCity = await getFranchiseCity(city)

    // Get recent wallet pass installations (user signups) - CITY FILTERED
    const { data: newPassInstalls } = await supabase
      .from('app_users')
      .select(`
        id,
        name,
        wallet_pass_id,
        wallet_pass_assigned_at,
        city,
        created_at
      `)
      .not('wallet_pass_id', 'is', null)
      .eq('city', franchiseCity) // 🎯 SIMPLIFIED: Filter by franchise city
      .order('wallet_pass_assigned_at', { ascending: false })
      .limit(15)

    // Get recent business profile applications (business signups) - CITY FILTERED
    const { data: newApplications } = await supabase
      .from('business_profiles')
      .select(`
        id,
        business_name,
        created_at,
        status,
        user_id,
        business_town,
        auto_imported
      `)
      .eq('city', franchiseCity) // 🎯 FRANCHISE FILTERING: Use city field for franchise
      .order('created_at', { ascending: false })
      .limit(10)

    // Get recent offer claims and redemptions - FRANCHISE FILTERED
    const { data: offerClaims } = await supabase
      .from('user_offer_claims')
      .select(`
        id,
        offer_title,
        business_name,
        claimed_at,
        wallet_pass_id,
        status,
        updated_at,
        app_users!inner(city)
      `)
      .eq('app_users.city', franchiseCity) // 🔒 SECURITY: Filter by franchise
      .order('claimed_at', { ascending: false })
      .limit(20)

    // 🚫 DISABLED: Business visits clutter the admin feed (will flood with real user activity)
    // Get recent business visits - FRANCHISE FILTERED
    // const { data: businessVisits } = await supabase
    //   .from('user_business_visits')
    //   .select(`
    //     id,
    //     visit_date,
    //     business_id,
    //     user_id,
    //     app_users!inner(city)
    //   `)
    //   .eq('app_users.city', franchiseCity) // 🔒 SECURITY: Filter by franchise
    //   .order('visit_date', { ascending: false })
    //   .limit(8)
    const businessVisits = null // Disabled to keep feed focused on admin actions

    // Get recent claim requests - CITY FILTERED
    const { data: claimRequests } = await supabase
      .from('claim_requests')
      .select(`
        id,
        created_at,
        status,
        business_email,
        business_website,
        business_id,
        user_id
      `)
      .eq('city', franchiseCity) // 🎯 FRANCHISE FILTERING
      .order('created_at', { ascending: false })
      .limit(10)

    // Get recent status changes - CITY FILTERED
    const { data: statusChanges, error: statusError } = await supabase
      .from('business_profiles')
      .select(`
        id,
        business_name,
        updated_at,
        status,
        created_at,
        business_town
      `)
      .eq('city', franchiseCity) // 🎯 FRANCHISE FILTERING: Only show this city's businesses
      .not('updated_at', 'is', null) // 🔧 FIX: Use proper null check syntax
      .order('updated_at', { ascending: false })
      .limit(20)

    // Process new wallet pass installations
    if (newPassInstalls) {
      for (const install of newPassInstalls) {
        const installDate = new Date(install.wallet_pass_assigned_at || install.created_at)
        const timeAgo = getTimeAgo(installDate)

        activities.push({
          id: `pass-${install.id}`,
          type: 'pass_install',
          message: `${install.name || 'User'} installed wallet pass in ${install.city || 'Unknown City'}`,
          time: timeAgo,
          timestamp: installDate,
          user_name: install.name,
          iconType: 'wallet',
          color: 'bg-purple-500'
        })
      }
    }

    // Process new business applications
    // 🚫 EXCLUDE auto-imported/unclaimed businesses (they weren't "applied" for)
    // 🚫 ONLY show applications from last 7 days
    if (newApplications) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      
      for (const app of newApplications) {
        const createdAt = new Date(app.created_at)
        
        // 🚫 CRITICAL: Skip unclaimed businesses (auto-imported via Google Places)
        if (app.status === 'unclaimed' || app.auto_imported === true) {
          console.log(`[Activity] Skipping unclaimed business: ${app.business_name} (status=${app.status}, auto_imported=${app.auto_imported})`)
          continue
        }
        
        // 🚫 CRITICAL: Only show applications from last 7 days
        if (createdAt < sevenDaysAgo) {
          console.log(`[Activity] Skipping old application: ${app.business_name} (created ${getTimeAgo(createdAt)})`)
          continue
        }

        const timeAgo = getTimeAgo(createdAt)

        // Show as "application" for pending_review/incomplete
        // Show as "claim submission" for pending_claim
        let message = ''
        let iconType = 'plus'
        let color = 'bg-green-500'

        if (app.status === 'pending_claim') {
          message = `Claim submitted: ${app.business_name || 'Unnamed Business'} in ${app.business_town || 'Unknown City'}`
          iconType = 'document'
          color = 'bg-amber-500'
        } else {
          message = `New business application: ${app.business_name || 'Unnamed Business'} in ${app.business_town || 'Unknown City'}`
        }

        activities.push({
          id: `app-${app.id}`,
          type: 'application',
          message,
          time: timeAgo,
          timestamp: createdAt,
          business_name: app.business_name,
          iconType,
          color
        })
      }
    }

    // Process status changes (approvals, updates, etc.)
    // 🚫 CRITICAL: Only show approvals for NEWLY CREATED businesses (created in last 7 days)
    // This prevents old businesses from appearing when their profile gets updated for other reasons
    if (statusChanges) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      for (const change of statusChanges) {
        const updatedAt = new Date(change.updated_at)
        const createdAt = new Date(change.created_at)

        // 🚫 CRITICAL FIX #1: Only show approvals for NEW businesses (created in last 7 days)
        // This prevents old businesses from showing when they get profile updates (secret menus, offers, etc.)
        if (createdAt < sevenDaysAgo) {
          // This is an OLD business - skip even if updated recently
          continue
        }

        // 🚫 CRITICAL FIX #2: Only show approvals/rejections if updated_at is SIGNIFICANTLY DIFFERENT from created_at
        // This filters out businesses that were approved long ago (their updated_at = created_at or very close)
        const timeDiffMinutes = Math.abs(updatedAt.getTime() - createdAt.getTime()) / (1000 * 60)
        const isRecentStatusChange = timeDiffMinutes > 5 // At least 5 minutes between creation and update

        // 🚫 CRITICAL FIX #3: Only show if updated in last 24 HOURS
        // This prevents old approvals from showing up if their updated_at was touched for any reason
        if (updatedAt < twentyFourHoursAgo) {
          console.log(`[Activity] Skipping old status change for: ${change.business_name} (updated ${getTimeAgo(updatedAt)})`)
          continue
        }

        let message = ''
        let type: AdminActivity['type'] = 'update'
        let color = 'bg-blue-500'
        let iconType = 'edit'
        let activityDate = updatedAt // Default to updated_at
        let activityId = `status-${change.id}-${change.updated_at}`

        switch (change.status) {
          case 'approved':
            // Only show if this was a real status change (not just initial creation)
            if (!isRecentStatusChange) {
              console.log(`[Activity] Skipping approval for ${change.business_name}: not a recent status change (${timeDiffMinutes.toFixed(1)} minutes between create/update)`)
              continue
            }

            message = `Admin approved: ${change.business_name || 'Business'} in ${change.business_town || 'Unknown City'}`
            type = 'approval'
            color = 'bg-green-500'
            iconType = 'check'
            // Use updated_at for approvals (when admin approved it)
            activityDate = updatedAt
            break
          case 'rejected':
            // Only show if this was a real status change (not just initial creation)
            if (!isRecentStatusChange) {
              console.log(`[Activity] Skipping rejection for ${change.business_name}: not a recent status change`)
              continue
            }

            message = `Admin rejected: ${change.business_name || 'Business'} application`
            type = 'rejection'
            color = 'bg-red-500'
            iconType = 'x'
            // Use updated_at for rejections (when admin rejected it)
            activityDate = updatedAt
            break
          case 'claimed_free':
            // Show when a business gets their claim approved
            if (!isRecentStatusChange) {
              console.log(`[Activity] Skipping claimed_free for ${change.business_name}: not a recent status change`)
              continue
            }

            message = `Claim approved: ${change.business_name || 'Business'} is now a Free Listing`
            type = 'approval'
            color = 'bg-emerald-500'
            iconType = 'check'
            activityDate = updatedAt
            break
          case 'pending_review':
            // Skip pending_review from status changes (we show these from new applications instead)
            continue
          case 'incomplete':
            // Skip incomplete status (not interesting for activity feed)
            continue
          case 'unclaimed':
            // Skip unclaimed businesses (auto-imported, not user activity)
            continue
          case 'pending_claim':
            // Skip pending_claim (we show these from new applications instead)
            continue
          default:
            // Skip other status updates (only show approvals/rejections)
            continue
        }

        const timeAgo = getTimeAgo(activityDate)

        activities.push({
          id: activityId,
          type,
          message,
          time: timeAgo,
          timestamp: activityDate,
          business_name: change.business_name,
          iconType,
          color
        })
      }
    }

    // Process offer claims and redemptions
    if (offerClaims) {
      for (const claim of offerClaims) {
        // Get user name from wallet pass ID
        let userName = 'Unknown User'
        if (claim.wallet_pass_id) {
          const { data: user } = await supabase
            .from('app_users')
            .select('name')
            .eq('wallet_pass_id', claim.wallet_pass_id)
            .single()
          
          if (user) userName = user.name || 'Unknown User'
        }

        // Add claim activity
        const claimDate = new Date(claim.claimed_at)
        const claimTimeAgo = getTimeAgo(claimDate)

        activities.push({
          id: `claim-${claim.id}`,
          type: 'offer_claim',
          message: `${userName} claimed "${claim.offer_title}" at ${claim.business_name}`,
          time: claimTimeAgo,
          timestamp: claimDate,
          user_name: userName,
          business_name: claim.business_name,
          iconType: 'gift',
          color: 'bg-blue-500'
        })

        // Add redemption activity if status is wallet_added or redeemed
        if (claim.status === 'wallet_added' || claim.status === 'redeemed') {
          const updateDate = new Date(claim.updated_at || claim.claimed_at)
          const updateTimeAgo = getTimeAgo(updateDate)

          activities.push({
            id: `redeem-${claim.id}`,
            type: 'offer_claim',
            message: `${userName} redeemed "${claim.offer_title}" at ${claim.business_name}`,
            time: updateTimeAgo,
            timestamp: updateDate,
            user_name: userName,
            business_name: claim.business_name,
            iconType: 'wallet',
            color: 'bg-green-500'
          })
        }
      }
    }

    // 🚫 DISABLED: Business visits processing (keeping feed focused on admin actions)
    // Process business visits
    // if (businessVisits) {
    //   for (const visit of businessVisits) {
    //     const visitDate = new Date(visit.visit_date)
    //     const timeAgo = getTimeAgo(visitDate)

    //     // Get user and business names
    //     const { data: user } = await supabase
    //       .from('app_users')
    //       .select('name')
    //       .eq('user_id', visit.user_id)
    //       .single()

    //     const { data: business } = await supabase
    //       .from('business_profiles')
    //       .select('business_name, business_town')
    //       .eq('id', visit.business_id)
    //       .single()

    //     const userName = user?.name || 'Unknown User'
    //     const businessName = business?.business_name || 'Unknown Business'
    //     const businessTown = business?.business_town || 'Unknown City'

    //     activities.push({
    //       id: `visit-${visit.id}`,
    //       type: 'business_visit',
    //       message: `${userName} visited ${businessName} in ${businessTown}`,
    //       time: timeAgo,
    //       timestamp: visitDate,
    //       user_name: userName,
    //       business_name: businessName,
    //       iconType: 'mapPin',
    //       color: 'bg-indigo-500'
    //     })
    //   }
    // }

    // Process claim requests
    if (claimRequests) {
      for (const claim of claimRequests) {
        const claimDate = new Date(claim.created_at)
        const timeAgo = getTimeAgo(claimDate)

        // Get business and user details
        const { data: business } = await supabase
          .from('business_profiles')
          .select('business_name')
          .eq('id', claim.business_id)
          .single()

        const { data: user } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', claim.user_id)
          .single()

        const businessName = business?.business_name || 'Unknown Business'
        const userEmail = user?.email || claim.business_email || 'Unknown User'

        // Set icon and color based on status
        let iconType = 'document'
        let color = 'bg-amber-500'
        let statusText = 'claimed'
        
        switch (claim.status) {
          case 'approved':
            iconType = 'check'
            color = 'bg-green-500'
            statusText = 'claim approved'
            break
          case 'denied':
            iconType = 'x'
            color = 'bg-red-500'
            statusText = 'claim denied'
            break
          case 'pending':
          default:
            iconType = 'document'
            color = 'bg-amber-500'
            statusText = 'claimed'
            break
        }

        activities.push({
          id: `claim-req-${claim.id}`,
          type: 'claim_request',
          message: `${userEmail} ${statusText} listing for ${businessName}`,
          time: timeAgo,
          timestamp: claimDate,
          user_name: userEmail,
          business_name: businessName,
          iconType,
          color
        })
      }
    }

    // Get trial expiries (businesses with featured plan that are about to expire) - CITY FILTERED
    const { data: trials } = await supabase
      .from('business_profiles')
      .select(`
        id,
        business_name,
        created_at,
        plan,
        business_town
      `)
      .eq('city', franchiseCity) // 🎯 FRANCHISE FILTERING: Only this city's trials
      .eq('plan', 'featured')
      .not('business_name', 'is', null)

    if (trials) {
      for (const trial of trials) {
        const createdAt = new Date(trial.created_at)
        const trialEndDate = new Date(createdAt.getTime() + (14 * 24 * 60 * 60 * 1000)) // 14 days trial
        const now = new Date()
        const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        
        if (daysLeft <= 3 && daysLeft > 0) {
          activities.push({
            id: `trial-${trial.id}`,
            type: 'trial_expiry',
            message: `${trial.business_name} trial expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
            time: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`,
            timestamp: trialEndDate,
            business_name: trial.business_name,
            iconType: 'clock',
            color: 'bg-orange-500'
          })
        }
      }
    }

    // Sort all activities by actual timestamp (most recent first) and limit
    const sortedActivities = activities
      .sort((a, b) => {
        // Use actual timestamps for accurate sorting
        const timestampA = getTimestampFromActivity(a)
        const timestampB = getTimestampFromActivity(b)
        return timestampB - timestampA // Most recent first
      })
      .slice(0, limit)

    return sortedActivities

  } catch (error) {
    console.error('Error fetching admin activity:', error)
    return []
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`
  
  const diffInWeeks = Math.floor(diffInDays / 7)
  return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`
}

function getTimestampFromActivity(activity: AdminActivity): number {
  // Return timestamp as milliseconds for accurate sorting
  return activity.timestamp.getTime()
}

function parseTimeAgo(timeString: string): number {
  // Convert time ago string back to minutes for sorting (legacy fallback)
  if (timeString === 'Just now') return 0
  
  const match = timeString.match(/(\d+)\s+(minute|hour|day|week)s?\s+ago/)
  if (!match) return 999999 // Unknown format, put at end
  
  const value = parseInt(match[1])
  const unit = match[2]
  
  switch (unit) {
    case 'minute': return value
    case 'hour': return value * 60
    case 'day': return value * 60 * 24
    case 'week': return value * 60 * 24 * 7
    default: return 999999
  }
}
