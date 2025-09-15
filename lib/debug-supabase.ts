// Debug utility for Supabase operations
// This file helps debug common Supabase issues and provides detailed logging

export interface SupabaseDebugInfo {
  url: string;
  hasAnonKey: boolean;
  timestamp: string;
  userAgent: string;
  origin: string;
}

export function getSupabaseDebugInfo(): SupabaseDebugInfo {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
    origin: typeof window !== 'undefined' ? window.location.origin : 'Server',
  };
}

export function logSupabaseEnvironment() {
  const debug = getSupabaseDebugInfo();
  
  console.group('🔧 Supabase Environment Debug');
  console.log('Supabase URL:', debug.url);
  console.log('Has Anon Key:', debug.hasAnonKey);
  console.log('Timestamp:', debug.timestamp);
  console.log('Origin:', debug.origin);
  console.log('User Agent:', debug.userAgent);
  
  // Check for common configuration issues
  const issues = [];
  
  if (!debug.url || debug.url === 'NOT_SET') {
    issues.push('❌ NEXT_PUBLIC_SUPABASE_URL is not set');
  } else if (!debug.url.startsWith('https://')) {
    issues.push('⚠️  NEXT_PUBLIC_SUPABASE_URL should start with https://');
  }
  
  if (!debug.hasAnonKey) {
    issues.push('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  }
  
  if (issues.length > 0) {
    console.group('🚨 Configuration Issues');
    issues.forEach(issue => console.error(issue));
    console.groupEnd();
  } else {
    console.log('✅ Basic configuration looks good');
  }
  
  console.groupEnd();
  
  return { debug, issues };
}

interface SupabaseError {
  message?: string;
  status?: number;
  code?: string;
  details?: string;
  hint?: string;
  stack?: string;
}

export function logSupabaseError(error: unknown, context: string = 'Unknown') {
  console.group(`💥 Supabase Error - ${context}`);
  
  const err = error as SupabaseError;
  
  // Log basic error info
  console.error('Error Message:', err?.message || 'No message');
  console.error('Error Status:', err?.status || 'No status');
  console.error('Error Code:', err?.code || 'No code');
  
  // Log detailed error object
  console.error('Full Error Object:', error);
  
  // Try to extract additional details
  if (err?.details) {
    console.error('Error Details:', err.details);
  }
  
  if (err?.hint) {
    console.error('Error Hint:', err.hint);
  }
  
  // Log stack trace if available
  if (err?.stack) {
    console.error('Stack Trace:', err.stack);
  }
  
  // Check for common error patterns and provide suggestions
  const suggestions = [];
  
  if (err?.status === 500) {
    suggestions.push('💡 500 errors often indicate database trigger issues or RLS policy problems');
    suggestions.push('💡 Check your database functions and triggers in the Supabase dashboard');
    suggestions.push('💡 Verify RLS policies are not blocking the operation');
  }
  
  if (err?.status === 401) {
    suggestions.push('💡 401 errors indicate authentication issues');
    suggestions.push('💡 Check if your API keys are correct');
  }
  
  if (err?.status === 403) {
    suggestions.push('💡 403 errors often indicate RLS policy restrictions');
    suggestions.push('💡 Check if your RLS policies allow the operation');
  }
  
  if (err?.message?.includes('trigger')) {
    suggestions.push('💡 This appears to be a database trigger error');
    suggestions.push('💡 Check your trigger functions in the Supabase SQL editor');
  }
  
  if (err?.message?.includes('profiles')) {
    suggestions.push('💡 This appears to be related to the profiles table');
    suggestions.push('💡 Check if the profiles table exists and has correct permissions');
  }
  
  if (suggestions.length > 0) {
    console.group('💡 Troubleshooting Suggestions');
    suggestions.forEach(suggestion => console.log(suggestion));
    console.groupEnd();
  }
  
  console.groupEnd();
}

// Helper to test database connection
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function testSupabaseConnection(supabase: any) {
  console.log('🔌 Testing Supabase connection...');
  
  try {
    // Test basic connection with a simple query
    console.log('🔍 Testing connection with profiles table query...');
    
    const result = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    console.log('📊 Full query result:', result);
    
    if (result.error) {
      console.error('❌ Database connection test failed:', result.error);
      console.error('❌ Error details:', JSON.stringify(result.error, null, 2));
      logSupabaseError(result.error, 'Connection Test');
      
      // Try a different approach - test with a simpler query
      console.log('🔄 Trying alternative connection test...');
      try {
        const simpleTest = await supabase.auth.getSession();
        console.log('🔐 Auth session test result:', simpleTest);
        
        if (simpleTest.error) {
          console.error('❌ Auth session test also failed:', simpleTest.error);
          return false;
        } else {
          console.log('✅ Auth connection works, but profiles table access failed');
          return false; // Still return false since profiles access failed
        }
      } catch (authError) {
        console.error('❌ Auth test threw error:', authError);
        return false;
      }
    }
    
    console.log('✅ Database connection successful');
    console.log('📋 Query data:', result.data);
    return true;
  } catch (error) {
    console.error('❌ Database connection test threw error:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    logSupabaseError(error, 'Connection Test Exception');
    return false;
  }
}
