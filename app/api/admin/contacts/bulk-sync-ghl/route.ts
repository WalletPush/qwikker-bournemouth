import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendContactUpdateToGoHighLevel } from '@/lib/integrations'

export async function POST(request: Request) {
  try {
    const { contactIds, city } = await request.json()
    
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'Contact IDs array is required' }, { status: 400 })
    }
    
    const supabaseAdmin = createAdminClient()
    
    // Get all contacts
    const { data: contacts, error } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .in('id', contactIds)
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }
    
    let syncedCount = 0
    let failedCount = 0
    const errors: string[] = []
    
    console.log(`🔄 Starting bulk sync of ${contacts?.length || 0} contacts for ${city}`)
    
    // Process contacts in batches to avoid overwhelming GHL
    const batchSize = 5
    const batches = []
    
    for (let i = 0; i < (contacts?.length || 0); i += batchSize) {
      batches.push(contacts!.slice(i, i + batchSize))
    }
    
    for (const batch of batches) {
      const promises = batch.map(async (contact) => {
        try {
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
            syncType: 'bulk_contact_sync',
            syncedAt: new Date().toISOString(),
            qwikkerContactId: contact.id,
            city: contact.city,
            status: contact.status
          }
          
          // Send to GHL
          await sendContactUpdateToGoHighLevel(ghlData)
          
          // Update sync timestamp
          await supabaseAdmin
            .from('business_profiles')
            .update({ last_ghl_sync: new Date().toISOString() })
            .eq('id', contact.id)
          
          syncedCount++
          console.log(`✅ Synced ${contact.business_name}`)
          
        } catch (error) {
          failedCount++
          const errorMsg = `Failed to sync ${contact.business_name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      })
      
      // Wait for batch to complete before processing next batch
      await Promise.all(promises)
      
      // Small delay between batches to be respectful to GHL API
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    console.log(`🏁 Bulk sync complete: ${syncedCount} synced, ${failedCount} failed`)
    
    return NextResponse.json({
      success: true,
      synced: syncedCount,
      failed: failedCount,
      total: contacts?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
      message: `Bulk sync completed: ${syncedCount}/${contacts?.length || 0} contacts synced successfully`
    })
    
  } catch (error) {
    console.error('Bulk sync error:', error)
    return NextResponse.json({ 
      error: 'Failed to bulk sync contacts with GHL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
