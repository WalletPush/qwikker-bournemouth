/**
 * PRODUCTION-GRADE RATE LIMITING
 * 
 * Implements rate limiting with both in-memory and Redis support.
 * Automatically uses Redis if available, falls back to in-memory for development.
 * 
 * PRODUCTION DEPLOYMENT:
 * Set REDIS_URL environment variable to enable Redis-based rate limiting
 * for horizontal scaling across multiple instances.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (fallback when Redis is not available)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Redis client (lazy-loaded if REDIS_URL is available)
let redisClient: any = null
let redisAvailable = false

// Initialize Redis if available
async function initializeRedis() {
  if (redisClient !== null) return redisClient
  
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    console.log('📝 Rate limiting: Using in-memory store (Redis not configured)')
    return null
  }
  
  try {
    // Dynamic import to avoid bundling Redis in environments that don't need it
    // Use eval to prevent bundler from trying to resolve redis at build time
    const redis = await eval('import("redis")')
    redisClient = redis.createClient({ url: redisUrl })
    await redisClient.connect()
    redisAvailable = true
    console.log('🚀 Rate limiting: Connected to Redis for distributed rate limiting')
    return redisClient
  } catch (error) {
    console.warn('⚠️ Rate limiting: Redis connection failed, falling back to in-memory:', error)
    redisClient = null
    redisAvailable = false
    return null
  }
}

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
 * Check if a request should be rate limited (Redis-aware)
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now()
  const key = `rate_limit:${identifier}`
  
  // Try Redis first, fall back to in-memory
  const redis = await initializeRedis()
  
  if (redis && redisAvailable) {
    return await checkRateLimitRedis(redis, key, config, now)
  } else {
    return checkRateLimitMemory(key, config, now)
  }
}

/**
 * Redis-based rate limiting
 */
async function checkRateLimitRedis(
  redis: any,
  key: string,
  config: RateLimitConfig,
  now: number
): Promise<RateLimitResult> {
  try {
    const resetTime = now + config.windowMs
    
    // Use Redis pipeline for atomic operations
    const pipeline = redis.multi()
    pipeline.incr(key)
    pipeline.expire(key, Math.ceil(config.windowMs / 1000))
    const results = await pipeline.exec()
    
    const count = results[0][1] // First command result
    
    if (count > config.maxRequests) {
      const ttl = await redis.ttl(key)
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: now + (ttl * 1000),
        retryAfter: ttl
      }
    }
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - count,
      resetTime
    }
  } catch (error) {
    console.warn('⚠️ Redis rate limiting failed, falling back to in-memory:', error)
    redisAvailable = false
    return checkRateLimitMemory(key, config, now)
  }
}

/**
 * In-memory rate limiting (fallback)
 */
function checkRateLimitMemory(
  key: string,
  config: RateLimitConfig,
  now: number
): RateLimitResult {
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
  return async function rateLimitMiddleware(
    request: Request
  ): Promise<RateLimitResult> {
    const key = generateRateLimitKey(request, keyPrefix)
    return await checkRateLimit(key, config)
  }
}
