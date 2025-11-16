// Types for comprehensive billing and subscription system

export interface SubscriptionTier {
  id: string
  tier_name: 'free' | 'starter' | 'featured' | 'spotlight'
  tier_display_name: string
  monthly_price: number
  yearly_price: number
  features: Record<string, any>
  is_active: boolean
  created_at: string
}

export interface BusinessSubscription {
  id: string
  business_id: string
  tier_id: string
  billing_cycle: 'monthly' | 'yearly'
  
  // Free trial tracking
  free_trial_start_date: string | null
  free_trial_end_date: string | null
  is_in_free_trial: boolean
  
  // Subscription dates
  subscription_start_date: string | null
  current_period_start: string | null
  current_period_end: string | null
  
  // Pricing and discounts
  base_price: number
  discounted_price: number | null
  lifetime_discount_percent: number
  has_lifetime_discount: boolean
  
  // Status
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'suspended'
  
  // Metadata
  upgraded_during_trial: boolean
  original_approval_date: string | null
  notes: string | null
  
  created_at: string
  updated_at: string
  
  // Relations
  tier?: SubscriptionTier
}

export interface BillingHistory {
  id: string
  business_id: string
  subscription_id: string
  
  // Payment details
  amount: number
  currency: string
  payment_method: string | null
  
  // Billing period
  billing_period_start: string | null
  billing_period_end: string | null
  
  // Status and metadata
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
  payment_date: string | null
  failure_reason: string | null
  external_payment_id: string | null
  
  // Invoice details
  invoice_number: string | null
  invoice_url: string | null
  
  created_at: string
}

export interface BillingAddress {
  line1: string
  line2?: string
  city: string
  postcode: string
  country: string
}

// Extended profile with billing info
export interface ProfileWithBilling {
  id: string
  business_name: string
  email: string
  current_subscription_id: string | null
  billing_email: string | null
  billing_address: BillingAddress | null
  payment_method_on_file: boolean
  last_payment_date: string | null
  next_billing_date: string | null
  
  // Relations
  current_subscription?: BusinessSubscription
  billing_history?: BillingHistory[]
}

// CRM card data structure
export interface BusinessCRMData {
  // Basic business info
  id: string
  user_id: string | null // Auth user ID (needed for subscription updates)
  business_name: string
  first_name: string | null
  last_name: string | null
  business_category: string
  business_type: string | null
  business_address: string
  business_town: string
  business_postcode: string
  email: string
  phone: string
  status: 'incomplete' | 'pending_review' | 'approved' | 'rejected'
  approved_at: string | null
  admin_notes: string | null
  
  // GHL sync tracking
  last_ghl_sync: string | null
  ghl_contact_id: string | null
  
  // Business assets
  logo: string | null
  
  // Subscription & billing
  subscription: BusinessSubscription | null
  tier: SubscriptionTier | null
  recent_payments: BillingHistory[]
  
  // Business details
  menu_url: string | null
  business_images: string[] | null
  business_menus?: Array<{
    id: string
    menu_name: string
    menu_type: string
    status: string
    uploaded_at: string
    admin_notes?: string
    menu_url?: string
  }> | null
  business_events?: Array<{
    id: string
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
    status: string
    created_at: string
  }> | null
  offer_name: string | null
  offer_type: string | null
  offer_image: string | null
  offer_start_date: string | null
  offer_end_date: string | null
  offer_terms: string | null
  secret_menu_items: Array<{
    itemName: string
    description?: string
    price?: string
    created_at: string
  }> | null
  
  // Trial calculations
  trial_days_remaining: number | null
  trial_status: 'active' | 'expired' | 'upgraded' | 'not_applicable'
  billing_starts_date: string | null // NOTE: This is actually trial END date (when they get hidden from users if no signup)
  
  // Recent activity
  last_updated: string
  has_pending_changes: boolean
  pending_changes_count: number
}

// Helper functions
export function calculateTrialStatus(subscription: BusinessSubscription | null): {
  trial_days_remaining: number | null
  trial_status: 'active' | 'expired' | 'upgraded' | 'not_applicable'
  billing_starts_date: string | null
} {
  if (!subscription || !subscription.is_in_free_trial) {
    return {
      trial_days_remaining: null,
      trial_status: 'not_applicable',
      billing_starts_date: null
    }
  }
  
  const now = new Date()
  const trialEnd = new Date(subscription.free_trial_end_date!)
  const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (subscription.upgraded_during_trial) {
    return {
      trial_days_remaining: daysRemaining > 0 ? daysRemaining : 0,
      trial_status: 'upgraded',
      billing_starts_date: subscription.free_trial_end_date
    }
  }
  
  if (daysRemaining <= 0) {
    return {
      trial_days_remaining: 0,
      trial_status: 'expired',
      billing_starts_date: subscription.free_trial_end_date
    }
  }
  
  return {
    trial_days_remaining: daysRemaining,
    trial_status: 'active',
    billing_starts_date: subscription.free_trial_end_date
  }
}

export function formatCurrency(amount: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

export function getSubscriptionDisplayText(subscription: BusinessSubscription | null, tier: SubscriptionTier | null): string {
  if (!subscription || !tier) return 'No subscription'
  
  if (subscription.is_in_free_trial) {
    const trialStatus = calculateTrialStatus(subscription)
    if (subscription.upgraded_during_trial) {
      return `${tier.tier_display_name} (Locked 20% off, starts after trial)`
    }
    return `Free Trial (${trialStatus.trial_days_remaining} days remaining)`
  }
  
  const price = subscription.discounted_price || subscription.base_price
  const cycle = subscription.billing_cycle
  const discount = subscription.has_lifetime_discount ? ' (20% off for life)' : ''
  
  return `${tier.tier_display_name} - ${formatCurrency(price)}/${cycle}${discount}`
}

export function getPaymentStatusColor(status: BillingHistory['status']): string {
  switch (status) {
    case 'paid': return 'text-green-400'
    case 'pending': return 'text-yellow-400'
    case 'failed': return 'text-red-400'
    case 'refunded': return 'text-blue-400'
    case 'cancelled': return 'text-gray-400'
    default: return 'text-gray-400'
  }
}

export function getSubscriptionStatusColor(status: BusinessSubscription['status']): string {
  switch (status) {
    case 'trial': return 'text-blue-400'
    case 'active': return 'text-green-400'
    case 'past_due': return 'text-yellow-400'
    case 'cancelled': return 'text-red-400'
    case 'suspended': return 'text-red-400'
    default: return 'text-gray-400'
  }
}
