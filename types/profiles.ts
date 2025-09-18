// Profile-related types for extended user data

// Menu preview item structure for featured menu items
export interface MenuPreviewItem {
  name: string;
  price: string;
  description: string;
}

export interface Profile {
  id: string;
  user_id: string;
  
  // Personal information
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  
  // Marketing and goals
  referral_source: ReferralSource | null;
  goals: UserGoal | null;
  notes: string | null;
  additional_notes: string | null;
  
  // Business information
  business_name: string | null;
  business_type: BusinessType | null;
  business_category: string | null;
  business_address: string | null;
  business_town: BusinessTown | null;
  business_postcode: string | null;
  
  // Online presence
  website_url: string | null;
  instagram_handle: string | null;
  facebook_url: string | null;
  logo: string | null; // URL to uploaded logo
  menu_url: string | null; // URL to uploaded menu/price list PDF
  
  // Offer data
  offer_name: string | null;
  offer_type: OfferType | null;
  offer_value: string | null;
  offer_claim_amount: OfferClaimAmount | null;
  offer_start_date: string | null; // ISO date string
  offer_end_date: string | null; // ISO date string
  offer_terms: string | null;
  offer_image: string | null; // URL to uploaded offer image
  
  // Plan and billing
  plan: SubscriptionPlan;
  trial_expiry: string | null; // ISO timestamp
  is_founder: boolean;
  
  // Admin approval workflow
  status: ProfileStatus;
  admin_notes: string | null;
  approved_by: string | null; // UUID of admin who approved
  approved_at: string | null; // ISO timestamp
  
  // Business display fields for user dashboard
  business_hours: string | null;
  business_tagline: string | null;
  business_description: string | null;
  business_images: string[] | null; // Array of image URLs
  menu_preview: MenuPreviewItem[] | null; // Array of featured menu items for quick display
  business_tier: BusinessTier;
  rating: number;
  review_count: number;
  profile_completion_percentage: number;
  
  // Referral system
  referral_code: string | null; // Unique referral code for this user
  referred_by: string | null; // Profile ID of who referred this user
  
  // QWIKKER status
  qwikker_status: QwikkerStatus | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Enum types for dropdowns
export type ReferralSource = 
  | 'google_search'
  | 'social_media'
  | 'word_of_mouth'
  | 'advertising'
  | 'partner_referral'
  | 'other';

export type UserGoal = 
  | 'increase_customers'
  | 'improve_marketing'
  | 'boost_sales'
  | 'build_brand_awareness'
  | 'customer_retention'
  | 'expand_business'
  | 'other';

export type BusinessType = 
  | 'bar'
  | 'cafe'
  | 'restaurant'
  | 'salon'
  | 'spa'
  | 'gym'
  | 'retail_shop'
  | 'hotel'
  | 'service_business'
  | 'other';

export type BusinessTown = 
  | 'bournemouth'
  | 'poole'
  | 'christchurch'
  | 'wimborne'
  | 'ferndown'
  | 'ringwood'
  | 'new_milton'
  | 'other';

export type OfferType = 
  | 'discount'
  | 'two_for_one'
  | 'freebie'
  | 'buy_x_get_y'
  | 'percentage_off'
  | 'fixed_amount_off'
  | 'other';

export type OfferClaimAmount = 
  | 'single'
  | 'multiple';

export type SubscriptionPlan = 
  | 'starter'
  | 'featured'
  | 'spotlight'
  | 'pro';

export type QwikkerStatus = 
  | 'pending'    // Orange - submitted but not yet reviewed/live
  | 'live'       // Green - approved and live on QWIKKER database  
  | 'not_live';  // Red - rejected or removed from database

// Form types for creating/updating profiles
export interface CreateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  referral_source?: ReferralSource;
  goals?: UserGoal;
  notes?: string;
  business_name?: string;
  business_type?: BusinessType;
  business_category?: string;
  business_address?: string;
  business_town?: BusinessTown;
  business_postcode?: string;
  website_url?: string;
  instagram_handle?: string;
  facebook_url?: string;
  offer_name?: string;
  offer_type?: OfferType;
  offer_value?: string;
  offer_claim_amount?: OfferClaimAmount;
  offer_start_date?: string;
  offer_end_date?: string;
  offer_terms?: string;
}

