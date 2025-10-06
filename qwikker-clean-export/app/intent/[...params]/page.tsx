import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { IntentRouter } from '@/components/intent/intent-router'

interface IntentPageProps {
  params: {
    params: string[]
  }
  searchParams: {
    qr?: string
    ref?: string
    user_id?: string
  }
}

export default async function IntentPage({ params, searchParams }: IntentPageProps) {
  const supabase = createServerComponentClient({ cookies })
  const qrCodeId = searchParams.qr
  const userId = searchParams.user_id

  // If no QR code ID, redirect to general onboarding
  if (!qrCodeId) {
    redirect('/user/dashboard')
  }

  // Look up the QR code assignment
  const { data: assignment } = await supabase
    .from('qr_code_assignments')
    .select(`
      *,
      qr_code_templates (*),
      business_profiles (
        id,
        business_name,
        slug,
        status
      )
    `)
    .eq('qr_code_id', qrCodeId)
    .eq('is_active', true)
    .single()

  // Log the QR scan for analytics
  if (assignment) {
    await supabase
      .from('qr_code_analytics')
      .insert({
        qr_code_id: qrCodeId,
        business_id: assignment.business_id,
        user_id: userId || null,
        user_agent: '', // Will be filled by client-side
        conversion_type: userId ? 'existing_user' : 'new_user',
        city: assignment.qr_code_templates?.city
      })
  }

  // Pass data to client component for routing logic
  return (
    <IntentRouter 
      assignment={assignment}
      userId={userId}
      qrCodeId={qrCodeId}
    />
  )
}
