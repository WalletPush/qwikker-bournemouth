import { NextRequest, NextResponse } from 'next/server'
import { updateMainPassOffer } from '@/lib/wallet/update-main-pass-offer'

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const result = await updateMainPassOffer({
      userWalletPassId: requestBody.userWalletPassId,
      currentOffer: requestBody.currentOffer,
      clearOffer: Boolean(requestBody.clearOffer),
      lastMessageOnly: Boolean(requestBody.lastMessageOnly),
      lastMessageOverride: requestBody.lastMessageOverride,
      offerDetails: requestBody.offerDetails,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update pass' },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Wallet pass updated',
      userWalletPassId: requestBody.userWalletPassId,
      currentOffer: result.currentOffer,
      pushMessage: result.pushMessage,
      debug: {
        expiryTime: result.expiryTime,
      },
    })
  } catch (error) {
    console.error('update-main-pass error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
