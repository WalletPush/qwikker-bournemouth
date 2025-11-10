import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    
    // Get business profile
    const { data: business, error: bizError } = await supabase
      .from('business_profiles')
      .select('id, business_name, business_description, updated_at')
      .ilike('business_name', '%adams%')
      .single()
    
    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found', details: bizError }, { status: 404 })
    }
    
    // Get knowledge base entries
    const { data: knowledge, error: kbError } = await supabase
      .from('knowledge_base')
      .select('id, title, content, updated_at')
      .eq('business_id', business.id)
      .order('updated_at', { ascending: false })
    
    return NextResponse.json({
      businessProfile: {
        id: business.id,
        name: business.business_name,
        description: business.business_description,
        updated: business.updated_at
      },
      knowledgeBase: {
        error: kbError?.message,
        count: knowledge?.length || 0,
        entries: knowledge?.map(k => ({
          title: k.title,
          hasWifi: k.content.includes('WIFI') || k.content.includes('wifi'),
          contentPreview: k.content.substring(0, 300),
          updated: k.updated_at
        })) || []
      }
    }, { headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

