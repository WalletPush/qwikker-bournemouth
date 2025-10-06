'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

interface CreateShortUrlParams {
  targetUrl: string
  userId: string
  urlType: 'offers' | 'chat' | 'dashboard'
}

export async function createShortUrl({ targetUrl, userId, urlType }: CreateShortUrlParams) {
  try {
    const supabase = createServiceRoleClient()
    
    // Check if a short URL already exists for this user and type
    const { data: existingUrl } = await supabase
      .from('short_urls')
      .select('short_id, target_url')
      .eq('user_id', userId)
      .eq('url_type', urlType)
      .eq('is_active', true)
      .single()
    
    if (existingUrl) {
      // Update existing URL if target has changed
      if (existingUrl.target_url !== targetUrl) {
        await supabase
          .from('short_urls')
          .update({ target_url: targetUrl })
          .eq('short_id', existingUrl.short_id)
      }
      return { success: true, shortUrl: `https://qwikkerdashboard-theta.vercel.app/api/redirect/${existingUrl.short_id}` }
    }
    
    // Generate new short ID
    const { data: shortIdResult } = await supabase.rpc('generate_short_id')
    const shortId = shortIdResult || Math.random().toString(36).substring(2, 8)
    
    // Create new short URL
    const { data, error } = await supabase
      .from('short_urls')
      .insert({
        short_id: shortId,
        target_url: targetUrl,
        user_id: userId,
        url_type: urlType,
        is_active: true
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating short URL:', error)
      return { success: false, error: error.message }
    }
    
    return { 
      success: true, 
      shortUrl: `https://qwikkerdashboard-theta.vercel.app/api/redirect/${shortId}`,
      shortId 
    }
    
  } catch (error) {
    console.error('Error in createShortUrl:', error)
    return { success: false, error: 'Failed to create short URL' }
  }
}

export async function getUrlAnalytics(userId?: string, urlType?: string) {
  try {
    const supabase = createServiceRoleClient()
    
    let query = supabase
      .from('url_clicks')
      .select(`
        *,
        short_urls!inner(
          short_id,
          url_type,
          user_id,
          created_at
        )
      `)
    
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    if (urlType) {
      query = query.eq('short_urls.url_type', urlType)
    }
    
    const { data: clicks, error } = await query
      .order('clicked_at', { ascending: false })
      .limit(100)
    
    if (error) {
      console.error('Error fetching URL analytics:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: clicks }
    
  } catch (error) {
    console.error('Error in getUrlAnalytics:', error)
    return { success: false, error: 'Failed to fetch analytics' }
  }
}
