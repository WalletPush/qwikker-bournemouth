/**
 * Append wallet_pass_id without breaking existing query strings.
 * `/path?highlight=x` + pass → `/path?highlight=x&wallet_pass_id=…`
 */
export function withWalletPassId(href: string, walletPassId?: string | null): string {
  if (!walletPassId) return href
  const join = href.includes('?') ? '&' : '?'
  return `${href}${join}wallet_pass_id=${encodeURIComponent(walletPassId)}`
}
