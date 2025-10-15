import { NextRequest, NextResponse } from 'next/server'
import { storeKnowledgeWithEmbedding } from '@/lib/ai/embeddings'
import * as pdf from 'pdf-parse'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File
    const businessId = formData.get('businessId') as string
    const city = formData.get('city') as string

    if (!file || !businessId || !city) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: pdf, businessId, city' 
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

    // Parse PDF content
    const pdfData = await pdf(buffer)
    const content = pdfData.text

    if (!content || content.trim().length < 50) {
      return NextResponse.json({ 
        success: false, 
        error: 'PDF appears to be empty or contains insufficient text' 
      }, { status: 400 })
    }

    // Store in knowledge_base with embedding
    const result = await storeKnowledgeWithEmbedding({
      city,
      businessId,
      knowledgeType: 'pdf_document',
      title: file.name.replace('.pdf', ''),
      content: content.trim(),
      metadata: {
        originalFileName: file.name,
        fileSize: file.size,
        pageCount: pdfData.numpages,
        uploadedAt: new Date().toISOString()
      },
      tags: ['menu', 'pdf', 'uploaded']
    })

    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to store PDF content: ${result.error}` 
      }, { status: 500 })
    }

    console.log(`✅ Successfully processed PDF "${file.name}" for business ${businessId} in ${city}`)

    return NextResponse.json({
      success: true,
      message: `PDF "${file.name}" processed successfully`,
      data: {
        knowledgeId: result.data?.id,
        contentLength: content.length,
        pageCount: pdfData.numpages
      }
    })

  } catch (error: any) {
    console.error('❌ Error processing PDF upload:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}