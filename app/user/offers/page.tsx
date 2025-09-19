import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserOffersPage } from '@/components/user/user-offers-page'
import { createClient } from '@/lib/supabase/server'

export default async function OffersPage() {
  const supabase = await createClient()
  
  // Fetch approved businesses with offers
  const { data: approvedBusinesses, error } = await supabase
    .from('business_profiles')
    .select(`
      id,
      business_name,
      business_type,
      business_category,
      business_town,
      business_address,
      business_tagline,
      business_description,
      business_hours,
      business_images,
      logo,
      offer_name,
      offer_type,
      offer_value,
      offer_terms,
      offer_start_date,
      offer_end_date,
      offer_image,
      rating,
      review_count,
      created_at
    `)
    .eq('status', 'approved')
    .not('offer_name', 'is', null) // Only businesses with offers
    .not('business_name', 'is', null)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching businesses with offers:', error)
  }
  
  // Transform real offers to match expected format
  const realOffers = (approvedBusinesses || []).map(business => ({
    id: `${business.id}-offer`,
    businessId: business.id,
    businessName: business.business_name,
    businessCategory: business.business_category,
    businessLogo: business.logo,
    businessRating: business.rating || 4.5,
    title: business.offer_name,
    description: business.offer_terms || `${business.offer_type} offer from ${business.business_name}`,
    type: business.offer_type?.toLowerCase().replace(' ', '_') || 'discount',
    value: business.offer_value,
    originalPrice: null, // Real offers don't have original price tracking yet
    discountedPrice: null,
    image: business.offer_image || business.business_images?.[0] || business.logo,
    isPopular: business.rating > 4.0,
    isEndingSoon: business.offer_end_date ? new Date(business.offer_end_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : false,
    validUntil: business.offer_end_date ? new Date(business.offer_end_date).toLocaleDateString() : null,
    termsAndConditions: business.offer_terms || 'Standard terms and conditions apply.',
    businessAddress: business.business_address,
    businessTown: business.business_town,
    businessHours: business.business_hours
  }))
  
  return (
    <UserDashboardLayout>
      <UserOffersPage realOffers={realOffers} />
    </UserDashboardLayout>
  )
}
