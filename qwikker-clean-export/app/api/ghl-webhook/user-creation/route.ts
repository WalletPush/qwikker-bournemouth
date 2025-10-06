import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// This webhook receives data from your EXISTING GHL workflow
// Add this as a webhook action AFTER wallet pass creation in GHL

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 Received GHL webhook for user creation')
    
    const data = await request.json()
    console.log('🔍 FULL GHL Data:', JSON.stringify(data, null, 2))
    
    // Extract data from GHL webhook - GHL sends data in customData object
    const {
      customData,
      // Fallback to root level if customData not available
      first_name: rootFirstName,
      last_name: rootLastName,
      email: rootEmail,
      phone,
      contact_id: rootContactId, // ✅ Extract GHL contact ID
      // Any other custom fields from GHL
      ...otherFields
    } = data
    
    // Get data from customData (preferred) or root level
    const first_name = customData?.first_name || rootFirstName
    const last_name = customData?.last_name || rootLastName
    const email = customData?.email || rootEmail
    const contact_id = customData?.contact_id || rootContactId // ✅ Get GHL contact ID
    
    // Look for wallet pass data in multiple possible locations
    const serialNumber = customData?.serialNumber || 
                         customData?.serial_number || 
                         data.serialNumber || 
                         data.serial_number ||
                         customData?.walletpass_serial ||
                         customData?.pass_serial
    
    const passTypeIdentifier = customData?.passTypeIdentifier || 
                              customData?.pass_type_identifier ||
                              data.passTypeIdentifier
    
    const url = customData?.url || 
                customData?.pass_url || 
                data.url ||
                data.pass_url
    
    const device = customData?.device || data.device
    
    console.log('🔍 Extracted fields:', {
      first_name,
      last_name, 
      email,
      contact_id,
      serialNumber,
      passTypeIdentifier,
      url,
      device,
      customData
    })
    
    // 🔍 DEBUG: Check name extraction specifically
    console.log('🔍 NAME DEBUG:', {
      'customData.first_name': customData?.first_name,
      'customData.last_name': customData?.last_name,
      'data.first_name': rootFirstName,
      'data.last_name': rootLastName,
      'final first_name': first_name,
      'final last_name': last_name,
      'will create name': `${first_name} ${last_name}`
    })
    
    // Enhanced debugging for wallet pass data
    console.log('🔍 WALLET PASS DEBUG:', {
      'customData keys': customData ? Object.keys(customData) : 'no customData',
      'root data keys': Object.keys(data),
      'serialNumber found in': serialNumber ? 'YES' : 'NO',
      'all possible serial fields': {
        'customData.serialNumber': customData?.serialNumber,
        'customData.serial_number': customData?.serial_number,
        'data.serialNumber': data.serialNumber,
        'data.serial_number': data.serial_number,
        'customData.walletpass_serial': customData?.walletpass_serial,
        'customData.pass_serial': customData?.pass_serial
      }
    })
    
    // Use serialNumber as wallet_pass_id
    const wallet_pass_id = serialNumber
    
    if (!email) {
      console.error('❌ Missing required email field')
      return NextResponse.json(
        { error: 'Missing email field' },
        { status: 400 }
      )
    }

    // Handle case where wallet pass hasn't been created yet (webhook fired too early)
    if (!wallet_pass_id) {
      console.warn('⚠️ Webhook fired before wallet pass creation - redirecting to waiting page')
      return NextResponse.json({
        success: true,
        message: 'User data received, waiting for wallet pass creation',
        waiting_for_pass: true,
        waiting_url: `https://qwikkerdashboard-theta.vercel.app/waiting-for-pass?email=${encodeURIComponent(email)}&name=${encodeURIComponent(`${first_name} ${last_name}`)}`
      })
    }
    
    const supabase = createRouteHandlerClient({ cookies })
    
    // 🔄 IMPROVED: Check by email first to handle deleted passes
    const { data: existingUserByEmail } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (existingUserByEmail) {
      // User exists by email - update with new wallet pass ID (handles deleted passes)
      console.log('🔄 Updating existing user with new wallet pass:', existingUserByEmail.name)
      
        // 🔧 Better name handling - don't overwrite with empty names
        const newName = (first_name && last_name) ? `${first_name} ${last_name}` : existingUserByEmail.name
        
        console.log('🔍 Name update logic:', {
          'has first_name': !!first_name,
          'has last_name': !!last_name,
          'existing name': existingUserByEmail.name,
          'new name would be': `${first_name} ${last_name}`,
          'final name': newName
        })
        
        const { data: updatedUser, error: updateError } = await supabase
        .from('app_users')
        .update({
          wallet_pass_id: wallet_pass_id, // New wallet pass ID
          name: newName, // ✅ Better name handling
          first_name: first_name || existingUserByEmail.first_name, // ✅ Store first_name separately
          last_name: last_name || existingUserByEmail.last_name, // ✅ Store last_name separately
          phone: phone || existingUserByEmail.phone, // Update phone if provided
          ghl_contact_id: contact_id, // ✅ Store GHL contact ID
          pass_type_identifier: passTypeIdentifier, // ✅ Store Pass Type ID for API calls
          wallet_pass_status: 'active', // Reactivate
          wallet_pass_assigned_at: new Date().toISOString(), // New assignment time
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select()
        .single()
      
      if (updateError) {
        console.error('❌ Error updating existing user:', updateError)
        // Continue to create new user if update fails
      } else {
        console.log('✅ Successfully updated existing user with new pass')
        return NextResponse.json({
          success: true,
          message: 'User updated with new wallet pass',
          user_id: updatedUser.id,
          wallet_pass_id: wallet_pass_id,
          welcome_url: `https://qwikkerdashboard-theta.vercel.app/verify-pass?wallet_pass_id=${wallet_pass_id}&name=${encodeURIComponent(updatedUser.name)}&email=${encodeURIComponent(updatedUser.email)}`
        })
      }
    }
    
    // Also check if this specific wallet_pass_id already exists (different email)
    const { data: existingUserByPassId } = await supabase
      .from('app_users')
      .select('*')
      .eq('wallet_pass_id', wallet_pass_id)
      .single()
    
    if (existingUserByPassId) {
      console.log('✅ Wallet pass ID already exists for different user:', existingUserByPassId.name)
      return NextResponse.json({
        success: true,
        message: 'Wallet pass already assigned',
        user_id: existingUserByPassId.id,
        wallet_pass_id: wallet_pass_id,
        welcome_url: `https://qwikkerdashboard-theta.vercel.app/verify-pass?wallet_pass_id=${wallet_pass_id}&name=${encodeURIComponent(existingUserByPassId.name)}&email=${encodeURIComponent(existingUserByPassId.email)}`
      })
    }
    
    // Create new user automatically
    // 🔧 Better name handling with fallbacks
    const userName = (first_name && last_name) ? `${first_name} ${last_name}` : 
                     first_name ? first_name : 
                     email ? email.split('@')[0] : 'Qwikker User'
    
    console.log('🔍 New user name logic:', {
      'has first_name': !!first_name,
      'has last_name': !!last_name,
      'email': email,
      'final name': userName
    })
    
    const { data: newUser, error } = await supabase
      .from('app_users')
      .insert({
        user_id: crypto.randomUUID(), // Generate unique user ID
        wallet_pass_id: wallet_pass_id,
        name: userName, // ✅ Better name with fallbacks
        first_name: first_name || null, // ✅ Store first_name separately
        last_name: last_name || null, // ✅ Store last_name separately
        email: email,
        phone: phone || null,
        ghl_contact_id: contact_id, // ✅ Store GHL contact ID
        pass_type_identifier: passTypeIdentifier, // ✅ Store Pass Type ID for API calls
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
        referral_code: `QWK-${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
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
    
    console.log('✅ Created new user:', newUser.name, 'ID:', wallet_pass_id)
    
    // Send success response back to GHL
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user_id: newUser.id,
      wallet_pass_id: wallet_pass_id,
      welcome_url: `https://qwikkerdashboard-theta.vercel.app/verify-pass?wallet_pass_id=${wallet_pass_id}&name=${encodeURIComponent(newUser.name)}&email=${encodeURIComponent(newUser.email)}`,
      user_data: {
        name: newUser.name,
        email: newUser.email,
        city: newUser.city,
        tier: newUser.tier,
        level: newUser.level,
        points_balance: newUser.total_points
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