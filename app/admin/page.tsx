import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { getCityFromRequest, getCityDisplayName } from '@/lib/utils/city-detection'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'

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
  
  // Create Supabase client for data fetching
  const supabase = await createClient()
  
  // Fetch business profiles for this city only
  const { data: allBusinesses, error: businessError } = await supabase
    .from('profiles')
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
      offer_name,
      offer_type,
      offer_value,
      offer_terms,
      menu_url,
      business_images,
      menu_preview,
      status,
      created_at,
      updated_at
    `)
    .eq('city', currentCity) // Only show businesses for this city
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
  
  return (
    <AdminDashboard 
      businesses={allBusinesses || []} 
      adminEmail={admin.email || admin.username} 
      city={currentCity}
      cityDisplayName={getCityDisplayName(currentCity)}
      pendingChangesCount={pendingChangesCount || 0}
      pendingChanges={pendingChanges || []}
    />
  )
}
