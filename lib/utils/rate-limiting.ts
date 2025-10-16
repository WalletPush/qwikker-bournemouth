/**
 * PRODUCTION-GRADE RATE LIMITING
 * 
 * Implements in-memory rate limiting with configurable windows and limits.
 * For production, consider Redis-based rate limiting for multi-instance deployments.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (use Redis in production for multi-instance support)
const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  windowMs: number  // Time window in milliseconds
  maxRequests: number  // Max requests per window
  keyGenerator?: (request: Request) => string  // Custom key generator
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const key = `rate_limit:${identifier}`
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    cleanupExpiredEntries()
  }
  
  const entry = rateLimitStore.get(key)
  
  if (!entry || now > entry.resetTime) {
    // First request or window expired - create new entry
    const resetTime = now + config.windowMs
    rateLimitStore.set(key, {
      count: 1,
      resetTime
    })
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime
    }
  }
  
  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    }
  }
  
  // Increment counter
  entry.count++
  rateLimitStore.set(key, entry)
  
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  }
}

/**
 * Generate rate limit key from request
 */
export function generateRateLimitKey(
  request: Request,
  prefix: string = 'default'
): string {
  // Try to get real IP from headers (Vercel/Cloudflare)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown'
  
  return `${prefix}:${ip.trim()}`
}

/**
 * Clean up expired entries from memory
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
      cleaned++
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired rate limit entries`)
  }
}

/**
 * Preset rate limit configurations
 */
export const RATE_LIMIT_PRESETS = {
  // Webhook endpoints - strict limits
  WEBHOOK_STRICT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10 // 10 requests per minute per IP
  },
  
  // API endpoints - moderate limits  
  API_MODERATE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100 // 100 requests per minute per IP
  },
  
  // Public endpoints - generous limits
  PUBLIC_GENEROUS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000 // 1000 requests per minute per IP
  }
} as const

/**
 * Express-style rate limiting middleware for Next.js API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  keyPrefix?: string
) {
  return function rateLimitMiddleware(
    request: Request
  ): RateLimitResult {
    const key = generateRateLimitKey(request, keyPrefix)
    return checkRateLimit(key, config)
  }
}
