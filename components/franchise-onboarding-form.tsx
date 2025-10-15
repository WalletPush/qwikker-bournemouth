'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import GooglePlacesAutocomplete from 'react-google-places-autocomplete'

interface FranchiseOnboardingFormProps {
  city: string
  cityDisplayName: string
}

export function FranchiseOnboardingForm({ city, cityDisplayName }: FranchiseOnboardingFormProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [businessData, setBusinessData] = useState({
    // Personal Info
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    
    // Business Info (auto-filled from Google Places)
    business_name: '',
    business_address: '',
    business_postcode: '',
    business_city: city, // Auto-set from subdomain
    latitude: null as number | null,
    longitude: null as number | null,
    
    // Additional Info
    business_type: '',
    business_category: '',
    website: '',
    instagram: '',
    facebook: ''
  })
  
  const supabase = createClientComponentClient()

  // Auto-detect city from subdomain
  useEffect(() => {
    const hostname = window.location.hostname
    const detectedCity = hostname.split('.')[0]
    if (detectedCity && detectedCity !== 'www') {
      setBusinessData(prev => ({ ...prev, business_city: detectedCity }))
    }
  }, [])

  const handlePlaceSelect = (place: any) => {
    if (!place) return

    // Extract business info from Google Places
    const businessName = place.structured_formatting?.main_text || ''
    const fullAddress = place.description || ''
    
    // Get detailed place info
    const service = new google.maps.places.PlacesService(document.createElement('div'))
    service.getDetails({
      placeId: place.place_id,
      fields: ['name', 'formatted_address', 'geometry', 'address_components', 'website', 'types']
    }, (placeDetails, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
        // Extract address components
        const addressComponents = placeDetails.address_components || []
        const postcode = addressComponents.find(comp => 
          comp.types.includes('postal_code')
        )?.long_name || ''
        
        const cityComponent = addressComponents.find(comp => 
          comp.types.includes('locality') || comp.types.includes('postal_town')
        )?.long_name || ''

        // Auto-detect business type from Google Places types
        const businessType = detectBusinessType(placeDetails.types || [])
        
        setBusinessData(prev => ({
          ...prev,
          business_name: placeDetails.name || businessName,
          business_address: placeDetails.formatted_address || fullAddress,
          business_postcode: postcode,
          business_town: cityComponent.toLowerCase() || '', // Store actual town in business_town
          city: city, // SECURITY: Always use franchise city, never Google Places
          latitude: placeDetails.geometry?.location?.lat() || null,
          longitude: placeDetails.geometry?.location?.lng() || null,
          website: placeDetails.website || '',
          business_type: businessType,
          business_category: businessType
        }))
      }
    })
  }

  const detectBusinessType = (googleTypes: string[]): string => {
    // Map Google Places types to our business categories
    const typeMapping: { [key: string]: string } = {
      'restaurant': 'Restaurant',
      'food': 'Restaurant', 
      'cafe': 'Cafe',
      'bar': 'Bar',
      'night_club': 'Bar',
      'gym': 'Fitness',
      'beauty_salon': 'Beauty',
      'hair_care': 'Beauty',
      'clothing_store': 'Retail',
      'store': 'Retail',
      'lodging': 'Accommodation',
      'tourist_attraction': 'Attraction',
      'amusement_park': 'Entertainment'
    }

    for (const type of googleTypes) {
      if (typeMapping[type]) {
        return typeMapping[type]
      }
    }
    
    return 'Other'
  }

  const submitToFranchiseCRM = async (data: any) => {
    try {
      // Get franchise CRM configuration for this city
      const { data: crmConfig } = await supabase
        .from('franchise_crm_configs')
        .select('*')
        .eq('city', city)
        .eq('is_active', true)
        .single()

      if (crmConfig) {
        // Send to franchise partner's CRM
        await fetch('/api/franchise/crm-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessData: data,
            crmConfig: crmConfig,
            city: city,
            cityDisplayName: cityDisplayName
          })
        })
        
        console.log(`✅ Sent to ${cityDisplayName} franchise CRM`)
      } else {
        console.log(`⚠️ No CRM config for ${city} - using default`)
        // Fallback to default CRM
        await fetch('/api/integrations/ghl-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
      }
    } catch (error) {
      console.error('CRM sync error:', error)
      // Don't block signup if CRM sync fails
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    
    try {
      // Create business profile
      const { data: profile, error } = await supabase
        .from('business_profiles')
        .insert({
          ...businessData,
          status: 'incomplete',
          tier: 'free_trial',
          city: businessData.business_city // Use detected city
        })
        .select()
        .single()

      if (error) throw error

      // Send to franchise CRM
      await submitToFranchiseCRM({
        ...businessData,
        profile_id: profile.id,
        signup_source: `${cityDisplayName} Qwikker Onboarding`,
        franchise_city: cityDisplayName
      })

      // Redirect to success page
      window.location.href = `/onboarding/success?city=${cityDisplayName}`
      
    } catch (error) {
      console.error('Signup error:', error)
      alert('Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Join {cityDisplayName}'s Local Business Network
          </h1>
          <p className="text-slate-400">
            Get discovered by local customers and boost your visibility
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Smart Business Address Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Find Your Business
              </label>
              <GooglePlacesAutocomplete
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
                selectProps={{
                  placeholder: "Start typing your business name or address...",
                  onChange: handlePlaceSelect,
                  className: "text-black",
                  styles: {
                    control: (provided) => ({
                      ...provided,
                      backgroundColor: '#334155',
                      borderColor: '#475569',
                      color: 'white',
                      minHeight: '48px'
                    }),
                    placeholder: (provided) => ({
                      ...provided,
                      color: '#94a3b8'
                    }),
                    singleValue: (provided) => ({
                      ...provided,
                      color: 'white'
                    }),
                    menu: (provided) => ({
                      ...provided,
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569'
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      backgroundColor: state.isFocused ? '#334155' : '#1e293b',
                      color: 'white',
                      cursor: 'pointer'
                    })
                  }
                }}
                autocompletionRequest={{
                  types: ['establishment'],
                  componentRestrictions: { 
                    country: 'gb' 
                  }
                }}
              />
              <p className="text-slate-400 text-xs mt-1">
                This will auto-fill your business details and location
              </p>
            </div>

            {/* Auto-filled Business Details */}
            {businessData.business_name && (
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h3 className="text-white font-semibold">Auto-Detected Business Info:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={businessData.business_name}
                      onChange={(e) => setBusinessData(prev => ({ ...prev, business_name: e.target.value }))}
                      className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Business Type</label>
                    <input
                      type="text"
                      value={businessData.business_type}
                      onChange={(e) => setBusinessData(prev => ({ ...prev, business_type: e.target.value }))}
                      className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Address</label>
                    <input
                      type="text"
                      value={businessData.business_address}
                      onChange={(e) => setBusinessData(prev => ({ ...prev, business_address: e.target.value }))}
                      className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">City</label>
                    <input
                      type="text"
                      value={businessData.business_city}
                      readOnly
                      className="w-full p-2 bg-slate-600 border border-slate-500 rounded text-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Postcode</label>
                    <input
                      type="text"
                      value={businessData.business_postcode}
                      onChange={(e) => setBusinessData(prev => ({ ...prev, business_postcode: e.target.value }))}
                      className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={businessData.first_name}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, first_name: e.target.value }))}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={businessData.last_name}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, last_name: e.target.value }))}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={businessData.email}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={businessData.phone}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={loading || !businessData.business_name || !businessData.email}
              className="w-full bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#009d5f] text-black font-semibold py-3 text-lg"
            >
              {loading ? 'Creating Account...' : `Join ${cityDisplayName} Qwikker`}
            </Button>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
