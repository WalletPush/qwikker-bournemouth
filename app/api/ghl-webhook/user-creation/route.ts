import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// This webhook receives data from your EXISTING GHL workflow
// Add this as a webhook action AFTER wallet pass creation in GHL

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 Received GHL webhook for user creation')
    
    const data = await request.json()
    console.log('GHL Data:', data)
    
    // Extract data from GHL webhook
    const {
      first_name,
      last_name,
      email,
      phone,
      // Custom fields from wallet pass creation
      serialNumber,
      passTypeIdentifier,
      url,
      device,
      // Any other custom fields from GHL
      ...customFields
    } = data
    
    if (!serialNumber || !email) {
      console.error('❌ Missing required fields:', { serialNumber, email })
      return NextResponse.json(
        { error: 'Missing serialNumber or email' },
        { status: 400 }
      )
    }
    
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user already exists
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
        dashboard_url: `https://qwikkerdashboard-theta.vercel.app/user/dashboard?wallet_pass_id=${serialNumber}`
      })
    }
    
    // Create new user automatically
    const { data: newUser, error } = await supabase
      .from('user_members')
      .insert({
        wallet_pass_id: serialNumber,
        name: `${first_name} ${last_name}`,
        first_name: first_name,
        last_name: last_name,
        email: email,
        phone: phone || null,
        city: 'bournemouth', // Auto-detect from subdomain later
        tier: 'explorer',
        level: 1,
        points_balance: 0,
        badges_earned: ['new_member'],
        preferences: {
          notifications: true,
          location_sharing: true,
          favorite_categories: []
        },
        device_info: {
          device_type: device,
          pass_url: url,
          pass_type_identifier: passTypeIdentifier,
          created_from: 'ghl_webhook'
        },
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error creating user:', error)
      return NextResponse.json(
        { error: 'Failed to create user', details: error.message },
        { status: 500 }
      )
    }
    
    console.log('✅ Created new user:', newUser.name, 'ID:', serialNumber)
    
    // Send success response back to GHL
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user_id: newUser.id,
      wallet_pass_id: serialNumber,
      dashboard_url: `https://qwikkerdashboard-theta.vercel.app/user/dashboard?wallet_pass_id=${serialNumber}`,
      user_data: {
        name: newUser.name,
        email: newUser.email,
        city: newUser.city,
        tier: newUser.tier,
        level: newUser.level,
        points_balance: newUser.points_balance
      }
    })
    
  } catch (error) {
    console.error('❌ GHL webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
