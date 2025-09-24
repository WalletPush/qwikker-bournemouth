import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserSettingsPage } from '@/components/user/user-settings-page'

interface SettingsPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedSearchParams = await searchParams
  const walletPassId = resolvedSearchParams.wallet_pass_id
  
  return (
    <UserDashboardLayout 
      currentSection="settings"
      walletPassId={walletPassId}
    >
      <UserSettingsPage />
    </UserDashboardLayout>
  )
}
