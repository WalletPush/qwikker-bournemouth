import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/admin/admin-dashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }
  
  // Check if user is admin - must be specific admin emails only
  const adminEmails = [
    'admin@qwikker.com',
    'admin@walletpush.io'
  ]
  
  const isAdmin = user.email && adminEmails.includes(user.email)
  
  // TEMPORARY: Allow any authenticated user for testing (REMOVE IN PRODUCTION)
  const tempAllowAll = true
  
  if (!isAdmin && !tempAllowAll) {
    redirect('/dashboard')
  }
  
  // Fetch ONLY complete business profiles from Supabase
  const { data: allBusinesses, error: businessError } = await supabase
    .from('profiles')
    .select(`
      id,
      user_id,
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
      status,
      created_at,
      updated_at
    `)
    .not('business_name', 'is', null)
    .not('business_category', 'is', null)
    .not('business_town', 'is', null)
    .order('created_at', { ascending: false })
  
  if (businessError) {
    console.error('Error fetching businesses:', businessError)
  }
  
  return (
    <AdminDashboard 
      businesses={allBusinesses || []} 
      adminEmail={user.email || ''} 
    />
  )
}
