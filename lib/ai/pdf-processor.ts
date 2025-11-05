import { generateEmbedding, storeKnowledgeWithEmbedding } from './embeddings'

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
    
    // Use require for pdf-parse to avoid ESM issues
    const pdfParse = require('pdf-parse')
    
    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse module not available')
    }
    
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
 * Clean and chunk text for better embeddings - MENU AWARE
 * Preserves complete menu items, prices, and logical sections
 */
export function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  // Clean the text but preserve important structure
  const cleanText = text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with double newline (section breaks)
    .trim()

  if (cleanText.length <= maxChunkSize) {
    return [cleanText]
  }

  const chunks: string[] = []
  
  // First, try to split by major sections (double newlines)
  const sections = cleanText.split(/\n\n+/)
  let currentChunk = ''

  for (const section of sections) {
    const trimmedSection = section.trim()
    if (!trimmedSection) continue

    // If this section alone is too big, we need to split it further
    if (trimmedSection.length > maxChunkSize) {
      // Save current chunk if it exists
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }
      
      // Split large section by menu items (lines that likely contain prices)
      const lines = trimmedSection.split('\n')
      let sectionChunk = ''
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue
        
        // If adding this line would exceed limit, save current chunk
        if (sectionChunk.length + trimmedLine.length + 1 > maxChunkSize) {
          if (sectionChunk.trim()) {
            chunks.push(sectionChunk.trim())
            sectionChunk = ''
          }
        }
        
        sectionChunk += (sectionChunk ? '\n' : '') + trimmedLine
      }
      
      // Add remaining section chunk
      if (sectionChunk.trim()) {
        chunks.push(sectionChunk.trim())
      }
      
    } else {
      // If adding this section would exceed the limit, save current chunk
      if (currentChunk.length + trimmedSection.length + 2 > maxChunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim())
          currentChunk = ''
        }
      }
      
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedSection
    }
  }

  // Add the last chunk if it exists
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.length > 0 ? chunks : [cleanText]
}

/**
 * Specialized chunking for menu PDFs - preserves pricing and menu items
 */
