'use server'

import OpenAI from 'openai'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

/**
 * Generate embeddings for text content using OpenAI's text-embedding-ada-002
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openai) {
    console.error('❌ OpenAI API key not configured')
    return null
  }

  try {
    const response = await Promise.race([
      openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.replace(/\n/g, ' '), // Clean up text
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Embedding timeout after 10 seconds')), 10000)
      )
    ])

    return response.data[0].embedding
  } catch (error) {
    console.error('❌ Error generating embedding:', error)
    return null
  }
}

/**
 * Regenerate business profile knowledge base entry when profile is updated
 */
export async function syncBusinessProfileToKnowledgeBase(businessId: string): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()
    
    // Fetch the latest business profile
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('id', businessId)
      .single()
    
    if (businessError || !business) {
      return {
        success: false,
        message: 'Business not found',
        error: businessError?.message
      }
    }
    
    // Generate the updated content
    const formattedHours = business.business_hours_structured
      ? Object.entries(business.business_hours_structured)
          .filter(([key]) => !['timezone', 'last_updated'].includes(key))
          .map(([day, hours]: [string, any]) => {
            const dayName = day.charAt(0).toUpperCase() + day.slice(1)
            if (hours.closed) return `${dayName}: Closed`
            if (!hours.open || !hours.close) return `${dayName}: null - null`
            return `${dayName}: ${hours.open} - ${hours.close}`
          })
          .join('\n')
      : business.business_hours || 'Not specified'
    
    const content = `Business Name: ${business.business_name}
Tagline: ${business.business_tagline || 'N/A'}
Description: ${business.business_description || 'No description provided'}
Category: ${business.business_category}
Type: ${business.business_type}
City: ${business.city}
Tier: ${business.business_tier}
Address: ${business.business_address || 'Not specified'}
Town: ${business.business_town || business.city}
Postcode: ${business.business_postcode || 'Not specified'}
Phone: ${business.phone || 'Not specified'}
Website: ${business.website_url || 'Not specified'}
Instagram: ${business.instagram_handle ? '@' + business.instagram_handle : 'Not specified'}
Facebook: ${business.facebook_url || 'Not specified'}
Hours:
${formattedHours}
Timezone: ${business.business_hours_structured?.timezone || 'Europe/London'}
This business is ${business.status} and ${business.status === 'approved' ? 'live on' : 'not yet live on'} the Qwikker platform in ${business.city}.`

    const title = `${business.business_name} - Basic Information`
    
    // Generate new embedding
    const fullText = `${title}\n\n${content}`
    const embedding = await generateEmbedding(fullText)
    
    if (!embedding) {
      return {
        success: false,
        message: 'Failed to generate embedding',
        error: 'OpenAI embedding generation failed'
      }
    }
    
    // Check if a "Basic Information" entry already exists
    const { data: existingEntry } = await supabase
      .from('knowledge_base')
      .select('id')
      .eq('business_id', businessId)
      .eq('title', title)
      .single()
    
    if (existingEntry) {
      // Update existing entry
      const { error: updateError } = await supabase
        .from('knowledge_base')
        .update({
          content,
          embedding,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEntry.id)
      
      if (updateError) {
        return {
          success: false,
          message: 'Failed to update knowledge base',
          error: updateError.message
        }
      }
      
      console.log(`✅ Updated knowledge base for: ${business.business_name}`)
      return {
        success: true,
        message: `Updated knowledge base for ${business.business_name}`
      }
    } else {
      // Create new entry (shouldn't happen, but fallback)
      const { error: insertError } = await supabase
        .from('knowledge_base')
        .insert({
          city: business.city.toLowerCase(),
          business_id: businessId,
          knowledge_type: 'custom_knowledge',
          title,
          content,
          embedding,
          metadata: {
            auto_generated: true,
            business_type: business.business_type,
            business_category: business.business_category,
            tier: business.business_tier,
            address: business.business_address,
            town: business.business_town,
            postcode: business.business_postcode,
            phone: business.phone,
            website: business.website_url,
            instagram: business.instagram_handle,
            facebook: business.facebook_url,
            hours: business.business_hours,
            hours_structured: business.business_hours_structured,
            rating: business.rating
          },
          tags: [
            business.business_category?.toLowerCase(),
            business.business_type,
            business.city.toLowerCase(),
            'basic_info',
            'auto_generated'
          ],
          status: 'active'
        })
      
      if (insertError) {
        return {
          success: false,
          message: 'Failed to create knowledge base entry',
          error: insertError.message
        }
      }
      
      console.log(`✅ Created knowledge base entry for: ${business.business_name}`)
      return {
        success: true,
        message: `Created knowledge base entry for ${business.business_name}`
      }
    }
    
  } catch (error) {
    console.error('❌ Error syncing business to knowledge base:', error)
    return {
      success: false,
      message: 'Internal error syncing knowledge base',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Store content in knowledge_base with vector embedding
 */
export async function storeKnowledgeWithEmbedding({
  city,
  businessId = null,
  knowledgeType,
  title,
  content,
  metadata = {},
  sourceUrl,
  fileUrl,
  tags = []
}: {
  city: string
  businessId?: string | null
  knowledgeType: 'web_scrape' | 'pdf_document' | 'event' | 'news_article' | 'custom_knowledge'
  title: string
  content: string
  metadata?: Record<string, any>
  sourceUrl?: string
  fileUrl?: string
  tags?: string[]
}) {
  const supabase = createServiceRoleClient()

  try {
    // Generate embedding for the content
    const fullText = `${title}\n\n${content}`
    const embedding = await generateEmbedding(fullText)
    
    if (!embedding) {
      throw new Error('Failed to generate embedding')
    }

    // Store in knowledge_base table
    const { data, error } = await supabase
      .from('knowledge_base')
      .insert({
        city: city.toLowerCase(),
        business_id: businessId,
        knowledge_type: knowledgeType,
        title,
        content,
        source_url: sourceUrl,
        file_url: fileUrl,
        metadata,
        tags,
        embedding,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error storing knowledge with embedding:', error)
      return { success: false, error: error.message }
    }

    console.log(`✅ Stored ${knowledgeType} knowledge with embedding: "${title}" for ${businessId ? 'business' : 'city'} ${city}`)
    return { success: true, data }

  } catch (error) {
    console.error('❌ Error in storeKnowledgeWithEmbedding:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Search knowledge_base using vector similarity
 */
export async function searchKnowledgeBase(
  query: string,
  city: string,
  options: {
    matchThreshold?: number
    matchCount?: number
    businessOnly?: boolean
    knowledgeTypes?: string[]
  } = {}
) {
  const supabase = createServiceRoleClient()
  const { matchThreshold = 0.7, matchCount = 10 } = options

  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query)
    if (!queryEmbedding) {
      throw new Error('Failed to generate query embedding')
    }

    // Search using the database function
    const { data, error } = await supabase
      .rpc('search_knowledge_base', {
        query_embedding: queryEmbedding,
        target_city: city.toLowerCase(),
        match_threshold: matchThreshold,
        match_count: matchCount
      })

    if (error) {
      console.error('❌ Error searching knowledge base:', error)
      return { success: false, error: error.message, results: [] }
    }

    // Filter results if needed
    let filteredResults = data || []
    
    if (options.businessOnly) {
      filteredResults = filteredResults.filter(item => item.business_id !== null)
    }
    
    if (options.knowledgeTypes && options.knowledgeTypes.length > 0) {
      filteredResults = filteredResults.filter(item => 
        options.knowledgeTypes!.includes(item.knowledge_type)
      )
    }

    console.log(`🔍 Found ${filteredResults.length} knowledge matches for "${query}" in ${city}`)
    return { success: true, results: filteredResults }

  } catch (error) {
    console.error('❌ Error in searchKnowledgeBase:', error)
    return { success: false, error: error.message, results: [] }
  }
}

/**
 * Legacy function for business knowledge search (now uses knowledge_base)
 */
export async function searchBusinessKnowledge(
  query: string,
  city: string,
  options: {
    matchThreshold?: number
    matchCount?: number
  } = {}
) {
  return searchKnowledgeBase(query, city, {
    ...options,
    businessOnly: true
  })
}

/**
 * Legacy function for city knowledge search (now uses knowledge_base)
 */
export async function searchCityKnowledge(
  query: string,
  city: string,
  options: {
    matchThreshold?: number
    matchCount?: number
  } = {}
) {
  return searchKnowledgeBase(query, city, {
    ...options,
    knowledgeTypes: ['event', 'news_article', 'custom_knowledge']
  })
}

/**
 * Generate embeddings for existing knowledge_base entries that don't have them
 */
export async function generateMissingEmbeddings(city: string) {
  const supabase = createServiceRoleClient()

  try {
    // Find knowledge entries without embeddings
    const { data: entries, error } = await supabase
      .from('knowledge_base')
      .select('id, title, content')
      .eq('city', city.toLowerCase())
      .eq('status', 'active')
      .is('embedding', null)

    if (error) {
      console.error('❌ Error fetching entries without embeddings:', error)
      return { success: false, error: error.message }
    }

    if (!entries || entries.length === 0) {
      console.log(`✅ All knowledge entries in ${city} already have embeddings`)
      return { success: true, processed: 0 }
    }

    let processed = 0
    let errors = 0

    for (const entry of entries) {
      try {
        const fullText = `${entry.title}\n\n${entry.content}`
        const embedding = await generateEmbedding(fullText)
        
        if (embedding) {
          const { error: updateError } = await supabase
            .from('knowledge_base')
            .update({ embedding })
            .eq('id', entry.id)

          if (updateError) {
            console.error(`❌ Error updating embedding for entry ${entry.id}:`, updateError)
            errors++
          } else {
            processed++
          }
        } else {
          errors++
        }
      } catch (error) {
        console.error(`❌ Error processing entry ${entry.id}:`, error)
        errors++
      }
    }

    console.log(`✅ Generated embeddings for ${processed}/${entries.length} entries in ${city} (${errors} errors)`)
    return { success: true, processed, errors, total: entries.length }

  } catch (error) {
    console.error('❌ Error in generateMissingEmbeddings:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update embeddings when knowledge content changes
 */
export async function updateKnowledgeEmbedding(knowledgeId: string) {
  const supabase = createServiceRoleClient()

  try {
    // Get the knowledge entry
    const { data: entry, error } = await supabase
      .from('knowledge_base')
      .select('id, title, content')
      .eq('id', knowledgeId)
      .single()

    if (error || !entry) {
      console.error('❌ Knowledge entry not found:', error)
      return { success: false, error: 'Knowledge entry not found' }
    }

    // Generate new embedding
    const fullText = `${entry.title}\n\n${entry.content}`
    const embedding = await generateEmbedding(fullText)
    
    if (!embedding) {
      throw new Error('Failed to generate embedding')
    }

    // Update the entry with new embedding
    const { error: updateError } = await supabase
      .from('knowledge_base')
      .update({ 
        embedding,
        updated_at: new Date().toISOString()
      })
      .eq('id', knowledgeId)

    if (updateError) {
      console.error('❌ Error updating knowledge embedding:', updateError)
      return { success: false, error: updateError.message }
    }

    console.log(`✅ Updated embedding for knowledge entry ${knowledgeId}`)
    return { success: true }

  } catch (error) {
    console.error('❌ Error in updateKnowledgeEmbedding:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Sync approved event to knowledge base for AI chat access
 */
export async function syncEventToKnowledgeBase(eventId: string): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    // Fetch the event with business details
    const { data: event, error: eventError } = await supabase
      .from('business_events')
      .select(`
        *,
        business:business_profiles(business_name, city, business_address, business_town)
      `)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return {
        success: false,
        message: 'Event not found',
        error: eventError?.message
      }
    }

    // Only sync approved events
    if (event.status !== 'approved') {
      return {
        success: false,
        message: `Event must be approved to sync to knowledge base (current status: ${event.status})`
      }
    }

    const business = event.business

    // Format event date and time
    const eventDate = new Date(event.event_date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    const eventTime = event.event_start_time && event.event_end_time
      ? `${event.event_start_time} - ${event.event_end_time}`
      : event.event_start_time
      ? `From ${event.event_start_time}`
      : 'Time TBC'

    // Build event location info
    const eventLocation = event.custom_location_name
      ? `${event.custom_location_name}${event.custom_location_address ? `, ${event.custom_location_address}` : ''}`
      : `${business.business_name}, ${business.business_address}, ${business.business_town}`

    // Build content for AI
    const content = `Event Name: ${event.event_name}
Event Type: ${event.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
Date: ${eventDate}
Time: ${eventTime}
${event.is_recurring ? `Recurring: ${event.recurrence_pattern?.replace(/_/g, ' ')}` : 'One-time event'}
Location: ${eventLocation}
Hosted by: ${business.business_name}
City: ${business.city}
Description: ${event.event_description}
${event.event_short_description ? `Summary: ${event.event_short_description}` : ''}
${event.price_info ? `Price: ${event.price_info}` : 'Price: Free/Not specified'}
${event.requires_booking && event.booking_url ? `Tickets/Booking: ${event.booking_url}` : event.requires_booking ? 'Booking required (contact venue)' : 'No booking required'}
Status: Approved and happening soon in ${business.city}`

    const title = `${event.event_name} at ${business.business_name} - Event`

    // Generate embedding
    const fullText = `${title}\n\n${content}`
    const embedding = await generateEmbedding(fullText)

    if (!embedding) {
      return {
        success: false,
        message: 'Failed to generate embedding for event',
        error: 'Embedding generation returned null'
      }
    }

    // Check if knowledge base entry already exists for this event
    const { data: existing } = await supabase
      .from('knowledge_base')
      .select('id')
      .eq('business_id', event.business_id)
      .eq('knowledge_type', 'event')
      .eq('metadata->>event_id', eventId)
      .single()

    if (existing) {
      // Update existing entry
      const { error: updateError } = await supabase
        .from('knowledge_base')
        .update({
          title,
          content,
          embedding,
          metadata: {
            event_id: eventId,
            event_name: event.event_name,
            event_type: event.event_type,
            event_date: event.event_date,
            is_recurring: event.is_recurring,
            requires_booking: event.requires_booking,
            booking_url: event.booking_url,
            price_info: event.price_info,
            custom_location: event.custom_location_name,
          },
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (updateError) {
        return {
          success: false,
          message: 'Failed to update event in knowledge base',
          error: updateError.message
        }
      }

      console.log(`✅ Updated event "${event.event_name}" in knowledge base`)
      return {
        success: true,
        message: 'Event updated in knowledge base successfully'
      }
    } else {
      // Create new entry
      const { error: insertError } = await supabase
        .from('knowledge_base')
        .insert({
          city: business.city,
          business_id: event.business_id,
          knowledge_type: 'event',
          title,
          content,
          embedding,
          metadata: {
            event_id: eventId,
            event_name: event.event_name,
            event_type: event.event_type,
            event_date: event.event_date,
            is_recurring: event.is_recurring,
            requires_booking: event.requires_booking,
            booking_url: event.booking_url,
            price_info: event.price_info,
            custom_location: event.custom_location_name,
          },
          tags: ['event', event.event_type, business.city, 'approved'],
          status: 'active'
        })

      if (insertError) {
        return {
          success: false,
          message: 'Failed to add event to knowledge base',
          error: insertError.message
        }
      }

      console.log(`✅ Added event "${event.event_name}" to knowledge base`)
      return {
        success: true,
        message: 'Event added to knowledge base successfully'
      }
    }

  } catch (error: any) {
    console.error('❌ Error in syncEventToKnowledgeBase:', error)
    return {
      success: false,
      message: 'Failed to sync event to knowledge base',
      error: error.message
    }
  }
}

/**
 * Remove event from knowledge base (when rejected, cancelled, or completed)
 */
export async function removeEventFromKnowledgeBase(eventId: string): Promise<{
  success: boolean
  message: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('knowledge_type', 'event')
      .eq('metadata->>event_id', eventId)

    if (error) {
      console.error('❌ Error removing event from knowledge base:', error)
      return {
        success: false,
        message: `Failed to remove event from knowledge base: ${error.message}`
      }
    }

    console.log(`✅ Removed event from knowledge base (ID: ${eventId})`)
    return {
      success: true,
      message: 'Event removed from knowledge base'
    }
  } catch (error: any) {
    console.error('❌ Error in removeEventFromKnowledgeBase:', error)
    return {
      success: false,
      message: `Error: ${error.message}`
    }
  }
}