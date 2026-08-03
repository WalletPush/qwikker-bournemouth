import { NextRequest, NextResponse } from 'next/server'
import { requireHQAdmin } from '@/lib/auth/hq'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

/**
 * HQ partner markets catalogue — Phase 2
 * GET list / PATCH status, blocked, manual_review_only, notes
 */
export async function GET() {
  try {
    const auth = await requireHQAdmin()
    if (!auth.ok) return auth.response

    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('partner_markets')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('HQ markets fetch failed:', error)
      return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 })
    }

    return NextResponse.json({ markets: data || [] })
  } catch (error) {
    console.error('HQ markets GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['owned', 'reserved', 'available']).optional(),
  blocked: z.boolean().optional(),
  manual_review_only: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
  thumbnail_url: z.string().url().optional().nullable(),
  sort_order: z.number().int().optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireHQAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { id, ...fields } = parsed.data
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) updates[k] = v
    }

    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('partner_markets')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('HQ markets update failed:', error)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, market: data })
  } catch (error) {
    console.error('HQ markets PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
