import { createClient } from '@/lib/supabase/server'

export default async function CreateTestProfilePage() {
  const supabase = await createClient()
  
  try {
    // Get current user
    const { data: authData } = await supabase.auth.getClaims()
    
    if (!authData?.claims) {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Create Test Profile</h1>
          <p className="text-red-500">Not authenticated - please log in first</p>
        </div>
      )
    }
    
    const userId = authData.claims.sub
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
      
    if (existingProfile) {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Test Profile Status</h1>
          <div className="bg-green-100 p-4 rounded-lg">
            <h2 className="font-semibold text-green-800">Profile Already Exists!</h2>
            <p className="text-green-700 mt-2">
              Business: <strong>{existingProfile.business_name}</strong><br/>
              Status: <strong>{existingProfile.status}</strong><br/>
              User ID: <code>{existingProfile.user_id}</code>
            </p>
          </div>
        </div>
      )
    }
    
    // Create test profile
    const { data: newProfile, error } = await supabase
      .from('business_profiles')
      .insert({
        user_id: userId,
        first_name: 'Test',
        last_name: 'Owner',
        email: 'test@example.com',
        phone: '+447700000000',
        business_name: 'Test Restaurant',
        business_type: 'restaurant',
        business_category: 'Casual Dining',
        business_address: '123 Test Street',
        business_town: 'bournemouth',
        business_postcode: 'BH1 1AA',
        status: 'approved',
        plan: 'starter',
        city: 'bournemouth'
      })
      .select()
      .single()
      
    if (error) {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Create Test Profile</h1>
          <div className="bg-red-100 p-4 rounded-lg">
            <h2 className="font-semibold text-red-800">Error Creating Profile</h2>
            <p className="text-red-700 mt-2">{error.message}</p>
          </div>
        </div>
      )
    }
    
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Test Profile Created!</h1>
        <div className="bg-green-100 p-4 rounded-lg">
          <h2 className="font-semibold text-green-800">Success!</h2>
          <p className="text-green-700 mt-2">
            Created test business profile for user: <code>{userId}</code><br/>
            Business: <strong>{newProfile.business_name}</strong><br/>
            Status: <strong>{newProfile.status}</strong>
          </p>
          <div className="mt-4">
            <a 
              href="/dashboard" 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Go to Business Dashboard
            </a>
          </div>
        </div>
      </div>
    )
    
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Create Test Profile</h1>
        <div className="bg-red-100 p-4 rounded-lg">
          <h2 className="font-semibold text-red-800">Unexpected Error</h2>
          <p className="text-red-700 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    )
  }
}
