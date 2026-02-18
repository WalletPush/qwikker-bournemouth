import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: cities, error } = await supabase
      .from('franchise_public_info')
      .select('city, display_name, subdomain, country_name, status')
      .in('status', ['active', 'pending_setup'])
      .order('country_name')
      .order('display_name')

    if (error) {
      console.error('Error fetching live cities:', error)
      return NextResponse.json({ cities: [] })
    }

    return NextResponse.json({ cities: cities || [] })
  } catch (error) {
    console.error('Error in live-cities API:', error)
    return NextResponse.json({ cities: [] })
  }
}
