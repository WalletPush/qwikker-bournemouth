'use server'

import pdfParse from 'pdf-parse'
import { generateEmbedding, storeBusinessEmbedding, storeCityEmbedding } from './embeddings'

interface ProcessedPDF {
  success: boolean
  text?: string
  pages?: number
  error?: string
  chunks?: string[]
  embeddings?: number
}

/**
 * Extract text from PDF buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<ProcessedPDF> {
  try {
    console.log(`📄 Processing PDF (${buffer.length} bytes)...`)
    
    const data = await pdfParse(buffer)
    
    if (!data.text || data.text.trim().length === 0) {
      return {
        success: false,
        error: 'PDF contains no extractable text'
      }
    }

    console.log(`✅ Extracted ${data.text.length} characters from ${data.numpages} pages`)
    
    return {
      success: true,
      text: data.text,
      pages: data.numpages
    }

  } catch (error) {
    console.error('❌ PDF processing error:', error)
    return {
      success: false,
      error: error.message || 'Failed to process PDF'
    }
  }
}

/**
 * Clean and chunk text for better embeddings
 */
export function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  // Clean the text
  const cleanText = text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim()

  if (cleanText.length <= maxChunkSize) {
    return [cleanText]
  }

  const chunks: string[] = []
  const sentences = cleanText.split(/[.!?]+/)
  let currentChunk = ''

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (!trimmedSentence) continue

    // If adding this sentence would exceed the limit, save current chunk
    if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }
    }

    currentChunk += (currentChunk ? '. ' : '') + trimmedSentence
  }

  // Add the last chunk if it exists
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.length > 0 ? chunks : [cleanText]
}

/**
 * Process PDF and store as embeddings for a business
 */
export async function processPDFForBusiness({
  buffer,
  businessId,
  city,
  contentType = 'menu_item',
  metadata = {}
}: {
  buffer: Buffer
  businessId: string
  city: string
  contentType?: 'menu_item' | 'business_info' | 'offer' | 'hours' | 'description'
  metadata?: Record<string, any>
}): Promise<{
  success: boolean
  message: string
  chunks?: number
  embeddings?: number
  error?: string
}> {
  try {
    // Extract text from PDF
    const pdfResult = await extractTextFromPDF(buffer)
    
    if (!pdfResult.success || !pdfResult.text) {
      return {
        success: false,
        message: pdfResult.error || 'Failed to extract text from PDF'
      }
    }

    // Chunk the text for better embeddings
    const chunks = chunkText(pdfResult.text, 800) // Smaller chunks for menus
    console.log(`📝 Created ${chunks.length} text chunks`)

    let successfulEmbeddings = 0
    let failedEmbeddings = 0

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      // Add chunk metadata
      const chunkMetadata = {
        ...metadata,
        chunk_index: i,
        total_chunks: chunks.length,
        source: 'pdf_upload',
        pages: pdfResult.pages
      }

      // Store as embedding
      const result = await storeBusinessEmbedding({
        businessId,
        city,
        contentType,
        content: chunk,
        metadata: chunkMetadata
      })

      if (result.success) {
        successfulEmbeddings++
      } else {
        failedEmbeddings++
        console.error(`❌ Failed to store chunk ${i}:`, result.error)
      }
    }

    const message = `Processed PDF: ${successfulEmbeddings} embeddings created${failedEmbeddings > 0 ? `, ${failedEmbeddings} failed` : ''}`
    
    return {
      success: successfulEmbeddings > 0,
      message,
      chunks: chunks.length,
      embeddings: successfulEmbeddings
    }

  } catch (error) {
    console.error('❌ Error processing PDF for business:', error)
    return {
      success: false,
      message: `Processing failed: ${error.message}`,
      error: error.message
    }
  }
}

/**
 * Process PDF and store as embeddings for city knowledge
 */
export async function processPDFForCity({
  buffer,
  city,
  title,
  contentType = 'general',
  metadata = {},
  sourceUrl
}: {
  buffer: Buffer
  city: string
  title: string
  contentType?: 'event' | 'news' | 'attraction' | 'transport' | 'general'
  metadata?: Record<string, any>
  sourceUrl?: string
}): Promise<{
  success: boolean
  message: string
  chunks?: number
  embeddings?: number
  error?: string
}> {
  try {
    // Extract text from PDF
    const pdfResult = await extractTextFromPDF(buffer)
    
    if (!pdfResult.success || !pdfResult.text) {
      return {
        success: false,
        message: pdfResult.error || 'Failed to extract text from PDF'
      }
    }

    // For city knowledge, we can use larger chunks
    const chunks = chunkText(pdfResult.text, 1200)
    console.log(`📝 Created ${chunks.length} text chunks for city knowledge`)

    let successfulEmbeddings = 0
    let failedEmbeddings = 0

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      // Create chunk title
      const chunkTitle = chunks.length > 1 ? `${title} (Part ${i + 1})` : title
      
      // Add chunk metadata
      const chunkMetadata = {
        ...metadata,
        chunk_index: i,
        total_chunks: chunks.length,
        source: 'pdf_upload',
        pages: pdfResult.pages
      }

      // Store as embedding
      const result = await storeCityEmbedding({
        city,
        contentType,
        title: chunkTitle,
        content: chunk,
        metadata: chunkMetadata,
        sourceUrl
      })

      if (result.success) {
        successfulEmbeddings++
      } else {
        failedEmbeddings++
        console.error(`❌ Failed to store city chunk ${i}:`, result.error)
      }
    }

    const message = `Processed city PDF: ${successfulEmbeddings} embeddings created${failedEmbeddings > 0 ? `, ${failedEmbeddings} failed` : ''}`
    
    return {
      success: successfulEmbeddings > 0,
      message,
      chunks: chunks.length,
      embeddings: successfulEmbeddings
    }

  } catch (error) {
    console.error('❌ Error processing PDF for city:', error)
    return {
      success: false,
      message: `Processing failed: ${error.message}`,
      error: error.message
    }
  }
}

/**
 * Validate PDF file
 */
export function validatePDFFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'File must be a PDF' }
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'PDF file must be smaller than 10MB' }
  }

  // Check file size (min 1KB)
  if (file.size < 1024) {
    return { valid: false, error: 'PDF file appears to be empty or corrupted' }
  }

  return { valid: true }
}
