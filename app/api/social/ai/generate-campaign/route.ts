/**
 * SOCIAL WIZARD v1 — CAMPAIGN PACK GENERATOR
 * POST /api/social/ai/generate-campaign
 * 
 * Generates 5-post campaign pack (Spotlight only)
 * Creates all drafts under single campaign_id
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildBusinessMarketingContext } from '@/lib/social-wizard/contextBuilder'
import { buildCampaignPrompt } from '@/lib/social-wizard/promptBuilder'
import { getSocialWizardLimits } from '@/lib/social-wizard/featureFlags'
import { getFranchiseApiKeys } from '@/lib/utils/franchise-api-keys'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const generateCampaignSchema = z.object({
  business_id: z.string().uuid(),
  goal: z.enum(['promote_offer', 'hype_event', 'menu_spotlight', 'general_update']),
  tone: z.enum(['premium', 'bold', 'friendly', 'playful']),
  pinned_source: z.object({
    type: z.enum(['offer', 'event', 'menu']),
    id: z.string().uuid()
  }).optional()
})

interface CampaignPost {
  angle: string
  caption: string
  hashtags: string[]
  template: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validation = generateCampaignSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const { business_id, goal, tone, pinned_source } = validation.data

    // Verify business membership
    const { data: membership } = await supabase
      .from('business_user_roles')
      .select('role')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get tier - must be Spotlight
    const { data: business } = await supabase
      .from('business_profiles')
      .select('plan, business_name, city')
      .eq('id', business_id)
      .single()

    const tier = business?.plan || 'starter'
    const city = business?.city || 'bournemouth'
    const limits = getSocialWizardLimits(tier)

    if (!limits.campaignPacks) {
      return NextResponse.json({ 
        error: 'Campaign packs are Spotlight only' 
      }, { status: 403 })
    }

    console.log(`📦 Generating campaign pack for ${business?.business_name} (${city})`)

    // Build context
    const context = await buildBusinessMarketingContext(business_id, pinned_source)

    // Build campaign prompt
    const { systemPrompt, userPrompt } = buildCampaignPrompt({
      goal,
      tone,
      hookTags: [],
      context,
      pinnedSource: pinned_source
    })

    // Call AI model
    // Get franchise-specific API keys
    const franchiseKeys = await getFranchiseApiKeys(city)

    const modelToUse = limits.aiModel
    let aiResponse = ''

    if (modelToUse === 'claude-sonnet-4' && franchiseKeys.anthropic_api_key) {
      const anthropic = new Anthropic({ apiKey: franchiseKeys.anthropic_api_key })
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        temperature: 0.85,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
      aiResponse = response.content[0].type === 'text' ? response.content[0].text : ''
    } else {
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
        max_tokens: 1500
      })
      aiResponse = response.choices[0]?.message?.content || ''
    }

    // Parse campaign posts
    const posts = parseCampaignJSON(aiResponse)

    if (posts.length < 5) {
      return NextResponse.json({ 
        error: 'Failed to generate 5 posts' 
      }, { status: 500 })
    }

    // Create campaign_id
    const campaign_id = randomUUID()

    // Save all 5 drafts
    const savedDrafts = []
    for (let i = 0; i < 5; i++) {
      const post = posts[i]
      const { data, error } = await supabase
        .from('social_posts')
        .insert({
          business_id,
          campaign_id,
          caption: post.caption,
          hashtags: post.hashtags,
          template_id: post.template,
          prompt_context: {
            campaign: true,
            angle: post.angle,
            position: i + 1,
            goal,
            tone,
            model: modelToUse,
            timestamp: new Date().toISOString()
          },
          created_by: user.id
        })
        .select()
        .single()

      if (data) {
        savedDrafts.push(data)
      } else {
        console.error(`Failed to save draft ${i + 1}:`, error)
      }
    }

    console.log(`✅ Created campaign pack with ${savedDrafts.length} drafts`)

    return NextResponse.json({
      success: true,
      campaign_id,
      drafts: savedDrafts,
      message: `Created ${savedDrafts.length} draft posts in campaign pack`
    })

  } catch (error) {
    console.error('❌ Campaign generation error:', error)
    return NextResponse.json({ 
      error: 'Campaign generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Parse campaign posts from JSON response
 */
function parseCampaignJSON(aiResponse: string): CampaignPost[] {
  try {
    let cleaned = aiResponse.trim()
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```/g, '')
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/g, '')
    }

    const parsed = JSON.parse(cleaned)

    if (!parsed.posts || !Array.isArray(parsed.posts)) {
      throw new Error('Missing posts array')
    }

    const angles = ['tease', 'feature', 'social_proof', 'reminder', 'last_call']

    return parsed.posts.slice(0, 5).map((p: any, index: number) => ({
      angle: p.angle || angles[index] || 'general',
      caption: p.caption || 'Check out what\'s new!',
      hashtags: Array.isArray(p.hashtags) ? p.hashtags : ['#local', '#food'],
      template: p.template || 'general'
    }))

  } catch (error) {
    console.error('Failed to parse campaign JSON:', error)
    // Fallback: generate 5 basic posts
    return [
      { angle: 'tease', caption: 'Something exciting is coming...', hashtags: ['#comingsoon'], template: 'general' },
      { angle: 'feature', caption: 'Check out our latest offering!', hashtags: ['#new', '#local'], template: 'general' },
      { angle: 'social_proof', caption: 'Our customers love us!', hashtags: ['#reviews'], template: 'general' },
      { angle: 'reminder', caption: 'Don\'t miss out!', hashtags: ['#limitedtime'], template: 'general' },
      { angle: 'last_call', caption: 'Last chance to join us!', hashtags: ['#lastcall'], template: 'general' }
    ]
  }
}
