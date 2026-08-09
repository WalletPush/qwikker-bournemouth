import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { saveOffer, unsaveOffer } from '@/lib/offers/activation-service'

const schema = z.object({
  walletPassId: z.string().min(10),
  offerId: z.string().uuid(),
  source: z.enum(['offers', 'chat', 'business', 'auto']).optional(),
  remove: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
    }

    if (parsed.data.remove) {
      const result = await unsaveOffer({
        walletPassId: parsed.data.walletPassId,
        offerId: parsed.data.offerId,
      })
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    }

    const result = await saveOffer({
      walletPassId: parsed.data.walletPassId,
      offerId: parsed.data.offerId,
      source: parsed.data.source,
    })
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('offers/save error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
