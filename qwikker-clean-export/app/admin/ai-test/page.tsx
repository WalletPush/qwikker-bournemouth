import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AITestPage } from '@/components/admin/ai-test-page'

export default async function AdminAITestPageRoute() {
  const supabase = createServerComponentClient({ cookies })
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/admin/login')
  }

  // Verify admin access
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.email !== 'admin@qwikker.com') {
    redirect('/admin/login')
  }

  return <AITestPage />
}
