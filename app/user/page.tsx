import { redirect } from 'next/navigation'
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "QWIKKER - User Dashboard",
  description: "Discover amazing local businesses, exclusive offers, and secret menus in Bournemouth",
}

// Redirect /user to /user/dashboard
export default function UserPage() {
  redirect('/user/dashboard')
}
