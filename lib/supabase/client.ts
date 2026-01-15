import { createBrowserClient } from '@supabase/ssr'
import { requireEnv } from '@/lib/utils/env-validation'

export function createClient() {
  // Validate env vars in development
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL', 'Supabase client') || process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase client') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  return createBrowserClient(supabaseUrl, supabaseKey)
}
