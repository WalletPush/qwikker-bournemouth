import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { postType, content, businessName, city, businessType } = await request.json()

    // Build prompt based on post type and content
    const prompt = buildPrompt(postType, content, businessName, city, businessType)

    // Generate with GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an elite social media creative director specializing in viral Instagram content for premium local businesses. 

Your posts are:
- BOLD, PUNCHY, and IMPOSSIBLE TO SCROLL PAST
- Use CREATIVE wordplay, alliteration, and hooks
- Strategic emoji use (2-3 MAX, only when they add impact)
- Headlines that DEMAND attention (short, powerful, benefit-focused)
- Captions that tell a story and create FOMO
- CTAs that feel exclusive and urgent
- Make people feel like they're missing out if they don't visit

STYLE RULES:
- Headlines: 3-7 words MAX, ALL CAPS or Title Case
- NO generic phrases like "We're excited to bring you" 
- NO basic descriptions - create DESIRE
- Make it feel PREMIUM and EXCLUSIVE
- Every word must earn its place

Always return ONLY a valid JSON object with: headline, caption, hashtags`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const generated = JSON.parse(completion.choices[0].message.content || '{}')

    return NextResponse.json({
      headline: generated.headline || 'Check this out!',
      caption: generated.caption || '',
      hashtags: generated.hashtags || `#${city?.replace(/\s/g, '')} #${businessName?.replace(/\s/g, '')}`
    })

  } catch (error) {
    console.error('Error generating social post:', error)
    return NextResponse.json(
      { error: 'Failed to generate post' },
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

