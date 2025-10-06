import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { UniversalQRRouter } from '@/components/intent/universal-qr-router'

interface IntentPageProps {
  searchParams: {
    type?: 'explore' | 'offers' | 'secret'
    business?: string
    lat?: string
    lng?: string
  }
}

export default async function IntentPage({ searchParams }: IntentPageProps) {
  const supabase = createServerComponentClient({ cookies })
  const qrType = searchParams.type
  const businessId = searchParams.business
  const lat = searchParams.lat ? parseFloat(searchParams.lat) : null
  const lng = searchParams.lng ? parseFloat(searchParams.lng) : null

  // Validate QR type
  if (!qrType || !['explore', 'offers', 'secret'].includes(qrType)) {
    redirect('/user/dashboard?error=invalid_qr')
  }

  // If business is specified, validate and redirect directly
  if (businessId) {
    const { data: business } = await supabase
      .from('business_profiles')
      .select(`
        id,
        business_name,
        slug,
        status,
        business_qr_assignments!inner(qr_type, is_active)
      `)
      .eq('id', businessId)
      .eq('business_qr_assignments.qr_type', qrType)
      .eq('business_qr_assignments.is_active', true)
      .eq('status', 'approved')
      .single()

    if (business) {
      // Log successful scan
      await supabase
        .from('universal_qr_analytics')
        .insert({
          qr_type: qrType,
          business_id: businessId,
          routing_method: 'direct_link',
          scan_result: 'business_found',
          latitude: lat,
          longitude: lng
        })

      // Redirect to appropriate page
      switch (qrType) {
        case 'explore':
          redirect(`/user/business/${business.slug}`)
        case 'offers':
          redirect(`/user/offers?business=${business.slug}`)
        case 'secret':
          redirect(`/user/secret-menu?business=${business.slug}`)
      }
    }
  }

  // If location provided, try to find nearby businesses
  let nearbyBusinesses = []
  if (lat && lng) {
    const { data } = await supabase.rpc('find_nearby_businesses_for_qr', {
      p_qr_type: qrType,
      p_latitude: lat,
      p_longitude: lng,
      p_city: 'bournemouth', // TODO: Make dynamic based on subdomain
      p_radius_km: 5.0
    })
    
    nearbyBusinesses = data || []
  }

  // Get all businesses with this QR type as fallback
  const { data: allBusinesses } = await supabase
    .from('business_profiles')
    .select(`
      id,
      business_name,
      slug,
      business_category,
      business_address,
      business_qr_assignments!inner(qr_type, is_active)
    `)
    .eq('business_qr_assignments.qr_type', qrType)
    .eq('business_qr_assignments.is_active', true)
    .eq('status', 'approved')
    .eq('city', 'bournemouth') // TODO: Make dynamic
    .order('business_name')

  return (
    <UniversalQRRouter
      qrType={qrType}
      nearbyBusinesses={nearbyBusinesses}
      allBusinesses={allBusinesses || []}
      userLocation={lat && lng ? { lat, lng } : null}
    />
  )
}