export function chunkMenuText(text: string, maxChunkSize: number = 1200): string[] {
  // Clean text while preserving menu structure
  const cleanText = text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  console.log(`🔍 Menu text length: ${cleanText.length} chars, max chunk size: ${maxChunkSize}`)

  // CONSERVATIVE CHUNKING: Only split if content is much larger than chunk size
  if (cleanText.length <= maxChunkSize * 2) {
    console.log(`📝 Content fits in one chunk (${cleanText.length} chars), preserving menu integrity`)
    return [cleanText]
  }

  console.log(`🔄 Content is large (${cleanText.length} chars), using semantic chunking...`)

  const chunks: string[] = []
  
  // Split by menu sections (usually separated by double newlines or headers)
  const sections = cleanText.split(/\n\n+/)
  let currentChunk = ''

  for (const section of sections) {
    const trimmedSection = section.trim()
    if (!trimmedSection) continue

    // Check if this looks like a menu section header
    const isHeader = /^[A-Z\s&-]{3,}$/.test(trimmedSection) || 
                    trimmedSection.length < 50 && 
                    !(/£|\$|€|\d+\.\d{2}/.test(trimmedSection))

    // If section is too large, split by menu items (lines)
    if (trimmedSection.length > maxChunkSize) {
      // Save current chunk first
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }

      const lines = trimmedSection.split('\n')
      let sectionChunk = ''
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        // Never split a line that contains pricing
        const containsPrice = /£|\$|€|\d+\.\d{2}/.test(trimmedLine)
        const wouldExceed = sectionChunk.length + trimmedLine.length + 1 > maxChunkSize

        if (wouldExceed && !containsPrice && sectionChunk.trim()) {
          chunks.push(sectionChunk.trim())
          sectionChunk = ''
        } else if (wouldExceed && containsPrice && sectionChunk.trim()) {
          // If we must split and this line has pricing, save current and start new
          chunks.push(sectionChunk.trim())
          sectionChunk = trimmedLine
          continue
        }

        sectionChunk += (sectionChunk ? '\n' : '') + trimmedLine
      }

      if (sectionChunk.trim()) {
        chunks.push(sectionChunk.trim())
      }

    } else {
      // Normal section handling
      if (currentChunk.length + trimmedSection.length + 2 > maxChunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim())
          currentChunk = ''
        }
      }

      currentChunk += (currentChunk ? '\n\n' : '') + trimmedSection
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  // AGGRESSIVE CHUNKING: If we still only have 1 chunk and content is long enough, force split by lines
  if (chunks.length <= 1 && cleanText.length > 200) {
    console.log(`🔄 Sections didn't split well, trying AGGRESSIVE line-by-line chunking...`)
    const lines = cleanText.split('\n')
    const lineChunks: string[] = []
    let currentLineChunk = ''
    
    // Use a smaller chunk size for aggressive splitting
    const aggressiveChunkSize = Math.min(maxChunkSize, 300) // Even smaller chunks
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue
      
      // RECIPE-AWARE SPLITTING: Don't split in the middle of cocktail ingredients
      const isIngredientLine = trimmedLine.toLowerCase().includes('muddled') ||
                              trimmedLine.toLowerCase().includes('topped') ||
                              trimmedLine.toLowerCase().includes('served') ||
                              trimmedLine.toLowerCase().includes('garnished') ||
                              trimmedLine.toLowerCase().includes('mixed') ||
                              trimmedLine.toLowerCase().includes('shaken') ||
                              trimmedLine.toLowerCase().includes('stirred') ||
                              trimmedLine.toLowerCase().includes('oz') ||
                              trimmedLine.toLowerCase().includes('ml')
      
      const wouldExceed = currentLineChunk.length + trimmedLine.length + 1 > aggressiveChunkSize
      
      // If we would exceed the limit and this isn't an ingredient line, split here
      if (wouldExceed && !isIngredientLine && currentLineChunk.trim()) {
        lineChunks.push(currentLineChunk.trim())
        currentLineChunk = trimmedLine
      } 
      // If it's an ingredient line, keep it with the current chunk even if it exceeds the limit slightly
      else {
        currentLineChunk += (currentLineChunk ? '\n' : '') + trimmedLine
      }
    }
    
    if (currentLineChunk.trim()) {
      lineChunks.push(currentLineChunk.trim())
    }
    
    // SMART MENU SPLITTING: If we still have only 1 chunk, try to split at menu item boundaries
    if (lineChunks.length <= 1 && cleanText.length > 400) {
      console.log(`🔄 Still only 1 chunk, trying SMART menu item splitting...`)
      
      // Look for natural menu item boundaries (cocktail names, section headers, etc.)
      const menuItemBoundaries = []
      const lines = cleanText.split('\n')
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Detect cocktail/item names (usually short lines without prices that aren't ingredients)
        const isItemName = line.length < 50 && 
                          line.length > 3 &&
                          !line.includes('£') && 
                          !line.includes('$') && 
                          !line.includes('€') &&
                          !line.toLowerCase().includes('muddled') &&
                          !line.toLowerCase().includes('topped') &&
                          !line.toLowerCase().includes('served') &&
                          !line.toLowerCase().includes('garnished') &&
                          !line.toLowerCase().includes('mixed') &&
                          !line.toLowerCase().includes('shaken') &&
                          !line.toLowerCase().includes('stirred')
        
        if (isItemName && i > 0) {
          const textUpToHere = lines.slice(0, i).join('\n')
          if (textUpToHere.length > 200 && textUpToHere.length < cleanText.length - 100) {
            menuItemBoundaries.push(i)
          }
        }
      }
      
      // If we found good boundaries, split there
      if (menuItemBoundaries.length > 0) {
        const bestBoundary = menuItemBoundaries[Math.floor(menuItemBoundaries.length / 2)]
        const firstPart = lines.slice(0, bestBoundary).join('\n').trim()
        const secondPart = lines.slice(bestBoundary).join('\n').trim()
        
        if (firstPart && secondPart) {
          console.log(`✅ Smart menu split at item boundary: ${firstPart.length} + ${secondPart.length} chars`)
          return [firstPart, secondPart]
        }
      }
      
      // Fallback: split at paragraph breaks, avoiding mid-recipe splits
      const paragraphs = cleanText.split(/\n\n+/)
      if (paragraphs.length > 1) {
        const midPoint = Math.floor(paragraphs.length / 2)
        const firstHalf = paragraphs.slice(0, midPoint).join('\n\n').trim()
        const secondHalf = paragraphs.slice(midPoint).join('\n\n').trim()
        
        if (firstHalf && secondHalf) {
          console.log(`✅ Paragraph-based split: ${firstHalf.length} + ${secondHalf.length} chars`)
          return [firstHalf, secondHalf]
        }
      }
      
      // Last resort: character-based split (original behavior)
      console.log(`🔄 No good boundaries found, using character split...`)
      const halfPoint = Math.floor(cleanText.length / 2)
      const firstHalf = cleanText.substring(0, halfPoint).trim()
      const secondHalf = cleanText.substring(halfPoint).trim()
      
      if (firstHalf && secondHalf) {
        console.log(`✅ Character-split created 2 chunks: ${firstHalf.length} + ${secondHalf.length} chars`)
        return [firstHalf, secondHalf]
      }
    }
    
    if (lineChunks.length > 1) {
      console.log(`✅ Aggressive line-based chunking created ${lineChunks.length} chunks`)
      return lineChunks
    }
  }

  console.log(`📝 Final result: ${chunks.length} chunks created`)
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
      const result = await storeKnowledgeWithEmbedding({
        city,
        businessId,
        knowledgeType: 'pdf_document',
        title: `Menu Content (Chunk ${i + 1})`,
        content: chunk,
        metadata: chunkMetadata,
        tags: ['menu', 'pdf', 'business', contentType]
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
      const result = await storeKnowledgeWithEmbedding({
        city,
        businessId: null,
        knowledgeType: 'pdf_document',
        title: chunkTitle,
        content: chunk,
        metadata: chunkMetadata,
        sourceUrl,
        tags: ['pdf', 'city', contentType]
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
