/**
 * PDF Parser Utility - Turbopack Compatible
 * Handles PDF text extraction with proper error handling
 */

// pdfjs-dist 5.x expects browser globals (DOMMatrix, Path2D) that
// don't exist in Node.js. Stub them so pdf-parse works server-side.
if (typeof globalThis.DOMMatrix === 'undefined') {
  // @ts-expect-error minimal stub for pdfjs-dist in Node
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() { return Object.create(DOMMatrix.prototype) }
  }
}
if (typeof globalThis.Path2D === 'undefined') {
  // @ts-expect-error minimal stub for pdfjs-dist in Node
  globalThis.Path2D = class Path2D {
    constructor() { return Object.create(Path2D.prototype) }
  }
}

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
    const pdfParseModule = await import('pdf-parse');
    
    const pdfParse = pdfParseModule.pdf || pdfParseModule.PDFParse;
    
    if (typeof pdfParse !== 'function') {
      throw new Error(`pdf-parse module did not export a function. Got: ${typeof pdfParse}, Module keys: ${Object.keys(pdfParseModule).join(', ')}`);
    }
    
    const result = await pdfParse(buffer);
    
    return {
      text: result.text || '',
      numpages: result.numpages || 0,
      info: result.info
    };
  } catch (error) {
    console.error('❌ PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${(error as Error).message}`);
  }
}

/**
 * Validate PDF content after parsing
 */
export function validatePDFContent(content: string, minLength: number = 50): boolean {
  return content && content.trim().length >= minLength;
}
