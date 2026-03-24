import { NextRequest, NextResponse } from 'next/server'

/**
 * @deprecated GHL integration retired (0.19). Returns 200 to prevent GHL retry loops.
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({ success: true, deprecated: true })
}
