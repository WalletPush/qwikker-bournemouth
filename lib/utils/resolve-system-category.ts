/**
 * Standardized system category resolution
 * Handles both camelCase (from server transforms) and snake_case (from raw DB)
 * Returns consistent string for placeholder/badge logic
 */

import type { SystemCategory } from '@/lib/constants/system-categories'

/**
 * Resolve system_category from a business object that may have either
 * camelCase or snake_case fields
 */
export function resolveSystemCategory(
  business: { systemCategory?: string | null; system_category?: string | null } | null | undefined
): SystemCategory {
  if (!business) return 'other'
  
  const resolved = business.systemCategory ?? business.system_category ?? 'other'
  return resolved as SystemCategory
}
