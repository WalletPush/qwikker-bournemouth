import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const walletPassId = searchParams.get('wallet_pass_id')

  if (!walletPassId) {
    return NextResponse.json({
      error: 'Missing wallet_pass_id parameter',
      usage: 'Add ?wallet_pass_id=YOUR_WALLET_PASS_ID to the URL'
    }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  try {
    // Look up user by wallet pass ID
    const { data: user, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('wallet_pass_id', walletPassId)
      .single()

    if (error) {
      return NextResponse.json({
        error: 'User not found or database error',
        details: error.message,
        wallet_pass_id: walletPassId
      }, { status: 404 })
    }

    // Return sanitized user data
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        wallet_pass_id: user.wallet_pass_id,
        wallet_pass_status: user.wallet_pass_status,
        city: user.city,
        tier: user.tier,
        level: user.level,
        ghl_contact_id: user.ghl_contact_id,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      issues: {
        missing_name: !user.name || user.name === 'New Qwikker User',
        not_active: user.wallet_pass_status !== 'active',
        no_ghl_sync: !user.ghl_contact_id
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Server error',
      details: error.message
    }, { status: 500 })
  }
}