export interface UpdateProfileRequest extends Partial<CreateProfileRequest> {
  id: string;
}

// Dropdown option types for forms
export interface DropdownOption<T = string> {
  value: T;
  label: string;
}

// Constants for dropdown options
export const REFERRAL_SOURCE_OPTIONS: DropdownOption<ReferralSource>[] = [
  { value: 'google_search', label: 'Google Search' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'word_of_mouth', label: 'Word of Mouth' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'partner_referral', label: 'Partner Referral' },
  { value: 'other', label: 'Other' },
];

export const USER_GOAL_OPTIONS: DropdownOption<UserGoal>[] = [
  { value: 'increase_customers', label: 'Increase Customers' },
  { value: 'improve_marketing', label: 'Improve Marketing' },
  { value: 'boost_sales', label: 'Boost Sales' },
  { value: 'build_brand_awareness', label: 'Build Brand Awareness' },
  { value: 'customer_retention', label: 'Customer Retention' },
  { value: 'expand_business', label: 'Expand Business' },
  { value: 'other', label: 'Other' },
];

export const BUSINESS_TYPE_OPTIONS: DropdownOption<BusinessType>[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'cafe', label: 'Café' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'salon', label: 'Salon' },
  { value: 'spa', label: 'Spa' },
  { value: 'gym', label: 'Gym' },
  { value: 'retail_shop', label: 'Retail Shop' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'service_business', label: 'Service Business' },
  { value: 'other', label: 'Other' },
];

export const BUSINESS_TOWN_OPTIONS: DropdownOption<BusinessTown>[] = [
  { value: 'bournemouth', label: 'Bournemouth' },
  { value: 'poole', label: 'Poole' },
  { value: 'christchurch', label: 'Christchurch' },
  { value: 'wimborne', label: 'Wimborne' },
  { value: 'ferndown', label: 'Ferndown' },
  { value: 'ringwood', label: 'Ringwood' },
  { value: 'new_milton', label: 'New Milton' },
  { value: 'other', label: 'Other' },
];

export const OFFER_TYPE_OPTIONS: DropdownOption<OfferType>[] = [
  { value: 'discount', label: 'Discount' },
  { value: 'two_for_one', label: '2-for-1' },
  { value: 'freebie', label: 'Freebie' },
  { value: 'buy_x_get_y', label: 'Buy X Get Y' },
  { value: 'percentage_off', label: 'Percentage Off' },
  { value: 'fixed_amount_off', label: 'Fixed Amount Off' },
  { value: 'other', label: 'Other' },
];

export const OFFER_CLAIM_AMOUNT_OPTIONS: DropdownOption<OfferClaimAmount>[] = [
  { value: 'single', label: 'Single Use' },
  { value: 'multiple', label: 'Multiple Use' },
];

export const SUBSCRIPTION_PLAN_OPTIONS: DropdownOption<SubscriptionPlan>[] = [
  { value: 'starter', label: 'Starter' },
  { value: 'spotlight', label: 'Spotlight' },
  { value: 'pro', label: 'Pro' },
];

export type ProfileStatus = 
  | 'incomplete'
  | 'pending_review'
  | 'approved'
  | 'rejected'
;

export type BusinessTier = 
  | 'qwikker_picks'
  | 'featured'
  | 'recommended'
;

export const PROFILE_STATUS_OPTIONS: DropdownOption<ProfileStatus>[] = [
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export const BUSINESS_TIER_OPTIONS: DropdownOption<BusinessTier>[] = [
  { value: 'qwikker_picks', label: 'Qwikker Picks' },
  { value: 'featured', label: 'Featured' },
  { value: 'recommended', label: 'Recommended' },
];
