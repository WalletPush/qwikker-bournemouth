import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserBusinessDetailPage } from '@/components/user/user-business-detail-page'
import { createClient } from '@/lib/supabase/server'
import { mockBusinesses } from '@/lib/mock-data/user-mock-data'

interface BusinessDetailPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function BusinessDetailPage({ params }: BusinessDetailPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  
  // Fetch approved businesses from database
  const { data: approvedBusinesses, error } = await supabase
    .from('profiles')
    .select(`
      id,
      business_name,
      business_type,
      business_category,
      business_town,
      business_address,
      business_tagline,
      business_description,
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
      created_at
    `)
    .eq('status', 'approved')
    .not('business_name', 'is', null)
  
  // Transform real businesses to match expected format
  const realBusinesses = (approvedBusinesses || []).map(business => ({
    id: business.id,
    name: business.business_name,
    category: business.business_category || business.business_type,
    location: business.business_town,
    address: business.business_address,
    tagline: business.business_tagline || '',
    description: business.business_description || '',
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
    distance: (Math.random() * 2 + 0.1).toFixed(1),
    activeOffers: business.offer_name ? 1 : 0,
    menuPreview: business.menu_preview || [], // Add menu preview for popular items
    hasSecretMenu: false, // Real businesses don't have secret menu yet
    tier: business.plan === 'spotlight' ? 'qwikker_picks' : business.plan === 'featured' ? 'featured' : 'recommended'
  }))
  
  // Combine real and mock businesses
  const allBusinesses = [...realBusinesses, ...mockBusinesses]
  
  return (
    <UserDashboardLayout>
      <UserBusinessDetailPage slug={slug} businesses={allBusinesses} />
    </UserDashboardLayout>
  )
}
