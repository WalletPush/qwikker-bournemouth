/**
 * Escape HTML special characters to prevent injection in email templates
 * @param input - Any value (string, number, null, undefined) to be safely inserted into HTML
 * @returns Escaped string safe for HTML insertion (empty string for null/undefined)
 */
export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return ''
  const str = String(input)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;')
}

