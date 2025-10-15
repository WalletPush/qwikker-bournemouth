import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { city, currentPassword, newPassword } = await request.json()

    if (!city || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'City, current password, and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get current admin password hash
    const { data: adminData, error: fetchError } = await supabase
      .from('franchise_admins')
      .select('password_hash')
      .eq('city', city)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching admin:', fetchError)
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, adminData.password_hash)
    
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Hash new password
    const saltRounds = 12
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

    // Update password in database
    const { error: updateError } = await supabase
      .from('franchise_admins')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('city', city)

    if (updateError) {
      console.error('❌ Error updating password:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    })

  } catch (error) {
    console.error('❌ Change password API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
