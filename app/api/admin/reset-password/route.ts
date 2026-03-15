import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json()

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: 'Email, code, and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const normalizedEmail = email.trim().toLowerCase()

    // Look up the verification code
    const { data: verificationRecord, error: lookupError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('code', code.trim())
      .eq('type', 'password_reset')
      .single()

    if (lookupError || !verificationRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
        { status: 400 }
      )
    }

    // Check expiry
    if (new Date(verificationRecord.expires_at) < new Date()) {
      // Clean up expired code
      await supabase
        .from('verification_codes')
        .delete()
        .eq('id', verificationRecord.id)

      return NextResponse.json(
        { error: 'Code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Find the admin account
    const { data: admin, error: adminError } = await supabase
      .from('city_admins')
      .select('id, city, username')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .single()

    if (adminError || !admin) {
      return NextResponse.json(
        { error: 'Admin account not found' },
        { status: 404 }
      )
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Update the password
    const { error: updateError } = await supabase
      .from('city_admins')
      .update({
        password_hash: passwordHash,
        password_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', admin.id)

    if (updateError) {
      console.error('Failed to update password:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    // Delete the used verification code
    await supabase
      .from('verification_codes')
      .delete()
      .eq('id', verificationRecord.id)

    console.log(`Password reset successful for admin: ${admin.username} (${admin.city})`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reset password API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
