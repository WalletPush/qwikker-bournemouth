import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface IntentPageProps {
  params: Promise<{
    code: string
  }>
}

export default async function IntentPage({ params }: IntentPageProps) {
  const resolvedParams = await params
  const { code } = resolvedParams
  
  const supabase = createServiceRoleClient()
  
  try {
    // Look up the QR code in our database
    const { data: qrCode, error } = await supabase
      .from('qr_code_templates')
      .select(`
        *,
        qr_code_assignments (
          business_id,
          assignment_type,
          target_content_id
        )
      `)
      .eq('code_name', code)
      .single()

    if (error || !qrCode) {
      console.error('QR code not found:', code, error)
      // Redirect to general user dashboard if code not found
      redirect('/user/dashboard')
    }

    // Track the scan in analytics
    try {
      await supabase
        .from('qr_code_analytics')
        .insert({
          qr_code_id: qrCode.id,
          business_id: qrCode.qr_code_assignments?.[0]?.business_id,
          device_type: 'unknown', // We'll enhance this later
          conversion_type: 'new_scan'
        })
    } catch (analyticsError) {
      console.error('Failed to track QR scan:', analyticsError)
      // Continue anyway - tracking failure shouldn't break the experience
    }

    // Handle different QR code types and routing
    const assignment = qrCode.qr_code_assignments?.[0]
    
    if (assignment && assignment.business_id) {
      // This is a business-specific QR code (Spotlight tier)
      const { data: business } = await supabase
        .from('business_profiles')
        .select('business_name, slug')
        .eq('id', assignment.business_id)
        .single()

      const businessName = business?.business_name || 'business'
      const highlightParam = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')

      switch (assignment.assignment_type) {
        case 'offers':
          redirect(`/user/offers?highlight=${encodeURIComponent(highlightParam)}`)
        case 'secret_menu':
          redirect(`/user/secret-menu?highlight=${encodeURIComponent(highlightParam)}`)
        case 'explore':
        case 'discover':
          redirect(`/user/discover?highlight=${encodeURIComponent(highlightParam)}`)
        default:
          redirect(`/user/dashboard?highlight=${encodeURIComponent(highlightParam)}`)
      }
    } else {
      // This is a general QR code (Marketing or Static Business)
      switch (qrCode.qr_type) {
        case 'offers':
          redirect('/user/offers')
        case 'secret_menu':
          redirect('/user/secret-menu')
        case 'explore':
        case 'discover':
          redirect('/user/discover')
        case 'general':
        default:
          // Check if there's a specific URL to redirect to
          if (qrCode.base_url && qrCode.base_url !== 'https://bournemouth.qwikker.com/intent/') {
            redirect(qrCode.base_url)
          } else {
            redirect('/user/dashboard')
          }
      }
    }
  } catch (error) {
    console.error('Intent routing error:', error)
    // Fallback to user dashboard
    redirect('/user/dashboard')
  }
}
