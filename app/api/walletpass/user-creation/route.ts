import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Extract city from request headers or URL
function extractCityFromRequest(request: NextRequest): string {
  const host = request.headers.get('host') || 'bournemouth.qwikker.com'
  const city = host.split('.')[0] // Extract subdomain
  return city === 'qwikkerdashboard-theta' || city === 'localhost' ? 'bournemouth' : city
}

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
    
    // 🔄 IMPROVED: Check by email first to handle deleted passes
    const { data: existingUserByEmail } = await supabase
      .from('user_members')
      .select('*')
      .eq('email', email)
      .single()
    
    if (existingUserByEmail) {
      // User exists by email - update with new wallet pass ID (handles deleted passes)
      console.log('🔄 Updating existing user with new wallet pass:', existingUserByEmail.name)
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('user_members')
        .update({
          wallet_pass_id: serialNumber, // New wallet pass ID
          name: `${First_Name} ${Last_Name}`, // Update name in case it changed
          first_name: First_Name,
          last_name: Last_Name,
          status: 'active', // Reactivate
          device_info: {
            device_type: device,
            pass_url: url,
            pass_type_identifier: passTypeIdentifier
          },
          created_at: new Date().toISOString() // Update creation time for new pass
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
          wallet_pass_id: serialNumber,
          dashboard_url: `https://${updatedUser.city}.qwikker.com/user?pass=${serialNumber}`
        })
      }
    }
    
    // Also check if this specific wallet_pass_id already exists (different email)
    const { data: existingUserByPassId } = await supabase
      .from('user_members')
      .select('*')
      .eq('wallet_pass_id', serialNumber)
      .single()
    
    if (existingUserByPassId) {
      console.log('✅ Wallet pass ID already exists for different user:', existingUserByPassId.name)
      return NextResponse.json({
        success: true,
        message: 'Wallet pass already assigned',
        user_id: existingUserByPassId.id,
        wallet_pass_id: serialNumber,
        dashboard_url: `https://${existingUserByPassId.city}.qwikker.com/user?pass=${serialNumber}`
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
        city: extractCityFromRequest(request), // Dynamic city detection
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
      dashboard_url: `https://${newUser.city}.qwikker.com/user?pass=${serialNumber}`,
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
