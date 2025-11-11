import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request: NextRequest) {
  console.log('🚀 Social Wizard API called')
  
  try {
    const body = await request.json()
    const { postType, content, businessName, city, businessType } = body
    
    console.log('📥 Request:', { postType, businessName, city, businessType, contentTitle: content?.title })

    // Build prompt based on post type and content
    const prompt = buildPrompt(postType, content, businessName, city, businessType)
    console.log('📝 Prompt built, calling Claude...')

    // Generate with Claude 3.5 Sonnet (using latest available version)
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      temperature: 0.9,
      system: `You are an elite creative director at a top advertising agency, specializing in viral Instagram content for premium local businesses. 

Your superpower: Creating posts that STOP THE SCROLL.

Your posts are:
- BOLD, PUNCHY, and dripping with personality
- Use unexpected wordplay, alliteration, and hooks
- Minimal emojis (1-2 MAX) - only when they amplify the message
- Headlines that create instant FOMO
- Captions that feel like a conversation with a witty friend
- Make people think "I NEED to check this out"

STYLE RULES:
- Headlines: 3-6 words MAX, mix of ALL CAPS and Title Case
- NO corporate speak ("We're excited...", "Join us for...")
- Create DESIRE and INTRIGUE, not descriptions
- Sound human, not like a brand
- Every word must punch

DESIGN INSTRUCTIONS:
You also specify visual styling to make each post unique:
- textColor: "white" | "black" | "gradient-gold" | "neon-green" | "hot-pink" | "electric-blue"
- textEffect: "bold-shadow" | "outline-glow" | "3d-pop" | "neon" | "vintage" | "graffiti"
- layout: "centered" | "top-left" | "bottom-right" | "diagonal" | "stacked"
- mood: "energetic" | "elegant" | "playful" | "mysterious" | "bold" | "minimal"

Return ONLY valid JSON: { headline, caption, hashtags, style: { textColor, textEffect, layout, mood } }`,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const textContent = message.content[0].type === 'text' ? message.content[0].text : '{}'
    console.log('✅ Claude response received:', textContent.substring(0, 200) + '...')
    
    // Extract JSON from response (Claude might wrap it in markdown)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    const generated = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    
    console.log('🎯 Parsed JSON:', { 
      hasHeadline: !!generated.headline, 
      hasCaption: !!generated.caption, 
      hasHashtags: !!generated.hashtags,
      hasStyle: !!generated.style
    })

    const response = {
      headline: generated.headline || 'Check this out!',
      caption: generated.caption || '',
      hashtags: generated.hashtags || `#${city?.replace(/\s/g, '')} #${businessName?.replace(/\s/g, '')}`,
      style: generated.style || {
        textColor: 'white',
        textEffect: 'bold-shadow',
        layout: 'centered',
        mood: 'energetic'
      }
    }
    
    console.log('📤 Sending response:', response)
    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ Error generating social post:', error)
    console.error('Error details:', error.message, error.stack)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate post',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

function buildPrompt(
  postType: string,
  content: any,
  businessName: string,
  city: string,
  businessType: string
): string {
  const baseContext = `
Business: ${businessName}
Type: ${businessType}
Location: ${city}
`

  if (postType === 'offer') {
    return `${baseContext}
Create an Instagram post for this OFFER:
Title: ${content.title}
Description: ${content.description}
${content.terms ? `Terms: ${content.terms}` : ''}

HEADLINE: 
- Make it BOLD and benefit-driven (3-7 words)
- Examples: "HALF PRICE HAPPINESS", "YOUR £20 JUST BECAME £40", "EXCLUSIVE: 50% OFF EVERYTHING"
- Focus on the BENEFIT, not the business

CAPTION:
- Hook line (1 sentence that creates intrigue)
- What they get (bullet points work great)
- Why it matters (create FOMO)
- How to claim (exclusive ${city} QWIKKER Pass)
- CTA (urgent and exclusive)
- Keep it 150-300 words MAX

HASHTAGS:
- Mix of local (#${city.replace(/\s/g, '')}) + trending + niche
- Include #QWIKKERExclusive
- 8-12 hashtags total

Return JSON with: headline, caption, hashtags`
  }

  if (postType === 'secret-menu') {
    return `${baseContext}
Create an Instagram post for this SECRET MENU ITEM:
Name: ${content.title}
Description: ${content.description}

HEADLINE:
- Make it MYSTERIOUS and exclusive
- Examples: "ASK FOR THE [NAME]", "THE SECRET'S OUT 🤫", "HIDDEN MENU UNLOCKED"
- Create curiosity

CAPTION:
- Start with intrigue (hint at something special)
- Reveal what it is (but keep it exclusive-sounding)
- Explain why it's special
- Make it clear this is ONLY for ${city} QWIKKER Pass holders
- CTA: "Show your pass and ask for..."
- 100-200 words MAX

HASHTAGS:
- Include #SecretMenu #HiddenGem #${city.replace(/\s/g, '')}
- 8-12 total

Return JSON with: headline, caption, hashtags`
  }

  if (postType === 'event') {
    return `${baseContext}
Create an Instagram post for this EVENT:
Name: ${content.title}
Description: ${content.description}
${content.event_date ? `Date: ${new Date(content.event_date).toLocaleDateString()}` : ''}
${content.location ? `Location: ${content.location}` : ''}

HEADLINE:
- Create FOMO and excitement
- Examples: "THIS FRIDAY: [EVENT NAME]", "LIMITED TICKETS LEFT", "YOUR WEEKEND JUST GOT BETTER"
- Make people want to be there

CAPTION:
- Hook: Why this event is unmissable
- Details: Date, time, what to expect
- Exclusive angle: QWIKKER Pass perks
- Urgency: Limited spots/tickets
- CTA: "Grab your tickets now"
- 150-250 words MAX

HASHTAGS:
- #${city.replace(/\s/g, '')}Events #WhatsOn${city.replace(/\s/g, '')}
- Event-specific tags
- 8-12 total

Return JSON with: headline, caption, hashtags`
  }

  // General update
  return `${baseContext}
Create a general Instagram post for this business.

HEADLINE:
- Something inviting and brand-focused
- Examples: "YOUR NEW LOCAL FAVOURITE", "DISCOVER [BUSINESS NAME]", "WHERE [CITY] COMES TOGETHER"

CAPTION:
- What makes this business special
- Atmosphere/vibe
- Why people should visit
- Available on ${city} QWIKKER Pass
- Warm, inviting CTA
- 100-200 words MAX

HASHTAGS:
- Local + niche + lifestyle hashtags
- 8-12 total

Return JSON with: headline, caption, hashtags`
}

