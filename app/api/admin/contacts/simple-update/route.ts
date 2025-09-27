import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  console.log('🔥 SIMPLE UPDATE API CALLED')
  
  try {
    const body = await request.json()
    console.log('🔥 Request body:', body)
    
    const { contactId, updates } = body
    
    if (!contactId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing contactId' 
      }, { status: 400 })
    }
    
    if (!updates) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing updates' 
      }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    
    // Simple update - just the basics
    const { data, error } = await supabase
      .from('business_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
      .select('id, business_name, first_name, last_name, email, phone')
    
    if (error) {
      console.error('🔥 Supabase error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }
    
    // Check if any rows were updated
    if (!data || data.length === 0) {
      console.error('🔥 No business found with ID:', contactId)
      return NextResponse.json({ 
        success: false, 
        error: 'Business not found or no changes made' 
      }, { status: 404 })
    }
    
    console.log('🔥 Update successful:', data[0])
    
    return NextResponse.json({
      success: true,
      message: 'Contact updated successfully',
      contact: data[0] // Return first result since we expect only one
    })
    
  } catch (error) {
    console.error('🔥 API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
