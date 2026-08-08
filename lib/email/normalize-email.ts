/** Extract bare address from `Name <user@domain>` or return trimmed lowercase. */
export function normalizeEmailAddress(raw?: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const angle = trimmed.match(/<([^>]+)>/)
  const addr = (angle?.[1] || trimmed).trim().toLowerCase()
  return addr.includes('@') ? addr : null
}
