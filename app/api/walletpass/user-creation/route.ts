import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// This endpoint receives data from GHL after WalletPass creation
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    console.log('🎫 WalletPass user creation data:', data)
    
    // Extract WalletPass data
    const {
      First_Name,
      Last_Name,
      email,
      serialNumber,        // This is the KEY for user authentication
      passTypeIdentifier,
      url,
      device
    } = data
    
    if (!serialNumber || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: serialNumber and email' },
        { status: 400 }
      )
    }
    
    const supabase = createRouteHandlerClient({ cookies })
    
    // Create user_members record with WalletPass data
    const { data: existingUser } = await supabase
      .from('user_members')
      .select('*')
      .eq('wallet_pass_id', serialNumber)
      .single()
    
    if (existingUser) {
      console.log('✅ User already exists:', existingUser.name)
      return NextResponse.json({
        success: true,
        message: 'User already exists',
        user_id: existingUser.id,
        wallet_pass_id: serialNumber,
        dashboard_url: `https://bournemouth.qwikker.com/user?pass=${serialNumber}`
      })
    }
    
    // Create new user_members record
    const { data: newUser, error } = await supabase
      .from('user_members')
      .insert({
        wallet_pass_id: serialNumber,
        name: `${First_Name} ${Last_Name}`,
        first_name: First_Name,
        last_name: Last_Name,
        email: email,
        city: 'bournemouth', // Extract from subdomain later
        tier: 'explorer',
        level: 1,
        points_balance: 0,
        badges_earned: [],
        preferences: {
          notifications: true,
          location_sharing: true,
          favorite_categories: []
        },
        device_info: {
          device_type: device,
          pass_url: url,
          pass_type_identifier: passTypeIdentifier
        },
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error creating user:', error)
      return NextResponse.json(
        { error: 'Failed to create user record', details: error.message },
        { status: 500 }
      )
    }
    
    console.log('✅ Created new user:', newUser.name)
    
    // Send success response back to GHL workflow
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user_id: newUser.id,
      wallet_pass_id: serialNumber,
      dashboard_url: `https://bournemouth.qwikker.com/user?pass=${serialNumber}`,
      user_data: {
        name: newUser.name,
        email: newUser.email,
        city: newUser.city,
        tier: newUser.tier,
        level: newUser.level
      }
    })
    
  } catch (error) {
    console.error('❌ WalletPass user creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
