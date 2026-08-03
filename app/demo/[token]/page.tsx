import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { verifyDemoToken } from '@/lib/listing-engine/demo-token'
import { getDemoData } from '@/lib/listing-engine/get-demo-data'
import { getFranchisePublicUrl } from '@/lib/utils/franchise-url'
import { PresentMode } from '@/components/demo/present-mode'
import type { DemoPreset } from '@/lib/listing-engine/get-demo-data'
import { DemoExpired } from '@/components/demo/demo-expired'

// Always dynamic (token verify + fresh draft) and never cached.
export const dynamic = 'force-dynamic'

// Demo pages must never be publicly findable.
export const metadata: Metadata = {
  title: 'Qwikker — Your Listing Preview',
  robots: { index: false, follow: false, nocache: true },
}

interface DemoPageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<{ pdf?: string; preset?: string; capture?: string }>
}

const VALID_PRESETS: DemoPreset[] = ['food', 'services', 'general']

export default async function DemoPage({ params, searchParams }: DemoPageProps) {
  const { token } = await params
  const { pdf, preset, capture } = await searchParams
  const pdfMode = pdf === '1'
  const captureMode = capture === '1'
  const forcedPreset = VALID_PRESETS.includes(preset as DemoPreset)
    ? (preset as DemoPreset)
    : undefined

  const verified = verifyDemoToken(token)

  // Malformed / forged tokens look like any other 404 (don't leak that /demo exists).
  if (!verified.ok) {
    if (verified.reason === 'expired') {
      return <DemoExpired />
    }
    notFound()
  }

  const data = await getDemoData(verified.businessId)
  if (!data) notFound()

  // Claim = the EXISTING claim flow, deep-linked to this business on the live
  // franchise subdomain (same link as the claim email / WhatsApp message).
  const city = verified.city || data.business.city
  const claimUrl = `${getFranchisePublicUrl(city)}/claim?business_id=${data.business.id}`

  return (
    <PresentMode
      data={data}
      claimUrl={claimUrl}
      pdfMode={pdfMode}
      forcedPreset={forcedPreset}
      capture={captureMode}
    />
  )
}
