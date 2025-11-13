/**
 * Admin API authentication middleware
 * Validates admin session for protected API routes
 * 
 * SECURITY: All /api/admin/* routes (except /login and /logout) must use this
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminById } from './admin-auth'
import type { FranchiseCity } from './city-detection'

export interface AdminSession {
  adminId: string
  city: FranchiseCity
  username: string
  loginTime: string
}

export interface AuthResult {
  authenticated: boolean
  session?: AdminSession
  error?: string
}

/**
 * Validate admin session from cookie
 * Returns auth result with session data if valid
 */
export async function validateAdminSession(request: NextRequest): Promise<AuthResult> {
  try {
    // Get session cookie
    const sessionCookie = request.cookies.get('qwikker_admin_session')
    
    if (!sessionCookie?.value) {
      return {
        authenticated: false,
        error: 'No admin session found'
      }
    }

    // Parse session data
    let session: AdminSession
    try {
      session = JSON.parse(sessionCookie.value)
    } catch {
      return {
        authenticated: false,
        error: 'Invalid session data'
      }
    }

    // Validate required fields
    if (!session.adminId || !session.city || !session.username) {
      return {
        authenticated: false,
        error: 'Incomplete session data'
      }
    }

    // Verify admin still exists and is active
    const admin = await getAdminById(session.adminId)
    
    if (!admin || !admin.is_active) {
      return {
        authenticated: false,
        error: 'Admin account not found or inactive'
      }
    }

    // Verify city matches
    if (admin.city !== session.city) {
      return {
        authenticated: false,
        error: 'Session city mismatch'
      }
    }

    // Session is valid
    return {
      authenticated: true,
      session
    }
  } catch (error) {
    console.error('❌ Admin session validation error:', error)
    return {
      authenticated: false,
      error: 'Session validation failed'
    }
  }
}

/**
 * Middleware wrapper for admin API routes
 * Use this to protect routes that require authentication
 * 
 * Example usage:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const authResult = await requireAdminAuth(request)
 *   if (!authResult.authenticated) {
 *     return NextResponse.json(
 *       { error: authResult.error || 'Unauthorized' },
 *       { status: 401 }
 *     )
 *   }
 *   
 *   // Continue with authenticated logic
 *   const { session } = authResult
 *   // ... your code here
 * }
 * ```
 */
export async function requireAdminAuth(request: NextRequest): Promise<AuthResult> {
  return validateAdminSession(request)
}

/**
 * Helper to create unauthorized response
 */
export function createUnauthorizedResponse(error?: string): NextResponse {
  return NextResponse.json(
    { 
      success: false,
      error: error || 'Unauthorized - Admin authentication required' 
    },
    { 
      status: 401,
      headers: {
        'WWW-Authenticate': 'Cookie realm="Admin"'
      }
    }
  )
}

/**
 * Helper to create forbidden response (authenticated but not authorized)
 */
export function createForbiddenResponse(error?: string): NextResponse {
  return NextResponse.json(
    { 
      success: false,
      error: error || 'Forbidden - Insufficient permissions' 
    },
    { status: 403 }
  )
}

