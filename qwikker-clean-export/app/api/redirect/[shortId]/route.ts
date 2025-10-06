import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortId: string }> }
) {
  try {
    const { shortId } = await params
    
    if (!shortId) {
      return NextResponse.redirect(new URL('/user', request.url))
    }
    
    const supabase = createServiceRoleClient()
    
    // Look up the short URL in our database
    const { data: urlMapping, error } = await supabase
      .from('short_urls')
      .select('target_url, user_id, created_at')
      .eq('short_id', shortId)
      .single()
    
    if (error || !urlMapping) {
      console.error('Short URL not found:', shortId, error)
      return NextResponse.redirect(new URL('/user', request.url))
    }
    
    // Log the click for analytics
    await supabase
      .from('url_clicks')
      .insert({
        short_id: shortId,
        user_id: urlMapping.user_id,
        clicked_at: new Date().toISOString(),
        user_agent: request.headers.get('user-agent'),
        ip_address: request.ip || 'unknown'
      })
    
    // Redirect to the target URL
    return NextResponse.redirect(new URL(urlMapping.target_url, request.url))
    
  } catch (error) {
    console.error('Redirect error:', error)
    return NextResponse.redirect(new URL('/user', request.url))
  }
}
