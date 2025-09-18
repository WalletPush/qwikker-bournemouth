import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserSettingsPage } from '@/components/user/user-settings-page'

export default function SettingsPage() {
  return (
    <UserDashboardLayout>
      <UserSettingsPage />
    </UserDashboardLayout>
  )
}
