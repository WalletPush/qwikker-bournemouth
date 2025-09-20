import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromRequest } from '@/lib/utils/city-detection'

export async function GET(request: Request) {
  try {
    const supabaseAdmin = createAdminClient()
    const city = getCityFromRequest(new Headers(request.headers))
    
    console.log(`📞 Fetching contacts for ${city}`)
    
    // Fetch all business contacts for this city
    const { data: contacts, error } = await supabaseAdmin
      .from('business_profiles')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        email,
        phone,
        business_name,
        business_type,
        business_category,
        business_town,
        business_address,
        business_postcode,
        status,
        created_at,
        updated_at,
        additional_notes,
        admin_notes
      `)
      .eq('city', city)
      .not('email', 'is', null) // Only contacts with email addresses
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }
    
    // Transform the data to match our Contact interface
    const transformedContacts = contacts?.map(contact => ({
      ...contact,
      // Add default values for fields that might not exist yet
      last_ghl_sync: null,
      ghl_contact_id: null,
      website: null,
      instagram: null,
      facebook: null,
      referral_source: null,
      goals: null,
      notes: contact.additional_notes ? 
        (() => {
          try {
            const parsed = JSON.parse(contact.additional_notes)
            return parsed.notes || ''
          } catch {
            return contact.additional_notes
          }
        })() : ''
    })) || []
    
    console.log(`✅ Retrieved ${transformedContacts.length} contacts for ${city}`)
    
    return NextResponse.json({
      success: true,
      contacts: transformedContacts,
      city,
      total: transformedContacts.length
    })
    
  } catch (error) {
    console.error('Contacts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
