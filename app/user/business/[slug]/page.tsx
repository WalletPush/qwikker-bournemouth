import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserBusinessDetailPage } from '@/components/user/user-business-detail-page'
import { createTenantAwareClient } from '@/lib/utils/tenant-security'

export const dynamic = 'force-dynamic'
import { mockBusinesses } from '@/lib/mock-data/user-mock-data'
import { formatBusinessHours } from '@/lib/utils/business-hours-formatter'
import { trackBusinessVisit } from '@/lib/actions/business-visit-actions'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'


interface BusinessDetailPageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function BusinessDetailPage({ params, searchParams }: BusinessDetailPageProps) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  
  // SECURITY: Validate franchise first
  const currentCity = await getSafeCurrentCity()
  const urlWalletPassId = resolvedSearchParams.wallet_pass_id
  
  // SECURITY: Use tenant-aware client (no service role fallback)
  const supabase = await createTenantAwareClient()
  
  // Get wallet pass ID from URL or cookie
  let cookieWalletPassId = null
  try {
    cookieWalletPassId = await getWalletPassCookie()
  } catch (error) {
    console.log('Cookie read error (safe to ignore):', error)
  }
  
  const walletPassId = urlWalletPassId || cookieWalletPassId || null
  
  // Get current user for the layout
  let currentUser = null
  if (walletPassId) {
    try {
      const { data: user } = await supabase
        .from('app_users')
        .select('*')
        .eq('wallet_pass_id', walletPassId)
        .eq('wallet_pass_status', 'active')
        .single()
      
      if (user) {
        currentUser = {
          id: user.id,
          wallet_pass_id: user.wallet_pass_id,
          name: user.name,
          email: user.email,
          city: user.city,
          tier: user.tier,
          level: user.level
        }
      }
    } catch (error) {
      console.log('No user found for business detail page')
    }
  }
  
  // Fetch approved businesses from database
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
      business_hours_structured,
      business_images,
      logo,
      offer_name,
      offer_type,
      offer_value,
      offer_terms,
      offer_start_date,
      offer_end_date,
      offer_image,
      menu_preview,
      plan,
      rating,
      review_count,
      additional_notes,
      created_at,
      business_offers!left(
        id,
        offer_name,
        offer_type,
        offer_value,
        offer_terms,
        offer_start_date,
        offer_end_date,
        offer_image,
        status
      )
    `)
    .eq('status', 'approved')
    .eq('city', currentCity) // SECURITY: Filter by franchise city
    .not('business_name', 'is', null)
  
  // Transform real businesses to match expected format
  const realBusinesses = (approvedBusinesses || []).map(business => {
    // Check if business has secret menu items
    let hasSecretMenu = false
    if (business.additional_notes) {
      try {
        const notes = JSON.parse(business.additional_notes)
        hasSecretMenu = notes.secret_menu_items && notes.secret_menu_items.length > 0
      } catch (e) {
        console.error('Error parsing additional_notes for business:', business.business_name, e)
        hasSecretMenu = false
      }
    }

    return {
      id: business.id,
      name: business.business_name,
      category: business.business_category || business.business_type,
      location: business.business_town, // Keep for display
      address: business.business_address,
      town: business.business_town, // Use actual business town for display
      tagline: business.business_tagline || '',
      description: business.business_description || '',
      hours: formatBusinessHours(business.business_hours, business.business_hours_structured), // For cards
      fullSchedule: formatBusinessHours(business.business_hours, business.business_hours_structured, true), // For hero view
      images: business.business_images || ['/placeholder-business.jpg'],
      logo: business.logo || '/placeholder-logo.jpg',
      slug: business.business_name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || business.id,
      offers: business.business_offers?.filter(offer => offer.status === 'approved').map(offer => ({
        id: offer.id,
        businessId: business.id,
        title: offer.offer_name,
        type: offer.offer_type,
        value: offer.offer_value,
        terms: offer.offer_terms || 'Terms and conditions apply',
        validUntil: offer.offer_end_date,
        expiryDate: offer.offer_end_date ? new Date(offer.offer_end_date).toLocaleDateString() : 'No expiry date',
        badge: offer.offer_value || 'OFFER',
        image: offer.offer_image || business.business_images?.[0]
      })) || [],
      plan: business.plan || 'starter',
      rating: business.rating || 4.5,
      reviewCount: business.review_count || Math.floor(Math.random() * 50) + 10,
      tags: [
        business.business_category,
        business.business_type,
        business.business_town
      ].filter(Boolean),
      distance: (Math.random() * 2 + 0.1).toFixed(1),
      activeOffers: business.business_offers?.filter(offer => offer.status === 'approved')?.length || 0,
      menuPreview: business.menu_preview || [], // Add menu preview for popular items
      hasSecretMenu, // Now properly checks for real secret menu data
      tier: business.plan === 'spotlight' ? 'qwikker_picks' : business.plan === 'featured' ? 'featured' : 'recommended'
    }
  })
  
  // Combine real and mock businesses
  const allBusinesses = [...realBusinesses, ...mockBusinesses]
  
  // Find the specific business being viewed
  const viewedBusiness = allBusinesses.find(business => business.slug === slug)
  
  // Get visitor info and business ID for client-side tracking
  let trackingData = null
  if (viewedBusiness && walletPassId) {
    // Try to find real business first, then fall back to mock business
    const realBusiness = realBusinesses.find(rb => rb.slug === slug)
    const businessId = realBusiness ? realBusiness.id : viewedBusiness.id
    
    trackingData = {
      businessId: businessId,
      visitorName: currentUser?.name || 'Anonymous User',
      visitorWalletPassId: walletPassId
    }
    
    console.log('🔍 Business visit tracking data:', trackingData)
  }
  
  return (
    <UserDashboardLayout currentSection="discover" currentUser={currentUser} walletPassId={walletPassId}>
      <UserBusinessDetailPage
        slug={slug}
        businesses={allBusinesses}
        walletPassId={walletPassId}
        trackingData={trackingData}
      />
    </UserDashboardLayout>
  )
}
