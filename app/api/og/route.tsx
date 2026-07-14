import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

// Dynamic per-city Open Graph / social share card. Driven entirely by query
// params (no DB call here) so it's fast and tenant-safe; app/page.tsx's
// generateMetadata supplies city name, live-offer count and accent colour.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = (searchParams.get('city') || 'Your City').slice(0, 40)
  const offers = Math.max(0, parseInt(searchParams.get('offers') || '0', 10) || 0)
  const accentRaw = searchParams.get('accent') || '#00d083'
  const accent = /^#[0-9a-fA-F]{6}$/.test(accentRaw) ? accentRaw : '#00d083'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0b0d10 0%, #11161b 100%)',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '9999px', background: accent, marginRight: '16px' }} />
          <div style={{ fontSize: '36px', color: '#ffffff', fontWeight: 700, letterSpacing: '-1px' }}>QWIKKER</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '96px', color: '#ffffff', fontWeight: 800, lineHeight: 1.02 }}>{city}</div>
          <div style={{ fontSize: '52px', color: accent, fontWeight: 800, marginTop: '4px' }}>in your wallet</div>
          <div style={{ fontSize: '32px', color: 'rgba(255,255,255,0.7)', marginTop: '28px' }}>
            Local offers, loyalty rewards &amp; secret menus
          </div>
        </div>

        <div style={{ display: 'flex' }}>
          {offers > 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: accent,
                color: '#04150d',
                fontSize: '32px',
                fontWeight: 700,
                padding: '16px 32px',
                borderRadius: '9999px',
              }}
            >
              {offers} live {offers === 1 ? 'offer' : 'offers'} right now
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                fontSize: '30px',
                padding: '16px 32px',
                borderRadius: '9999px',
              }}
            >
              Add to Apple &amp; Google Wallet — no app
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
