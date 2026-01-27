/**
 * API Route Security Helpers
 * 
 * CRITICAL: These helpers enforce franchise isolation at the API layer.
 * Even with perfect middleware, attackers can call API routes directly.
 * 
 * Every /api/dashboard/* route MUST use getValidatedBusinessForRequest()
 * before performing ANY operations.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCityFromHostname } from '@/lib/utils/city-detection'

export interface ValidatedBusinessContext {
  businessId: string
  city: string
  userId: string
  business: {
    id: string
    city: string
    business_name: string
    status: string
    owner_user_id: string
  }
}

/**
 * Validates that:
 * 1. User is authenticated
 * 2. User owns a business
 * 3. Business city matches current subdomain
 * 
 * Throws 401/403 errors if validation fails (fail-closed)
 * 
 * @param request - Next.js request object
 * @returns Validated business context
 * @throws Error with status code if validation fails
 */
export async function getValidatedBusinessForRequest(
  request: NextRequest
): Promise<ValidatedBusinessContext> {
  const supabase = createClient()
  
  // 1. Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error('🚨 API Protection: No authenticated user')
    throw createApiError(401, 'Unauthorized - please log in')
  }
  
  // 2. Get current city from hostname
  const hostname = request.headers.get('host') || ''
  let currentCity: string
  
  try {
    currentCity = await getCityFromHostname(hostname)
  } catch (error) {
    console.error('🚨 API Protection: Failed to detect city:', error)
    throw createApiError(400, 'Invalid subdomain')
  }
  
  // 3. Fetch business profile
  const { data: business, error: businessError } = await supabase
    .from('business_profiles')
    .select('id, city, business_name, status, owner_user_id')
    .eq('owner_user_id', user.id)
    .single()
  
  // FAIL-CLOSED: If fetch failed OR no business found, deny access
  if (businessError || !business) {
    console.error('🚨 API Protection: No business found for user:', user.id)
    console.error('   Error:', businessError?.message || 'No business record')
    throw createApiError(403, 'No business profile found')
  }
  
  // 4. Validate franchise isolation: business.city MUST match subdomain
  const businessCity = business.city.toLowerCase()
  const urlCity = currentCity.toLowerCase()
  
  if (businessCity !== urlCity) {
    console.error('🚨 API Protection: FRANCHISE ISOLATION VIOLATION')
    console.error(`   User ${user.id} tried to access ${urlCity} API`)
    console.error(`   But business belongs to ${businessCity}`)
    console.error(`   Request: ${request.method} ${request.url}`)
    
    throw createApiError(
      403, 
      `Access denied: Business belongs to ${businessCity}, not ${urlCity}`
    )
  }
  
  // All validation passed
  console.log(`✅ API Protection: Validated ${business.business_name} (${businessCity})`)
  
  return {
    businessId: business.id,
    city: business.city,
    userId: user.id,
    business
  }
}

/**
 * Helper to create API errors with proper structure
 */
function createApiError(status: number, message: string): Error {
  const error = new Error(message) as Error & { status: number }
  error.status = status
  return error
}

/**
 * Wrapper for API routes to handle validation errors
 * 
 * Usage:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   return withApiProtection(request, async ({ businessId, city }) => {
 *     // Your route logic here
 *     return NextResponse.json({ success: true })
 *   })
 * }
 * ```
 */
export async function withApiProtection(
  request: NextRequest,
  handler: (context: ValidatedBusinessContext) => Promise<Response>
): Promise<Response> {
  try {
    const context = await getValidatedBusinessForRequest(request)
    return await handler(context)
  } catch (error: any) {
    const status = error.status || 500
    const message = error.message || 'Internal server error'
    
    return new Response(
      JSON.stringify({ 
        error: message,
        code: status 
      }),
      { 
        status,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * Validate admin access for admin API routes
 * 
 * Checks that user has admin privileges for the current city
 */
export async function getValidatedAdminForRequest(
  request: NextRequest
): Promise<{ adminId: string; city: string; email: string }> {
  const supabase = createClient()
  
  // Get current city from hostname
  const hostname = request.headers.get('host') || ''
  let currentCity: string
  
  try {
    currentCity = await getCityFromHostname(hostname)
  } catch (error) {
    console.error('🚨 Admin API Protection: Failed to detect city:', error)
    throw createApiError(400, 'Invalid subdomain')
  }
  
  // Check for admin session cookie
  const { cookies } = await import('next/headers')
  const cookieStore = cookies()
  const adminSessionCookie = cookieStore.get('qwikker_admin_session')
  
  if (!adminSessionCookie) {
    console.error('🚨 Admin API Protection: No admin session cookie')
    throw createApiError(401, 'Admin authentication required')
  }
  
  // Parse admin session (format: "email:city")
  const [email, sessionCity] = adminSessionCookie.value.split(':')
  
  if (!email || !sessionCity) {
    console.error('🚨 Admin API Protection: Invalid admin session format')
    throw createApiError(401, 'Invalid admin session')
  }
  
  // Validate city matches
  if (sessionCity.toLowerCase() !== currentCity.toLowerCase()) {
    console.error('🚨 Admin API Protection: City mismatch')
    console.error(`   Session city: ${sessionCity}`)
    console.error(`   Request city: ${currentCity}`)
    throw createApiError(403, 'Admin not authorized for this city')
  }
  
  // Verify admin exists in database
  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, email, city')
    .eq('email', email)
    .eq('city', currentCity)
    .single()
  
  if (error || !admin) {
    console.error('🚨 Admin API Protection: Admin not found in database')
    throw createApiError(403, 'Admin account not found')
  }
  
  console.log(`✅ Admin API Protection: Validated ${email} for ${currentCity}`)
  
  return {
    adminId: admin.id,
    city: admin.city,
    email: admin.email
  }
}
