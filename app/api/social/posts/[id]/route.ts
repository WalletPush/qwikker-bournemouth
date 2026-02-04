/**
 * SOCIAL WIZARD v1 — DRAFT UPDATE/DELETE
 * PUT /api/social/posts/[id] - Update draft
 * DELETE /api/social/posts/[id] - Delete draft
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateDraftSchema = z.object({
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  media_url: z.string().url().optional(),
  template_id: z.string().optional()
})

/**
 * PUT - Update draft (partial update)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const validation = updateDraftSchema.safeParse(body)
  
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Invalid input', 
      details: validation.error.errors 
    }, { status: 400 })
  }

  // RLS handles business membership check
  const { data, error } = await supabase
    .from('social_posts')
    .update(validation.data)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    console.error('Failed to update draft:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  console.log('✅ Draft updated:', params.id)

  return NextResponse.json({ 
    success: true, 
    draft: data 
  })
}

/**
 * DELETE - Delete draft
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // RLS handles business membership check
  const { error } = await supabase
    .from('social_posts')
    .delete()
    .eq('id', params.id)

  if (error) {
    console.error('Failed to delete draft:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  console.log('✅ Draft deleted:', params.id)

  return NextResponse.json({ success: true })
}
