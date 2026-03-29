import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HQAdminShell } from '@/components/hqadmin/hq-admin-shell'

export const metadata = {
  title: 'QWIKKER HQ',
  description: 'Platform control plane'
}

export default async function HQAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/hq-login')
  }
  
  const { data: hqAdmin } = await supabase
    .from('hq_admins')
    .select('user_id, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  
  if (!hqAdmin) {
    await supabase.auth.signOut()
    redirect('/hq-login?error=access_denied')
  }
  
  return (
    <HQAdminShell userEmail={user.email || 'Admin'}>
      {children}
    </HQAdminShell>
  )
}
