import { UserPageSkeleton } from '@/components/user/user-page-skeleton'

export default function OffersLoading() {
  return (
    <UserPageSkeleton activeTabId="offers" label="Loading Offers" variant="list" />
  )
}
