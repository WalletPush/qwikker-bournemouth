import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { ComingSoonPage } from '@/components/coming-soon/coming-soon-page'

interface ComingSoonPageProps {
  searchParams: {
    qr?: string
    city?: string
    type?: string
  }
}

export default async function ComingSoonRoute({ searchParams }: ComingSoonPageProps) {
  const supabase = createServerComponentClient({ cookies })
  const qrCode = searchParams.qr
  const city = searchParams.city || 'bournemouth'
  const qrType = searchParams.type

  // Look up QR code details if provided
  let qrDetails = null
  if (qrCode) {
    const { data } = await supabase
      .from('qr_code_inventory')
      .select('qr_code, qr_type, physical_format, city')
      .eq('qr_code', qrCode)
      .single()
    
    qrDetails = data
  }

  // Log the scan for analytics (unassigned QR scan)
  if (qrCode && qrDetails) {
    await supabase
      .from('qr_code_analytics')
      .insert({
        qr_code_id: qrDetails.id,
        business_id: null, // No business assigned
        user_id: null, // Anonymous scan
        scan_result: 'unassigned_qr',
        city: qrDetails.city,
        device_type: 'unknown' // Will be updated by client-side
      })
  }

  return (
    <ComingSoonPage 
      city={city}
      qrCode={qrCode}
      qrType={qrType}
      qrDetails={qrDetails}
    />
  )
}
