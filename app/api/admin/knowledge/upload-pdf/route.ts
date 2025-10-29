import { NextRequest, NextResponse } from 'next/server'
import { storeKnowledgeWithEmbedding } from '@/lib/ai/embeddings'
import { parsePDF, validatePDFContent } from '@/lib/utils/pdf-parser'
import { chunkMenuText, chunkText } from '@/lib/ai/pdf-processor'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File
    const targetId = formData.get('targetId') as string
    const targetType = formData.get('targetType') as string
    const title = formData.get('title') as string

    if (!file || !targetId || !targetType) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: pdf, targetId, targetType' 
      }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ 
        success: false, 
        error: 'File must be a PDF' 
      }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse PDF content using utility function (Turbopack compatible)
    const pdfData = await parsePDF(buffer)
    const content = pdfData.text

    if (!validatePDFContent(content)) {
      return NextResponse.json({ 
        success: false, 
        error: 'PDF appears to be empty or contains insufficient text' 
      }, { status: 400 })
    }

    // Determine if this is for a business or general city knowledge
    const isBusinessUpload = targetType === 'business'
    const businessId = isBusinessUpload ? targetId : null
    
    // For business uploads, we need to get the city from the business record
    // For general uploads, targetId is the city
    let city = targetId // Default for general uploads
    
    if (isBusinessUpload) {
      // Get the city from the business record
      const { createServiceRoleClient } = await import('@/lib/supabase/server')
      const supabase = createServiceRoleClient()
      
      const { data: business, error } = await supabase
        .from('business_profiles')
        .select('city')
        .eq('id', targetId)
        .single()
      
      if (error || !business) {
        return NextResponse.json({ 
          success: false, 
          error: 'Business not found or unable to determine city' 
        }, { status: 400 })
      }
      
      city = business.city
    }
    
    // Use provided title or fallback to filename
    const documentTitle = title || file.name.replace('.pdf', '')

        // CHUNK THE CONTENT for better AI retrieval - use conservative chunking for businesses
        const chunks = isBusinessUpload 
          ? chunkMenuText(content.trim(), 1200) // Large chunks that preserve complete menus
          : chunkText(content.trim(), 1000)     // Reasonable chunks for city knowledge
    
    console.log(`📝 Created ${chunks.length} ${isBusinessUpload ? 'menu-aware' : 'general'} text chunks for better AI retrieval`)
    console.log(`📊 Content length: ${content.length} chars, Chunk sizes:`, chunks.map((chunk, i) => `Chunk ${i + 1}: ${chunk.length} chars`).join(', '))

    let successfulEmbeddings = 0
    let failedEmbeddings = 0
    const embeddingIds: string[] = []

    // Store each chunk as a separate embedding
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      // Create chunk title
      const chunkTitle = chunks.length > 1 ? `${documentTitle} (Part ${i + 1})` : documentTitle
      
      // Add chunk metadata
      const chunkMetadata = {
        originalFileName: file.name,
        fileSize: file.size,
        pageCount: pdfData.numpages,
        uploadedAt: new Date().toISOString(),
        targetType,
        targetId,
        chunk_index: i,
        total_chunks: chunks.length,
        source: 'pdf_upload'
      }

      console.log(`📝 Storing chunk ${i + 1}/${chunks.length}: "${chunkTitle}" (${chunk.length} chars)`)
      
      const result = await storeKnowledgeWithEmbedding({
        city: city,
        businessId,
        knowledgeType: 'pdf_document',
        title: chunkTitle,
        content: chunk,
        metadata: chunkMetadata,
        tags: isBusinessUpload ? ['menu', 'pdf', 'business', 'uploaded'] : ['pdf', 'city', 'general', 'uploaded']
      })

      if (result.success) {
        successfulEmbeddings++
        console.log(`✅ Stored chunk ${i + 1} with ID: ${result.data?.id}`)
        if (result.data?.id) {
          embeddingIds.push(result.data.id)
        }
      } else {
        failedEmbeddings++
        console.error(`❌ Failed to store chunk ${i + 1}:`, result.error)
      }
    }

    if (successfulEmbeddings === 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to store any PDF chunks: ${failedEmbeddings} chunks failed` 
      }, { status: 500 })
    }

    const target = isBusinessUpload ? `business ${businessId} in ${city}` : `city ${city}`
    console.log(`✅ Successfully processed PDF "${file.name}" for ${target} - ${successfulEmbeddings} chunks stored`)

    return NextResponse.json({
      success: true,
      message: `PDF "${documentTitle}" processed successfully for ${isBusinessUpload ? 'business' : 'city knowledge'}`,
      data: {
        embeddingIds,
        contentLength: content.length,
        pageCount: pdfData.numpages,
        chunks: chunks.length,
        embeddings: successfulEmbeddings,
        failed: failedEmbeddings
      }
    })

  } catch (error: unknown) {
    console.error('❌ Error processing PDF upload:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message || 'Internal server error' 
    }, { status: 500 })
  }
}