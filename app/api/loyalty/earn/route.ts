import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { hasWalletPushCredentials } from '@/lib/loyalty/loyalty-types'
import {
  isTokenValid,
  canEarnNow,
  hashIp,
  getTodayInTimezone,
  getProximityMessage,
  getLoyaltyPassFieldValues,
  EARN_RATE_LIMIT_PER_USER_PER_HOUR,
  EARN_RATE_LIMIT_PER_IP_PER_HOUR,
  IP_VELOCITY_THRESHOLD,
  IP_VELOCITY_WINDOW_MINUTES,
} from '@/lib/loyalty/loyalty-utils'
import { updateLoyaltyPassField } from '@/lib/loyalty/walletpush-loyalty'

/**
 * POST /api/loyalty/earn
 *
 * Core earn endpoint. Validates token, enforces cooldowns and
 * fraud checks, increments balance, updates WalletPush pass.
 *
 * Body: { publicId, token, walletPassId }
 */
export async function POST(request: NextRequest) {
  try {
    const city = await getSafeCurrentCity()
    const { publicId, token, walletPassId } = await request.json()

    if (!publicId || !token || !walletPassId) {
      return NextResponse.json(
        { error: 'publicId, token, and walletPassId are required' },
        { status: 400 }
      )
    }

    const serviceRole = createServiceRoleClient()

    // 1. Resolve program
    const { data: program } = await serviceRole
      .from('loyalty_programs')
      .select('*, business_profiles!inner(business_name)')
      .eq('public_id', publicId)
      .eq('city', city)
      .single()

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // 2. Validate program is active
    if (program.status !== 'active') {
      return NextResponse.json(
        { error: 'This loyalty program is not currently active' },
        { status: 400 }
      )
    }

    // 3. Validate token
    if (!isTokenValid(program, token)) {
      return NextResponse.json(
        { error: 'Invalid QR code. Please scan the QR at the till.' },
        { status: 403 }
      )
    }

    // 4. IP hash
    const forwardedFor = request.headers.get('x-forwarded-for')
    const rawIp = forwardedFor?.split(',')[0]?.trim() || 'unknown'
    const ipHash = hashIp(rawIp)

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const velocityWindowStart = new Date(
      Date.now() - IP_VELOCITY_WINDOW_MINUTES * 60 * 1000
    ).toISOString()

    // 5. Rate limit: per user per hour
    const { count: userAttempts } = await serviceRole
      .from('loyalty_earn_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_wallet_pass_id', walletPassId)
      .gte('earned_at', oneHourAgo)

    if ((userAttempts ?? 0) >= EARN_RATE_LIMIT_PER_USER_PER_HOUR) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.', reason: 'rate_limit_user' },
        { status: 429 }
      )
    }

    // 6. Rate limit: per IP per hour
    const { count: ipAttempts } = await serviceRole
      .from('loyalty_earn_events')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('earned_at', oneHourAgo)

    if ((ipAttempts ?? 0) >= EARN_RATE_LIMIT_PER_IP_PER_HOUR) {
      return NextResponse.json(
        { error: 'Too many attempts from this location.', reason: 'rate_limit_ip' },
        { status: 429 }
      )
    }

    // 7. IP velocity: same IP stamping too many different users
    const { data: recentIpUsers } = await serviceRole
      .from('loyalty_earn_events')
      .select('user_wallet_pass_id')
      .eq('ip_hash', ipHash)
      .eq('business_id', program.business_id)
      .gte('earned_at', velocityWindowStart)

    const uniqueUsers = new Set(
      (recentIpUsers || []).map((e: any) => e.user_wallet_pass_id)
    )
    uniqueUsers.add(walletPassId)

    if (uniqueUsers.size > IP_VELOCITY_THRESHOLD) {
      await serviceRole.from('loyalty_earn_events').insert({
        membership_id: null as any, // will be filled below if membership exists
        business_id: program.business_id,
        user_wallet_pass_id: walletPassId,
        method: 'counter_qr',
        ip_hash: ipHash,
        valid: false,
        reason_if_invalid: 'ip_velocity',
      }).then(() => {}) // fire-and-forget the invalid event

      return NextResponse.json(
        { error: 'Suspicious activity detected. Please try again later.', reason: 'ip_velocity' },
        { status: 429 }
      )
    }

    // 8. Find or auto-create membership
    let { data: membership } = await serviceRole
      .from('loyalty_memberships')
      .select('*')
      .eq('program_id', program.id)
      .eq('user_wallet_pass_id', walletPassId)
      .single()

    if (!membership) {
      const { data: created, error: createError } = await serviceRole
        .from('loyalty_memberships')
        .insert({
          program_id: program.id,
          user_wallet_pass_id: walletPassId,
        })
        .select()
        .single()

      if (createError) {
        if (createError.code === '23505') {
          const { data: refetched } = await serviceRole
            .from('loyalty_memberships')
            .select('*')
            .eq('program_id', program.id)
            .eq('user_wallet_pass_id', walletPassId)
            .single()
          membership = refetched
        } else {
          return NextResponse.json({ error: createError.message }, { status: 500 })
        }
      } else {
        membership = created
      }
    }

    if (!membership) {
      return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 })
    }

    // 9. Cooldown check
    const earnCheck = canEarnNow(membership, program)
    if (!earnCheck.allowed) {
      await serviceRole.from('loyalty_earn_events').insert({
        membership_id: membership.id,
        business_id: program.business_id,
        user_wallet_pass_id: walletPassId,
        method: 'counter_qr',
        ip_hash: ipHash,
        valid: false,
        reason_if_invalid: earnCheck.reason || 'cooldown',
      })

      return NextResponse.json({
        success: false,
        error: earnCheck.reason,
        reason: 'cooldown',
        nextEligibleAt: earnCheck.nextEligibleAt || null,
        newBalance: membership.stamps_balance,
        threshold: program.reward_threshold,
        rewardUnlocked: false,
        proximityMessage: null,
      })
    }

    // 10. Insert valid earn event
    await serviceRole.from('loyalty_earn_events').insert({
      membership_id: membership.id,
      business_id: program.business_id,
      user_wallet_pass_id: walletPassId,
      method: 'counter_qr',
      ip_hash: ipHash,
      valid: true,
    })

    // 11. Increment balance + update counters
    const todayStr = getTodayInTimezone(program.timezone)
    const isNewDay = membership.earned_today_date !== todayStr
    const newTodayCount = isNewDay ? 1 : membership.earned_today_count + 1
    const newBalance = membership.stamps_balance + 1
    const rewardUnlocked = newBalance >= program.reward_threshold

    await serviceRole
      .from('loyalty_memberships')
      .update({
        stamps_balance: newBalance,
        total_earned: membership.total_earned + 1,
        last_earned_at: new Date().toISOString(),
        earned_today_count: newTodayCount,
        earned_today_date: todayStr,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', membership.id)

    // 12. WalletPush call-out (fire-and-forget)
    if (
      hasWalletPushCredentials(program) &&
      membership.walletpush_serial
    ) {
      const serial = membership.walletpush_serial
      const businessName = (program as any).business_profiles?.business_name || 'this business'

      if (rewardUnlocked) {
        updateLoyaltyPassField(program, serial, 'Points', String(newBalance), false)
        updateLoyaltyPassField(program, serial, 'Status', 'Reward Available!', false)
        updateLoyaltyPassField(
          program,
          serial,
          'Last_Message',
          `You earned a free ${program.reward_description} at ${businessName}!`,
          true
        )
      } else {
        const fieldValues = getLoyaltyPassFieldValues(
          program,
          { ...membership, stamps_balance: newBalance },
          program.type
        )
        updateLoyaltyPassField(program, serial, 'Points', fieldValues.Points, false)
        updateLoyaltyPassField(program, serial, 'Status', fieldValues.Status, true)
      }
    }

    // 13. Build response
    const proximityMessage = rewardUnlocked
      ? null
      : getProximityMessage(newBalance, program.reward_threshold)

    const nextGapMs = program.min_gap_minutes * 60 * 1000
    const nextEligibleAt = nextGapMs > 0
      ? new Date(Date.now() + nextGapMs).toISOString()
      : null

    return NextResponse.json({
      success: true,
      newBalance,
      threshold: program.reward_threshold,
      rewardUnlocked,
      proximityMessage,
      nextEligibleAt,
    })
  } catch (error) {
    console.error('[loyalty/earn]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
