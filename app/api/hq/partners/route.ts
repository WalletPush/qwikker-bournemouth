import { NextRequest, NextResponse } from 'next/server'
import { requireHQAdmin } from '@/lib/auth/hq'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveTerritoryAvailability } from '@/lib/partners/availability'
import { writeClaimAudit } from '@/lib/partners/claim-transitions'
import { normalizeClaimStatus, canTransitionClaimStatus } from '@/lib/partners/claim-status'
import { createPartnerHoldApprovedEmail } from '@/lib/email/templates/partner-emails'
import { computeFoundingCounts, FOUNDING_TOTAL } from '@/lib/partners/founding'
import { Resend } from 'resend'
import { sendWithRetry } from '@/lib/email/send-franchise-email'

export async function GET() {
  try {
    const auth = await requireHQAdmin()
    if (!auth.ok) return auth.response

    const supabase = createServiceRoleClient()

    const [claimsResult, waitlistResult, franchisesResult, marketsResult] = await Promise.all([
      supabase.from('partner_claims').select('*').order('created_at', { ascending: false }),
      supabase.from('partner_waitlist').select('*').order('created_at', { ascending: false }),
      supabase
        .from('franchise_crm_configs')
        .select('city')
        .in('status', ['active', 'coming_soon', 'pending_setup']),
      supabase.from('partner_markets').select('city_slug, status').eq('status', 'owned'),
    ])

    if (claimsResult.error) {
      console.error('Failed to fetch claims:', claimsResult.error)
      return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 })
    }

    const liveOwnedSlugs = Array.from(
      new Set([
        ...(franchisesResult.data || []).map((f) => f.city),
        ...(marketsResult.data || []).map((m) => m.city_slug),
      ])
    )
    const founding = computeFoundingCounts(claimsResult.data || [], liveOwnedSlugs)

    return NextResponse.json({
      claims: claimsResult.data || [],
      waitlist: waitlistResult.data || [],
      founding: {
        secured: founding.securedCount,
        converted: founding.convertedFoundingCount,
        live: founding.liveOwnedCount,
        total: FOUNDING_TOTAL,
        open: founding.foundingOpen,
      },
    })
  } catch (error) {
    console.error('HQ partners API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireHQAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { id, action, notes } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const actor = auth.user?.email || 'hq-admin'

    const { data: claim, error: fetchErr } = await supabase
      .from('partner_claims')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    const fromStatus = normalizeClaimStatus(claim.status) || claim.status

    switch (action) {
      case 'approve_hold': {
        // Recheck availability in a guarded update (prevents concurrent double-approve)
        const [franchisesResult, holdsResult] = await Promise.all([
          supabase.from('franchise_crm_configs').select('city, status').eq('city', claim.city_slug),
          supabase
            .from('partner_claims')
            .select('id, city_slug, status, expires_at')
            .eq('city_slug', claim.city_slug)
            .eq('status', 'held'),
        ])

        const availability = resolveTerritoryAvailability({
          citySlug: claim.city_slug,
          franchises: franchisesResult.data || [],
          holds: (holdsResult.data || []).filter((h) => h.id !== claim.id),
        })

        if (availability !== 'available') {
          return NextResponse.json(
            { error: 'Territory is no longer available for hold' },
            { status: 409 }
          )
        }

        if (!canTransitionClaimStatus(fromStatus as any, 'held')) {
          return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 })
        }

        if (!claim.verified_at && claim.status !== 'email_verified') {
          // Allow approve from email_verified; require verified_at
          if (claim.status !== 'email_verified') {
            return NextResponse.json({ error: 'Email must be verified before hold' }, { status: 400 })
          }
        }

        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        const [claimsForFounding, franchisesForFounding, marketsForFounding] = await Promise.all([
          supabase.from('partner_claims').select('status, expires_at, is_founding_eligible, city_slug'),
          supabase
            .from('franchise_crm_configs')
            .select('city')
            .in('status', ['active', 'coming_soon', 'pending_setup']),
          supabase.from('partner_markets').select('city_slug').eq('status', 'owned'),
        ])
        const liveOwnedSlugs = Array.from(
          new Set([
            ...(franchisesForFounding.data || []).map((f) => f.city),
            ...(marketsForFounding.data || []).map((m) => m.city_slug),
          ])
        )
        const founding = computeFoundingCounts(claimsForFounding.data || [], liveOwnedSlugs)

        const isFounding = founding.securedCount < FOUNDING_TOTAL
        const now = new Date().toISOString()
        const verifiedAt = claim.verified_at || now

        const { data: updated, error } = await supabase
          .from('partner_claims')
          .update({
            status: 'held',
            expires_at: expiresAt,
            verified_at: verifiedAt,
            is_founding_eligible: isFounding,
            founding_terms_version: isFounding ? 'founding-v1' : null,
            founding_slot_number: isFounding ? founding.securedCount + 1 : null,
            updated_at: now,
            notes: notes !== undefined ? notes : claim.notes,
          })
          .eq('id', id)
          .eq('status', 'email_verified')
          .select('id')
          .maybeSingle()

        if (error || !updated) {
          return NextResponse.json(
            { error: error?.message || 'Hold approval failed — territory may have been taken' },
            { status: 409 }
          )
        }

        // Ensure unique held city — if race created duplicate, this second check helps surface it
        const { count } = await supabase
          .from('partner_claims')
          .select('id', { count: 'exact', head: true })
          .eq('city_slug', claim.city_slug)
          .eq('status', 'held')

        if ((count || 0) > 1) {
          // Roll back this approval
          await supabase
            .from('partner_claims')
            .update({
              status: 'email_verified',
              expires_at: null,
              founding_slot_number: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
          return NextResponse.json({ error: 'Territory hold conflict' }, { status: 409 })
        }

        await writeClaimAudit({
          claimId: id,
          actor,
          fromStatus: claim.status,
          toStatus: 'held',
          note: 'HQ approved 30-day hold',
        })

        // Sync public market catalogue (non-hub only)
        await supabase
          .from('partner_markets')
          .update({ status: 'reserved', updated_at: new Date().toISOString() })
          .eq('city_slug', claim.city_slug)
          .eq('tier', 'partner')
          .neq('status', 'owned')

        try {
          const resendApiKey = process.env.RESEND_API_KEY
          if (resendApiKey) {
            const resendClient = new Resend(resendApiKey)
            const template = createPartnerHoldApprovedEmail({
              full_name: claim.full_name,
              city_name: claim.city_name,
              expiresAt: new Date(expiresAt).toUTCString(),
            })
            await sendWithRetry(resendClient, {
              from: process.env.EMAIL_FROM || 'QWIKKER <no-reply@qwikker.com>',
              to: claim.email,
              subject: template.subject,
              html: template.html,
              text: template.text,
              tags: [
                { name: 'service', value: 'qwikker' },
                { name: 'type', value: 'partner-hold-approved' },
              ],
            })
          }
        } catch (err) {
          console.error('Hold approved email failed:', err)
        }

        return NextResponse.json({ success: true, expires_at: expiresAt })
      }

      case 'reject': {
        if (!canTransitionClaimStatus(fromStatus as any, 'rejected')) {
          return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 })
        }
        const { error } = await supabase
          .from('partner_claims')
          .update({
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejected_reason: body.reason || notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
        if (error) throw error
        await writeClaimAudit({
          claimId: id,
          actor,
          fromStatus: claim.status,
          toStatus: 'rejected',
          note: body.reason || notes || 'Rejected by HQ',
        })
        if (normalizeClaimStatus(claim.status) === 'held') {
          await supabase
            .from('partner_markets')
            .update({ status: 'available', updated_at: new Date().toISOString() })
            .eq('city_slug', claim.city_slug)
            .eq('tier', 'partner')
            .neq('status', 'owned')
        }
        return NextResponse.json({ success: true })
      }

      case 'extend': {
        if (normalizeClaimStatus(claim.status) !== 'held') {
          return NextResponse.json({ error: 'Only held claims can be extended' }, { status: 400 })
        }
        const currentExpiry = new Date(claim.expires_at || Date.now())
        const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000)
        const { error } = await supabase
          .from('partner_claims')
          .update({
            expires_at: newExpiry.toISOString(),
            status: 'held',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
        if (error) throw error
        await writeClaimAudit({
          claimId: id,
          actor,
          fromStatus: claim.status,
          toStatus: 'held',
          note: 'Hold extended 30 days',
        })
        return NextResponse.json({ success: true, new_expires_at: newExpiry.toISOString() })
      }

      case 'release': {
        const { error } = await supabase
          .from('partner_claims')
          .update({
            status: 'released',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
        if (error) throw error
        await writeClaimAudit({
          claimId: id,
          actor,
          fromStatus: claim.status,
          toStatus: 'released',
          note: 'Released by HQ',
        })
        await supabase
          .from('partner_markets')
          .update({ status: 'available', updated_at: new Date().toISOString() })
          .eq('city_slug', claim.city_slug)
          .eq('tier', 'partner')
          .neq('status', 'owned')
        return NextResponse.json({ success: true })
      }

      case 'convert': {
        const agreement_signed_at = body.agreement_signed_at || claim.agreement_signed_at
        const payment_confirmed_at = body.payment_confirmed_at || claim.payment_confirmed_at
        if (!agreement_signed_at || !payment_confirmed_at) {
          return NextResponse.json(
            {
              error:
                'Conversion requires agreement_signed_at and payment_confirmed_at',
            },
            { status: 400 }
          )
        }
        if (normalizeClaimStatus(claim.status) !== 'held') {
          return NextResponse.json({ error: 'Only held claims can be converted' }, { status: 400 })
        }
        const converted_at = new Date().toISOString()
        const { error } = await supabase
          .from('partner_claims')
          .update({
            status: 'converted',
            agreement_signed_at,
            payment_confirmed_at,
            converted_at,
            updated_at: converted_at,
            is_founding_eligible: claim.is_founding_eligible ?? true,
            founding_terms_version: claim.founding_terms_version || 'founding-v1',
          })
          .eq('id', id)
          .eq('status', 'held')
        if (error) throw error
        await writeClaimAudit({
          claimId: id,
          actor,
          fromStatus: 'held',
          toStatus: 'converted',
          note: 'Converted after agreement + payment',
        })
        await supabase
          .from('partner_markets')
          .update({ status: 'owned', updated_at: converted_at })
          .eq('city_slug', claim.city_slug)
          .eq('tier', 'partner')
        return NextResponse.json({ success: true })
      }

      case 'update_notes': {
        const { error } = await supabase
          .from('partner_claims')
          .update({
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
        if (error) throw error
        return NextResponse.json({ success: true })
      }

      // Legacy aliases
      case 'reserve': {
        return NextResponse.json(
          { error: 'Use approve_hold for verified enquiries' },
          { status: 400 }
        )
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('HQ partners PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
