import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')
    if (!adminSessionCookie?.value) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json({ error: 'Invalid admin session' }, { status: 401 })
    }

    const admin = await getAdminById(adminSession.adminId)
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin session' }, { status: 401 })
    }

    const hostname = request.headers.get('host') || ''
    const city = await getCityFromHostname(hostname)
    if (!city || !await isAdminForCity(adminSession.adminId, city)) {
      return NextResponse.json({ error: 'Not authorized for this city' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const [
      usageLogs,
      kbEntries,
      chatMessages,
      businessProfiles,
    ] = await Promise.all([
      supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('city', city.toLowerCase())
        .gte('created_at', since)
        .order('created_at', { ascending: false }),

      supabase
        .from('knowledge_base')
        .select('id, business_id, knowledge_type, status, created_at')
        .eq('city', city.toLowerCase()),

      supabase
        .from('chat_messages')
        .select('id, session_id, created_at, role')
        .gte('created_at', since),

      supabase
        .from('business_profiles')
        .select('id, business_name, status, city')
        .eq('city', city.toLowerCase()),
    ])

    const logs = usageLogs.data || []
    const kb = kbEntries.data || []
    const chats = chatMessages.data || []
    const businesses = businessProfiles.data || []

    const totalPromptTokens = logs.reduce((sum, l) => sum + (l.prompt_tokens || 0), 0)
    const totalCompletionTokens = logs.reduce((sum, l) => sum + (l.completion_tokens || 0), 0)
    const totalTokens = logs.reduce((sum, l) => sum + (l.total_tokens || 0), 0)
    const totalCost = logs.reduce((sum, l) => sum + parseFloat(l.estimated_cost_usd || '0'), 0)

    const costByModel: Record<string, { tokens: number; cost: number; calls: number }> = {}
    for (const log of logs) {
      const model = log.model || 'unknown'
      if (!costByModel[model]) costByModel[model] = { tokens: 0, cost: 0, calls: 0 }
      costByModel[model].tokens += log.total_tokens || 0
      costByModel[model].cost += parseFloat(log.estimated_cost_usd || '0')
      costByModel[model].calls += 1
    }

    const dailyUsage: Record<string, { tokens: number; cost: number; calls: number }> = {}
    for (const log of logs) {
      const day = new Date(log.created_at).toISOString().split('T')[0]
      if (!dailyUsage[day]) dailyUsage[day] = { tokens: 0, cost: 0, calls: 0 }
      dailyUsage[day].tokens += log.total_tokens || 0
      dailyUsage[day].cost += parseFloat(log.estimated_cost_usd || '0')
      dailyUsage[day].calls += 1
    }

    const hourlyBuckets: Record<number, number> = {}
    for (const log of logs) {
      const hour = new Date(log.created_at).getHours()
      hourlyBuckets[hour] = (hourlyBuckets[hour] || 0) + 1
    }

    const uniqueSessions = new Set(chats.filter(c => c.session_id).map(c => c.session_id))
    const userMessages = chats.filter(c => c.role === 'user').length

    const activeKb = kb.filter(e => e.status === 'active')
    const businessesWithKb = new Set(activeKb.map(e => e.business_id).filter(Boolean))
    const businessesWithoutKb = businesses.filter(b => !businessesWithKb.has(b.id) && b.status === 'active')

    return NextResponse.json({
      usage: {
        totalPromptTokens,
        totalCompletionTokens,
        totalTokens,
        totalCost: Math.round(totalCost * 1_000_000) / 1_000_000,
        totalCalls: logs.length,
        costByModel,
        dailyUsage,
        hourlyBuckets,
        avgCostPerCall: logs.length > 0 ? totalCost / logs.length : 0,
      },
      conversations: {
        totalSessions: uniqueSessions.size,
        totalUserMessages: userMessages,
      },
      knowledgeBase: {
        totalEntries: kb.length,
        activeEntries: activeKb.length,
        entriesByType: groupBy(activeKb, 'knowledge_type'),
        businessesWithKb: businessesWithKb.size,
        totalBusinesses: businesses.filter(b => b.status === 'active').length,
        coverageGaps: businessesWithoutKb.map(b => ({ id: b.id, name: b.business_name })),
      },
      period: { days, since },
    })
  } catch (error) {
    console.error('AI usage API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, number> {
  const result: Record<string, number> = {}
  for (const item of arr) {
    const k = String(item[key] || 'unknown')
    result[k] = (result[k] || 0) + 1
  }
  return result
}
