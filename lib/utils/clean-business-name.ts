/**
 * Strip a trailing place name (town / city / region) from a business name.
 *
 * Google listings are often named "Cafe Aroma Poole" or "The Larder House
 * Bournemouth" — the brand is just "Cafe Aroma" / "The Larder House". On
 * printed launch-pack artwork the town suffix looks odd, so we drop it.
 *
 * We only strip when the LAST word(s) exactly match one of the known places,
 * so real names like "Poole Pottery" (place at the START) are left untouched.
 */
export function cleanBusinessName(name: string, places: (string | null | undefined)[]): string {
  let out = (name || '').trim()
  if (!out) return out

  const candidates = places
    .map((p) => (p || '').trim())
    .filter(Boolean)
    // longest first so "Bournemouth Town Centre" beats "Bournemouth"
    .sort((a, b) => b.length - a.length)

  for (const place of candidates) {
    // Match the place as trailing word(s), optionally after a comma / dash.
    const re = new RegExp(`[\\s,\\-–—]+${escapeRegExp(place)}\\s*$`, 'i')
    const stripped = out.replace(re, '').trim()
    // Never strip everything away (e.g. a business literally called "Poole").
    if (stripped && stripped.toLowerCase() !== out.toLowerCase()) {
      out = stripped
    }
  }
  return out
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
