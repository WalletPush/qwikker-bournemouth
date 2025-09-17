import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserDashboardHome } from '@/components/user/user-dashboard-home'

export default function UserDashboardPage() {
  return (
    <UserDashboardLayout currentSection="dashboard">
      <UserDashboardHome />
    </UserDashboardLayout>
  )
}
