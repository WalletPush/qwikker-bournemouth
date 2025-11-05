import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Remove menu-related knowledge base entries when a menu is deleted or rejected
 */
export async function removeMenuFromKnowledgeBase(menuId: string, city: string): Promise<{
  success: boolean
  message: string
  deletedCount?: number
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()
    
    console.log(`🗑️ Removing menu ${menuId} from knowledge base for city ${city}`)
    
    // Find all knowledge base entries for this menu
    const { data: entries, error: findError } = await supabase
      .from('knowledge_base')
      .select('id, title')
      .eq('city', city.toLowerCase())
      .contains('metadata', { menuId })
    
    if (findError) {
      console.error('❌ Error finding menu knowledge entries:', findError)
      return {
        success: false,
        message: 'Failed to find menu knowledge entries',
        error: findError.message
      }
    }
    
    if (!entries || entries.length === 0) {
      console.log(`ℹ️ No knowledge base entries found for menu ${menuId}`)
      return {
        success: true,
        message: 'No knowledge base entries to remove',
        deletedCount: 0
      }
    }
    
    // Delete all entries for this menu
    const entryIds = entries.map(entry => entry.id)
    const { error: deleteError } = await supabase
      .from('knowledge_base')
      .delete()
      .in('id', entryIds)
    
    if (deleteError) {
      console.error('❌ Error deleting menu knowledge entries:', deleteError)
      return {
        success: false,
        message: 'Failed to delete menu knowledge entries',
        error: deleteError.message
      }
    }
    
    console.log(`✅ Removed ${entries.length} knowledge base entries for menu ${menuId}`)
    
    return {
      success: true,
      message: `Removed ${entries.length} knowledge base entries`,
      deletedCount: entries.length
    }
    
  } catch (error) {
    console.error('❌ Error removing menu from knowledge base:', error)
    return {
      success: false,
      message: 'Internal error removing menu from knowledge base',
      error: error.message
    }
  }
}

/**
 * Update menu knowledge base entries when menu is updated (e.g., name change)
 */
export async function updateMenuInKnowledgeBase(
  menuId: string, 
  city: string, 
  updates: {
    menuName?: string
    menuType?: string
  }
): Promise<{
  success: boolean
  message: string
  updatedCount?: number
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()
    
    console.log(`📝 Updating menu ${menuId} in knowledge base for city ${city}`)
    
    // Find all knowledge base entries for this menu
    const { data: entries, error: findError } = await supabase
      .from('knowledge_base')
      .select('id, title, metadata')
      .eq('city', city.toLowerCase())
      .contains('metadata', { menuId })
    
    if (findError) {
      console.error('❌ Error finding menu knowledge entries:', findError)
      return {
        success: false,
        message: 'Failed to find menu knowledge entries',
        error: findError.message
      }
    }
    
    if (!entries || entries.length === 0) {
      console.log(`ℹ️ No knowledge base entries found for menu ${menuId}`)
      return {
        success: true,
        message: 'No knowledge base entries to update',
        updatedCount: 0
      }
    }
    
    let updatedCount = 0
    
    // Update each entry
    for (const entry of entries) {
      const updateData: any = {}
      
      // Update title if menu name changed
      if (updates.menuName) {
        const isMultiPart = entry.title.includes('(Part ')
        if (isMultiPart) {
          const partMatch = entry.title.match(/\(Part \d+\)$/)
          updateData.title = partMatch 
            ? `${updates.menuName} ${partMatch[0]}`
            : updates.menuName
        } else {
          updateData.title = updates.menuName
        }
      }
      
      // Update metadata
      const updatedMetadata = { ...entry.metadata }
      if (updates.menuType) {
        updatedMetadata.menuType = updates.menuType
      }
      updateData.metadata = updatedMetadata
      
      // Apply updates
      const { error: updateError } = await supabase
        .from('knowledge_base')
        .update(updateData)
        .eq('id', entry.id)
      
      if (updateError) {
        console.error(`❌ Error updating knowledge entry ${entry.id}:`, updateError)
      } else {
        updatedCount++
      }
    }
    
    console.log(`✅ Updated ${updatedCount}/${entries.length} knowledge base entries for menu ${menuId}`)
    
    return {
      success: updatedCount > 0,
      message: `Updated ${updatedCount} knowledge base entries`,
      updatedCount
    }
    
  } catch (error) {
    console.error('❌ Error updating menu in knowledge base:', error)
    return {
      success: false,
      message: 'Internal error updating menu in knowledge base',
      error: error.message
    }
  }
}
