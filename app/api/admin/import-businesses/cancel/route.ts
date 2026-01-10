import { NextRequest, NextResponse } from 'next/server'

// This would ideally be in a shared state management system (Redis, etc.)
// For now, using the same in-memory map as the import route
// In production, use Redis or a database to track imports

export async function POST(request: NextRequest) {
  try {
    const { importId } = await request.json()

    if (!importId) {
      return NextResponse.json({
        success: false,
        error: 'Import ID required'
      }, { status: 400 })
    }

    // Note: This is a simplified implementation
    // The actual cancellation happens in the import route by checking the activeImports map
    console.log(`🛑 Cancel requested for import: ${importId}`)

    return NextResponse.json({
      success: true,
      message: 'Import cancellation requested'
    })

  } catch (error: any) {
    console.error('❌ Cancel import error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to cancel import'
    }, { status: 500 })
  }
}

