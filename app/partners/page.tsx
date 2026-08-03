import { Instrument_Sans } from 'next/font/google'
import { PartnersOpportunityPage } from '@/components/partners/partners-opportunity-page'
import { commercialCopy } from '@/lib/partners/commercial-copy'

const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-partners-display',
  display: 'swap',
})

const PARTNERS_ORIGIN = 'https://partners.qwikker.com'

const OG_IMAGE = {
  url: '/partners/og-share.png',
  width: 1024,
  height: 537,
  alt: 'Qwikker Territory Partners — own your city’s AI future',
}

export const metadata = {
  metadataBase: new URL(PARTNERS_ORIGIN),
  title: commercialCopy.pageTitle,
  description: commercialCopy.pageDescription,
  keywords: [
    'Qwikker partner',
    'territory partner',
    'franchise opportunity',
    'AI local search',
    'city territory rights',
    'founding partner',
    'local business platform',
    'digital territory',
  ],
  alternates: { canonical: PARTNERS_ORIGIN },
  openGraph: {
    title: commercialCopy.pageTitle,
    description: commercialCopy.pageDescription,
    url: PARTNERS_ORIGIN,
    siteName: 'QWIKKER',
    type: 'website',
    locale: 'en_GB',
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: commercialCopy.pageTitle,
    description: commercialCopy.pageDescription,
    images: [OG_IMAGE.url],
  },
  robots: { index: true, follow: true },
}

export default function PartnersRoute() {
  return (
    <div className={`${instrument.variable} partners-root`}>
      <PartnersOpportunityPage />
    </div>
  )
}
