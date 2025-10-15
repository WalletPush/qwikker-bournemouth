'use server'

import { updateKnowledgeEmbedding } from './embeddings'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Sync all approved businesses to embeddings
 * This should be run when setting up the AI system or after major updates
 */
export async function syncAllBusinessEmbeddings(city?: string) {
  const supabase = createServiceRoleClient()

  try {
    console.log(`🔄 Starting embeddings sync${city ? ` for ${city}` : ' for all cities'}...`)

    // Get all approved businesses
    let query = supabase
      .from('business_profiles')
      .select('id, business_name, city')
      .eq('status', 'approved')

    if (city) {
      query = query.eq('city', city.toLowerCase())
    }

    const { data: businesses, error } = await query

    if (error) {
      console.error('❌ Error fetching businesses for sync:', error)
      return { success: false, error: error.message }
    }

    if (!businesses || businesses.length === 0) {
      console.log('ℹ️ No approved businesses found to sync')
      return { success: true, synced: 0, skipped: 0, errors: 0 }
    }

    console.log(`📊 Found ${businesses.length} approved businesses to sync`)

    let synced = 0
    let skipped = 0
    let errors = 0

    // Process businesses in batches to avoid overwhelming the API
    const batchSize = 5
    for (let i = 0; i < businesses.length; i += batchSize) {
      const batch = businesses.slice(i, i + batchSize)
      
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(businesses.length / batchSize)}`)

      const batchPromises = batch.map(async (business) => {
        try {
          const result = await updateBusinessEmbeddings(business.id)
          if (result.success) {
            synced++
            console.log(`✅ Synced ${business.business_name} (${result.count} embeddings)`)
          } else {
            errors++
            console.error(`❌ Failed to sync ${business.business_name}:`, result.error)
          }
        } catch (error) {
          errors++
          console.error(`❌ Error syncing ${business.business_name}:`, error)
        }
      })

      await Promise.all(batchPromises)

      // Small delay between batches to be nice to the API
      if (i + batchSize < businesses.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log(`✅ Embeddings sync complete: ${synced} synced, ${skipped} skipped, ${errors} errors`)

    return {
      success: true,
      synced,
      skipped,
      errors,
      total: businesses.length
    }

  } catch (error) {
    console.error('❌ Error in syncAllBusinessEmbeddings:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Sync embeddings for a specific business (called when business data changes)
 */
export async function syncBusinessEmbeddings(businessId: string) {
  try {
    console.log(`🔄 Syncing embeddings for business ${businessId}`)
    
    const result = await updateBusinessEmbeddings(businessId)
    
    if (result.success) {
      console.log(`✅ Successfully synced ${result.count} embeddings for business ${businessId}`)
    } else {
      console.error(`❌ Failed to sync embeddings for business ${businessId}:`, result.error)
    }

    return result

  } catch (error) {
    console.error(`❌ Error syncing embeddings for business ${businessId}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Clean up orphaned embeddings (embeddings for businesses that no longer exist or are not approved)
 */
export async function cleanupOrphanedEmbeddings() {
  const supabase = createServiceRoleClient()

  try {
    console.log('🧹 Cleaning up orphaned embeddings...')

    // Find embeddings for businesses that don't exist or aren't approved
    const { data: orphanedEmbeddings, error: findError } = await supabase
      .from('business_embeddings')
      .select(`
        id,
        business_id,
        business_profiles!inner(id, status)
      `)
      .or('business_profiles.status.neq.approved,business_profiles.id.is.null')

    if (findError) {
      console.error('❌ Error finding orphaned embeddings:', findError)
      return { success: false, error: findError.message }
    }

    if (!orphanedEmbeddings || orphanedEmbeddings.length === 0) {
      console.log('✅ No orphaned embeddings found')
      return { success: true, cleaned: 0 }
    }

    console.log(`🗑️ Found ${orphanedEmbeddings.length} orphaned embeddings to clean up`)

    // Delete orphaned embeddings
    const orphanedIds = orphanedEmbeddings.map(e => e.id)
    const { error: deleteError } = await supabase
      .from('business_embeddings')
      .delete()
      .in('id', orphanedIds)

    if (deleteError) {
      console.error('❌ Error deleting orphaned embeddings:', deleteError)
      return { success: false, error: deleteError.message }
    }

    console.log(`✅ Cleaned up ${orphanedEmbeddings.length} orphaned embeddings`)

    return {
      success: true,
      cleaned: orphanedEmbeddings.length
    }

  } catch (error) {
    console.error('❌ Error in cleanupOrphanedEmbeddings:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get embeddings statistics for monitoring
 */
export async function getEmbeddingsStats(city?: string) {
  const supabase = createServiceRoleClient()

  try {
    // Business embeddings stats
    let businessQuery = supabase
      .from('business_embeddings')
      .select('content_type, city', { count: 'exact' })

    if (city) {
      businessQuery = businessQuery.eq('city', city.toLowerCase())
    }

    const { count: businessEmbeddingsCount, error: businessError } = await businessQuery

    if (businessError) {
      console.error('❌ Error getting business embeddings stats:', businessError)
      return { success: false, error: businessError.message }
    }

    // City embeddings stats
    let cityQuery = supabase
      .from('city_embeddings')
      .select('content_type, city', { count: 'exact' })

    if (city) {
      cityQuery = cityQuery.eq('city', city.toLowerCase())
    }

    const { count: cityEmbeddingsCount, error: cityError } = await cityQuery

    if (cityError) {
      console.error('❌ Error getting city embeddings stats:', cityError)
      return { success: false, error: cityError.message }
    }

    // Approved businesses count
    let approvedQuery = supabase
      .from('business_profiles')
      .select('id', { count: 'exact' })
      .eq('status', 'approved')

    if (city) {
      approvedQuery = approvedQuery.eq('city', city.toLowerCase())
    }

    const { count: approvedBusinessesCount, error: approvedError } = await approvedQuery

    if (approvedError) {
      console.error('❌ Error getting approved businesses stats:', approvedError)
      return { success: false, error: approvedError.message }
    }

    const stats = {
      businessEmbeddings: businessEmbeddingsCount || 0,
      cityEmbeddings: cityEmbeddingsCount || 0,
      approvedBusinesses: approvedBusinessesCount || 0,
      coverage: approvedBusinessesCount ? 
        Math.round(((businessEmbeddingsCount || 0) / approvedBusinessesCount) * 100) : 0
    }

    console.log(`📊 Embeddings stats${city ? ` for ${city}` : ''}:`, stats)

    return {
      success: true,
      stats
    }

  } catch (error) {
    console.error('❌ Error getting embeddings stats:', error)
    return { success: false, error: error.message }
  }
}
