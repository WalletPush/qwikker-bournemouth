import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    console.log(`🔗 Simple shortlink redirect for code: ${code}`)
    
    if (!code) {
      return NextResponse.redirect('https://qwikkerdashboard-theta.vercel.app', 302)
    }
    
    // For now, reconstruct the wallet_pass_id from the code
    // This is a temporary solution until we have proper database storage
    const searchParams = request.nextUrl.searchParams
    const walletPassId = `bee78ec9-897a-4c96-99cc-9c68e2db2e19` // This should come from database lookup
    
    // Default redirect to dashboard
    const redirectUrl = `https://qwikkerdashboard-theta.vercel.app/user/dashboard?wallet_pass_id=${walletPassId}`
    
    console.log(`✅ Redirecting shortlink ${code} to: ${redirectUrl}`)
    
    return NextResponse.redirect(redirectUrl, 302)
    
  } catch (error) {
    console.error('❌ Shortlink redirect error:', error)
    return NextResponse.redirect('https://qwikkerdashboard-theta.vercel.app', 302)
  }
}
