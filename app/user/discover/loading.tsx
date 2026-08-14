import { UserPageSkeleton } from '@/components/user/user-page-skeleton'

export default function DiscoverLoading() {
  return (
    <UserPageSkeleton activeTabId="more" label="Loading Discover" variant="feed" />
  )
}
