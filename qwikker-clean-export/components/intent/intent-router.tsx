'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface QRAssignment {
  id: string
  business_id: string
  assignment_type: 'explore' | 'offers' | 'secret_menu' | 'general'
  target_content_id?: string
  qr_code_templates: {
    id: string
    code_name: string
    qr_type: string
    city: string
  }
  business_profiles: {
    id: string
    business_name: string
    slug: string
    status: string
  }
}

interface IntentRouterProps {
  assignment: QRAssignment | null
  userId?: string
  qrCodeId: string
}

export function IntentRouter({ assignment, userId, qrCodeId }: IntentRouterProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    processIntent()
  }, [])

  const processIntent = async () => {
    try {
      // Update analytics with client-side data
      await supabase
        .from('qr_code_analytics')
        .update({
          user_agent: navigator.userAgent,
          device_type: getDeviceType(),
          ip_address: null // Will be filled by server if needed
        })
        .eq('qr_code_id', qrCodeId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!assignment) {
        // QR code not assigned - check if it exists in inventory
        const { data: qrInventory } = await supabase
          .from('qr_code_inventory')
          .select('qr_code, qr_type, city, physical_format')
          .eq('qr_code', qrCodeId)
          .single()

        if (qrInventory) {
          // QR exists but unassigned - show coming soon page
          router.push(`/coming-soon?qr=${qrInventory.qr_code}&city=${qrInventory.city}&type=${qrInventory.qr_type}`)
        } else {
          // QR doesn't exist - redirect to general dashboard
          router.push('/user/dashboard?ref=qr_invalid')
        }
        return
      }

      if (assignment.business_profiles.status !== 'approved') {
        // Business not approved yet - show coming soon message
        router.push(`/user/dashboard?ref=qr_pending&business=${assignment.business_profiles.business_name}`)
        return
      }

      // Check if user exists (has wallet pass)
      if (userId) {
        // Existing user - direct to content
        await routeExistingUser(assignment)
      } else {
        // New user - store intent and redirect to onboarding
        await storeIntentAndRedirect(assignment)
      }

    } catch (error) {
      console.error('Error processing intent:', error)
      router.push('/user/dashboard?ref=qr_error')
    } finally {
      setIsProcessing(false)
    }
  }

  const routeExistingUser = async (assignment: QRAssignment) => {
    const businessSlug = assignment.business_profiles.slug

    switch (assignment.assignment_type) {
      case 'explore':
        router.push(`/user/discover?highlight=${businessSlug}&ref=qr`)
        break
      case 'offers':
        if (assignment.target_content_id) {
          router.push(`/user/offers?highlight=${assignment.target_content_id}&business=${businessSlug}&ref=qr`)
        } else {
          router.push(`/user/offers?business=${businessSlug}&ref=qr`)
        }
        break
      case 'secret_menu':
        router.push(`/user/secret-menu?business=${businessSlug}&ref=qr`)
        break
      case 'general':
      default:
        router.push(`/user/dashboard?ref=qr&business=${businessSlug}`)
        break
    }

    // Mark analytics as target reached
    await supabase
      .from('qr_code_analytics')
      .update({ target_reached: true })
      .eq('qr_code_id', qrCodeId)
      .order('created_at', { ascending: false })
      .limit(1)
  }

  const storeIntentAndRedirect = async (assignment: QRAssignment) => {
    // Generate a temporary session ID for intent tracking
    const sessionId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Store the intent for deferred deep linking
    await supabase
      .from('intent_queue')
      .insert({
        user_identifier: sessionId,
        intent_type: assignment.assignment_type,
        business_id: assignment.business_id,
        target_content_id: assignment.target_content_id,
        qr_code_id: qrCodeId,
        payload: {
          business_name: assignment.business_profiles.business_name,
          business_slug: assignment.business_profiles.slug,
          qr_code_name: assignment.qr_code_templates.code_name,
          city: assignment.qr_code_templates.city
        }
      })

    // Redirect to wallet pass creation with session tracking
    const city = assignment.qr_code_templates.city
    const redirectUrl = `https://${city}.qwikker.com/join?intent=${sessionId}&ref=qr&business=${assignment.business_profiles.business_name}`
    
    router.push(redirectUrl)
  }

  const getDeviceType = (): string => {
    const userAgent = navigator.userAgent
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet'
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile'
    return 'desktop'
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl font-bold text-black">Q</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Loading...</h2>
          <p className="text-slate-400">Taking you to your content</p>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00d083]"></div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
