import { NextResponse } from 'next/server'
import { updateContactEverywhere } from '@/lib/actions/seamless-updates'

export async function POST(request: Request) {
  try {
    const { contactId, updates } = await request.json()
    
    if (!contactId || !updates) {
      return NextResponse.json({ error: 'Contact ID and updates are required' }, { status: 400 })
    }
    
    console.log('🔄 Admin contact update request:', { contactId, updates })
    
    // Use the seamless update system
    const result = await updateContactEverywhere(contactId, updates, 'admin')
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        contact: result.data?.contact ? {
          id: result.data.contact.id,
          business_name: result.data.contact.business_name,
          email: result.data.contact.email,
          updated_at: result.data.contact.updated_at,
          first_name: result.data.contact.first_name,
          last_name: result.data.contact.last_name,
          phone: result.data.contact.phone
        } : undefined,
        updatedFields: result.data?.updatedFields || Object.keys(updates),
        ghlSyncSuccess: result.ghlSyncSuccess,
        warnings: result.errors // Non-critical errors as warnings
      })
    } else {
      return NextResponse.json({ 
        error: result.message,
        details: result.errors?.join('; ') || 'Unknown error'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('💥 Contact update API error:', error)
    return NextResponse.json({ 
      error: 'Failed to update contact',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
