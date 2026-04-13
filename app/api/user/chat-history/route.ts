import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/chat-history?walletPassId=xxx
 * Returns the latest chat session from today, or a fresh sessionId.
 * Messages are capped at 50 per session.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const walletPassId = searchParams.get('walletPassId')

  if (!walletPassId) {
    return NextResponse.json({ error: 'Missing walletPassId' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Find the most recent session within the last 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const { data: latestMsg, error: latestErr } = await supabase
    .from('chat_messages')
    .select('session_id')
    .eq('wallet_pass_id', walletPassId)
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestErr) {
    console.error('[chat-history] Error finding latest session:', latestErr)
    return NextResponse.json({ sessionId: crypto.randomUUID(), messages: [] })
  }

  if (!latestMsg) {
    // No session today — return fresh sessionId
    return NextResponse.json({ sessionId: crypto.randomUUID(), messages: [] })
  }

  const sessionId = latestMsg.session_id

  // Load messages for this session (cap at 50)
  const { data: messages, error: msgErr } = await supabase
    .from('chat_messages')
    .select('id, role, content, metadata, created_at')
    .eq('wallet_pass_id', walletPassId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(50)

  if (msgErr) {
    console.error('[chat-history] Error loading messages:', msgErr)
    return NextResponse.json({ sessionId, messages: [] })
  }

  return NextResponse.json({
    sessionId,
    messages: (messages || []).map(m => ({
      id: m.id,
      type: m.role as 'user' | 'ai',
      content: m.content,
      timestamp: m.created_at,
      quickReplies: (m.metadata as Record<string, unknown>)?.quickReplies || [],
    })),
  })
}
