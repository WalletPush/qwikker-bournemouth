import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserOffersPage } from '@/components/user/user-offers-page'

export default function OffersPage() {
  return (
    <UserDashboardLayout>
      <UserOffersPage />
    </UserDashboardLayout>
  )
}
