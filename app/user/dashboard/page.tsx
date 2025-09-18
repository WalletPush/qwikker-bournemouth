import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserDashboardHome } from '@/components/user/user-dashboard-home'
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "QWIKKER - User Dashboard",
  description: "Discover amazing local businesses, exclusive offers, and secret menus in Bournemouth",
}

export default function UserDashboardPage() {
  return (
    <UserDashboardLayout currentSection="dashboard">
      <UserDashboardHome />
    </UserDashboardLayout>
  )
}
