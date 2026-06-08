import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'

const bodySchema = z.object({
  businessId: z.string().min(1),
  email: z.string().trim().email().max(254),
})

/**
 * Admin action: manually set/update the contact email for a business.
 * Used for outreach on imported (unclaimed) listings that have no email on file.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }
    const { businessId, email } = parsed.data
    const normalisedEmail = email.toLowerCase()

    // Admin authentication
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')
    if (!adminSessionCookie?.value) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json({ error: 'Invalid admin session' }, { status: 401 })
    }

    const admin = await getAdminById(adminSession.adminId)
    const hostname = request.headers.get('host') || ''
    const requestCity = await getCityFromHostname(hostname)

    if (!admin || !(await isAdminForCity(adminSession.adminId, requestCity))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient()

    const { data: business, error: businessError } = await supabaseAdmin
      .from('business_profiles')
      .select('id, city')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Tenant isolation: admin can only act on businesses in their own city
    if (business.city !== requestCity) {
      return NextResponse.json({ error: 'Unauthorized access to this business' }, { status: 403 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('business_profiles')
      .update({ email: normalisedEmail })
      .eq('id', businessId)

    if (updateError) {
      console.error('update-business-email update failed:', updateError)
      return NextResponse.json({ error: 'Failed to save email' }, { status: 500 })
    }

    console.log(`✉️ [${requestCity}] Admin ${admin.id} set email for ${businessId}: ${normalisedEmail}`)

    return NextResponse.json({ success: true, email: normalisedEmail })
  } catch (error) {
    console.error('update-business-email API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
