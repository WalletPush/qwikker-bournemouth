import { createClient } from '@/lib/supabase/server'
import { UserDiscoverPage } from '@/components/user/user-discover-page'

export default async function DiscoverPage() {
  const supabase = await createClient()
  
  // Fetch approved businesses only
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
      plan,
      rating,
      review_count,
      created_at
    `)
    .eq('status', 'approved')
    .not('business_name', 'is', null)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching businesses:', error)
  }
  
  // Transform data to match the expected format
  const businesses = (approvedBusinesses || []).map(business => ({
    id: business.id,
    name: business.business_name,
    category: business.business_category || business.business_type,
    location: business.business_town,
    address: business.business_address,
    tagline: business.business_tagline || '',
    description: business.business_description || '',
    images: business.business_images || [],
    logo: business.logo,
    offers: business.offer_name ? [{
      id: `${business.id}-offer`,
      title: business.offer_name,
      type: business.offer_type,
      value: business.offer_value,
      image: business.offer_image
    }] : [],
    plan: business.plan || 'starter',
    rating: business.rating || 0,
    reviewCount: business.review_count || 0,
    tags: [
      business.business_category,
      business.business_type,
      business.business_town
    ].filter(Boolean)
  }))
  
  return <UserDiscoverPage businesses={businesses} />
}