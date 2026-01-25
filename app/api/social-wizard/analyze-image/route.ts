import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import { getFranchiseApiKeys } from '@/lib/utils/franchise-api-keys'

export async function POST(request: NextRequest) {
  console.log('🎨 Image Analysis API called')
  
  try {
    // Get franchise city and their Anthropic API key
    const city = await getFranchiseCityFromRequest()
    const franchiseKeys = await getFranchiseApiKeys(city)
    
    if (!franchiseKeys.anthropic_api_key) {
      console.error(`❌ No Anthropic API key configured for ${city}`)
      return NextResponse.json(
        { error: 'Social Wizard is not configured for this city. Please add your Anthropic API key in the Setup page.' },
        { status: 503 }
      )
    }
    
    // Create Anthropic client with franchise's API key
    const anthropic = new Anthropic({
      apiKey: franchiseKeys.anthropic_api_key
    })
    
    const { imageUrl, businessName, offerText } = await request.json()
    
    console.log('📥 Analyzing:', { imageUrl, businessName, offerText })

    // Use Claude Vision to analyze the image
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl
              }
            },
            {
              type: 'text',
              text: `You are a professional Instagram designer analyzing this image for ${businessName}.

The post will feature this text: "${offerText}"

Analyze this image and provide SPECIFIC design instructions for creating a stunning Instagram post:

1. **Image Composition:**
   - Identify the main focal points
   - Where are the brightest/darkest areas?
   - What colors dominate the image?
   - Where is there empty/calm space suitable for text?

2. **Text Placement Strategy:**
   - Where should the headline go for maximum readability?
   - Should text be top, center, bottom, or side?
   - What text color will contrast best? (white, black, or specific color)
   - Does the image need a dark/light overlay for text readability?

3. **Design Enhancement:**
   - What color from the image should be used for accents/overlays?
   - Should we add a gradient overlay? If so, what direction and colors?
   - Suggest a geometric element that complements the image (optional)
   - What mood does this image convey? (vibrant, elegant, cozy, bold, etc.)

4. **Typography Style:**
   - Recommend font weight: ultra-bold, bold, or normal
   - Suggest text size relative to image: massive, large, medium, small
   - Should text have: shadow, outline, glow, or solid background?

Return your analysis as JSON:
{
  "textPlacement": "top" | "center" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right",
  "textColor": hex color code or "white" | "black",
  "textEffect": "shadow" | "outline" | "glow" | "solid-bg" | "none",
  "overlayNeeded": boolean,
  "overlayStyle": {
    "type": "gradient" | "solid" | "vignette" | "none",
    "color": hex color from image,
    "opacity": 0.3 to 0.7,
    "direction": "top-to-bottom" | "bottom-to-top" | "left-to-right" | "radial"
  },
  "accentColor": hex color from image,
  "mood": "vibrant" | "elegant" | "cozy" | "bold" | "modern" | "rustic",
  "reasoning": "Brief explanation of design choices"
}`
            }
          ]
        }
      ]
    })

    const textContent = message.content[0].type === 'text' ? message.content[0].text : '{}'
    console.log('✅ Claude Vision response:', textContent.substring(0, 500))
    
    // Extract JSON
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    
    console.log('🎯 Image analysis:', analysis)

    return NextResponse.json(analysis)

  } catch (error: any) {
    console.error('❌ Image analysis error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to analyze image',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

