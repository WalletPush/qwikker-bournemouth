import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * EMERGENCY EMAIL FIX API
 * Use this to fix a user's auth email when they accidentally changed it
 * and can no longer log in
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, newEmail, oldEmail } = await request.json()
    
    if (!userId || !newEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and newEmail are required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    console.log(`🔧 EMERGENCY EMAIL FIX for user ${userId}`)
    console.log(`   Old email: ${oldEmail || 'unknown'}`)
    console.log(`   New email: ${newEmail}`)

    // Step 1: Update auth.users email
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        email: newEmail,
        email_confirm: true // Skip verification
      }
    )

    if (authError) {
      console.error('❌ Failed to update auth email:', authError)
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to update auth email: ${authError.message}` 
        },
        { status: 500 }
      )
    }

    console.log('✅ Auth email updated successfully')

    // Step 2: Update business_profiles email to match
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .update({ 
        email: newEmail,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (profileError) {
      console.error('❌ Failed to update profile email:', profileError)
      return NextResponse.json(
        { 
          success: false, 
          error: `Auth email updated but profile update failed: ${profileError.message}` 
        },
        { status: 500 }
      )
    }

    console.log('✅ Profile email updated successfully')

    return NextResponse.json({
      success: true,
      message: `Email successfully changed to ${newEmail}. User can now log in with this email.`,
      authUser: {
        id: authUser.user.id,
        email: authUser.user.email,
      },
      profile: {
        id: profile.id,
        email: profile.email,
        business_name: profile.business_name
      }
    })

  } catch (error) {
    console.error('❌ Emergency email fix error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

