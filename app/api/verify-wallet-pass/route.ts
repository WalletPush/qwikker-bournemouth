import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { wallet_pass_id } = await request.json()
    
    if (!wallet_pass_id) {
      return NextResponse.json(
        { success: false, message: 'Missing wallet pass ID' },
        { status: 400 }
      )
    }
    
    const supabase = createServiceRoleClient()
    
    // Check if user exists with this wallet pass ID
    const { data: user, error } = await supabase
      .from('app_users')
      .select('id, wallet_pass_id, name, wallet_pass_status')
      .eq('wallet_pass_id', wallet_pass_id)
      .single()
    
    if (error || !user) {
      console.log('❌ Wallet pass verification failed:', wallet_pass_id, error?.message)
      return NextResponse.json({
        success: false,
        userExists: false,
        message: 'Wallet pass not found. Please ensure your pass was created successfully and try again.'
      })
    }
    
    // Check if pass is active
    if (user.wallet_pass_status !== 'active') {
      return NextResponse.json({
        success: false,
        userExists: true,
        message: 'Wallet pass exists but is not active. Please contact support.'
      })
    }
    
    console.log('✅ Wallet pass verified successfully:', user.name, wallet_pass_id)
    
    return NextResponse.json({
      success: true,
      userExists: true,
      message: 'Wallet pass verified successfully',
      user: {
        name: user.name,
        wallet_pass_id: user.wallet_pass_id
      }
    })
    
  } catch (error) {
    console.error('❌ Wallet pass verification error:', error)
    return NextResponse.json(
      { success: false, message: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}
