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
      .from('app_users')
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
      .from('app_users')
      .insert({
        user_id: crypto.randomUUID(), // Generate unique user ID
        wallet_pass_id: serialNumber,
        name: `${first_name} ${last_name}`,
        email: email,
        phone: phone || null,
        city: 'bournemouth', // Auto-detect from subdomain later
        tier: 'explorer',
        level: 1,
        total_points: 0,
        experience_points: 0,
        stats: {
          streakDays: 0,
          chatMessages: 0,
          photosShared: 0,
          offersRedeemed: 0,
          reviewsWritten: 0,
          friendsReferred: 0,
          businessesVisited: 0,
          secretItemsUnlocked: 0
        },
        badges: [],
        referral_code: `${first_name.toUpperCase()}-QWK-${new Date().getFullYear()}`,
        wallet_pass_status: 'active',
        wallet_pass_assigned_at: new Date().toISOString(),
        notification_preferences: {
          sms: false,
          geoOffers: true,
          secretMenus: true,
          weeklyDigest: true,
          newBusinesses: true
        },
        profile_completion_percentage: 60,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
