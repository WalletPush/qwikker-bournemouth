import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()
  
  // Check what's actually in the knowledge base for David's menus
  const { data: knowledgeBase } = await supabase
    .from('knowledge_base')
    .select('title, content_type, file_url, metadata')
    .ilike('title', '%david%')
    .limit(5)
  
  return NextResponse.json({ 
    knowledge_base_entries: knowledgeBase,
    note: "Check what URLs/content is actually stored in knowledge base"
  })
}
