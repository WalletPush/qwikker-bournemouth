/**
 * SOCIAL WIZARD v1 — AI GENERATION ENDPOINT
 * POST /api/social/ai/generate
 * 
 * Generates 3 post variants from business data
 * Returns strict JSON with captions, hashtags, templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildBusinessMarketingContext } from '@/lib/social-wizard/contextBuilder'
import { buildSocialPrompt, type PostGoal, type PostTone } from '@/lib/social-wizard/promptBuilder'
import { getSocialWizardLimits } from '@/lib/social-wizard/featureFlags'
import { getFranchiseApiKeys } from '@/lib/utils/franchise-api-keys'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const generateSchema = z.object({
  business_id: z.string().uuid(),
  goal: z.enum(['promote_offer', 'hype_event', 'menu_spotlight', 'general_update']),
  tone: z.enum(['premium', 'bold', 'friendly', 'playful']),
  hook_tags: z.array(z.string()).default([]),
  source_override: z.object({
    type: z.enum(['offer', 'event', 'menu']),
    id: z.string().uuid()
  }).nullish(),
  include_secret_menu: z.string().uuid().nullish()
})

interface Variant {
  caption: string
  hashtags: string[]
  template: string
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
    const validation = generateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const { business_id, goal, tone, hook_tags, source_override, include_secret_menu } = validation.data

    // Verify business membership via business_user_roles
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

    // Get tier, limits, and city
    const { data: business } = await supabase
      .from('business_profiles')
      .select('plan, business_name, city')
      .eq('id', business_id)
      .single()

    const tier = business?.plan || 'starter'
    const city = business?.city || 'bournemouth'
    const limits = getSocialWizardLimits(tier)

    if (!limits.enabled) {
      return NextResponse.json({ 
        error: 'Social Wizard not available for Starter tier' 
      }, { status: 403 })
    }

    console.log(`🎨 Generating posts for ${business?.business_name} (${tier} tier, ${city})`)

    // Build marketing context (deterministic)
    const context = await buildBusinessMarketingContext(business_id, source_override, include_secret_menu)

    // Build prompt
    const { systemPrompt, userPrompt } = buildSocialPrompt({
      goal,
      tone,
      hookTags: hook_tags,
      context,
      pinnedSource: source_override
    })

    // Get franchise-specific API keys
    const franchiseKeys = await getFranchiseApiKeys(city)
    
    // Select AI model based on tier
    const modelToUse = limits.aiModel
    console.log(`🤖 Using ${modelToUse} for generation (franchise: ${city})`)

    let aiResponse = ''

    // Call appropriate AI model
    if (modelToUse === 'claude-sonnet-4' && franchiseKeys.anthropic_api_key) {
      try {
        const anthropic = new Anthropic({ apiKey: franchiseKeys.anthropic_api_key })
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          temperature: 0.85,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        })
        aiResponse = response.content[0].type === 'text' ? response.content[0].text : ''
      } catch (anthropicError: any) {
        console.error(`❌ Anthropic API error for ${city}, falling back to OpenAI:`, anthropicError.message)
        // Fall through to OpenAI if Claude fails
        if (!franchiseKeys.openai_api_key) {
          return NextResponse.json({ 
            error: `Claude API failed (${anthropicError.message || 'invalid key'}) and no OpenAI fallback configured for ${city}` 
          }, { status: 500 })
        }
        // Continue to OpenAI fallback below
      }
    }
    
    if (!aiResponse) {
      // Use OpenAI (either as primary or fallback)
      // Check if OpenAI key exists for this franchise
      if (!franchiseKeys.openai_api_key) {
        console.error(`❌ No OpenAI API key configured for ${city} franchise`)
        return NextResponse.json({ 
          error: `AI service not configured for ${city}. Please add OpenAI API key in Admin Setup.` 
        }, { status: 500 })
      }
      
      const openai = new OpenAI({ apiKey: franchiseKeys.openai_api_key })
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.85,
        max_tokens: 800
      })
      aiResponse = response.choices[0]?.message?.content || ''
    }

    // Parse strict JSON response
    const variants = parseVariantsJSON(aiResponse)

    if (variants.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to generate variants' 
      }, { status: 500 })
    }

    console.log(`✅ Generated ${variants.length} variants`)

    return NextResponse.json({
      success: true,
      variants,
      prompt_context: {
        goal,
        tone,
        hook_tags,
        source_override: source_override || null,
        include_secret_menu: include_secret_menu || null,
        source_ids: context.sourceIds,
        model: modelToUse,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ AI generation error:', error)
    return NextResponse.json({ 
      error: 'AI generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Parse strict JSON response from AI
 * Handles both perfect JSON and slightly malformed responses
 */
function parseVariantsJSON(aiResponse: string): Variant[] {
  try {
    // Remove any markdown code blocks if present
    let cleaned = aiResponse.trim()
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```/g, '')
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/g, '')
    }

    // Parse JSON
    const parsed = JSON.parse(cleaned)

    // Validate structure
    if (!parsed.variants || !Array.isArray(parsed.variants)) {
      throw new Error('Missing variants array')
    }

    // Map and validate each variant
    const variants: Variant[] = parsed.variants.slice(0, 3).map((v: any) => ({
      caption: v.caption || 'Check out what\'s new!',
      hashtags: Array.isArray(v.hashtags) ? v.hashtags : ['#local', '#food'],
      template: v.template || 'general'
    }))

    return variants.length > 0 ? variants : [createFallbackVariant(aiResponse)]

  } catch (error) {
    console.warn('⚠️ JSON parse failed, using fallback:', error)
    // Fallback: create single variant from raw response
    return [createFallbackVariant(aiResponse)]
  }
}

/**
 * Create fallback variant from raw AI response
 */
function createFallbackVariant(aiResponse: string): Variant {
  // Extract first ~200 chars as caption
  const caption = aiResponse
    .slice(0, 250)
    .replace(/```json|```/g, '')
    .replace(/[{}\[\]"]/g, '')
    .trim()
    .slice(0, 200)

  return {
    caption: caption || 'Check out what\'s new at our place!',
    hashtags: ['#local', '#food', '#community'],
    template: 'general'
  }
}
