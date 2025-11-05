import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadToCloudinary } from '@/lib/actions/file-actions'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in to upload menus' },
        { status: 401 }
      )
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('menu') as File
    const menuName = formData.get('menuName') as string
    const menuType = formData.get('menuType') as string

    if (!file || !menuName || !menuType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: menu file, menu name, and menu type'
      }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Only PDF files are allowed for menus.'
      }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      }, { status: 400 })
    }

    // Get business profile
    const { data: businessProfile, error: profileError } = await supabase
      .from('business_profiles')
      .select('id, business_name, city')
      .eq('user_id', user.id)
      .single()

    if (profileError || !businessProfile) {
      return NextResponse.json({
        success: false,
        error: 'Business profile not found. Please complete your business registration first.'
      }, { status: 404 })
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(file, 'qwikker/menus')
    
    if (!uploadResult.success) {
      return NextResponse.json({
        success: false,
        error: uploadResult.error || 'Failed to upload menu file'
      }, { status: 500 })
    }

    // Insert menu record into database
    const { data: menuRecord, error: insertError } = await supabase
      .from('menus')
      .insert({
        business_id: businessProfile.id,
        menu_name: menuName,
        menu_type: menuType,
        menu_url: uploadResult.data.secure_url,
        status: 'pending',
        file_size: file.size,
        original_filename: file.name
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to save menu record to database'
      }, { status: 500 })
    }

    // Send Slack notification for menu submission
    try {
      const { sendCitySlackNotification } = await import('@/lib/utils/dynamic-notifications')
      
      await sendCitySlackNotification({
        title: `New Menu Submitted: ${businessProfile.business_name}`,
        message: `${businessProfile.business_name} has uploaded a new ${menuType} menu "${menuName}" for admin approval.`,
        city: businessProfile.city || 'bournemouth',
        type: 'business_signup',
        data: { 
          businessName: businessProfile.business_name, 
          menuName,
          menuType,
          menuId: menuRecord.id 
        }
      })
      
      console.log(`📢 Slack notification sent for menu submission: ${businessProfile.business_name}`)
    } catch (error) {
      console.error('⚠️ Slack notification error (non-critical):', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Menu uploaded successfully and submitted for admin approval',
      data: {
        id: menuRecord.id,
        menu_name: menuName,
        menu_type: menuType,
        status: 'pending'
      }
    })

  } catch (error) {
    console.error('Menu upload error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error during menu upload'
    }, { status: 500 })
  }
}