import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import {
  convertStructuredToText,
  normalizeStructuredHours,
  type BusinessHoursStructured,
  DAYS_OF_WEEK,
} from '@/types/business-hours'

const periodSchema = z.object({
  open: z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/),
  close: z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/),
})

const daySchema = z.object({
  open: z.string().nullable(),
  close: z.string().nullable(),
  closed: z.boolean(),
  notes: z.string().nullable().optional(),
  periods: z.array(periodSchema).max(2).nullable().optional(),
})

const hoursSchema = z.object({
  monday: daySchema,
  tuesday: daySchema,
  wednesday: daySchema,
  thursday: daySchema,
  friday: daySchema,
  saturday: daySchema,
  sunday: daySchema,
  timezone: z.string().optional(),
  last_updated: z.string().optional(),
  legacy_text: z.string().optional(),
  needs_conversion: z.boolean().optional(),
})

const bodySchema = z.object({
  businessId: z.string().uuid(),
  hoursStructured: hoursSchema,
})

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid hours payload', success: false, details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { businessId, hoursStructured } = parsed.data

    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')

    if (!adminSessionCookie?.value) {
      return NextResponse.json(
        { error: 'Admin authentication required', success: false },
        { status: 401 }
      )
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json(
        { error: 'Invalid admin session', success: false },
        { status: 401 }
      )
    }

    const admin = await getAdminById(adminSession.adminId)
    const hostname = request.headers.get('host') || ''
    const requestCity = await getCityFromHostname(hostname)

    if (!admin || !(await isAdminForCity(adminSession.adminId, requestCity))) {
      return NextResponse.json(
        { error: 'Insufficient permissions', success: false },
        { status: 403 }
      )
    }

    const supabaseAdmin = createAdminClient()

    const { data: business, error: fetchError } = await supabaseAdmin
      .from('business_profiles')
      .select('id, city')
      .eq('id', businessId)
      .single()

    if (fetchError || !business) {
      return NextResponse.json(
        { error: 'Business not found', success: false },
        { status: 404 }
      )
    }

    if (business.city !== requestCity) {
      return NextResponse.json(
        { error: 'Business not in your city', success: false },
        { status: 403 }
      )
    }

    const normalized = normalizeStructuredHours(
      hoursStructured as BusinessHoursStructured
    )
    // Ensure all day keys present for DB check constraint
    for (const day of DAYS_OF_WEEK) {
      if (!normalized[day]) {
        return NextResponse.json(
          { error: `Missing day: ${day}`, success: false },
          { status: 400 }
        )
      }
    }

    const hoursText = convertStructuredToText(normalized)

    const { error: updateError } = await supabaseAdmin
      .from('business_profiles')
      .update({
        business_hours_structured: normalized,
        business_hours: hoursText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId)

    if (updateError) {
      console.error('Error updating hours:', updateError)
      return NextResponse.json(
        {
          error: 'Failed to update hours',
          success: false,
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    revalidatePath('/admin')
    revalidatePath('/user/discover')

    return NextResponse.json({
      success: true,
      message: 'Hours updated successfully',
      business_hours: hoursText,
      business_hours_structured: normalized,
    })
  } catch (error) {
    console.error('Error in update-hours:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
