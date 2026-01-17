#!/usr/bin/env node
/**
 * Reset HQ Admin Password
 * Runs locally using service role key from .env.local
 * 
 * Usage: node scripts/reset-hq-password.js
 */

const fs = require('fs')
const path = require('path')

// Manually load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      process.env[key] = value
    }
  })
}

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const HQ_EMAIL = 'hq@qwikker.com'
const NEW_PASSWORD = 'HQAdmin123!'

async function resetHQPassword() {
  console.log('🔧 Resetting HQ Admin Password...\n')

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables!')
    console.error('   Make sure .env.local has:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // 1. Check if user exists
    console.log(`🔍 Looking for user: ${HQ_EMAIL}`)
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message)
      process.exit(1)
    }

    let user = users.find(u => u.email === HQ_EMAIL)

    // 2. Create user if doesn't exist
    if (!user) {
      console.log('❌ User not found. Creating new user...')
      const { data, error: createError } = await supabase.auth.admin.createUser({
        email: HQ_EMAIL,
        password: NEW_PASSWORD,
        email_confirm: true
      })

      if (createError) {
        console.error('❌ Error creating user:', createError.message)
        process.exit(1)
      }

      user = data.user
      console.log('✅ User created!')
    } else {
      console.log('✅ User found!')
      
      // Reset password
      console.log('🔐 Resetting password...')
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: NEW_PASSWORD }
      )

      if (updateError) {
        console.error('❌ Error updating password:', updateError.message)
        process.exit(1)
      }
      console.log('✅ Password reset!')
    }

    // 3. Ensure user is in hq_admins table
    console.log('📝 Adding to hq_admins table...')
    const { error: insertError } = await supabase
      .from('hq_admins')
      .upsert({
        user_id: user.id,
        email: HQ_EMAIL,
        role: 'admin',
        is_active: true
      }, {
        onConflict: 'user_id'
      })

    if (insertError) {
      console.error('❌ Error adding to hq_admins:', insertError.message)
      process.exit(1)
    }

    console.log('✅ Added to hq_admins table!')
    console.log('\n🎉 SUCCESS!\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📝 Login Credentials:')
    console.log(`   📧 Email:    ${HQ_EMAIL}`)
    console.log(`   🔐 Password: ${NEW_PASSWORD}`)
    console.log('\n🌐 Login URLs:')
    console.log('   🏠 Local:      http://localhost:3000/hq-login')
    console.log('   🌍 Production: https://qwikkerdashboard-theta.vercel.app/hq-login')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('⚠️  CHANGE THIS PASSWORD after logging in!\n')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

resetHQPassword()
