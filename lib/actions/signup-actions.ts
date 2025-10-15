'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { uploadToCloudinary } from '@/lib/integrations'
import { getCurrentLocation, mapTownToCity } from '@/lib/utils/location-detection'
import { validateBusinessProfile } from '@/lib/utils/business-validation'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
// import { sendWelcomeEmail } from '@/lib/email/send-welcome-email' // Disabled until domain verification

interface SignupData {
  // Personal info
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  
  // Business info
  businessName: string
  businessType: string
  businessCategory: string
  businessAddress: string
  town: string
  postcode: string
  
  // Optional fields
  website?: string
  instagram?: string
  facebook?: string
  
  // Offer data
  offerName?: string
  offerType?: string
  offerValue?: string
  claimAmount?: string
  startDate?: string
  endDate?: string
  terms?: string
  
  // Other
  referralSource?: string
  goals?: string
  notes?: string
}

export async function createUserAndProfile(formData: SignupData, files: { logo?: File, menu?: File[], offer?: File }, referralCode?: string, urlLocation?: string) {
  const supabaseAdmin = createAdminClient()
  
  try {
    // 0. Detect current location from subdomain/IP
    const headersList = await headers()
    const hostname = headersList.get('host') || 'localhost:3000'
    const devLocationOverride = process.env.DEV_LOCATION_OVERRIDE // e.g., 'london', 'manchester'
    const locationInfo = await getCurrentLocation(hostname, devLocationOverride, urlLocation)
    
    console.log(`🌍 Detected location: ${locationInfo.displayName} (${locationInfo.city}) from hostname: ${hostname}${devLocationOverride ? ` [ENV: ${devLocationOverride}]` : ''}${urlLocation ? ` [URL: ${urlLocation}]` : ''}`)
    // 1. Create user in auth.users using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true, // Auto-confirm email so users can login immediately
      user_metadata: {
        first_name: formData.firstName,
        last_name: formData.lastName,
      }
    })

    if (authError || !authData.user) {
      console.error('Auth user creation failed:', authError)
      throw new Error(`Account creation failed: ${authError?.message || 'Unknown error'}`)
    }

    console.log('Auth user created:', authData.user.id)

    // 2. Upload files to Cloudinary
    let logoUrl = ''
    let menuUrls: string[] = []
    let offerImageUrl = ''

    if (files.logo) {
      logoUrl = await uploadToCloudinary(files.logo, 'qwikker/logos')
    }
    
    if (files.menu && files.menu.length > 0) {
      menuUrls = await Promise.all(
        files.menu.map(file => uploadToCloudinary(file, 'qwikker/menus'))
      )
    }
    
    if (files.offer) {
      offerImageUrl = await uploadToCloudinary(files.offer, 'qwikker/offers')
    }

    // 3. Prepare profile data
    const normalizePhoneNumber = (phone: string): string => {
      const cleaned = phone.trim()
      if (cleaned.startsWith('0')) {
        return '+44' + cleaned.slice(1)
      }
      return cleaned
    }

    const mapReferralSource = (source: string) => {
      if (!source) return null
      const mapping: Record<string, string> = {
        'founding-member': 'partner_referral',
        'business-referral': 'partner_referral', 
        'google-search': 'google_search',
        'social-media': 'social_media',
        'word-of-mouth': 'word_of_mouth',
        'other': 'other'
      }
      return mapping[source] || 'other'
    }

    const mapGoals = (goals: string) => {
      if (!goals || goals.trim() === '') return null
      
      // Map common phrases to database values
      const lowerGoals = goals.toLowerCase()
      if (lowerGoals.includes('customer') && (lowerGoals.includes('new') || lowerGoals.includes('more') || lowerGoals.includes('attract'))) {
        return 'increase_customers'
      }
      if (lowerGoals.includes('marketing') || lowerGoals.includes('advertis') || lowerGoals.includes('promot')) {
        return 'improve_marketing'
      }
      if (lowerGoals.includes('sales') || lowerGoals.includes('revenue') || lowerGoals.includes('income')) {
        return 'boost_sales'
      }
      if (lowerGoals.includes('brand') || lowerGoals.includes('awareness') || lowerGoals.includes('recognition')) {
        return 'build_brand_awareness'
      }
      if (lowerGoals.includes('retention') || lowerGoals.includes('keep') || lowerGoals.includes('loyal')) {
        return 'customer_retention'
      }
      if (lowerGoals.includes('expand') || lowerGoals.includes('grow') || lowerGoals.includes('bigger')) {
        return 'expand_business'
      }
      
      // Default to 'other' for anything that doesn't match
      return 'other'
    }

    const mapBusinessType = (type: string) => {
      const mapping: Record<string, string> = {
        'Restaurant': 'restaurant',
        'Cafe/Coffee Shop': 'cafe',
        'Bar/Pub': 'bar',
        'Dessert/Ice Cream': 'restaurant', // closest match
        'Takeaway/Street Food': 'restaurant',
        'Salon/Spa': 'salon',
        'Hairdresser/Barber': 'salon',
        'Tattoo/Piercing': 'salon',
        'Clothing/Fashion': 'retail_shop',
        'Gift Shop': 'retail_shop',
        'Fitness/Gym': 'gym',
        'Sports/Outdoors': 'gym',
        'Hotel/BnB': 'hotel',
        'Venue/Event Space': 'hotel',
        'Entertainment/Attractions': 'other',
        'Professional Services': 'service_business',
        'Other': 'other'
      }
      return mapping[type] || 'other'
    }

    const mapBusinessTown = (town: string) => {
      const cleanTown = town.toLowerCase().trim()
      const mapping: Record<string, string> = {
        'bournemouth': 'bournemouth',
        'poole': 'poole', 
        'christchurch': 'christchurch',
        'wimborne': 'wimborne',
        'ferndown': 'ferndown',
        'ringwood': 'ringwood',
        'new milton': 'new_milton',
        'newmilton': 'new_milton'
      }
      return mapping[cleanTown] || 'other'
    }

    const mapOfferType = (type: string) => {
      if (!type) return null
      const mapping: Record<string, string> = {
        'percentage': 'percentage_off',
        'fixed': 'fixed_amount_off',
        'bogo': 'two_for_one',
        'free-item': 'freebie',
        'bundle': 'other',
        'other': 'other'
      }
      return mapping[type] || 'other'
    }

    const mapClaimAmount = (amount: string) => {
      if (!amount) return null
      const mapping: Record<string, string> = {
        'first_10': 'first_10',
        'first_25': 'first_25', 
        'first_50': 'first_50',
        'first_100': 'first_100',
        'unlimited': 'unlimited',
        'custom': 'custom'
      }
      return mapping[amount] || 'unlimited'
    }

    const profileData = {
      user_id: authData.user.id,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: normalizePhoneNumber(formData.phone),
      business_name: formData.businessName,
      business_type: mapBusinessType(formData.businessType),
      business_category: formData.businessCategory,
      business_address: formData.businessAddress,
      business_town: mapBusinessTown(formData.town),
      business_postcode: formData.postcode,
      website_url: formData.website || null,
      instagram_handle: formData.instagram || null,
      facebook_url: formData.facebook || null,
      logo: logoUrl || null,
      menu_url: menuUrls.length > 0 ? menuUrls[0] : null, // Fix: Use first menu URL
      offer_name: formData.offerName || null,
      offer_type: mapOfferType(formData.offerType || ''),
      offer_value: formData.offerValue || null,
      offer_claim_amount: mapClaimAmount(formData.claimAmount || ''),
      offer_start_date: formData.startDate || null,
      offer_end_date: formData.endDate || null,
      offer_terms: formData.terms || null,
      offer_image: offerImageUrl || null,
      referral_source: mapReferralSource(formData.referralSource || ''),
      goals: mapGoals(formData.goals || ''),
      notes: formData.notes || null,
      plan: 'featured', // Free trial users get Featured plan access during 120-day trial
      is_founder: new Date() < new Date('2025-12-31'),
      city: locationInfo.city, // SECURITY: Use validated franchise city from request, not Google Places
      status: 'incomplete', // Fix: Add default status
      profile_completion_percentage: 25, // Fix: Add default completion percentage
      business_tier: 'free_trial', // Fix: Add correct business tier for onboarding
      rating: 0, // Fix: Add default rating
      review_count: 0, // Fix: Add default review count
    }

    // SECURITY: Validate business profile data server-side
    const validatedProfileData = await validateBusinessProfile(profileData)

    // 4. Create profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .insert(validatedProfileData)
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation failed:', profileError)
      throw new Error(`Profile creation failed: ${profileError.message}`)
    }

    console.log('Profile created:', profile.id)

    // 5. Track referral if provided
    if (referralCode) {
      try {
        const { trackReferral } = await import('@/lib/actions/referral-actions')
        await trackReferral(referralCode, authData.user.id)
      } catch (error) {
        console.error('Referral tracking failed (non-critical):', error)
      }
    }

           // Send welcome email (disabled until domain verification)
           // sendWelcomeEmail({
           //   firstName: formData.firstName,
           //   lastName: formData.lastName,
           //   email: formData.email,
           //   businessName: formData.businessName,
           //   profile: profile
           // }).catch(error => {
           //   console.error('Welcome email failed (non-blocking):', error)
           // })
    
    // 7. Auto-login the user after successful signup
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })
      
      if (signInError) {
        console.error('Auto-login failed:', signInError)
        // Don't fail the entire signup, just redirect to login with email pre-filled
        return {
          success: true,
          user: authData.user,
          profile: profile,
          autoLoginFailed: true,
          redirectTo: `/auth/login?email=${encodeURIComponent(formData.email)}&message=account-created`
        }
      }
      
      console.log('✅ Auto-login successful for:', formData.email)
      
      // Successful auto-login - redirect to dashboard
      return {
        success: true,
        user: authData.user,
        profile: profile,
        autoLoginSuccess: true,
        redirectTo: '/dashboard?welcome=true'
      }
      
    } catch (autoLoginError) {
      console.error('Auto-login error:', autoLoginError)
      // Don't fail the entire signup, just redirect to login
      return {
        success: true,
        user: authData.user,
        profile: profile,
        autoLoginFailed: true,
        redirectTo: `/auth/login?email=${encodeURIComponent(formData.email)}&message=account-created`
      }
    }

  } catch (error) {
    console.error('Signup process failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
