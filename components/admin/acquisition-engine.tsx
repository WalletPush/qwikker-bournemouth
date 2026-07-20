'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AcquisitionDraftReview, type AcquisitionResult } from '@/components/admin/acquisition-draft-review'

interface BusinessHit {
  id: string
  name: string
  town: string | null
  claimed: boolean
  rating: number | null
  reviewCount: number | null
  hasPlaceId: boolean
  category: string | null
}

export function AcquisitionEngine({ cityDisplayName }: { cityDisplayName: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BusinessHit[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<BusinessHit | null>(null)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<AcquisitionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runSearch() {
    setSearching(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/offer-engine/businesses?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setResults(data.businesses || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function generate(biz: BusinessHit) {
    setSelected(biz)
    setGenerating(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/admin/offer-engine/acquisition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: biz.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setResult(data.result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Acquisition Lab</h1>
            <Badge variant="secondary">Ad-hoc · no save</Badge>
          </div>
          <p className="text-slate-400 mt-1">
            {cityDisplayName} · Quick single-business test bench (nothing saved). To enrich and save drafts
            for real, use{' '}
            <Link href="/admin/acquisition" className="text-blue-400 hover:underline">
              the Acquisition pipeline
            </Link>
            .
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-base text-slate-200">Pick a business</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                placeholder="Search business name… (leave blank for A–Z)"
                className="bg-slate-950 border-slate-700 text-slate-100"
              />
              <Button onClick={runSearch} disabled={searching}>
                {searching ? 'Searching…' : 'Search'}
              </Button>
            </div>

            {results.length > 0 && (
              <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 overflow-hidden">
                {results.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => generate(b)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-3 ${
                      selected?.id === b.id ? 'bg-slate-800/60' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{b.name}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {[b.town, b.category].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {b.rating ? (
                        <Badge variant="outline" className="border-slate-700 text-slate-300">
                          ★ {b.rating}
                        </Badge>
                      ) : null}
                      <Badge variant={b.claimed ? 'default' : 'secondary'}>
                        {b.claimed ? 'Claimed' : 'Unclaimed'}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950/50 text-red-300 px-4 py-3 text-sm">{error}</div>
        )}

        {generating && selected && (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-8 text-center text-slate-400">
              <div className="animate-pulse">Scanning {selected.name}&apos;s website and drafting…</div>
            </CardContent>
          </Card>
        )}

        {result && !generating && (
          <AcquisitionDraftReview
            result={result}
            footerNote="Ad-hoc test bench — nothing is saved. Use the Acquisition pipeline to enrich and save drafts."
          />
        )}
      </div>
    </div>
  )
}
