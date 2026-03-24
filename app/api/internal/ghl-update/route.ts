import { NextRequest, NextResponse } from 'next/server'

/**
 * @deprecated GHL integration retired (0.19). Returns 200 no-op.
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({ success: true, deprecated: true, message: 'GHL integration retired' })
}
