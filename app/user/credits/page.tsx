import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserCreditsPage } from '@/components/user/user-credits-page'

export default function CreditsPage() {
  return (
    <UserDashboardLayout>
      <UserCreditsPage />
    </UserDashboardLayout>
  )
}
