import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/knowledge/entries
 *
 * List knowledge base entries for a city, optionally filtered by
 * business_id and/or knowledge_type. Returns entries sorted newest-first.
 *
 * Query params:
 *   city        (required)
 *   business_id (optional – omit or "general" for city-wide entries)
 *   type        (optional – knowledge_type filter)
 *   search      (optional – text search over title + content)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const params = request.nextUrl.searchParams

    const city = params.get('city')
    if (!city) {
      return NextResponse.json(
        { success: false, error: 'city parameter is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('knowledge_base')
      .select('id, city, business_id, knowledge_type, title, content, source_url, metadata, tags, status, created_at, updated_at')
      .eq('city', city)
      .in('status', ['active', 'draft'])
      .order('created_at', { ascending: false })

    const businessId = params.get('business_id')
    if (businessId && businessId !== 'general') {
      query = query.eq('business_id', businessId)
    } else if (businessId === 'general') {
      query = query.is('business_id', null)
    }

    const type = params.get('type')
    if (type && type !== 'all') {
      query = query.eq('knowledge_type', type)
    }

    const search = params.get('search')
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    }

    const { data: entries, error } = await query.limit(500)

    if (error) {
      console.error('Error fetching KB entries:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch entries' },
        { status: 500 }
      )
    }

    const typeCounts: Record<string, number> = {}
    entries?.forEach((e) => {
      typeCounts[e.knowledge_type] = (typeCounts[e.knowledge_type] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      entries: entries || [],
      total: entries?.length || 0,
      typeCounts,
    })
  } catch (error) {
    console.error('Unexpected error in KB entries API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/knowledge/entries
 *
 * Update a knowledge base entry. Used for:
 *   - Approving drafts: { id, status: 'active' }
 *   - Editing content:  { id, content: '...', title: '...' }
 *   - Both at once:     { id, content: '...', status: 'active', reviewed_by: '...' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const body = await request.json()
    const { id, status, content, title, reviewed_by } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status) updates.status = status
    if (content !== undefined) updates.content = content
    if (title !== undefined) updates.title = title

    // If approving, stamp review metadata
    if (status === 'active') {
      const { data: existing } = await supabase
        .from('knowledge_base')
        .select('metadata')
        .eq('id', id)
        .single()

      if (existing?.metadata) {
        updates.metadata = {
          ...existing.metadata,
          reviewed_by: reviewed_by || null,
          reviewed_at: new Date().toISOString(),
        }
      }
    }

    const { error } = await supabase
      .from('knowledge_base')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Error updating KB entry:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error updating KB entry:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/knowledge/entries
 *
 * Soft-delete (archive) a knowledge base entry by id.
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    // Check if entry is a draft — drafts get hard deleted, active entries get archived
    const { data: entry } = await supabase
      .from('knowledge_base')
      .select('status')
      .eq('id', id)
      .single()

    const isDraft = entry?.status === 'draft'

    const { error } = isDraft
      ? await supabase.from('knowledge_base').delete().eq('id', id)
      : await supabase.from('knowledge_base').update({ status: 'archived' }).eq('id', id)

    if (error) {
      console.error('Error archiving KB entry:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error deleting KB entry:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
