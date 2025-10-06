// Script to create admin user
// Run with: node scripts/create-admin.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
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
    // Create admin user
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@qwikker.com',
      password: 'QwikkerAdmin2025!',
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        first_name: 'Qwikker',
        last_name: 'Admin'
      }
    })

    if (error) {
      console.error('Error creating admin user:', error)
      return
    }

    console.log('✅ Admin user created successfully!')
    console.log('Email: admin@qwikker.com')
    console.log('Password: QwikkerAdmin2025!')
    console.log('User ID:', data.user.id)

  } catch (error) {
    console.error('Script error:', error)
  }
}

createAdminUser()
