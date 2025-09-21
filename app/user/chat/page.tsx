import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserChatPagePremium } from '@/components/user/user-chat-page-premium'
import { createServiceRoleClient } from '@/lib/supabase/server'

export default async function ChatPage() {
  const supabase = createServiceRoleClient()
  
  // Get current user for personalized chat
  let currentUser = null
  try {
    const { data: user } = await supabase
      .from('app_users')
      .select('name, level, tier, total_points, city, preferred_categories')
      .eq('wallet_pass_id', 'QWIK-BOURNEMOUTH-DAVID-2024')
      .single()
    currentUser = user
  } catch (error) {
    console.log('No user found, using generic chat')
  }
  
  return (
    <UserDashboardLayout currentSection="chat" currentUser={currentUser}>
      <UserChatPagePremium currentUser={currentUser} />
    </UserDashboardLayout>
  )
}
