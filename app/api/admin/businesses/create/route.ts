import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    
    // Get franchise city for admin isolation
    const city = await getFranchiseCityFromRequest()
    
    const {
      businessName,
      businessType,
      businessCategory,
      businessTown,
      businessAddress,
      businessPostcode,
      contactEmail,
      contactPhone,
      firstName,
      lastName,
      businessHours,
      businessDescription,
      businessTagline,
      plan = 'starter',
      autoApprove = false,
      adminUserId
    } = await request.json()

    if (!businessName || !businessType || !contactEmail || !adminUserId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: businessName, businessType, contactEmail, adminUserId'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(contactEmail)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 })
    }

    // Check if business with this email already exists
    const { data: existingBusiness, error: checkError } = await supabase
      .from('business_profiles')
      .select('id, business_name, email')
      .eq('email', contactEmail)
      .eq('city', city)
      .single()

    if (existingBusiness) {
      return NextResponse.json({
        success: false,
        error: `A business with email ${contactEmail} already exists: ${existingBusiness.business_name}`
      }, { status: 409 })
    }

    // Generate a temporary password (business owner should change this)
    const tempPassword = `Qwikker${Math.random().toString(36).slice(-8)}!`
    
    // Create auth user first
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: contactEmail,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email for admin-created accounts
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        created_by_admin: true,
        admin_id: adminUserId,
        franchise_city: city
      }
    })

    if (authError || !authUser.user) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json({
        success: false,
        error: `Failed to create user account: ${authError?.message || 'Unknown error'}`
      }, { status: 500 })
    }

    // Create business profile
    const businessData = {
      user_id: authUser.user.id,
      city: city,
      first_name: firstName || null,
      last_name: lastName || null,
      email: contactEmail,
      phone: contactPhone || null,
      business_name: businessName,
      business_type: businessType,
      business_category: businessCategory || null,
      business_town: businessTown || city,
      business_address: businessAddress || null,
      business_postcode: businessPostcode || null,
      business_hours: businessHours || null,
      business_description: businessDescription || null,
      business_tagline: businessTagline || null,
      plan: plan,
      status: autoApprove ? 'approved' : 'pending_review',
      approved_by: autoApprove ? adminUserId : null,
      approved_at: autoApprove ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      profile_completion_percentage: 60, // Basic info completed
      additional_notes: `Created by admin ${adminUserId} on ${new Date().toISOString()}`
    }

    const { data: businessProfile, error: profileError } = await supabase
      .from('business_profiles')
      .insert(businessData)
      .select()
      .single()

    if (profileError) {
      console.error('Error creating business profile:', profileError)
      
      // Clean up auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authUser.user.id)
      
      return NextResponse.json({
        success: false,
        error: `Failed to create business profile: ${profileError.message}`
      }, { status: 500 })
    }

    // Create corresponding profiles entry (for plan management)
    const { error: profilesError } = await supabase
      .from('profiles')
      .insert({
        user_id: authUser.user.id,
        plan: plan,
        email: contactEmail,
        first_name: firstName,
        last_name: lastName
      })

    if (profilesError) {
      console.error('Error creating profiles entry:', profilesError)
      // This is not critical, continue without failing
    }

    // If auto-approved, add to knowledge base
    if (autoApprove) {
      try {
        const { addBasicBusinessKnowledge } = await import('@/lib/ai/embeddings')
        
        await addBasicBusinessKnowledge(businessProfile.id, city, {
          includeBasicInfo: true,
          includeOffers: false, // No offers yet
          includeMenus: false   // No menus yet
        })
        
        console.log(`✅ Added auto-approved business to knowledge base`)
      } catch (error) {
        console.error('❌ Failed to add business to knowledge base:', error)
        // Don't fail the creation if knowledge base update fails
      }
    }

    // Log the creation for audit trail
    console.log(`🏢 Admin ${adminUserId} created business "${businessName}" for ${contactEmail} in ${city}`)

    return NextResponse.json({
      success: true,
      message: `Business "${businessName}" created successfully`,
      data: {
        businessId: businessProfile.id,
        userId: authUser.user.id,
        businessName,
        contactEmail,
        tempPassword, // Return this so admin can share with business owner
        status: businessProfile.status,
        loginUrl: `https://${city}.qwikker.com/auth/login`
      }
    })

  } catch (error) {
    console.error('Business creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
