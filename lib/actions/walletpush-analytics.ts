'use server'

interface WalletPushAnalytics {
  passesCreated: number
  passesInstalled: number
  offersClaimed: number
  offersRedeemed: number
  recentActivity: Array<{
    type: 'pass_installed' | 'offer_claimed' | 'offer_redeemed'
    user_name: string
    timestamp: string
    details?: string
  }>
}

export async function getWalletPushAnalytics(city: string = 'bournemouth'): Promise<WalletPushAnalytics> {
  try {
    const MOBILE_WALLET_APP_KEY = process.env.MOBILE_WALLET_APP_KEY
    const MOBILE_WALLET_TEMPLATE_ID = process.env.MOBILE_WALLET_TEMPLATE_ID
    
    if (!MOBILE_WALLET_APP_KEY || !MOBILE_WALLET_TEMPLATE_ID) {
      console.warn('Missing WalletPush credentials for analytics')
      return {
        passesCreated: 0,
        passesInstalled: 0,
        offersClaimed: 0,
        offersRedeemed: 0,
        recentActivity: []
      }
    }
    
    // Fetch analytics from WalletPush API
    const analyticsUrl = `https://app2.walletpush.io/api/v1/templates/${MOBILE_WALLET_TEMPLATE_ID}/analytics`
    
    const response = await fetch(analyticsUrl, {
      method: 'GET',
      headers: {
        'Authorization': MOBILE_WALLET_APP_KEY,
        'Content-Type': 'application/json',
      }
    })
    
    if (!response.ok) {
      console.error('Failed to fetch WalletPush analytics:', response.status)
      return {
        passesCreated: 0,
        passesInstalled: 0,
        offersClaimed: 0,
        offersRedeemed: 0,
        recentActivity: []
      }
    }
    
    const data = await response.json()
    
    // Fetch recent activity
    const activityUrl = `https://app2.walletpush.io/api/v1/templates/${MOBILE_WALLET_TEMPLATE_ID}/activity`
    
    const activityResponse = await fetch(activityUrl, {
      method: 'GET',
      headers: {
        'Authorization': MOBILE_WALLET_APP_KEY,
        'Content-Type': 'application/json',
      }
    })
    
    let recentActivity = []
    if (activityResponse.ok) {
      const activityData = await activityResponse.json()
      recentActivity = (activityData.activities || []).map((activity: any) => ({
        type: activity.type || 'pass_installed',
        user_name: activity.user_name || 'Anonymous User',
        timestamp: activity.timestamp || new Date().toISOString(),
        details: activity.details
      }))
    }
    
    return {
      passesCreated: data.passes_created || 0,
      passesInstalled: data.passes_installed || 0,
      offersClaimed: data.offers_claimed || 0,
      offersRedeemed: data.offers_redeemed || 0,
      recentActivity: recentActivity.slice(0, 10) // Latest 10 activities
    }
    
  } catch (error) {
    console.error('Error fetching WalletPush analytics:', error)
    return {
      passesCreated: 0,
      passesInstalled: 0,
      offersClaimed: 0,
      offersRedeemed: 0,
      recentActivity: []
    }
  }
}

// City-specific analytics mapping
const CITY_TEMPLATE_MAPPING = {
  'bournemouth': process.env.MOBILE_WALLET_TEMPLATE_ID,
  'calgary': process.env.CALGARY_WALLET_TEMPLATE_ID,
  'london': process.env.LONDON_WALLET_TEMPLATE_ID,
  'paris': process.env.PARIS_WALLET_TEMPLATE_ID,
}

export async function getCitySpecificAnalytics(city: string): Promise<WalletPushAnalytics> {
  const templateId = CITY_TEMPLATE_MAPPING[city as keyof typeof CITY_TEMPLATE_MAPPING]
  
  if (!templateId) {
    console.warn(`No template ID configured for city: ${city}`)
    return {
      passesCreated: 0,
      passesInstalled: 0,
      offersClaimed: 0,
      offersRedeemed: 0,
      recentActivity: []
    }
  }
  
  // Use city-specific template ID for analytics
  return getWalletPushAnalytics(city)
}
