import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'

const cityRequestSchema = z.object({
  cityName: z.string().min(2).max(100).trim(),
  email: z.string().email().max(255).trim().toLowerCase(),
  name: z.string().max(100).trim().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = cityRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { cityName, email, name } = parsed.data
    const cityNameNormalized = cityName.toLowerCase().trim()

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('city_requests')
      .insert({
        city_name: cityName,
        city_name_normalized: cityNameNormalized,
        email,
        name: name || null,
      })

    // Unique constraint violation means they already voted -- still return success
    if (error && error.code === '23505') {
      return NextResponse.json({
        success: true,
        message: 'Vote registered',
      })
    }

    if (error) {
      console.error('Failed to insert city request:', error)
      return NextResponse.json({ error: 'Failed to register vote' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Vote registered',
    })
  } catch (err) {
    console.error('City request error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
