import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { addBasicBusinessKnowledge } from '@/lib/actions/knowledge-base-actions'
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
    
    // Fetch the business to check its tier before deciding approval path
    const { data: business } = await supabaseAdmin
      .from('business_profiles')
      .select('business_tier, city')
      .eq('id', businessId)
      .single()

    switch (action) {
      case 'approve':
        if (business?.business_tier === 'free_tier') {
          // Free listing path: set claimed_free (locks dashboard, no subscription needed)
          newStatus = 'claimed_free'
          updateData = {
            status: newStatus,
            approved_at: new Date().toISOString()
          }
        } else {
          // Trial path: set approved, then create trial subscription via RPC
          newStatus = 'approved'
          updateData = {
            status: newStatus,
            approved_at: new Date().toISOString()
          }
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
    
    // Create trial subscription for non-free-listing approvals
    if (action === 'approve' && business?.business_tier !== 'free_tier') {
      try {
        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('approve_business_with_trial', {
          p_business_id: businessId,
          p_approved_by: admin.id
        })
        if (rpcError) {
          console.error('⚠️ Trial subscription RPC error (non-critical):', rpcError)
        } else {
          console.log(`✅ Trial subscription created for ${data.business_name}:`, rpcResult)
        }
      } catch (error) {
        console.error('⚠️ Trial subscription error (non-critical):', error)
      }
    }

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
        // 🔒 GUARD: Never send notifications to auto-imported unclaimed businesses
        // Three-way check (status already changed to 'approved' by this point)
        const isUnclaimedImport = 
          data.auto_imported === true && 
          !data.owner_user_id && 
          !data.claimed_at
        
        // Notify business owner
        if (data.user_id && !isUnclaimedImport) {
          await sendBusinessApprovedNotification(data.user_id, data.business_name || 'Your Business')
          console.log(`🔔 Approval notification sent to business owner: ${data.business_name}`)
        } else if (isUnclaimedImport) {
          console.log(`⏭️ Skipped notification (auto-imported, unclaimed): ${data.business_name}`)
        }

        // Notify users about new business (if has offers)
        // 🔒 GUARD: Only notify users if this is a real claimed business (not auto-imported unclaimed)
        if (data.offer_name && data.offer_value && !isUnclaimedImport) {
          const { getRequestCityFallback } = await import('@/lib/utils/city-detection')
          const fallbackCity = await getRequestCityFallback(request)
          const userIds = await getUsersForBusinessNotifications(data.city || fallbackCity, data.business_type)
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
        
        // 🔒 GUARD: Never send emails to auto-imported unclaimed businesses
        // Three-way check (status already changed to 'approved' by this point)
        const isUnclaimedImport = 
          data.auto_imported === true && 
          !data.owner_user_id && 
          !data.claimed_at
        
        // Use deployment URL (Vercel preview) until custom domains are live
        const deploymentUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qwikkerdashboard-theta.vercel.app'
        if (data.email && data.business_name && !isUnclaimedImport) {
          const { getFranchiseSupportEmail } = await import('@/lib/email/send-franchise-email')
          const supportEmail = await getFranchiseSupportEmail(requestCity)
          const emailResult = await sendBusinessApprovalNotification({
            firstName: data.first_name || 'Business Owner',
            businessName: data.business_name,
            city: requestCity,
            dashboardUrl: `${deploymentUrl}/dashboard`,
            supportEmail,
          })
          
          if (emailResult.success) {
            console.log(`📧 Business approval email sent to ${data.email}`)
          } else {
            console.error(`❌ Failed to send approval email: ${emailResult.error}`)
          }
        } else if (isUnclaimedImport) {
          console.log(`⏭️ Skipped email (auto-imported, unclaimed): ${data.business_name}`)
        }
      } catch (error) {
        console.error('⚠️ Email notification error (non-critical):', error)
      }

      // 📢 SEND SLACK NOTIFICATION: Business approved
      try {
        const { sendCitySlackNotification, sendHQSlackNotification } = await import('@/lib/utils/dynamic-notifications')

        const slackPayload = {
          title: `Business Approved: ${data.business_name}`,
          message: `${data.business_name} has been approved by ${admin.username || 'Admin'} and is now live on the platform.`,
          city: requestCity,
          type: 'business_signup' as const,
          data: { businessName: data.business_name, businessType: data.business_type }
        }

        await sendCitySlackNotification(slackPayload)
        sendHQSlackNotification(slackPayload).catch(() => {})
        
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
          const { getFranchiseSupportEmail } = await import('@/lib/email/send-franchise-email')
          const supportEmail = await getFranchiseSupportEmail(requestCity)
          const emailResult = await sendBusinessRejectionNotification({
            firstName: data.first_name || 'Business Owner',
            businessName: data.business_name,
            rejectionReason: data.admin_notes || 'Please review and update your business information.',
            city: requestCity,
            supportEmail,
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
