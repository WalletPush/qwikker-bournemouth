import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { businessId, action, adminEmail } = await request.json()
    
    if (!businessId || !action || !adminEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Verify admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check if user is admin - must be specific admin emails only
    const adminEmails = [
      'admin@qwikker.com',
      'admin@walletpush.io',
      'freespiritfamilies@gmail.com' // TEMPORARY: For testing
    ]
    
    const isAdmin = user.email && adminEmails.includes(user.email)
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Update business status
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        status: newStatus,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .select()
      .single()
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update business status' },
        { status: 500 }
      )
    }
    
    // TODO: Send email notification to business owner
    
    return NextResponse.json({
      success: true,
      business: data,
      message: `Business ${action}d successfully`
    })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
