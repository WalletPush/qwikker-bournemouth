import { createAdminClient } from '@/lib/supabase/admin'

export default async function TestDB() {
  let result = 'Testing...'
  
  try {
    const supabaseAdmin = createAdminClient()
    
    // Test 1: Can we connect?
    const { data: testData, error: testError } = await supabaseAdmin
      .from('profiles')
      .select('count(*)')
      .limit(1)
    
    if (testError) {
      result = `Database Error: ${testError.message}`
    } else {
      result = 'Database connection works!'
    }
    
    // Test 2: Can we create a test user?
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
      user_metadata: {
        first_name: 'Test',
        last_name: 'User'
      }
    })
    
    if (authError) {
      result += `\nAuth Error: ${authError.message}`
    } else {
      result += `\nAuth works! User ID: ${authData.user?.id}`
      
      // Clean up test user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      result += `\nTest user cleaned up`
    }
    
  } catch (error) {
    result = `Catch Error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Test</h1>
      <pre className="bg-gray-100 p-4 rounded">{result}</pre>
    </div>
  )
}
