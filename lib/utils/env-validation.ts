/**
 * Environment variable validation for development
 * 
 * Throws clear errors if required env vars are missing
 * Only runs in development mode (not in production builds)
 */

export function requireEnv(key: string, context: string = 'application'): string {
  const value = process.env[key]
  
  if (!value) {
    // Only throw in development
    if (process.env.NODE_ENV === 'development') {
      throw new Error(
        `\n\n` +
        `❌ Missing required environment variable: ${key}\n` +
        `\n` +
        `This is required for ${context}.\n` +
        `\n` +
        `To fix:\n` +
        `1. Create .env.local in your repo root\n` +
        `2. Add: ${key}=your-value-here\n` +
        `3. Restart your dev server\n` +
        `\n` +
        `See README-dev.md for full setup instructions.\n`
      )
    }
    
    // In production, return empty string and let app handle gracefully
    return ''
  }
  
  return value
}

/**
 * Validate all required Supabase environment variables
 * Call this early in app initialization
 */
export function validateSupabaseEnv() {
  if (process.env.NODE_ENV === 'development') {
    requireEnv('NEXT_PUBLIC_SUPABASE_URL', 'Supabase connection')
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase authentication')
  }
}
