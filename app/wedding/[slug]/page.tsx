import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Cormorant_Garamond, Great_Vibes } from 'next/font/google'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { getWedding, WEDDING_CITY } from '@/lib/wedding/config'
import { listWeddingPhotos } from '@/lib/wedding/photos'
import { WeddingAlbum } from '@/components/wedding/wedding-album'

// Unlisted by design: keep it out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// Always render fresh so the gallery reflects the latest uploads.
export const dynamic = 'force-dynamic'

const weddingSerif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-wedding-serif',
})

const weddingScript = Great_Vibes({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-wedding-script',
})

export default async function WeddingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const sp = await searchParams

  const wedding = getWedding(slug)
  if (!wedding) notFound()

  // Bournemouth subdomain ONLY — 404 everywhere else (incl. other cities / root domain).
  let city: string
  try {
    city = await getCityFromHostname((await headers()).get('host') || '')
  } catch {
    notFound()
  }
  if (city !== WEDDING_CITY) notFound()

  const photos = await listWeddingPhotos(wedding.slug)

  // Hidden cleanup mode: /wedding/<slug>?manage=<download-password>
  const manageParam = typeof sp.manage === 'string' ? sp.manage : ''
  const manage = manageParam.length > 0 && manageParam === wedding.downloadPassword

  return (
    <main
      className={`${weddingSerif.variable} ${weddingScript.variable} min-h-screen bg-gradient-to-b from-white via-[#eef7fd] to-[#d6ecfa]`}
    >
      <WeddingAlbum
        slug={wedding.slug}
        coupleNames={wedding.coupleNames}
        title={wedding.title}
        welcome={wedding.welcome}
        intro={wedding.intro}
        initialPhotos={photos}
        manage={manage}
      />
    </main>
  )
}
