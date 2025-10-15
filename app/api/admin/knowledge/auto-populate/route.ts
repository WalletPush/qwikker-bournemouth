import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { storeKnowledgeWithEmbedding } from '@/lib/ai/embeddings'

/**
 * Format structured business hours for AI consumption
 */
function formatStructuredHoursForAI(hoursStructured: any): string {
  if (!hoursStructured) return ""
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const hoursLines = []
  
  days.forEach(day => {
    const dayData = hoursStructured[day]
    if (dayData) {
      const dayName = day.charAt(0).toUpperCase() + day.slice(1)
      if (dayData.closed) {
        hoursLines.push(`${dayName}: Closed`)
      } else if (dayData.open && dayData.close) {
        hoursLines.push(`${dayName}: ${dayData.open} - ${dayData.close}`)
      }
    }
  })
  
  if (hoursStructured.timezone) {
    hoursLines.push(`Timezone: ${hoursStructured.timezone}`)
  }
  
  return hoursLines.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const { city } = await request.json()
    
    if (!city) {
      return NextResponse.json({ 
        success: false, 
        error: 'City is required' 
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    
    // Get all approved businesses for the city
    const { data: businesses, error } = await supabase
      .from('business_profiles')
      .select(`
        id, business_name, business_description, business_tagline,
        business_category, business_type, business_address, business_town,
        website, instagram, facebook,
        business_hours, business_hours_structured,
        menu_preview, city, status,
        business_offers!left(
          id, offer_name, offer_type, offer_value, offer_terms,
          offer_start_date, offer_end_date, status
        )
      `)
      .eq('city', city.toLowerCase())
      .eq('status', 'approved')

    if (error) {
      console.error('❌ Error fetching businesses:', error)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to fetch businesses: ${error.message}` 
      }, { status: 500 })
    }

    if (!businesses || businesses.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No approved businesses found in ${city}`,
        processed: 0
      })
    }

    let processed = 0
    let errors = 0
    const results = []

    for (const business of businesses) {
      try {
        // 1. Create main business info knowledge entry
        const businessInfo = `
Business: ${business.business_name}
Category: ${business.business_category}
Type: ${business.business_type}
Description: ${business.business_description || business.business_tagline || 'Local business'}
Address: ${business.business_address}, ${business.business_town}
Website: ${business.website || 'Not provided'}
Instagram: ${business.instagram ? `@${business.instagram}` : 'Not available'}
Facebook: ${business.facebook || 'Not available'}
Opening Hours: ${formatStructuredHoursForAI(business.business_hours_structured) || business.business_hours || 'Opening hours not provided - please contact business directly'}
        `.trim()

        const businessResult = await storeKnowledgeWithEmbedding({
          city: business.city,
          businessId: business.id,
          knowledgeType: 'custom_knowledge',
          title: `${business.business_name} - Business Information`,
          content: businessInfo,
          metadata: {
            type: 'business_profile',
            category: business.business_category,
            businessType: business.business_type,
            hasMenu: business.menu_preview && business.menu_preview.length > 0,
            hasOffers: business.business_offers && business.business_offers.length > 0
          },
          tags: ['business', 'profile', business.business_category?.toLowerCase(), business.business_type?.toLowerCase()].filter(Boolean)
        })

        if (businessResult.success) {
          processed++
          results.push({ type: 'business_info', business: business.business_name, success: true })
        } else {
          errors++
          results.push({ type: 'business_info', business: business.business_name, success: false, error: businessResult.error })
        }

        // 2. Create menu knowledge entries if menu exists
        if (business.menu_preview && Array.isArray(business.menu_preview) && business.menu_preview.length > 0) {
          const menuItems = business.menu_preview.map(item => 
            `${item.name}: ${item.description || 'No description'} - £${item.price || 'Price on request'}`
          ).join('\n')

          const menuContent = `
Menu for ${business.business_name}:

${menuItems}

Categories available: ${[...new Set(business.menu_preview.map(item => item.category).filter(Boolean))].join(', ') || 'Various items'}
          `.trim()

          const menuResult = await storeKnowledgeWithEmbedding({
            city: business.city,
            businessId: business.id,
            knowledgeType: 'custom_knowledge',
            title: `${business.business_name} - Menu`,
            content: menuContent,
            metadata: {
              type: 'menu',
              itemCount: business.menu_preview.length,
              categories: [...new Set(business.menu_preview.map(item => item.category).filter(Boolean))]
            },
            tags: ['menu', 'food', business.business_category?.toLowerCase()].filter(Boolean)
          })

          if (menuResult.success) {
            processed++
            results.push({ type: 'menu', business: business.business_name, success: true })
          } else {
            errors++
            results.push({ type: 'menu', business: business.business_name, success: false, error: menuResult.error })
          }
        }

        // 3. Create offer knowledge entries if offers exist
        if (business.business_offers && business.business_offers.length > 0) {
          const activeOffers = business.business_offers.filter(offer => offer.status === 'approved')
          
          if (activeOffers.length > 0) {
            const offersContent = `
Current offers at ${business.business_name}:

${activeOffers.map(offer => `
        OFFER: ${offer.offer_name}
        Discount: ${offer.offer_value}
        Offer Terms: ${offer.offer_terms || 'Standard terms apply'}
        Offer Valid Until: ${offer.offer_end_date || 'Ongoing'}
        NOTE: These are OFFER validity times, NOT business opening hours
`).join('\n')}
            `.trim()

            const offerResult = await storeKnowledgeWithEmbedding({
              city: business.city,
              businessId: business.id,
              knowledgeType: 'custom_knowledge',
              title: `${business.business_name} - Current Offers`,
              content: offersContent,
              metadata: {
                type: 'offers',
                offerCount: activeOffers.length,
                offerTypes: [...new Set(activeOffers.map(offer => offer.offer_type))]
              },
              tags: ['offers', 'deals', 'discounts', business.business_category?.toLowerCase()].filter(Boolean)
            })

            if (offerResult.success) {
              processed++
              results.push({ type: 'offers', business: business.business_name, success: true })
            } else {
              errors++
              results.push({ type: 'offers', business: business.business_name, success: false, error: offerResult.error })
            }
          }
        }

      } catch (error) {
        console.error(`❌ Error processing business ${business.business_name}:`, error)
        errors++
        results.push({ type: 'error', business: business.business_name, success: false, error: error.message })
      }
    }

    console.log(`✅ Auto-populated knowledge base for ${city}: ${processed} entries created, ${errors} errors`)

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${businesses.length} businesses in ${city}`,
      stats: {
        businessesProcessed: businesses.length,
        knowledgeEntriesCreated: processed,
        errors: errors
      },
      results: results
    })

  } catch (error: any) {
    console.error('❌ Error in auto-populate:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}
