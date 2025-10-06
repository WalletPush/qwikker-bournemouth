import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// This API replaces the vippassbot.com shortlink creation for GHL workflows
export async function POST(request: NextRequest) {
  try {
    console.log('🔗 GHL Shortlink creation request (replacing vippassbot)')
    console.log('📨 Headers:', Object.fromEntries(request.headers.entries()))
    
    const body = await request.json()
    console.log('📥 Request body:', JSON.stringify(body, null, 2))
    
    // Extract data from GHL webhook format
    const { 
      wallet_pass_id, 
      city = 'bournemouth', 
      link_type = 'chat'
    } = body
    
    if (!wallet_pass_id) {
      return NextResponse.json(
        { error: 'Missing wallet_pass_id' },
        { status: 400 }
      )
    }
    
    // For now, just return a simple shortlink without database operations
    // This ensures GHL workflow continues working
    const shortCode = wallet_pass_id.slice(-8)
    const shortUrl = `https://s.qwikker.com/${shortCode}`
    
    console.log(`✅ Created temporary shortlink: ${shortUrl}`)
    
    return NextResponse.json({
      result: "success",
      message: shortUrl,
      idstring: shortCode,
      path: shortCode,
      domain: "s.qwikker.com",
      originalURL: `https://qwikkerdashboard-theta.vercel.app/user/${link_type}?wallet_pass_id=${wallet_pass_id}`,
      allowDuplicates: true,
      cloaking: true,
      utmSource: "shortlink",
      utmMedium: "wallet_pass", 
      utmCampaign: `${city}_${link_type}`,
      title: `Qwikker ${city.charAt(0).toUpperCase() + city.slice(1)}`,
      shortKey: shortCode,
      debug: {
        wallet_pass_id,
        city,
        link_type,
        timestamp: new Date().toISOString()
      }
    })
    
    
  } catch (error) {
    console.error('❌ GHL shortlink creation error:', error)
    console.error('❌ Error stack:', error.stack)
    return NextResponse.json(
      { 
        result: "error",
        message: "Failed to create shortlink",
        error: error.message,
        debug: {
          errorType: error.constructor.name,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}
