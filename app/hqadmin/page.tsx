import { redirect } from 'next/navigation'

export default function HQAdminPage() {
  // For now, redirect to franchises
  // Later, this can be a proper dashboard with KPIs
  redirect('/hqadmin/franchises')
}

