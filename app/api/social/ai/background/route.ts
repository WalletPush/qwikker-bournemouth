/**
 * SOCIAL WIZARD — AI BACKGROUND GENERATION
 * POST /api/social/ai/background
 * 
 * Generates mood-based abstract backgrounds using OpenAI DALL-E
 * Backgrounds are abstract, premium, and designed for text overlay
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFranchiseApiKeys } from '@/lib/utils/franchise-api-keys'
import OpenAI from 'openai'
import { z } from 'zod'

const backgroundSchema = z.object({
  business_id: z.string().uuid(),
  mood: z.enum(['offer', 'event', 'menu', 'general']),
  tone: z.enum(['premium', 'bold', 'friendly', 'playful']).optional()
})

// Mood-based DALL-E prompts
const BACKGROUND_PROMPTS = {
  offer: "Ultra-realistic cinematic abstract background, dark premium restaurant atmosphere with warm bokeh lights, soft lens blur, shallow depth of field, moody ambiance, no people, no food, no objects, no text, designed for text overlay",
  
  event: "Ultra-realistic cinematic abstract background, electric night lighting with cool neon glow, subtle motion blur, modern premium atmosphere, no people, no food, no objects, no text, designed for text overlay",
  
  menu: "Ultra-realistic cinematic abstract background, warm textured blur with soft golden lighting, shallow depth of field, appetizing atmosphere, no people, no food, no objects, no text, designed for text overlay",
  
  general: "Ultra-realistic cinematic abstract background, dark modern gradient with subtle texture, soft studio lighting, premium minimal aesthetic, no people, no objects, no text, designed for text overlay"
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate input
    const body = await req.json()
    const validation = backgroundSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const { business_id, mood, tone } = validation.data

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

    // Get business city for franchise-specific API keys
    const { data: business } = await supabase
      .from('business_profiles')
      .select('city, business_name, system_category')
      .eq('id', business_id)
      .single()

    const city = business?.city || 'bournemouth'
    
    // Get franchise API keys
    const franchiseKeys = await getFranchiseApiKeys(city)
    
    if (!franchiseKeys.openai_api_key) {
      return NextResponse.json({ 
        error: `OpenAI API key not configured for ${city}` 
      }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey: franchiseKeys.openai_api_key })

    // Build enhanced prompt based on business context
    let prompt = BACKGROUND_PROMPTS[mood]
    
    // Add tone-specific modifications
    if (tone === 'premium') {
      prompt += ", elegant lighting, high-end aesthetic"
    } else if (tone === 'bold') {
      prompt += ", dramatic lighting, high contrast"
    } else if (tone === 'friendly') {
      prompt += ", warm inviting atmosphere"
    } else if (tone === 'playful') {
      prompt += ", vibrant energetic feel"
    }

    // Add business category context if relevant
    if (business?.system_category) {
      const category = business.system_category.toLowerCase()
      if (category.includes('restaurant') || category.includes('food')) {
        prompt += ", culinary ambiance"
      } else if (category.includes('bar') || category.includes('pub')) {
        prompt += ", bar atmosphere"
      } else if (category.includes('cafe') || category.includes('coffee')) {
        prompt += ", cozy cafe feel"
      }
    }

    console.log(`🎨 Generating ${mood} background for ${business?.business_name} (${city})`)

    // Generate image with DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
      response_format: 'url' // Get URL, not base64 (faster)
    })

    const imageUrl = response.data[0]?.url

    if (!imageUrl) {
      return NextResponse.json({ 
        error: 'Failed to generate background' 
      }, { status: 500 })
    }

    console.log(`✅ Background generated: ${imageUrl}`)

    // Return the generated image URL
    return NextResponse.json({
      success: true,
      imageUrl,
      mood,
      tone,
      prompt: prompt.slice(0, 100) + '...', // Return truncated prompt for debugging
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Background generation error:', error)
    
    // Handle specific OpenAI errors
    if (error.status === 400) {
      return NextResponse.json({ 
        error: 'Invalid prompt or parameters' 
      }, { status: 400 })
    }
    
    if (error.status === 429) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again in a moment.' 
      }, { status: 429 })
    }

    return NextResponse.json({ 
      error: 'Failed to generate background',
      details: error.message 
    }, { status: 500 })
  }
}
