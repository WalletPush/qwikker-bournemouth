import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendContactUpdateToGoHighLevel } from '@/lib/integrations'

export async function POST(request: Request) {
  try {
    const { contactId } = await request.json()
    
    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
    }
    
    const supabaseAdmin = createAdminClient()
    
    // Get the contact data
    const { data: contact, error } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('id', contactId)
      .single()
    
    if (error || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }
    
    // Prepare GHL data format
    const ghlData = {
      // Personal info
      firstName: contact.first_name || '',
      lastName: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      
      // Business info
      businessName: contact.business_name || '',
      businessType: contact.business_type || '',
      businessCategory: contact.business_category || '',
      businessAddress: contact.business_address || '',
      town: contact.business_town || '',
      postcode: contact.business_postcode || '',
      
      // Optional fields
      website: contact.website || '',
      instagram: contact.instagram || '',
      facebook: contact.facebook || '',
      
      // File URLs
      logo_url: contact.logo || '',
      menu_url: contact.menu_url || '',
      offer_image_url: contact.offer_image || '',
      
      // Offer data
      offerName: contact.offer_name || '',
      offerType: contact.offer_type || '',
      offerValue: contact.offer_value || '',
      offerTerms: contact.offer_terms || '',
      offerStartDate: contact.offer_start_date || '',
      offerEndDate: contact.offer_end_date || '',
      
      // Additional data
      referralSource: contact.referral_source || '',
      goals: contact.goals || '',
      notes: contact.additional_notes || '',
      
      // Sync metadata
      contactSync: true,
      syncType: 'manual_contact_sync',
      syncedAt: new Date().toISOString(),
      qwikkerContactId: contact.id,
      city: contact.city,
      status: contact.status
    }
    
    // Send to GHL
    await sendContactUpdateToGoHighLevel(ghlData)
    
    // Update the contact with sync timestamp
    const { error: updateError } = await supabaseAdmin
      .from('business_profiles')
      .update({
        last_ghl_sync: new Date().toISOString(),
        // Note: We don't have ghl_contact_id from the response yet
        // This would need to be implemented based on GHL's response format
      })
      .eq('id', contactId)
    
    if (updateError) {
      console.error('Failed to update sync timestamp:', updateError)
      // Don't fail the request for this
    }
    
    console.log(`✅ Contact ${contact.business_name} synced with GHL`)
    
    return NextResponse.json({
      success: true,
      message: 'Contact successfully synced with GHL',
      contact: {
        id: contact.id,
        business_name: contact.business_name,
        email: contact.email
      }
    })
    
  } catch (error) {
    console.error('GHL sync error:', error)
    return NextResponse.json({ 
      error: 'Failed to sync contact with GHL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
