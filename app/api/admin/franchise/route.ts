import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/franchise - List all franchises
export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()
    
    const { data: franchises, error } = await supabaseAdmin
      .from('franchise_crm_configs')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Failed to fetch franchises:', error)
      return NextResponse.json({ error: 'Failed to fetch franchises' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      franchises: franchises || []
    })
    
  } catch (error) {
    console.error('Franchise API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/franchise - Add new franchise
// NOTE: API keys (Google Places, Resend) should ideally be encrypted using Supabase Vault
// For MVP, they are stored as plain text with RLS protection
export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    const {
      city,
      display_name,
      subdomain,
      ghl_webhook_url,
      ghl_update_webhook_url,
      slack_webhook_url,
      slack_channel,
      owner_name,
      owner_email,
      owner_phone,
      timezone,
      google_places_api_key,
      resend_api_key,
      founding_member_enabled,
      founding_member_total_spots,
      founding_member_trial_days,
      founding_member_discount_percent
    } = data
    
    // Validate required fields
    if (!city || !display_name || !subdomain || !ghl_webhook_url || !owner_name || !owner_email) {
      return NextResponse.json({ 
        error: 'Missing required fields: city, display_name, subdomain, ghl_webhook_url, owner_name, owner_email' 
      }, { status: 400 })
    }
    
    const supabaseAdmin = createAdminClient()
    
    const { data: franchise, error } = await supabaseAdmin
      .from('franchise_crm_configs')
      .insert({
        city,
        display_name,
        subdomain,
        ghl_webhook_url,
        ghl_update_webhook_url,
        slack_webhook_url,
        slack_channel,
        owner_name,
        owner_email,
        owner_phone,
        timezone: timezone || 'UTC',
        google_places_api_key,
        resend_api_key,
        founding_member_enabled: founding_member_enabled !== undefined ? founding_member_enabled : true,
        founding_member_total_spots: founding_member_total_spots || 150,
        founding_member_trial_days: founding_member_trial_days || 90,
        founding_member_discount_percent: founding_member_discount_percent || 20,
        status: 'active'
      })
      .select()
    
    if (error) {
      console.error('Failed to create franchise:', error)
      return NextResponse.json({ 
        error: `Failed to create franchise: ${error.message}` 
      }, { status: 500 })
    }
    
    if (!franchise || franchise.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to create franchise - no data returned' 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Franchise created successfully',
      franchise: franchise[0]
    })
    
  } catch (error) {
    console.error('Franchise creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/franchise - Update existing franchise  
export async function PUT(request: Request) {
  try {
    const data = await request.json()
    const { id, ...updates } = data
    
    if (!id) {
      return NextResponse.json({ error: 'Franchise ID is required' }, { status: 400 })
    }
    
    const supabaseAdmin = createAdminClient()
    
    const { data: franchises, error } = await supabaseAdmin
      .from('franchise_crm_configs')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) {
      console.error('Failed to update franchise:', error)
      return NextResponse.json({ 
        error: `Failed to update franchise: ${error.message}` 
      }, { status: 500 })
    }
    
    if (!franchises || franchises.length === 0) {
      return NextResponse.json({ 
        error: 'Franchise not found' 
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Franchise updated successfully',
      franchise: franchises[0]
    })
    
  } catch (error) {
    console.error('Franchise update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
