import { createTenantAwareClient, getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { UserDiscoverPage } from '@/components/user/user-discover-page'
import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'

export const dynamic = 'force-dynamic'
import { mockBusinesses } from '@/lib/mock-data/user-mock-data'
import { formatBusinessHours } from '@/lib/utils/business-hours-formatter'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'
import { filterActiveOffers } from '@/lib/utils/offer-helpers'

interface DiscoverPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  // SECURITY: Validate franchise first
  let currentCity: string
  try {
    currentCity = await getSafeCurrentCity()
  } catch (error) {
    console.error('❌ Invalid franchise access:', error)
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-slate-400">Invalid franchise location detected.</p>
        </div>
      </div>
    )
  }

  // Use tenant-aware client instead of service role
  // SECURITY: Use tenant-aware client (no fallback to service role)
  const supabase = await createTenantAwareClient()

  const resolvedSearchParams = await searchParams
  const urlWalletPassId = resolvedSearchParams.wallet_pass_id
  
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
      console.log('No user found for discover page')
    }
  }
  
  // Fetch approved businesses only
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
      offer_image,
      menu_preview,
      rating,
      review_count,
      additional_notes,
      created_at,
      business_offers!left(
        id,
        offer_name,
        offer_type,
        offer_value,
        offer_image,
        status
      )
    `)
    .eq('status', 'approved')
    .eq('city', currentCity) // SECURITY: Filter by franchise city
    .not('business_name', 'is', null)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('❌ Error fetching businesses for discover page:', error, JSON.stringify(error))
  }
  
  // Transform real approved businesses to match the expected format
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
      images: business.business_images && business.business_images.length > 0 
        ? business.business_images 
        : [business.logo || '/placeholder-business.jpg'],
      logo: business.logo || '/placeholder-logo.jpg',
      slug: business.business_name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || business.id,
      offers: filterActiveOffers(business.business_offers || []).map(offer => ({
        id: offer.id,
        title: offer.offer_name,
        type: offer.offer_type,
        value: offer.offer_value,
        image: offer.offer_image
      })) || [],
      plan: business.plan || 'starter',
      rating: business.rating || 4.5,
      reviewCount: business.review_count || Math.floor(Math.random() * 50) + 10,
      tags: [
        business.business_category,
        business.business_type,
        business.business_town
      ].filter(Boolean),
      distance: (Math.random() * 2 + 0.1).toFixed(1), // Random distance for demo
      activeOffers: business.business_offers?.filter(offer => offer.status === 'approved')?.length || 0,
      menuPreview: business.menu_preview || [], // Add menu preview for popular items
      hasSecretMenu, // Now properly checks for real secret menu data
      tier: business.plan === 'spotlight' ? 'qwikker_picks' : business.plan === 'featured' ? 'featured' : 'recommended'
    }
  })
  
  // Combine real businesses with mock businesses for now
  const allBusinesses = [...realBusinesses, ...mockBusinesses]
  
  return (
    <UserDashboardLayout 
      currentSection="discover"
      walletPassId={walletPassId}
      currentUser={currentUser}
    >
      <UserDiscoverPage businesses={allBusinesses} walletPassId={walletPassId} />
    </UserDashboardLayout>
  )
}