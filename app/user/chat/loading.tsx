import { UserPageSkeleton } from '@/components/user/user-page-skeleton'

export default function ChatLoading() {
  return (
    <UserPageSkeleton activeTabId="ask" label="Loading Ask" variant="chat" />
  )
}
