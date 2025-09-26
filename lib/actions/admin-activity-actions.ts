'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface AdminActivity {
  id: string
  type: 'application' | 'update' | 'approval' | 'rejection' | 'signup' | 'trial_expiry'
  message: string
  time: string
  business_name?: string
  user_name?: string
  iconType: string
  color: string
}

export async function getAdminActivity(limit: number = 10): Promise<AdminActivity[]> {
  try {
    const supabase = createServiceRoleClient()
    const activities: AdminActivity[] = []

    // Get recent business profile applications (new signups)
    const { data: newApplications } = await supabase
      .from('business_profiles')
      .select(`
        id,
        business_name,
        created_at,
        status,
        user_id,
        user_members (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get recent status changes
    const { data: statusChanges } = await supabase
      .from('business_profiles')
      .select(`
        id,
        business_name,
        updated_at,
        status,
        created_at,
        user_members (
          first_name,
          last_name
        )
      `)
      .neq('updated_at', null)
      .order('updated_at', { ascending: false })
      .limit(20)

    // Process new applications
    if (newApplications) {
      for (const app of newApplications) {
        const userName = app.user_members ? 
          `${app.user_members.first_name} ${app.user_members.last_name}`.trim() : 
          'Unknown User'
        
        const createdAt = new Date(app.created_at)
        const timeAgo = getTimeAgo(createdAt)

        activities.push({
          id: `app-${app.id}`,
          type: 'application',
          message: `New application from ${app.business_name || 'Unnamed Business'} by ${userName}`,
          time: timeAgo,
          business_name: app.business_name,
          user_name: userName,
          iconType: 'plus',
          color: 'bg-green-500'
        })
      }
    }

    // Process status changes (approvals, updates, etc.)
    if (statusChanges) {
      for (const change of statusChanges) {
        const userName = change.user_members ? 
          `${change.user_members.first_name} ${change.user_members.last_name}`.trim() : 
          'Unknown User'
        
        const updatedAt = new Date(change.updated_at)
        const createdAt = new Date(change.created_at)
        const timeAgo = getTimeAgo(updatedAt)
        
        // Skip if this is just the initial creation (not a real update)
        if (Math.abs(updatedAt.getTime() - createdAt.getTime()) < 60000) {
          continue
        }

        let message = ''
        let type: AdminActivity['type'] = 'update'
        let color = 'bg-blue-500'
        let iconType = 'edit'

        switch (change.status) {
          case 'approved':
            message = `Approved: ${change.business_name || 'Business'} application`
            type = 'approval'
            color = 'bg-green-500'
            iconType = 'check'
            break
          case 'rejected':
            message = `Rejected: ${change.business_name || 'Business'} application`
            type = 'rejection'
            color = 'bg-red-500'
            iconType = 'x'
            break
          case 'pending_review':
            message = `${change.business_name || 'Business'} submitted for review`
            type = 'update'
            color = 'bg-yellow-500'
            iconType = 'clock'
            break
          default:
            message = `${change.business_name || 'Business'} updated profile`
            type = 'update'
            iconType = 'edit'
            break
        }

        activities.push({
          id: `status-${change.id}-${change.updated_at}`,
          type,
          message,
          time: timeAgo,
          business_name: change.business_name,
          user_name: userName,
          iconType,
          color
        })
      }
    }

    // Get trial expiries (businesses with featured plan that are about to expire)
    const { data: trials } = await supabase
      .from('business_profiles')
      .select(`
        id,
        business_name,
        created_at,
        plan,
        user_members (
          first_name,
          last_name
        )
      `)
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
            business_name: trial.business_name,
            iconType: 'clock',
            color: 'bg-orange-500'
          })
        }
      }
    }

    // Sort all activities by time (most recent first) and limit
    const sortedActivities = activities
      .sort((a, b) => {
        // Convert time strings back to comparable values for sorting
        const timeA = parseTimeAgo(a.time)
        const timeB = parseTimeAgo(b.time)
        return timeA - timeB
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

function parseTimeAgo(timeString: string): number {
  // Convert time ago string back to minutes for sorting
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
