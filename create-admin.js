const { createClient } = require('@supabase/supabase-js')

// You'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iiiciapavjonpmldytxf.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdminUser() {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@qwikker.com',
      password: 'admin',
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User'
      }
    })

    if (error) {
      console.error('Error creating admin user:', error)
      return
    }

    console.log('✅ Admin user created successfully!')
    console.log('Email: admin@qwikker.com')
    console.log('Password: admin')
    console.log('User ID:', data.user.id)

  } catch (error) {
    console.error('Error:', error)
  }
}

createAdminUser()
