import { NextRequest, NextResponse } from 'next/server'
import { runWeeklyDigestAllCities, runWeeklyDigestForCity } from '@/lib/email/digest-runner'

/**
 * Weekly digest cron — only cities with email_automations.weekly_digest enabled=true.
 * Auth: Bearer CRON_SECRET
 * Optional: ?city=bournemouth to run one city.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const city = new URL(request.url).searchParams.get('city')
  if (city) {
    const result = await runWeeklyDigestForCity(city)
    return NextResponse.json({ ok: true, results: [result] })
  }

  const results = await runWeeklyDigestAllCities()
  return NextResponse.json({ ok: true, results })
}

export async function POST(request: NextRequest) {
  return GET(request)
}
