/**
 * PDF Parser Utility - Turbopack Compatible
 * Handles PDF text extraction with proper error handling
 */

export interface PDFParseResult {
  text: string;
  numpages: number;
  info?: any;
}

/**
 * Parse PDF buffer and extract text content
 * Uses dynamic import to avoid Turbopack issues
 */
export async function parsePDF(buffer: Buffer): Promise<PDFParseResult> {
  try {
    // Dynamic import to avoid Turbopack module resolution issues
    const pdfParseModule = await import('pdf-parse');
    
    // Use the correct export - it's 'pdf' not default!
    const pdfParse = pdfParseModule.pdf || pdfParseModule.PDFParse;
    
    // Ensure we have a function
    if (typeof pdfParse !== 'function') {
      throw new Error(`pdf-parse module did not export a function. Got: ${typeof pdfParse}, Module keys: ${Object.keys(pdfParseModule).join(', ')}`);
    }
    
    // Parse the PDF buffer
    const result = await pdfParse(buffer);
    
    return {
      text: result.text || '',
      numpages: result.numpages || 0,
      info: result.info
    };
  } catch (error) {
    console.error('❌ PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Validate PDF content after parsing
 */
export function validatePDFContent(content: string, minLength: number = 50): boolean {
  return content && content.trim().length >= minLength;
}
