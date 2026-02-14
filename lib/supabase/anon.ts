import { createClient } from '@supabase/supabase-js'

/**
 * Anonymous Supabase client for public operations
 * 
 * Use this for:
 * - Public click tracking (no auth required)
 * - Other public inserts where RLS allows anonymous access
 * 
 * DO NOT use for:
 * - Authenticated user operations (use createClient from server.ts)
 * - Admin operations (use createServiceRoleClient)
 */
export function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
