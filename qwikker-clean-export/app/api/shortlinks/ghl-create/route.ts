import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// This API replaces the vippassbot.com shortlink creation for GHL workflows
export async function POST(request: NextRequest) {
  try {
    console.log('🔗 GHL Shortlink creation request (replacing vippassbot)')
    
    const body = await request.json()
    console.log('📥 Request body:', body)
    
    // Extract data from GHL webhook format
    const { 
      wallet_pass_id, 
      city, 
      link_type = 'offers', // 'chat', 'offers', 'dashboard'
      contact_id,
      first_name,
      last_name
    } = body
    
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
    
    const franchise_city = city || user.city || 'bournemouth'
    
    // Generate unique shortlink code (8 characters like old system)
    function generateCode() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      let result = ''
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    }
    
    let shortlink_code = generateCode()
    
    // Ensure uniqueness
    let { data: existing } = await supabase
      .from('user_shortlinks')
      .select('shortlink_code')
      .eq('shortlink_code', shortlink_code)
      .single()
    
    while (existing) {
      shortlink_code = generateCode()
      const { data } = await supabase
        .from('user_shortlinks')
        .select('shortlink_code')
        .eq('shortlink_code', shortlink_code)
        .single()
      existing = data
    }
    
    // Generate destination URL based on environment
    const isProduction = process.env.NODE_ENV === 'production'
    let destination_url
    
    if (isProduction) {
      // Production: Use franchise domain
      destination_url = `https://${franchise_city}.qwikker.com/user/${link_type}?wallet_pass_id=${wallet_pass_id}`
    } else {
      // Testing: Use Vercel deployment
      destination_url = `https://qwikkerdashboard-theta.vercel.app/user/${link_type}?wallet_pass_id=${wallet_pass_id}`
    }
    
    // Store shortlink in database
    const { data: shortlink, error: shortlinkError } = await supabase
      .from('user_shortlinks')
      .insert({
        shortlink_code,
        wallet_pass_id,
        franchise_city,
        link_type,
        destination_url,
        title: `Qwikker ${link_type.charAt(0).toUpperCase() + link_type.slice(1)}`,
        utm_campaign: `${franchise_city}_wallet_pass`
      })
      .select()
      .single()
    
    if (shortlinkError) {
      console.error('❌ Error storing shortlink:', shortlinkError)
      return NextResponse.json(
        { error: 'Failed to create shortlink' },
        { status: 500 }
      )
    }
    
    // Return response in same format as old vippassbot system
    const response = {
      result: "success",
      message: `https://s.qwikker.com/${shortlink_code}`,
      idstring: shortlink_code,
      path: shortlink_code,
      domain: "s.qwikker.com",
      originalURL: destination_url,
      allowDuplicates: true,
      cloaking: true,
      utmSource: "shortlink",
      utmMedium: "wallet_pass", 
      utmCampaign: `${franchise_city}_${link_type}`,
      title: `Qwikker ${franchise_city.charAt(0).toUpperCase() + franchise_city.slice(1)}`,
      shortKey: shortlink_code
    }
    
    console.log(`✅ Created shortlink for ${user.name}: s.qwikker.com/${shortlink_code} → ${link_type}`)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ GHL shortlink creation error:', error)
    return NextResponse.json(
      { 
        result: "error",
        message: "Failed to create shortlink",
        error: error.message 
      },
      { status: 500 }
    )
  }
}
