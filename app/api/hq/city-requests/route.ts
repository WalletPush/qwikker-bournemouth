import { NextResponse } from 'next/server'
import { requireHQAdmin } from '@/lib/auth/hq'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const auth = await requireHQAdmin()
  if (!auth.ok) return auth.response

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('city_requests')
    .select('id, city_name, city_name_normalized, email, name, created_at, notified_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch city requests:', error)
    return NextResponse.json({ error: 'Failed to fetch city requests' }, { status: 500 })
  }

  // Group by normalized city name
  const cityMap = new Map<string, {
    cityName: string
    normalizedName: string
    voteCount: number
    notifiedCount: number
    latestVote: string
    voters: Array<{ id: string; email: string; name: string | null; createdAt: string; notifiedAt: string | null }>
  }>()

  for (const row of data || []) {
    const key = row.city_name_normalized
    if (!cityMap.has(key)) {
      cityMap.set(key, {
        cityName: row.city_name,
        normalizedName: key,
        voteCount: 0,
        notifiedCount: 0,
        latestVote: row.created_at,
        voters: [],
      })
    }

    const city = cityMap.get(key)!
    city.voteCount++
    if (row.notified_at) city.notifiedCount++
    if (row.created_at > city.latestVote) {
      city.latestVote = row.created_at
      city.cityName = row.city_name
    }
    city.voters.push({
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at,
      notifiedAt: row.notified_at,
    })
  }

  // Sort by vote count descending
  const cities = Array.from(cityMap.values()).sort((a, b) => b.voteCount - a.voteCount)

  return NextResponse.json({ cities })
}
