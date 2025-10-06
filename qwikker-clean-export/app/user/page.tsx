import { redirect } from 'next/navigation'
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "QWIKKER - User Dashboard",
  description: "Discover amazing local businesses, exclusive offers, and secret menus in Bournemouth",
}

interface UserPageProps {
  searchParams: Promise<{
    wallet_pass_id?: string
  }>
}

// Redirect /user to /user/dashboard with wallet_pass_id preserved
export default async function UserPage({ searchParams }: UserPageProps) {
  const resolvedSearchParams = await searchParams
  const walletPassId = resolvedSearchParams.wallet_pass_id
  
  if (walletPassId) {
    redirect(`/user/dashboard?wallet_pass_id=${walletPassId}`)
  } else {
    redirect('/user/dashboard')
  }
}
