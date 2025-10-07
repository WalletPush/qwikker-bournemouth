'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { logSupabaseEnvironment, testSupabaseConnection } from '@/lib/debug-supabase'

export default function DebugSupabasePage() {
  const [results, setResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    console.log(message)
  }

  const runDiagnostics = async () => {
    setIsLoading(true)
    setResults([])
    
    try {
      const supabase = createClient()
      
      // 1. Check environment
      addResult('🔧 Checking Supabase environment...')
      const { issues } = logSupabaseEnvironment()
      
      if (issues.length > 0) {
        issues.forEach(issue => addResult(issue))
      } else {
        addResult('✅ Environment configuration looks good')
      }

      // 2. Test basic connection
      addResult('🔌 Testing database connection...')
      const connectionOk = await testSupabaseConnection(supabase)
      addResult(connectionOk ? '✅ Database connection successful' : '❌ Database connection failed')

      // 3. Test profiles table access
      addResult('📋 Testing profiles table access...')
      try {
        const { data, error } = await supabase.rpc('test_profiles_access')
        if (error) {
          addResult(`❌ Profiles test function error: ${error.message}`)
        } else {
          addResult(`✅ Profiles test result: ${data}`)
        }
      } catch (error) {
        addResult(`❌ Failed to call test function: ${error}`)
      }

      // 4. Test RLS policies
      addResult('🔒 Testing RLS policies...')
      try {
        const { error } = await supabase
          .from('business_profiles')
          .select('count')
          .limit(1)
        
        if (error) {
          if (error.code === 'PGRST116') {
            addResult('✅ RLS is working (no data returned for unauthenticated user)')
          } else {
            addResult(`❌ RLS test error: ${error.message}`)
          }
        } else {
          addResult('⚠️  RLS might not be properly configured (data returned for unauthenticated user)')
        }
      } catch (error) {
        addResult(`❌ RLS test failed: ${error}`)
      }

      // 5. Test auth configuration
      addResult('🔐 Testing auth configuration...')
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          addResult(`❌ Auth session error: ${error.message}`)
        } else {
          addResult(`✅ Auth session check successful (${data.session ? 'authenticated' : 'not authenticated'})`)
        }
      } catch (error) {
        addResult(`❌ Auth test failed: ${error}`)
      }

    } catch (error) {
      addResult(`💥 Diagnostics failed: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testSignup = async () => {
    setIsLoading(true)
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'testpassword123'
    
    try {
      const supabase = createClient()
      
      addResult(`🧪 Testing signup with email: ${testEmail}`)
      
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      })

      if (error) {
        addResult(`❌ Signup test failed: ${error.message}`)
        console.error('Full signup error:', error)
      } else {
        addResult(`✅ Signup test successful! User ID: ${data.user?.id}`)
        
        // Check if profile was created
        if (data.user?.id) {
          setTimeout(async () => {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('business_profiles')
                .select('*')
                .eq('user_id', data.user!.id)
                .single()
              
              if (profileError) {
                addResult(`❌ Profile creation check failed: ${profileError.message}`)
              } else {
                addResult(`✅ Profile created successfully: ${JSON.stringify(profileData, null, 2)}`)
              }
            } catch (error) {
              addResult(`❌ Profile check error: ${error}`)
            }
          }, 2000) // Wait 2 seconds for trigger to complete
        }
      }
      
    } catch (error) {
      addResult(`💥 Signup test threw error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const checkBusinessOffers = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      
      addResult('🔍 Checking David\'s Grill Shack offers...')
      
      // First, find David's Grill Shack business ID
      const { data: business, error: businessError } = await supabase
        .from('business_profiles')
        .select('id, business_name, offer_name')
        .ilike('business_name', '%david%grill%')
        .single()
      
      if (businessError) {
        addResult(`❌ Error finding David's Grill Shack: ${businessError.message}`)
        return
      }
      
      if (!business) {
        addResult('❌ David\'s Grill Shack not found')
        return
      }
      
      addResult(`✅ Found business: ${business.business_name} (ID: ${business.id})`)
      addResult(`📝 Legacy offer_name: ${business.offer_name || 'None'}`)
      
      // Now check business_offers table
      const { data: offers, error: offersError } = await supabase
        .from('business_offers')
        .select('*')
        .eq('business_id', business.id)
      
      if (offersError) {
        addResult(`❌ Error fetching business_offers: ${offersError.message}`)
        return
      }
      
      addResult(`📊 Found ${offers?.length || 0} offers in business_offers table:`)
      offers?.forEach((offer, index) => {
        addResult(`  ${index + 1}. ${offer.offer_name} (${offer.status}) - ${offer.offer_value}`)
      })
      
    } catch (error) {
      addResult(`💥 Business offers check failed: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🔧 Supabase Debug Dashboard</CardTitle>
            <p className="text-sm text-muted-foreground">
              Use this page to diagnose Supabase connection and configuration issues.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button onClick={runDiagnostics} disabled={isLoading}>
                {isLoading ? 'Running...' : '🔍 Run Diagnostics'}
              </Button>
              <Button onClick={testSignup} disabled={isLoading} variant="outline">
                {isLoading ? 'Testing...' : '🧪 Test Signup'}
              </Button>
              <Button onClick={checkBusinessOffers} disabled={isLoading} variant="outline">
                {isLoading ? 'Checking...' : '🏢 Check David\'s Offers'}
              </Button>
              <Button onClick={clearResults} variant="outline" size="sm">
                🗑️ Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📊 Diagnostic Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <pre className="text-sm space-y-1 font-mono">
                  {results.map((result, index) => (
                    <div key={index} className="py-1">
                      {result}
                    </div>
                  ))}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>💡 Common Issues & Solutions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">500 Errors During Signup</h4>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Usually caused by database trigger errors</li>
                <li>Check if the profiles table exists and has correct permissions</li>
                <li>Verify the handle_new_user() function is working correctly</li>
                <li>Look for constraint violations (missing required fields)</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">RLS Policy Issues</h4>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Ensure RLS is enabled on the profiles table</li>
                <li>Check that policies allow the intended operations</li>
                <li>Verify auth.uid() is accessible in your policies</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Environment Configuration</h4>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>NEXT_PUBLIC_SUPABASE_URL should be your project URL</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY should be your anon/public key</li>
                <li>Both should be accessible in the browser (NEXT_PUBLIC_ prefix)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
