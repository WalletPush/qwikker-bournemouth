import { UserPageSkeleton } from '@/components/user/user-page-skeleton'

export default function DashboardLoading() {
  return (
    <UserPageSkeleton activeTabId="nearby" label="Loading Nearby" variant="feed" />
  )
}
