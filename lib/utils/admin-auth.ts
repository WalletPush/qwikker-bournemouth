/**
 * Admin authentication utilities for franchise management
 * Handles city-based admin login and session management
 */

import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FranchiseCity } from './city-detection'

export interface AdminUser {
  id: string
  city: FranchiseCity
  username: string
  email: string | null
  full_name: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
}

export interface AdminLoginResult {
  success: boolean
  admin?: AdminUser
  error?: string
}

/**
 * Authenticate admin user with username and password for specific city
 */
export async function authenticateAdmin(
  city: FranchiseCity,
  username: string,
  password: string
): Promise<AdminLoginResult> {
  try {
    const adminClient = createAdminClient()
    
    // Get admin record from database
    const { data: adminRecord, error } = await adminClient
      .from('city_admins')
      .select('*')
      .eq('city', city)
      .eq('username', username)
      .eq('is_active', true)
      .single()

    if (error || !adminRecord) {
      return {
        success: false,
        error: 'Invalid credentials'
      }
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, adminRecord.password_hash)
    
    if (!passwordMatch) {
      return {
        success: false,
        error: 'Invalid credentials'
      }
    }

    // Update last login timestamp
    await adminClient
      .from('city_admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', adminRecord.id)

    const admin: AdminUser = {
      id: adminRecord.id,
      city: adminRecord.city as FranchiseCity,
      username: adminRecord.username,
      email: adminRecord.email,
      full_name: adminRecord.full_name,
      is_active: adminRecord.is_active,
      last_login: adminRecord.last_login,
      created_at: adminRecord.created_at
    }

    return {
      success: true,
      admin
    }
  } catch (error) {
    console.error('Admin authentication error:', error)
    return {
      success: false,
      error: 'Authentication failed'
    }
  }
}

/**
 * Get admin user by ID
 */
export async function getAdminById(adminId: string): Promise<AdminUser | null> {
  try {
    const adminClient = createAdminClient()
    
    const { data: adminRecord, error } = await adminClient
      .from('city_admins')
      .select('*')
      .eq('id', adminId)
      .eq('is_active', true)
      .single()

    if (error || !adminRecord) {
      return null
    }

    return {
      id: adminRecord.id,
      city: adminRecord.city as FranchiseCity,
      username: adminRecord.username,
      email: adminRecord.email,
      full_name: adminRecord.full_name,
      is_active: adminRecord.is_active,
      last_login: adminRecord.last_login,
      created_at: adminRecord.created_at
    }
  } catch (error) {
    console.error('Get admin error:', error)
    return null
  }
}

/**
 * Check if user has admin access for specific city
 */
export async function isAdminForCity(adminId: string, city: FranchiseCity): Promise<boolean> {
  try {
    const admin = await getAdminById(adminId)
    return admin?.city === city && admin.is_active
  } catch (error) {
    console.error('Admin city check error:', error)
    return false
  }
}

/**
 * Change admin password
 */
export async function changeAdminPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient()
    
    // Get current admin record
    const { data: adminRecord, error: fetchError } = await adminClient
      .from('city_admins')
      .select('password_hash')
      .eq('id', adminId)
      .eq('is_active', true)
      .single()

    if (fetchError || !adminRecord) {
      return {
        success: false,
        error: 'Admin not found'
      }
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, adminRecord.password_hash)
    
    if (!passwordMatch) {
      return {
        success: false,
        error: 'Current password is incorrect'
      }
    }

    // Hash new password
    const saltRounds = 10
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

    // Update password
    const { error: updateError } = await adminClient
      .from('city_admins')
      .update({ 
        password_hash: newPasswordHash,
        password_changed_at: new Date().toISOString()
      })
      .eq('id', adminId)

    if (updateError) {
      return {
        success: false,
        error: 'Failed to update password'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Change password error:', error)
    return {
      success: false,
      error: 'Failed to change password'
    }
  }
}

/**
 * Get all admins for a city (for management purposes)
 */
export async function getAdminsForCity(city: FranchiseCity): Promise<AdminUser[]> {
  try {
    const adminClient = createAdminClient()
    
    const { data: adminRecords, error } = await adminClient
      .from('city_admins')
      .select('*')
      .eq('city', city)
      .order('created_at', { ascending: true })

    if (error || !adminRecords) {
      return []
    }

    return adminRecords.map(record => ({
      id: record.id,
      city: record.city as FranchiseCity,
      username: record.username,
      email: record.email,
      full_name: record.full_name,
      is_active: record.is_active,
      last_login: record.last_login,
      created_at: record.created_at
    }))
  } catch (error) {
    console.error('Get admins for city error:', error)
    return []
  }
}
