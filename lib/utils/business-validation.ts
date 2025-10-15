'use server'

import { getSafeCurrentCity } from './tenant-security'

/**
 * Server-side validation for business onboarding
 * Ensures business city matches the franchise subdomain
 */
export async function validateBusinessCity(requestedCity: string): Promise<string> {
  try {
    // Get the validated franchise city from the request
    const validatedCity = await getSafeCurrentCity()
    
    // SECURITY: Ensure requested city matches the validated franchise
    if (requestedCity !== validatedCity) {
      console.error(`🚨 SECURITY: Business city mismatch - requested: ${requestedCity}, validated: ${validatedCity}`)
      throw new Error(`Access denied: Cannot create business for '${requestedCity}' from '${validatedCity}' franchise`)
    }
    
    return validatedCity
  } catch (error) {
    console.error('🚨 SECURITY: Business city validation failed:', error)
    throw new Error(`Business validation failed: ${error}`)
  }
}

/**
 * Validate business profile data before database insertion
 */
export interface BusinessProfileData {
  city: string
  business_name: string
  business_address: string
  business_town: string
  [key: string]: any
}

export async function validateBusinessProfile(data: BusinessProfileData): Promise<BusinessProfileData> {
  // Validate the city matches the franchise
  const validatedCity = await validateBusinessCity(data.city)
  
  // Return sanitized data with validated city
  return {
    ...data,
    city: validatedCity
  }
}
