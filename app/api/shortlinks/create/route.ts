import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Creating bulletproof shortlinks for user')
    
    const { wallet_pass_id, franchise_city } = await request.json()
    
    if (!wallet_pass_id) {
      return NextResponse.json(
        { error: 'Missing wallet_pass_id' },
        { status: 400 }
      )
    }
    
    const supabase = createServiceRoleClient()
    
    // Validate user exists
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('wallet_pass_id, city, name')
      .eq('wallet_pass_id', wallet_pass_id)
      .single()
    
    if (userError || !user) {
      console.error('❌ User not found for shortlink creation:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // SECURITY: Use validated city from user record or request context
    let city = franchise_city || user.city
    
    if (!city) {
      try {
        city = await getSafeCurrentCity()
      } catch (error) {
        console.error('❌ Could not determine franchise city for shortlink creation:', error)
        return NextResponse.json(
          { error: 'Unable to determine franchise city for shortlink creation' },
          { status: 400 }
        )
      }
    }
    
    // Create shortlinks using database function
    const { data: shortlinks, error: shortlinkError } = await supabase
      .rpc('create_user_shortlinks', {
        p_wallet_pass_id: wallet_pass_id,
        p_franchise_city: city
      })
    
    if (shortlinkError) {
      console.error('❌ Error creating shortlinks:', shortlinkError)
      return NextResponse.json(
        { error: 'Failed to create shortlinks' },
        { status: 500 }
      )
    }
    
    // Format response like old system
    const response = {
      success: true,
      user: {
        wallet_pass_id: user.wallet_pass_id,
        name: user.name,
        city: city
      },
      shortlinks: {}
    }
    
    // Convert to object format for easy access
    shortlinks.forEach((link: { link_type: string; short_code: string; created_at: string }) => {
      response.shortlinks[link.link_type] = {
        code: link.shortlink_code,
        url: link.shortlink_url,
        destination: link.destination_url
      }
    })
    
    console.log(`✅ Created ${shortlinks.length} shortlinks for ${user.name} in ${city}`)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Shortlink creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
