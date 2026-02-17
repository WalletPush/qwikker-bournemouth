import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ContactCentreClient } from '@/components/dashboard/contact-centre-client'
import { calculateActionItemsCount } from '@/lib/utils/action-items-count'

export default async function ContactCentrePage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', data.claims.sub)
    .single()

  const actionItemsCount = calculateActionItemsCount(profile)

  return (
    <DashboardLayout currentSection="contact-centre" profile={profile} actionItemsCount={actionItemsCount}>
      <ContactCentreClient />
    </DashboardLayout>
  )
}
