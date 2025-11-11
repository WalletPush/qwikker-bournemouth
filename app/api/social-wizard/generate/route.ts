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
          content: `You are a social media expert specializing in creating viral Instagram posts for local businesses. 
Your posts are:
- Engaging and attention-grabbing
- Authentic and conversational
- Optimized for Instagram (use emojis strategically)
- Action-oriented with clear CTAs
- Locally focused (mention the city and QWIKKER Pass)

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

Write a post that:
- Has a catchy, benefit-focused headline (max 100 chars)
- Creates urgency and excitement
- Highlights the value of the offer
- Mentions this is exclusive to ${city} QWIKKER Pass holders
- Includes a clear call-to-action
- Uses 5-8 relevant hashtags including #${city.replace(/\s/g, '')} and #QWIKKER

Return JSON with: headline, caption (max 2200 chars), hashtags`
  }

  if (postType === 'secret-menu') {
    return `${baseContext}
Create an Instagram post for this SECRET MENU ITEM:
Name: ${content.title}
Description: ${content.description}

Write a post that:
- Creates intrigue and exclusivity
- Makes people want to try it
- Emphasizes it's a hidden gem only for QWIKKER Pass holders
- Has a fun, mysterious vibe
- Includes relevant food/drink hashtags
- Uses 5-8 hashtags including #${city.replace(/\s/g, '')} and #SecretMenu

Return JSON with: headline, caption (max 2200 chars), hashtags`
  }

  if (postType === 'event') {
    return `${baseContext}
Create an Instagram post for this EVENT:
Name: ${content.title}
Description: ${content.description}
${content.event_date ? `Date: ${new Date(content.event_date).toLocaleDateString()}` : ''}
${content.location ? `Location: ${content.location}` : ''}

Write a post that:
- Creates excitement and FOMO
- Highlights what makes this event special
- Includes date/time details naturally
- Encourages people to attend
- Mentions ${city} QWIKKER Pass holders get priority or special perks
- Uses event-related hashtags
- Uses 5-8 hashtags including #${city.replace(/\s/g, '')}Events

Return JSON with: headline, caption (max 2200 chars), hashtags`
  }

  // General update
  return `${baseContext}
Create a general Instagram post for this business.

Write a post that:
- Is warm and inviting
- Showcases the business personality
- Encourages people to visit
- Mentions they're on the ${city} QWIKKER Pass
- Includes a clear CTA
- Uses 5-8 relevant local hashtags

Return JSON with: headline, caption (max 2200 chars), hashtags`
}

