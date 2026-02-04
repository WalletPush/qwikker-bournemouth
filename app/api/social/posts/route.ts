/**
 * SOCIAL WIZARD v1 — DRAFTS CRUD
 * GET /api/social/posts - List drafts
 * POST /api/social/posts - Create draft
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createDraftSchema = z.object({
  business_id: z.string().uuid(),
  campaign_id: z.string().uuid().optional(),
  caption: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
  media_url: z.string().url().optional(),
  template_id: z.string().optional(),
  prompt_context: z.any().optional()
})

/**
 * GET - List drafts
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const business_id = searchParams.get('business_id')
  const campaign_id = searchParams.get('campaign_id')
  const search = searchParams.get('search')

  // Build query - RLS will filter by business membership
  let query = supabase
    .from('social_posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (business_id) {
    query = query.eq('business_id', business_id)
  }

  if (campaign_id) {
    query = query.eq('campaign_id', campaign_id)
  }

  if (search) {
    query = query.ilike('caption', `%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch drafts:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true, 
    drafts: data || [] 
  })
}

/**
 * POST - Create draft
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const validation = createDraftSchema.safeParse(body)
  
  if (!validation.success) {
    return NextResponse.json({ 
      error: 'Invalid input', 
      details: validation.error.errors 
    }, { status: 400 })
  }

  const { 
    business_id, 
    campaign_id, 
    caption, 
    hashtags, 
    media_url, 
    template_id, 
    prompt_context 
  } = validation.data

  // Verify business membership
  const { data: membership } = await supabase
    .from('business_user_roles')
    .select('role')
    .eq('business_id', business_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ 
      error: 'Forbidden: Not a member of this business' 
    }, { status: 403 })
  }

  // Insert draft
  const { data, error } = await supabase
    .from('social_posts')
    .insert({
      business_id,
      campaign_id: campaign_id || null,
      caption,
      hashtags,
      media_url: media_url || null,
      template_id: template_id || null,
      prompt_context: prompt_context || {},
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create draft:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  console.log('✅ Draft created:', data.id)

  return NextResponse.json({ 
    success: true, 
    draft: data 
  })
}
