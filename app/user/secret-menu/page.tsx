import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserSecretMenuPage } from '@/components/user/user-secret-menu-page'

export default function SecretMenuPage() {
  return (
    <UserDashboardLayout>
      <UserSecretMenuPage />
    </UserDashboardLayout>
  )
}
