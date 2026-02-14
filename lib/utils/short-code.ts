/**
 * Short Code Generator for Push Notifications
 * 
 * Generates cryptographically secure short codes for tracking URLs.
 * Uses base62 encoding (A-Za-z0-9) for URL-safe, compact codes.
 * 
 * Examples:
 * - 8 chars: x5k9m2p8 (for notifications)
 * - 10 chars: a7b3c1d6e9 (for recipients)
 * 
 * Security:
 * - 10-char base62 = 62^10 = ~840 quadrillion possibilities
 * - Brute force infeasible for MVP use case
 * 
 * IMPORTANT: Do NOT use "check-then-insert" pattern (racy).
 * Instead: generate → INSERT → retry on unique violation (23505).
 */

import { randomBytes } from 'crypto'

const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Generate a cryptographically secure short code
 * 
 * @param length - Desired length (default 10)
 * @returns Base62 short code (e.g., "x5k9m2p8")
 */
export function generateShortCode(length = 10): string {
  // Generate random bytes (use more bytes than needed for better entropy)
  const bytes = randomBytes(length * 2)
  
  // Convert to base62
  let code = ''
  for (let i = 0; i < length; i++) {
    // Use byte value as index into BASE62_CHARS
    const index = bytes[i] % BASE62_CHARS.length
    code += BASE62_CHARS[index]
  }
  
  return code
}

/**
 * Validate short code format (flexible length ranges)
 * 
 * FIX: Use min/max ranges instead of exact length for future flexibility
 * 
 * @param code - Code to validate
 * @param minLength - Minimum length (default 6)
 * @param maxLength - Maximum length (default 14)
 * @returns True if valid
 */
export function isValidShortCode(
  code: string, 
  minLength = 6, 
  maxLength = 14
): boolean {
  if (!code) return false
  
  // Check characters (base62 only)
  const base62Regex = /^[A-Za-z0-9]+$/
  if (!base62Regex.test(code)) return false
  
  // Check length range (flexible for future changes)
  if (code.length < minLength || code.length > maxLength) return false
  
  return true
}
