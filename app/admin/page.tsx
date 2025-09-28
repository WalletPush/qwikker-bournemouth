import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { getCityFromRequest, getCityDisplayName } from '@/lib/utils/city-detection'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { getBusinessCRMData } from '@/lib/actions/admin-crm-actions'

export default async function AdminPage() {
  // Get city from URL subdomain
  const headersList = await headers()
  const currentCity = getCityFromRequest(headersList)
  
  // Check for admin session cookie
  const cookieStore = await cookies()
  const adminSessionCookie = cookieStore.get('qwikker_admin_session')

  if (!adminSessionCookie?.value) {
    redirect('/admin/login')
  }

  let adminSession
  try {
    adminSession = JSON.parse(adminSessionCookie.value)
  } catch {
    redirect('/admin/login')
  }

  // Verify admin exists and has access to this city
  const admin = await getAdminById(adminSession.adminId)
  const hasAccess = await isAdminForCity(adminSession.adminId, currentCity)
  
  if (!admin || !hasAccess) {
    redirect('/admin/login')
  }
  
  // 🔥 ADMIN: Use admin client to see ALL businesses (bypasses RLS)
  const supabase = createAdminClient()
  
  // Fetch business profiles for this franchise (covers multiple cities)
  // Use hardcoded mapping for now to ensure businesses show up
  const legacyMapping: Record<string, string[]> = {
    'bournemouth': ['bournemouth', 'christchurch', 'poole'],
    'calgary': ['calgary'],
    'london': ['london'],
  }
  const coveredCities = legacyMapping[currentCity.toLowerCase()] || [currentCity.toLowerCase()]
  console.log(`🏢 Admin Page for ${currentCity} covering cities:`, coveredCities)

  const { data: allBusinesses, error: businessError } = await supabase
    .from('business_profiles')
    .select(`
      id,
      user_id,
      city,
      business_name,
      email,
      first_name,
      last_name,
      business_type,
      business_category,
      business_town,
      business_address,
      business_postcode,
      phone,
      logo,
      business_tagline,
      business_description,
      business_hours,
      business_hours_structured,
      website_url,
      instagram_handle,
      facebook_url,
      offer_name,
      offer_type,
      offer_value,
      offer_terms,
      offer_image,
      offer_start_date,
      offer_end_date,
      offer_claim_amount,
      menu_url,
      business_images,
      menu_preview,
      additional_notes,
      admin_notes,
      status,
      approved_at,
      profile_completion_percentage,
      business_tier,
      created_at,
      updated_at
    `)
    .in('business_town', coveredCities) // Use franchise-aware filtering
    .not('email', 'is', null)
    .order('created_at', { ascending: false })
  
  if (businessError) {
    console.error('Error fetching businesses:', businessError)
  }

  // Fetch pending changes count for navigation
  const { count: pendingChangesCount, error: changesError } = await supabase
    .from('business_changes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .in('business_id', (allBusinesses || []).map(b => b.id))

  if (changesError) {
    console.error('Error fetching pending changes count:', changesError)
  }

  // Fetch actual pending changes for the updates tab
  const { data: pendingChanges, error: changesDataError } = await supabase
    .from('business_changes')
    .select(`
      *,
      business:business_id (
        business_name,
        first_name,
        last_name,
        email,
        logo
      )
    `)
    .eq('status', 'pending')
    .in('business_id', (allBusinesses || []).map(b => b.id))
    .order('submitted_at', { ascending: false })

  if (changesDataError) {
    console.error('Error fetching pending changes data:', changesDataError)
  }
  
  // Fetch comprehensive CRM data
  const crmData = await getBusinessCRMData(currentCity)
  
  return (
    <AdminDashboard 
      businesses={allBusinesses || []} 
      crmData={crmData}
      adminEmail={admin.email || admin.username} 
      city={currentCity}
      cityDisplayName={getCityDisplayName(currentCity)}
      pendingChangesCount={pendingChangesCount || 0}
      pendingChanges={pendingChanges || []}
    />
  )
}
