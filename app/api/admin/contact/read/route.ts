import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'

export const dynamic = 'force-dynamic'

/**
 * Admin Contact Centre - Mark Thread as Read
 *
 * POST /api/admin/contact/read
 * Body: { threadId }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { threadId } = await request.json()

    if (!threadId) {
      return NextResponse.json({ error: 'threadId required' }, { status: 400 })
    }

    const adminClient = createServiceRoleClient()

    // Verify thread belongs to admin's city
    const { data: thread, error: threadError } = await adminClient
      .from('contact_threads')
      .select('id, city')
      .eq('id', threadId)
      .eq('city', admin.city)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    await adminClient.from('contact_read_receipts').upsert({
      thread_id: threadId,
      user_id: admin.id,
      last_read_at: now,
      updated_at: now,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Admin mark read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
