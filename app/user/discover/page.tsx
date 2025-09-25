import { createServiceRoleClient } from '@/lib/supabase/server'
import { UserDiscoverPage } from '@/components/user/user-discover-page'
import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { mockBusinesses } from '@/lib/mock-data/user-mock-data'
import { formatBusinessHours } from '@/lib/utils/business-hours-formatter'
import { getWalletPassCookie } from '@/lib/utils/wallet-session'

interface DiscoverPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const supabase = createServiceRoleClient()
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
      plan,
      rating,
      review_count,
      additional_notes,
      created_at
    `)
    .eq('status', 'approved')
    .not('business_name', 'is', null)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching businesses:', error)
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
      location: business.business_town,
      address: business.business_address,
      tagline: business.business_tagline || '',
      description: business.business_description || '',
      hours: formatBusinessHours(business.business_hours, business.business_hours_structured), // For cards
      fullSchedule: formatBusinessHours(business.business_hours, business.business_hours_structured, true), // For hero view
      images: business.business_images || ['/placeholder-business.jpg'],
      logo: business.logo || '/placeholder-logo.jpg',
      slug: business.business_name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || business.id,
      offers: business.offer_name ? [{
        id: `${business.id}-offer`,
        title: business.offer_name,
        type: business.offer_type,
        value: business.offer_value,
        image: business.offer_image
      }] : [],
      plan: business.plan || 'starter',
      rating: business.rating || 4.5,
      reviewCount: business.review_count || Math.floor(Math.random() * 50) + 10,
      tags: [
        business.business_category,
        business.business_type,
        business.business_town
      ].filter(Boolean),
      distance: (Math.random() * 2 + 0.1).toFixed(1), // Random distance for demo
      activeOffers: business.offer_name ? 1 : 0,
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
    >
      <UserDiscoverPage businesses={allBusinesses} walletPassId={walletPassId} />
    </UserDashboardLayout>
  )
}