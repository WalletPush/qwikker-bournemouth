#!/usr/bin/env node

/**
 * Update Calgary admin password for testing
 * Usage: node scripts/update-calgary-admin-password.js
 */

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')
require('dotenv').config({ path: '.env.local' })

async function updateCalgaryAdminPassword() {
  // Initialize Supabase client with service role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables')
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    console.log('🔐 Updating Calgary admin password...')
    
    // New password: "Calgary123" (easy to remember for testing)
    const newPassword = 'Calgary123'
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(newPassword, saltRounds)
    
    console.log('🏙️ Setting up Calgary admin credentials:')
    console.log('   City: calgary')
    console.log('   Username: calgary') 
    console.log('   Password: Calgary123')
    console.log('   URL: calgary.qwikker.com/admin/login (or localhost:3000/admin/login)')
    
    // Update the Calgary admin password
    const { data, error } = await supabase
      .from('city_admins')
      .update({
        password_hash: passwordHash,
        password_changed_at: new Date().toISOString(),
        email: 'admin@calgary.qwikker.com',
        full_name: 'Calgary Admin',
        is_active: true
      })
      .eq('city', 'calgary')
      .eq('username', 'calgary')
      .select()

    if (error) {
      console.error('❌ Database error:', error)
      process.exit(1)
    }

    if (!data || data.length === 0) {
      console.log('⚠️ Calgary admin not found, creating new admin...')
      
      // Create new Calgary admin
      const { data: newAdmin, error: createError } = await supabase
        .from('city_admins')
        .insert({
          city: 'calgary',
          username: 'calgary',
          password_hash: passwordHash,
          email: 'admin@calgary.qwikker.com',
          full_name: 'Calgary Admin',
          is_active: true
        })
        .select()

      if (createError) {
        console.error('❌ Failed to create Calgary admin:', createError)
        process.exit(1)
      }

      console.log('✅ Created new Calgary admin!')
      console.log('📋 Admin details:', newAdmin[0])
    } else {
      console.log('✅ Updated Calgary admin password!')
      console.log('📋 Admin details:', data[0])
    }

    console.log('\n🎉 Calgary admin is ready!')
    console.log('\n📝 Login Instructions:')
    console.log('1. Go to: http://localhost:3000/admin/login')
    console.log('2. Enter credentials:')
    console.log('   - Username: calgary')
    console.log('   - Password: Calgary123')
    console.log('\n🌍 For production, use: https://calgary.qwikker.com/admin/login')
    console.log('\n🔍 This admin can only see Calgary businesses and data!')

  } catch (error) {
    console.error('❌ Script error:', error)
    process.exit(1)
  }
}

// Run the script
updateCalgaryAdminPassword()
