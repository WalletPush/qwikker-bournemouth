import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface WalletPassPageProps {
  params: {
    id: string
  }
}

export default async function WalletPassPage({ params }: WalletPassPageProps) {
  const { id } = params
  const supabase = await createClient()
  
  try {
    // Try to find existing user by wallet pass ID
    const { data: existingUser } = await supabase
      .from('app_users')
      .select('wallet_pass_id, name')
      .eq('wallet_pass_id', id)
      .single()
    
    if (existingUser) {
      redirect(`/user/dashboard?wallet_pass_id=${id}`)
    } else {
      // New user - create profile
      const userId = crypto.randomUUID()
      await supabase
        .from('app_users')
        .insert({
          user_id: userId,
          wallet_pass_id: id,
          name: 'New Qwikker User',
          city: 'bournemouth',
          referral_code: `REF-${Date.now()}`,
          wallet_pass_status: 'active',
          wallet_pass_assigned_at: new Date().toISOString()
        })
      
      redirect(`/user/dashboard?wallet_pass_id=${id}`)
    }
  } catch (error) {
    console.error('Error processing wallet pass:', error)
    redirect('/user/dashboard')
  }
}

export async function generateMetadata({ params }: WalletPassPageProps) {
  return {
    title: 'Qwikker - Welcome!',
    description: 'Welcome to Qwikker Bournemouth'
  }
}
