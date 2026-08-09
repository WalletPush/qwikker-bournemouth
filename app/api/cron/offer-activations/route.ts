import { NextRequest, NextResponse } from 'next/server'
import {
  processActivationLifecycle,
  processWalletActivationOutbox,
} from '@/lib/offers/activation-service'

/**
 * Offer activation lifecycle cron:
 * - mid-window warning (once)
 * - expiry → ended + clear_pending
 * - wallet outbox: clear Current_Offer + vibe CTA Last_Message push
 *
 * Auth: Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lifecycle = await processActivationLifecycle()
  const outbox = await processWalletActivationOutbox(50)

  return NextResponse.json({
    ok: true,
    lifecycle,
    outbox,
  })
}

export async function POST(request: NextRequest) {
  return GET(request)
}
