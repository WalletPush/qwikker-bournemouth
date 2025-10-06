import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Received GHL webhook for offer update')
    
    const data = await request.json()
    console.log('🔍 Offer Update Data:', JSON.stringify(data, null, 2))
    
    // Extract offer update data from GHL
    const {
      email,
      first_name,
      last_name,
      'Serial Number': serialNumber,
      'Current Offer': currentOffer,
      // Any other fields from the workflow
      ...otherFields
    } = data
    
    console.log('📥 Extracted offer update:', { 
      email, 
      serialNumber, 
      currentOffer,
      firstName: first_name,
      lastName: last_name
    })
    
    // Here we could update our database or trigger other actions
    // For now, just log success
    console.log('✅ Offer update webhook processed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Offer update received successfully',
      serialNumber,
      currentOffer
    })
    
  } catch (error) {
    console.error('❌ Offer update webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process offer update', details: error.message },
      { status: 500 }
    )
  }
}
