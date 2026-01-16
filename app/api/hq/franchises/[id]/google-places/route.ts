import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const configSchema = z.object({
  google_places_public_key: z.string().nullable(),
  google_places_server_key: z.string().nullable(),
  google_places_country: z.string().nullable(),
  city_center_lat: z.number().nullable(),
  city_center_lng: z.number().nullable(),
  onboarding_search_radius_m: z.number().nullable(),
  import_search_radius_m: z.number().nullable(),
  import_max_radius_m: z.number().nullable(),
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
    
    const { data, error } = await supabase
      .from('franchise_crm_configs')
      .update({
        google_places_public_key: config.google_places_public_key,
        google_places_server_key: config.google_places_server_key,
        google_places_country: config.google_places_country,
        city_center_lat: config.city_center_lat,
        city_center_lng: config.city_center_lng,
        onboarding_search_radius_m: config.onboarding_search_radius_m,
        import_search_radius_m: config.import_search_radius_m,
        import_max_radius_m: config.import_max_radius_m,
      })
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
