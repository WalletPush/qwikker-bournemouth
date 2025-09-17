import { redirect } from 'next/navigation'

// Redirect /user to /user/dashboard
export default function UserPage() {
  redirect('/user/dashboard')
}
