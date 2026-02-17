import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Business Contact Centre - Mark Thread as Read
 *
 * POST /api/business/contact/read
 * Body: { threadId }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { threadId } = await request.json()

    if (!threadId) {
      return NextResponse.json({ error: 'threadId is required' }, { status: 400 })
    }

    const adminClient = createServiceRoleClient()

    // Verify business owns this thread
    const { data: profile } = await adminClient
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: thread } = await adminClient
      .from('contact_threads')
      .select('id')
      .eq('id', threadId)
      .eq('business_id', profile.id)
      .single()

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Upsert read receipt
    const now = new Date().toISOString()
    await adminClient
      .from('contact_read_receipts')
      .upsert({
        thread_id: threadId,
        user_id: user.id,
        last_read_at: now,
        updated_at: now,
      })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Mark read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
