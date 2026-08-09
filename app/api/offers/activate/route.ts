import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { activateOffer, getActiveActivation } from '@/lib/offers/activation-service'

const activateSchema = z.object({
  walletPassId: z.string().min(10),
  offerId: z.string().uuid(),
  source: z.enum(['offers', 'chat', 'business', 'auto']).optional(),
  confirmReplace: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = activateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
    }

    const result = await activateOffer(parsed.data)
    const status =
      result.error === 'needs_replace_confirm'
        ? 409
        : result.success
          ? 200
          : 400
    return NextResponse.json(result, { status })
  } catch (error) {
    console.error('offers/activate error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const walletPassId = new URL(request.url).searchParams.get('walletPassId')
    if (!walletPassId || walletPassId.length < 10) {
      return NextResponse.json({ success: false, error: 'Invalid wallet pass' }, { status: 400 })
    }
    const active = await getActiveActivation(walletPassId)
    return NextResponse.json({ success: true, ...active })
  } catch (error) {
    console.error('offers/activate GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
