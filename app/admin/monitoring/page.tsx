import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminMonitoringDashboard } from '@/components/admin/admin-monitoring-dashboard'

export default async function AdminMonitoringPage() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }

  // Check if user is admin
  const adminEmails = [
    'admin@qwikker.com',
    'admin@walletpush.io',
    'freespiritfamilies@gmail.com' // TEMPORARY: For testing
  ]
  const isAdmin = user.email && adminEmails.includes(user.email)
  
  if (!isAdmin) {
    redirect('/dashboard')
  }

  return <AdminMonitoringDashboard />
}

