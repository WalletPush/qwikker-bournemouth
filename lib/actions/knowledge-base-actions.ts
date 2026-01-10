'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { categoryDisplayLabel, categorySystemEnum } from '@/lib/utils/category-helpers'

/**
 * Automatically add basic business information to knowledge base when approved
 */
export async function addBasicBusinessKnowledge(businessId: string, adminId: string) {
  const supabaseAdmin = createAdminClient()

  try {
    // 🔍 CHECK FOR EXISTING ENTRIES: Prevent duplicates on approval
    const { data: existingEntries, error: checkError } = await supabaseAdmin
      .from('knowledge_base')
      .select('id, title')
      .eq('business_id', businessId)

    if (checkError) {
      console.error('❌ Error checking existing knowledge entries:', checkError)
      return { success: false, error: 'Failed to check existing entries' }
    }

    if (existingEntries && existingEntries.length > 0) {
      console.log(`⏭️ Business ${businessId} already has ${existingEntries.length} knowledge entries - skipping auto-population`)
      return { success: true, message: 'Business already in knowledge base' }
    }

  // Get business details and all their offers
  const { data: business, error: businessError } = await supabaseAdmin
    .from('business_profiles')
    .select(`
      *,
      business_offers!business_id (
        id,
        offer_name,
        offer_type,
        offer_value,
        offer_terms,
        offer_start_date,
        offer_end_date,
        status
      )
    `)
    .eq('id', businessId)
    .single()

    if (businessError || !business) {
      console.error('Error fetching business for knowledge base:', businessError)
      return { success: false, error: 'Business not found' }
    }

    // Create basic business knowledge entry
    const basicKnowledge = {
      city: business.city,
      business_id: businessId,
      knowledge_type: 'custom_knowledge',
      title: `${business.business_name} - Basic Information`,
      content: generateBasicBusinessContent(business),
      metadata: {
        auto_generated: true,
        system_category: categorySystemEnum(business), // Stable enum
        display_category: categoryDisplayLabel(business), // User-friendly label
        business_type: business.business_type,
        address: business.business_address,
        postcode: business.business_postcode,
        town: business.business_town,
        phone: business.phone,
        website: business.website_url,
        instagram: business.instagram_handle,
        facebook: business.facebook_url,
        hours: business.business_hours,
        hours_structured: business.business_hours_structured,
        rating: business.rating,
        tier: business.business_tier
      },
      tags: [
        categorySystemEnum(business), // Already lowercase, stable enum
        business.business_type?.toLowerCase(),
        business.business_town?.toLowerCase(),
        'basic_info',
        'auto_generated'
      ].filter(Boolean),
      status: 'active',
      created_by: adminId
    }

    const { data: knowledgeEntry, error: knowledgeError } = await supabaseAdmin
      .from('knowledge_base')
      .insert(basicKnowledge)
      .select()
      .single()

    if (knowledgeError) {
      console.error('Error adding basic business knowledge:', knowledgeError)
      return { success: false, error: 'Failed to add knowledge base entry' }
    }

    console.log(`✅ Basic knowledge added for ${business.business_name}`)
    return { success: true, data: knowledgeEntry }

  } catch (error) {
    console.error('Exception adding basic business knowledge:', error)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

/**
 * Generate comprehensive business content for AI consumption
 */
function generateBasicBusinessContent(business: any): string {
  const sections = []

  // Business Identity
  sections.push(`Business Name: ${business.business_name}`)
  if (business.business_tagline) {
    sections.push(`Tagline: ${business.business_tagline}`)
  }
  if (business.business_description) {
    sections.push(`Description: ${business.business_description}`)
  }

  // Business Details
  sections.push(`Category: ${categoryDisplayLabel(business)}`)
  sections.push(`Type: ${business.business_type}`)
  sections.push(`City: ${business.city}`)
  if (business.business_tier) {
    sections.push(`Tier: ${business.business_tier}`)
  }

  // Location
  if (business.business_address) {
    sections.push(`Address: ${business.business_address}`)
  }
  if (business.business_town) {
    sections.push(`Town: ${business.business_town}`)
  }
  if (business.business_postcode) {
    sections.push(`Postcode: ${business.business_postcode}`)
  }

  // Contact Information
  if (business.phone) {
    sections.push(`Phone: ${business.phone}`)
  }
  if (business.website_url) {
    sections.push(`Website: ${business.website_url}`)
  }
  if (business.instagram_handle) {
    sections.push(`Instagram: @${business.instagram_handle}`)
  }
  if (business.facebook_url) {
    sections.push(`Facebook: ${business.facebook_url}`)
  }

  // Operating Information - Use structured hours if available, fallback to text
  if (business.business_hours_structured) {
    const structuredHours = formatStructuredHoursForAI(business.business_hours_structured)
    sections.push(`Hours:\n${structuredHours}`)
  } else if (business.business_hours) {
    sections.push(`Hours: ${business.business_hours}`)
  }

  // Current Offers (updated to use business_offers table)
  if (business.business_offers && business.business_offers.length > 0) {
    const approvedOffers = business.business_offers.filter(offer => offer.status === 'approved')
    if (approvedOffers.length > 0) {
      sections.push(`Current Offers:`)
      approvedOffers.forEach((offer, index) => {
        sections.push(`  ${index + 1}. ${offer.offer_name}`)
        if (offer.offer_type) {
          sections.push(`     Type: ${offer.offer_type}`)
        }
        if (offer.offer_value) {
          sections.push(`     Value: ${offer.offer_value}`)
        }
        if (offer.offer_terms) {
          sections.push(`     Terms: ${offer.offer_terms}`)
        }
        if (offer.offer_end_date) {
          sections.push(`     Valid until: ${offer.offer_end_date}`)
        }
      })
    }
  } else if (business.offer_name) {
    // Fallback to legacy single offer from business_profiles
    sections.push(`Current Offer: ${business.offer_name}`)
    if (business.offer_type) {
      sections.push(`Offer Type: ${business.offer_type}`)
    }
    if (business.offer_value) {
      sections.push(`Offer Value: ${business.offer_value}`)
    }
    if (business.offer_terms) {
      sections.push(`Offer Terms: ${business.offer_terms}`)
    }
  }

  // Quality Indicators
  if (business.rating && business.rating > 0) {
    sections.push(`Rating: ${business.rating}/5`)
  }
  if (business.review_count && business.review_count > 0) {
    sections.push(`Reviews: ${business.review_count} reviews`)
  }

  // Additional Context
  sections.push(`This business is approved and live on the Qwikker platform in ${business.city}.`)

  return sections.join('\n')
}

/**
 * Get knowledge enhancement suggestions for a newly approved business
 */
export async function getKnowledgeEnhancementSuggestions(businessId: string) {
  const supabaseAdmin = createAdminClient()

  try {
    const { data: business, error: businessError } = await supabaseAdmin
      .from('business_profiles')
      .select('website_url, menu_url, business_images')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return { success: false, error: 'Business not found' }
    }

    const suggestions = []

    // Website scraping suggestion
    if (business.website_url) {
      suggestions.push({
        type: 'web_scrape',
        title: 'Scrape Business Website',
        description: 'Extract menu, offers, and current information from their website',
        url: business.website_url,
        priority: 'high'
      })
    }

    // Menu processing suggestion
    if (business.menu_url) {
      suggestions.push({
        type: 'pdf_document',
        title: 'Process Menu Document',
        description: 'Extract menu items and prices for AI recommendations',
        url: business.menu_url,
        priority: 'high'
      })
    }

    // Image analysis suggestion
    if (business.business_images && business.business_images.length > 0) {
      suggestions.push({
        type: 'image_analysis',
        title: 'Analyze Business Photos',
        description: 'Extract visual information from uploaded business photos',
        count: business.business_images.length,
        priority: 'medium'
      })
    }

    return { success: true, suggestions }

  } catch (error) {
    console.error('Error getting enhancement suggestions:', error)
    return { success: false, error: 'Failed to get suggestions' }
  }
}

/**
 * Create a web scrape knowledge entry
 */
export async function createWebScrapeKnowledge(
  businessId: string | null,
  city: string,
  url: string,
  title: string,
  adminId: string
) {
  // This will be implemented when we build the web scraping functionality
  return { success: false, error: 'Web scraping not yet implemented' }
}

/**
 * Create a PDF document knowledge entry
 */
export async function createPdfKnowledge(
  businessId: string | null,
  city: string,
  file: File,
  title: string,
  adminId: string
) {
  // This will be implemented when we build the PDF processing functionality
  return { success: false, error: 'PDF processing not yet implemented' }
}

/**
 * Create an event knowledge entry
 */
export async function createEventKnowledge(
  businessId: string | null,
  city: string,
  eventData: any,
  adminId: string
) {
  const supabaseAdmin = createAdminClient()

  try {
    const knowledgeEntry = {
      city,
      business_id: businessId,
      knowledge_type: 'event',
      title: eventData.name,
      content: generateEventContent(eventData),
      metadata: {
        event_date: eventData.date,
        event_time: eventData.time,
        event_location: eventData.location,
        event_type: eventData.type,
        ticket_required: eventData.ticketRequired,
        price: eventData.price
      },
      tags: [
        'event',
        eventData.type?.toLowerCase(),
        businessId ? 'business_event' : 'city_event',
        city.toLowerCase()
      ].filter(Boolean),
      status: 'active',
      created_by: adminId
    }

    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .insert(knowledgeEntry)
      .select()
      .single()

    if (error) {
      console.error('Error creating event knowledge:', error)
      return { success: false, error: 'Failed to create event' }
    }

    return { success: true, data }

  } catch (error) {
    console.error('Exception creating event knowledge:', error)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

/**
 * Format structured business hours for AI consumption
 */
function formatStructuredHoursForAI(hoursStructured: any): string {
  if (!hoursStructured) return "Business hours not available."
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const hoursLines = []
  
  days.forEach(day => {
    const dayData = hoursStructured[day]
    if (dayData) {
      const dayName = day.charAt(0).toUpperCase() + day.slice(1)
      if (dayData.closed) {
        hoursLines.push(`${dayName}: Closed`)
      } else {
        hoursLines.push(`${dayName}: ${dayData.open} - ${dayData.close}`)
      }
    }
  })
  
  if (hoursStructured.timezone) {
    hoursLines.push(`Timezone: ${hoursStructured.timezone}`)
  }
  
  return hoursLines.join('\n')
}

function generateEventContent(eventData: any): string {
  const sections = []

  sections.push(`Event: ${eventData.name}`)
  
  if (eventData.description) {
    sections.push(`Description: ${eventData.description}`)
  }
  
  if (eventData.date) {
    sections.push(`Date: ${eventData.date}`)
  }
  
  if (eventData.time) {
    sections.push(`Time: ${eventData.time}`)
  }
  
  if (eventData.location) {
    sections.push(`Location: ${eventData.location}`)
  }
  
  if (eventData.type) {
    sections.push(`Type: ${eventData.type}`)
  }
  
  if (eventData.price) {
    sections.push(`Price: ${eventData.price}`)
  }
  
  if (eventData.ticketRequired) {
    sections.push(`Tickets Required: ${eventData.ticketRequired ? 'Yes' : 'No'}`)
  }

  return sections.join('\n')
}
