import { redirect } from 'next/navigation'

export default function AdminAITestRedirect() {
  redirect('/admin?tab=ai-management')
}
