import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const configSchema = z.object({
  // Accept single API key (will be duplicated into both public and server)
  google_places_api_key: z.string().optional(),
  // Or accept separate keys (backwards compatibility)
  google_places_public_key: z.string().nullable().optional(),
  google_places_server_key: z.string().nullable().optional(),
  google_places_country: z.string().nullable().optional(),
  city_center_lat: z.number().nullable().optional(),
  city_center_lng: z.number().nullable().optional(),
  onboarding_search_radius_m: z.number().nullable().optional(),
  import_search_radius_m: z.number().nullable().optional(),
  import_max_radius_m: z.number().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const franchiseId = params.id
    
    if (!franchiseId) {
      return NextResponse.json(
        { error: 'Franchise ID required' },
        { status: 400 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validation = configSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid configuration', details: validation.error.format() },
        { status: 400 }
      )
    }
    
    const config = validation.data
    
    // If single API key provided, duplicate it into both public and server keys
    let publicKey = config.google_places_public_key
    let serverKey = config.google_places_server_key
    
    if (config.google_places_api_key) {
      publicKey = config.google_places_api_key
      serverKey = config.google_places_api_key
    }
    
    // Validate radii
    if (config.onboarding_search_radius_m && config.onboarding_search_radius_m < 5000) {
      return NextResponse.json(
        { error: 'Onboarding radius must be at least 5km' },
        { status: 400 }
      )
    }
    
    if (config.import_max_radius_m && config.import_search_radius_m) {
      if (config.import_search_radius_m > config.import_max_radius_m) {
        return NextResponse.json(
          { error: 'Import default radius cannot exceed max radius' },
          { status: 400 }
        )
      }
    }
    
    // Update franchise_crm_configs
    const supabase = createAdminClient()
    
    const updatePayload: any = {}
    
    // Only update fields that are provided
    if (publicKey !== undefined) updatePayload.google_places_public_key = publicKey
    if (serverKey !== undefined) updatePayload.google_places_server_key = serverKey
    if (config.google_places_country !== undefined) updatePayload.google_places_country = config.google_places_country
    if (config.city_center_lat !== undefined) updatePayload.city_center_lat = config.city_center_lat
    if (config.city_center_lng !== undefined) updatePayload.city_center_lng = config.city_center_lng
    if (config.onboarding_search_radius_m !== undefined) updatePayload.onboarding_search_radius_m = config.onboarding_search_radius_m
    if (config.import_search_radius_m !== undefined) updatePayload.import_search_radius_m = config.import_search_radius_m
    if (config.import_max_radius_m !== undefined) updatePayload.import_max_radius_m = config.import_max_radius_m
    
    const { data, error } = await supabase
      .from('franchise_crm_configs')
      .update(updatePayload)
      .eq('id', franchiseId)
      .select()
      .single()
    
    if (error) {
      console.error('Failed to update Google Places config:', error)
      return NextResponse.json(
        { error: 'Failed to update configuration', message: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data
    })
    
  } catch (error) {
    console.error('Error updating Google Places config:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const franchiseId = params.id
    
    if (!franchiseId) {
      return NextResponse.json(
        { error: 'Franchise ID required' },
        { status: 400 }
      )
    }
    
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from('franchise_crm_configs')
      .select('google_places_public_key, google_places_server_key, google_places_country, city_center_lat, city_center_lng, onboarding_search_radius_m, import_search_radius_m, import_max_radius_m')
      .eq('id', franchiseId)
      .single()
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch configuration' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data
    })
    
  } catch (error) {
    console.error('Error fetching Google Places config:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
