import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { addBasicBusinessKnowledge } from '@/lib/actions/knowledge-base-actions'
import { sendContactUpdateToGoHighLevel } from '@/lib/integrations'
import { sendBusinessApprovedNotification, getUsersForBusinessNotifications, sendNewOfferNotification } from '@/lib/notifications/business-notifications'

export async function POST(request: NextRequest) {
  try {
    const { businessId, action } = await request.json()
    
    if (!businessId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Get admin session from cookie
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')

    if (!adminSessionCookie?.value) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Verify admin exists and get city from request
    const admin = await getAdminById(adminSession.adminId)
    const hostname = request.headers.get('host') || ''
    const requestCity = await getCityFromHostname(hostname)
    
    if (!admin || !await isAdminForCity(adminSession.adminId, requestCity)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Update business status using admin client
    const supabaseAdmin = createAdminClient()
    let newStatus: string
    let updateData: Record<string, unknown> = {}
    
    switch (action) {
      case 'approve':
        newStatus = 'approved'
        updateData = {
          status: newStatus,
          approved_at: new Date().toISOString()
        }
        break
      case 'reject':
        newStatus = 'rejected'
        updateData = {
          status: newStatus,
          approved_at: new Date().toISOString()
        }
        break
      case 'restore':
        newStatus = 'pending_review'
        updateData = {
          status: newStatus,
          approved_at: null // Clear the approval timestamp
        }
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
    
    const { data, error } = await supabaseAdmin
      .from('business_profiles')
      .update(updateData)
      .eq('id', businessId)
      .eq('city', requestCity) // Only allow updating businesses in admin's city
      .select()
      .single()
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update business status' },
        { status: 500 }
      )
    }
    
    const actionPastTense = action === 'restore' ? 'restored' : `${action}d`
    console.log(`✅ Business ${data.business_name} ${actionPastTense} by ${admin.username} in ${requestCity}`)
    
    // 🧠 HYBRID KNOWLEDGE BASE: Auto-add basic info when approved
    if (action === 'approve') {
      try {
        const knowledgeResult = await addBasicBusinessKnowledge(businessId, admin.id)
        if (knowledgeResult.success) {
          console.log(`🧠 Basic knowledge added for ${data.business_name}`)
        } else {
          console.error(`⚠️ Failed to add knowledge for ${data.business_name}:`, knowledgeResult.error)
        }
      } catch (error) {
        console.error('⚠️ Knowledge base integration error (non-critical):', error)
      }

      // 🔔 SEND PUSH NOTIFICATIONS: Business approved
      try {
        // Notify business owner
        if (data.user_id) {
          await sendBusinessApprovedNotification(data.user_id, data.business_name || 'Your Business')
          console.log(`🔔 Approval notification sent to business owner: ${data.business_name}`)
        }

        // Notify users about new business (if has offers)
        if (data.offer_name && data.offer_value) {
          const userIds = await getUsersForBusinessNotifications(data.city || 'bournemouth', data.business_type)
          if (userIds.length > 0) {
            await sendNewOfferNotification(
              userIds,
              data.business_name || 'New Business',
              data.offer_name,
              data.offer_value
            )
            console.log(`🔔 New offer notification sent to ${userIds.length} users`)
          }
        }
      } catch (error) {
        console.error('⚠️ Push notification error (non-critical):', error)
      }

      // 📧 SEND EMAIL NOTIFICATIONS: Business approved
      try {
        const { sendBusinessApprovalNotification } = await import('@/lib/notifications/email-notifications')
        
        if (data.email && data.business_name) {
          const emailResult = await sendBusinessApprovalNotification({
            firstName: data.first_name || 'Business Owner',
            businessName: data.business_name,
            city: requestCity,
            dashboardUrl: `https://${requestCity}.qwikker.com/dashboard`,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@qwikker.com'
          })
          
          if (emailResult.success) {
            console.log(`📧 Business approval email sent to ${data.email}`)
          } else {
            console.error(`❌ Failed to send approval email: ${emailResult.error}`)
          }
        }
      } catch (error) {
        console.error('⚠️ Email notification error (non-critical):', error)
      }

      // 📢 SEND SLACK NOTIFICATION: Business approved
      try {
        const { sendCitySlackNotification } = await import('@/lib/utils/dynamic-notifications')
        
        await sendCitySlackNotification({
          title: `Business Approved: ${data.business_name}`,
          message: `${data.business_name} has been approved by ${admin.username || 'Admin'} and is now live on the platform.`,
          city: requestCity,
          type: 'business_signup',
          data: { businessName: data.business_name, businessType: data.business_type }
        })
        
        console.log(`📢 Slack notification sent for business approval: ${data.business_name}`)
      } catch (error) {
        console.error('⚠️ Slack notification error (non-critical):', error)
      }
    }
    
    // 📧 SEND EMAIL NOTIFICATIONS: Business rejected
    if (action === 'reject') {
      try {
        const { sendBusinessRejectionNotification } = await import('@/lib/notifications/email-notifications')
        
        if (data.email && data.business_name) {
          const emailResult = await sendBusinessRejectionNotification({
            firstName: data.first_name || 'Business Owner',
            businessName: data.business_name,
            rejectionReason: data.admin_notes || 'Please review and update your business information.',
            city: requestCity,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@qwikker.com'
          })
          
          if (emailResult.success) {
            console.log(`📧 Business rejection email sent to ${data.email}`)
          } else {
            console.error(`❌ Failed to send rejection email: ${emailResult.error}`)
          }
        }
      } catch (error) {
        console.error('⚠️ Email notification error (non-critical):', error)
      }
    }
    
    // 📞 SYNC STATUS CHANGES TO GHL (for all actions)
    try {
      const ghlData = {
        // Personal info
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        
        // Business info
        businessName: data.business_name || '',
        businessType: data.business_type || '',
        businessCategory: data.business_category || '',
        businessAddress: data.business_address || '',
        town: data.business_town || '',
        postcode: data.business_postcode || '',
        
        // Optional fields
        website: data.website || '',
        instagram: data.instagram || '',
        facebook: data.facebook || '',
        
        // File URLs
        logo_url: data.logo || '',
        menu_url: data.menu_url || '',
        
        // Offer data (if exists)
        offerName: data.offer_name || '',
        offerType: data.offer_type || '',
        offerValue: data.offer_value || '',
        offerTerms: data.offer_terms || '',
        offerStartDate: data.offer_start_date || '',
        offerEndDate: data.offer_end_date || '',
        
        // Status and metadata
        status: newStatus,
        approvedAt: data.approved_at,
        city: data.city,
        qwikkerContactId: data.id,
        
        // Sync metadata
        contactSync: true,
        syncType: `business_${action}`,
        isUpdate: true,
        updateSource: 'admin_approval',
        adminAction: action,
        adminName: admin.username,
        updatedAt: new Date().toISOString()
      }
      
      await sendContactUpdateToGoHighLevel(ghlData, data.city)
      console.log(`📞 Business ${action} synced to ${data.city} GHL: ${data.business_name}`)
      
    } catch (ghlError) {
      console.error(`⚠️ GHL sync failed after business ${action} (non-critical):`, ghlError)
      // Don't fail the approval if GHL sync fails
    }
    
    return NextResponse.json({
      success: true,
      business: data,
      message: `Business ${action}d successfully`
    })
    
  } catch (error) {
    console.error('Admin approval API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
