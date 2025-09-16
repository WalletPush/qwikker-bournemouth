import { redirect } from 'next/navigation'

export default function ProtectedPage() {
  // Redirect to the new dashboard
  redirect('/dashboard')
}
