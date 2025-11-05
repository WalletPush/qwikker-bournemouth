import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    
    // Get franchise city for admin isolation
    const city = await getFranchiseCityFromRequest()
    
    const { menuId, action, adminNotes, adminUserId } = await request.json()

    if (!menuId || !action || !adminUserId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: menuId, action, adminUserId'
      }, { status: 400 })
    }

    if (!['approve', 'reject', 'needs_revision'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be: approve, reject, or needs_revision'
      }, { status: 400 })
    }

    // Verify menu exists and belongs to this franchise
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .select(`
        *,
        business_profiles!inner(
          id,
          business_name,
          city,
          user_id
        )
      `)
      .eq('id', menuId)
      .eq('business_profiles.city', city)
      .single()

    if (menuError || !menu) {
      return NextResponse.json({
        success: false,
        error: 'Menu not found or not in your franchise area'
      }, { status: 404 })
    }

    // Prepare update data - only include fields that exist in the table
    const updateData: any = {
      status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_revision',
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString()
    }

    // Note: approved_by and approved_at columns may not exist in current table
    // We'll update the table structure separately
    // For now, just update status and admin_notes

    // Update menu status
    console.log('🔄 Updating menu with data:', updateData)
    console.log('🔄 Menu ID:', menuId)
    
    const { data: updateResult, error: updateError } = await supabase
      .from('menus')
      .update(updateData)
      .eq('id', menuId)
      .select()

    console.log('🔄 Update result:', updateResult)
    console.log('🔄 Update error:', updateError)

    if (updateError) {
      console.error('❌ Error updating menu status:', updateError)
      return NextResponse.json({
        success: false,
        error: `Failed to update menu status: ${updateError.message || updateError.code || 'Unknown error'}`
      }, { status: 500 })
    }

    if (!updateResult || updateResult.length === 0) {
      console.error('❌ No rows updated - menu may not exist or RLS policy may be blocking update')
      return NextResponse.json({
        success: false,
        error: 'No menu was updated - check if menu exists and you have permission'
      }, { status: 404 })
    }

    // Track knowledge base processing results
    let successfulEmbeddings = 0

    // If approved, process PDF and add to knowledge base
    if (action === 'approve') {
      try {
        console.log(`📄 Processing approved menu "${menu.menu_name}" for knowledge base...`)
        
        // Download the PDF from Cloudinary
        const response = await fetch(menu.menu_url)
        if (!response.ok) {
          throw new Error(`Failed to download PDF: ${response.statusText}`)
        }
        
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Import PDF processing functions
        const { parsePDF, validatePDFContent } = await import('@/lib/utils/pdf-parser')
        const { chunkMenuText } = await import('@/lib/ai/pdf-processor')
        const { storeKnowledgeWithEmbedding } = await import('@/lib/ai/embeddings')
        
        // Parse PDF content
        const pdfData = await parsePDF(buffer)
        const content = pdfData.text
        
        if (!validatePDFContent(content)) {
          throw new Error('PDF appears to be empty or contains insufficient text')
        }
        
        console.log(`📝 Extracted ${content.length} characters from menu PDF`)
        
        // Chunk the menu text using specialized menu chunking
        const chunks = chunkMenuText(content, 1200)
        console.log(`🔄 Created ${chunks.length} menu chunks`)
        
        let failedEmbeddings = 0
        
        // Store each chunk as a separate embedding
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          
          // Create chunk title
          const chunkTitle = chunks.length > 1 
            ? `${menu.menu_name} (Part ${i + 1})` 
            : menu.menu_name
          
          // Add chunk metadata
          const chunkMetadata = {
            originalFileName: menu.original_filename,
            fileSize: menu.file_size,
            menuType: menu.menu_type,
            menuId: menu.id,
            uploadedAt: menu.created_at, // Use created_at since uploaded_at column doesn't exist yet
            approvedAt: new Date().toISOString(),
            chunk_index: i,
            total_chunks: chunks.length,
            source: 'menu_approval'
          }
          
          // Store as embedding
          const result = await storeKnowledgeWithEmbedding({
            city: city,
            businessId: menu.business_id,
            knowledgeType: 'pdf_document',
            title: chunkTitle,
            content: chunk,
            metadata: chunkMetadata,
            fileUrl: menu.menu_url,
            tags: ['menu', 'pdf', 'business', 'approved', menu.menu_type]
          })
          
          if (result.success) {
            successfulEmbeddings++
            console.log(`✅ Stored menu chunk ${i + 1}/${chunks.length}`)
          } else {
            failedEmbeddings++
            console.error(`❌ Failed to store menu chunk ${i + 1}:`, result.error)
          }
        }
        
        if (successfulEmbeddings > 0) {
          console.log(`✅ Successfully added menu "${menu.menu_name}" to knowledge base: ${successfulEmbeddings} chunks stored`)
        } else {
          console.error(`❌ Failed to add any chunks of menu "${menu.menu_name}" to knowledge base`)
        }
        
      } catch (error) {
        console.error('❌ Failed to process menu for knowledge base:', error)
        // Don't fail the approval if knowledge base update fails
        // The menu is still approved, just not in the knowledge base yet
      }

      // 📧 SEND EMAIL NOTIFICATION: Menu approved
      try {
        // Get business contact info
        const { data: businessContact, error: contactError } = await supabase
          .from('business_profiles')
          .select('email, first_name, business_name')
          .eq('id', menu.business_id)
          .single()

        if (businessContact?.email) {
          const { sendMenuApprovalNotification } = await import('@/lib/notifications/email-notifications')
          
          const emailResult = await sendMenuApprovalNotification({
            firstName: businessContact.first_name || 'Business Owner',
            businessName: businessContact.business_name || 'Your Business',
            menuName: menu.menu_name,
            menuType: menu.menu_type,
            city: city,
            dashboardUrl: `https://${city}.qwikker.com/dashboard`
          })
          
          if (emailResult.success) {
            console.log(`📧 Menu approval email sent to ${businessContact.email}`)
          } else {
            console.error(`❌ Failed to send menu approval email: ${emailResult.error}`)
          }
        }
      } catch (error) {
        console.error('⚠️ Menu approval email error (non-critical):', error)
      }
    }
    
    // If rejected, remove from knowledge base if it was previously approved
    if (action === 'reject' && menu.status === 'approved') {
      try {
        const { removeMenuFromKnowledgeBase } = await import('@/lib/ai/menu-knowledge')
        
        const result = await removeMenuFromKnowledgeBase(menuId, city)
        if (result.success) {
          console.log(`✅ Removed rejected menu from knowledge base: ${result.message}`)
        } else {
          console.error(`❌ Failed to remove menu from knowledge base: ${result.error}`)
        }
      } catch (error) {
        console.error('❌ Error removing menu from knowledge base:', error)
        // Don't fail the rejection if knowledge base cleanup fails
      }
    }

    const actionText = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'marked as needs revision'
    
    return NextResponse.json({
      success: true,
      message: `Menu "${menu.menu_name}" has been ${actionText}`,
      chunksCreated: action === 'approve' ? successfulEmbeddings : undefined,
      data: {
        menuId,
        status: updateData.status,
        businessName: menu.business_profiles.business_name
      }
    })

  } catch (error) {
    console.error('Menu approval error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
