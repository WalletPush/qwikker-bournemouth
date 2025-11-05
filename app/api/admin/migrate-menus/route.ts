import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Get all menu entries from knowledge base
    const { data: knowledgeMenus, error: knowledgeError } = await supabase
      .from('knowledge_base')
      .select(`
        id,
        business_id,
        title,
        metadata,
        created_at
      `)
      .eq('knowledge_type', 'pdf_document')
      .contains('tags', ['menu'])

    if (knowledgeError) {
      console.error('Error fetching knowledge base menus:', knowledgeError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch knowledge base menus'
      }, { status: 500 })
    }

    if (!knowledgeMenus || knowledgeMenus.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No menus found in knowledge base to migrate',
        migrated: 0
      })
    }

    const migratedMenus = []
    const errors = []

    for (const knowledgeMenu of knowledgeMenus) {
      try {
        // Extract metadata
        const metadata = knowledgeMenu.metadata || {}
        const originalFileName = metadata.originalFileName || knowledgeMenu.title
        const fileSize = metadata.fileSize || 0
        
        // Determine menu type from filename/title
        let menuType = 'main_menu' // default
        const titleLower = knowledgeMenu.title.toLowerCase()
        if (titleLower.includes('cocktail') || titleLower.includes('drink')) {
          menuType = 'cocktails'
        } else if (titleLower.includes('wine')) {
          menuType = 'wine_list'
        } else if (titleLower.includes('dessert')) {
          menuType = 'desserts'
        } else if (titleLower.includes('breakfast')) {
          menuType = 'breakfast'
        } else if (titleLower.includes('lunch')) {
          menuType = 'lunch'
        } else if (titleLower.includes('dinner')) {
          menuType = 'dinner'
        } else if (titleLower.includes('special')) {
          menuType = 'specials'
        }

        // Check if this menu already exists in the menus table
        const { data: existingMenu, error: checkError } = await supabase
          .from('menus')
          .select('id')
          .eq('business_id', knowledgeMenu.business_id)
          .eq('menu_name', knowledgeMenu.title)
          .single()

        if (existingMenu) {
          console.log(`Menu already exists: ${knowledgeMenu.title}`)
          continue
        }

        // Create menu record in new table
        const { data: newMenu, error: insertError } = await supabase
          .from('menus')
          .insert({
            business_id: knowledgeMenu.business_id,
            menu_name: knowledgeMenu.title,
            menu_type: menuType,
            menu_url: `https://res.cloudinary.com/dsh32kke7/raw/upload/qwikker/menus/${knowledgeMenu.title}.pdf`, // Construct URL
            file_size: fileSize,
            original_filename: originalFileName,
            status: 'approved', // Since it's already in knowledge base, it was approved
            admin_notes: 'Migrated from existing knowledge base',
            created_at: knowledgeMenu.created_at,
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) {
          console.error(`Error inserting menu ${knowledgeMenu.title}:`, insertError)
          errors.push({
            title: knowledgeMenu.title,
            error: insertError.message
          })
        } else {
          migratedMenus.push(newMenu)
          console.log(`✅ Migrated menu: ${knowledgeMenu.title}`)
        }

      } catch (error) {
        console.error(`Error processing menu ${knowledgeMenu.title}:`, error)
        errors.push({
          title: knowledgeMenu.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed. ${migratedMenus.length} menus migrated successfully.`,
      migrated: migratedMenus.length,
      menus: migratedMenus,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Menu migration error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error during migration'
    }, { status: 500 })
  }
}
