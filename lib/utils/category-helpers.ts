/**
 * Category Resolution Helper for AI/Analytics
 * 
 * Use this helper in all AI, embeddings, analytics, and knowledge base code
 * to ensure consistent category handling during the migration.
 * 
 * Strict rules:
 * - Use system_category for filtering/routing/grouping
 * - Use display_category for text context shown to users/AI
 * - Only fall back to legacy business_category if both are missing
 */

import { SYSTEM_CATEGORY_LABEL, isValidSystemCategory, SystemCategory } from "@/lib/constants/system-categories";

/**
 * Safely resolve category fields for AI/analytics use
 * 
 * @param business - Business profile object (may have old or new fields)
 * @returns { system: SystemCategory, display: string }
 */
export function categoryForAI(business: any): { system: SystemCategory; display: string } {
  // Prefer system_category if valid
  const system: SystemCategory = isValidSystemCategory(business.system_category) 
    ? business.system_category 
    : "other";
  
  // Prefer display_category, fall back to deriving from system, then legacy
  const display = 
    business.display_category || 
    SYSTEM_CATEGORY_LABEL[system] || 
    business.business_category || 
    "Other";
  
  return { system, display };
}

/**
 * Get display label only (for simple text interpolation)
 */
export function categoryDisplayLabel(business: any): string {
  return categoryForAI(business).display;
}

/**
 * Get system category only (for filtering, grouping, tagging)
 */
export function categorySystemEnum(business: any): SystemCategory {
  return categoryForAI(business).system;
}

