import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get('city')
  if (!city) return NextResponse.json({ error: 'Missing city' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('user_support_requests')
    .select('*')
    .eq('city', city)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching user support requests:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }

  return NextResponse.json({ requests: data || [] })
}

export async function PATCH(request: NextRequest) {
  const { id, status, admin_notes } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const updates: Record<string, unknown> = {}
  if (status) updates.status = status
  if (admin_notes !== undefined) updates.admin_notes = admin_notes
  if (status === 'resolved') updates.resolved_at = new Date().toISOString()

  const { error } = await supabase
    .from('user_support_requests')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error updating user support request:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
