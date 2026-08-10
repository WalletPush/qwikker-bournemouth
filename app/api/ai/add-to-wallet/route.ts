import { NextRequest, NextResponse } from 'next/server'

/**
 * @deprecated Use POST /api/offers/save then POST /api/offers/activate (Save → Redeem).
 * Kept only so old clients get a clear migration error instead of the legacy 12h wallet path.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error:
        'This endpoint is retired. Use /api/offers/save to Save, then /api/offers/activate to Redeem.',
      deprecated: true,
      use: ['POST /api/offers/save', 'POST /api/offers/activate'],
    },
    { status: 410 }
  )
}
