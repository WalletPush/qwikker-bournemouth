const DEFAULT_LOCALE = 'en-US'
const DEFAULT_CURRENCY = 'USD'

export function formatMoney(
  amount: number,
  opts?: { currency?: string; locale?: string; signed?: boolean }
): string {
  const currency = opts?.currency ?? DEFAULT_CURRENCY
  const locale = opts?.locale ?? DEFAULT_LOCALE
  const absolute = Math.abs(amount)
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absolute)

  if (opts?.signed || amount < 0) {
    if (amount < 0) return `−${formatted}`
    if (amount > 0 && opts?.signed) return `+${formatted}`
  }
  return formatted
}

export const PARTNERS_CURRENCY = DEFAULT_CURRENCY
export const PARTNERS_LOCALE = DEFAULT_LOCALE
