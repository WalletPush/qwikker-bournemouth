import { NextRequest, NextResponse } from 'next/server'
import { requireHQAdmin } from '@/lib/auth/hq'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const auth = await requireHQAdmin()
    if (!auth.ok) return auth.response

    const supabase = createServiceRoleClient()

    const [claimsResult, waitlistResult] = await Promise.all([
      supabase
        .from('partner_claims')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('partner_waitlist')
        .select('*')
        .order('created_at', { ascending: false })
    ])

    if (claimsResult.error) {
      console.error('Failed to fetch claims:', claimsResult.error)
      return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 })
    }

    return NextResponse.json({
      claims: claimsResult.data || [],
      waitlist: waitlistResult.data || [],
    })
  } catch (error) {
    console.error('HQ partners API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireHQAdmin()
    if (!auth.ok) return auth.response

    const { id, action, notes } = await request.json()

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    switch (action) {
      case 'extend': {
        const { data: claim } = await supabase
          .from('partner_claims')
          .select('expires_at')
          .eq('id', id)
          .single()

        if (!claim) {
          return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
        }

        const currentExpiry = new Date(claim.expires_at)
        const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000)

        const { error } = await supabase
          .from('partner_claims')
          .update({
            expires_at: newExpiry.toISOString(),
            status: 'claimed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true, new_expires_at: newExpiry.toISOString() })
      }

      case 'release': {
        const { error } = await supabase
          .from('partner_claims')
          .update({
            status: 'released',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case 'convert': {
        const { error } = await supabase
          .from('partner_claims')
          .update({
            status: 'converted',
            converted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
      }

      case 'update_notes': {
        const { error } = await supabase
          .from('partner_claims')
          .update({
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('HQ partners PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
