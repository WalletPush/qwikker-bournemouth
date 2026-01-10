import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/claims
 * Fetch all claim requests for a city
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city') || 'bournemouth'

    const supabase = createServiceRoleClient()

    // Fetch claim requests with business details
    const { data: claims, error } = await supabase
      .from('claim_requests')
      .select(`
        id,
        status,
        created_at,
        submitted_at,
        business_email,
        business_website,
        first_name,
        last_name,
        verification_method,
        risk_score,
        risk_level,
        is_founding_member,
        founding_member_spot_number,
        data_edited,
        edited_business_name,
        edited_address,
        edited_phone,
        edited_website,
        edited_hours,
        edited_category,
        edited_type,
        edited_description,
        logo_upload,
        hero_image_upload,
        business:business_profiles(
          id,
          business_name,
          business_address,
          business_category,
          business_type,
          rating,
          review_count,
          years_on_google,
          business_images
        )
      `)
      .eq('city', city)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching claims:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch claims'
      }, { status: 500 })
    }

    // Transform data for frontend
    const transformedClaims = (claims || []).map((claim: any) => {
      // Calculate risk score based on verification factors
      let riskScore = 0
      let emailDomainMatch = false
      
      // Check if email domain matches business website domain
      if (claim.business_email && claim.business_website) {
        const emailDomain = claim.business_email.split('@')[1]?.toLowerCase()
        const websiteDomain = claim.business_website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase()
        emailDomainMatch = emailDomain === websiteDomain || websiteDomain.includes(emailDomain)
        
        if (!emailDomainMatch) {
          riskScore += 30 // Major risk: email doesn't match website
        }
      } else if (!claim.business_website) {
        riskScore += 10 // Minor risk: no website to verify
      }
      
      // Check account age (just created = higher risk)
      const accountAgeMinutes = Math.floor((Date.now() - new Date(claim.created_at).getTime()) / (1000 * 60))
      if (accountAgeMinutes < 15) {
        riskScore += 20 // Account created very recently
      }
      
      // Generic email check (gmail, yahoo, hotmail, etc.)
      if (claim.business_email) {
        const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com']
        const emailDomain = claim.business_email.split('@')[1]?.toLowerCase()
        if (genericDomains.includes(emailDomain)) {
          riskScore += 15 // Using personal email, not business email
        }
      }
      
      // Determine risk level
      let riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
      if (riskScore === 0) riskLevel = 'safe'
      else if (riskScore <= 20) riskLevel = 'low'
      else if (riskScore <= 40) riskLevel = 'medium'
      else if (riskScore <= 60) riskLevel = 'high'
      else riskLevel = 'critical'
      
      console.log(`Risk calculation for ${claim.business?.business_name}: ${riskScore}/100 (${riskLevel})`)
      
      // Generate confidence badge
      let confidenceBadge = 'Email verified'
      if (emailDomainMatch) {
        confidenceBadge = 'VERY HIGH - Email domain matches website'
      } else if (riskLevel === 'critical') {
        confidenceBadge = '🚨 Generic email, multiple risk factors'
      } else if (riskLevel === 'medium' || riskLevel === 'high') {
        confidenceBadge = 'Email does not match website'
      }
      
      return {
        id: claim.id,
        status: claim.status,
        createdAt: claim.created_at,
        submittedAt: claim.submitted_at,
        user: {
          name: `${claim.first_name || ''} ${claim.last_name || ''}`.trim(),
          email: claim.business_email,
          accountCreated: claim.created_at
        },
        business: {
          id: claim.business?.id,
          name: claim.business?.business_name,
          address: claim.business?.business_address,
          category: claim.business?.business_category,
          type: claim.business?.business_type,
          rating: claim.business?.rating,
          reviewCount: claim.business?.review_count,
          googleYears: claim.business?.years_on_google,
          image: claim.business?.business_images?.[0] || null
        },
        website: claim.business_website,
        verification: {
          emailDomainMatch,
          phoneVerified: false,
          duplicateClaims: 0,
          deniedClaims: 0,
          riskScore,
          riskLevel,
          confidenceBadge
        },
        foundingMemberEligible: claim.is_founding_member || false,
        foundingMemberCount: claim.founding_member_spot_number || 0,
        dataEdited: claim.data_edited || false,
        editedData: claim.data_edited ? {
          businessName: claim.edited_business_name,
          address: claim.edited_address,
          phone: claim.edited_phone,
          website: claim.edited_website,
          hours: claim.edited_hours,
          category: claim.edited_category,
          type: claim.edited_type,
          description: claim.edited_description,
          logoUrl: claim.logo_upload,
          heroImageUrl: claim.hero_image_upload
        } : null
      }
    })

    return NextResponse.json({
      success: true,
      claims: transformedClaims
    })

  } catch (error: any) {
    console.error('Claims API error:', error)
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred'
    }, { status: 500 })
  }
}

