import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserChatPage } from '@/components/user/user-chat-page'

export default function ChatPage() {
  return (
    <UserDashboardLayout>
      <UserChatPage />
    </UserDashboardLayout>
  )
}
