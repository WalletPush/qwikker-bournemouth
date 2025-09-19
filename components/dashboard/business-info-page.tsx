'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateBusinessInfo } from '@/lib/actions/business-actions'
import { Profile, BUSINESS_TYPE_OPTIONS, BUSINESS_TOWN_OPTIONS, MenuPreviewItem } from '@/types/profiles'
import { BusinessHoursInput } from '@/components/business-hours-input'
import { BusinessHoursStructured } from '@/types/business-hours'

interface BusinessInfoPageProps {
  profile: Profile
}

export function BusinessInfoPage({ profile }: BusinessInfoPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [menuItems, setMenuItems] = useState<MenuPreviewItem[]>(
    profile.menu_preview && profile.menu_preview.length > 0 
      ? profile.menu_preview 
      : [{ name: '', price: '', description: '' }]
  )

  const [formData, setFormData] = useState({
    business_name: profile.business_name || '',
    business_type: profile.business_type || '',
    business_category: profile.business_category || '',
    business_address: profile.business_address || '',
    business_town: profile.business_town || '',
    business_postcode: profile.business_postcode || '',
    business_hours: profile.business_hours || '',
    business_tagline: profile.business_tagline || '',
    business_description: profile.business_description || '',
    website_url: profile.website_url || '',
    instagram_handle: profile.instagram_handle || '',
    facebook_url: profile.facebook_url || '',
  })

  const [businessHours, setBusinessHours] = useState<BusinessHoursStructured | null>(
    // Try to parse existing structured hours, fallback to null for new input
    profile.business_hours_structured as BusinessHoursStructured || null
  )

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addMenuItem = () => {
    if (menuItems.length < 5) {
      setMenuItems([...menuItems, { name: '', price: '', description: '' }])
    }
  }

  const removeMenuItem = (index: number) => {
    setMenuItems(menuItems.filter((_, i) => i !== index))
  }

  const updateMenuItem = (index: number, field: keyof MenuPreviewItem, value: string) => {
    setMenuItems(menuItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      // Include menu items and structured business hours in the form data
      const dataWithMenuItems = {
        ...formData,
        menu_preview: menuItems.filter(item => item.name && item.price), // Only include completed items
        business_hours_structured: businessHours
      }
      const result = await updateBusinessInfo(profile.user_id, dataWithMenuItems)
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Business information updated successfully!'
        })
        router.refresh()
      } else {
        throw new Error(result.error || 'Update failed')
      }
    } catch (error) {
      console.error('Business info update error:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Update failed. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Business Information</h1>
        <p className="text-gray-400">Update your business details and online presence</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Details */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Business Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="business_name" className="text-white">Business Name <span className="text-red-500">*</span></Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => handleInputChange('business_name', e.target.value)}
                  className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                  placeholder="Your business name"
                />
              </div>
              <div>
                <Label htmlFor="business_type" className="text-white">Business Type</Label>
                <select
                  id="business_type"
                  value={formData.business_type}
                  onChange={(e) => handleInputChange('business_type', e.target.value)}
                  className="w-full bg-slate-900 text-white border-slate-600 focus:border-[#00d083] rounded-md p-2"
                >
                  <option value="">Select business type</option>
                  {BUSINESS_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="business_category" className="text-white">Business Category <span className="text-red-500">*</span></Label>
              <Input
                id="business_category"
                value={formData.business_category}
                onChange={(e) => handleInputChange('business_category', e.target.value)}
                className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                placeholder="e.g., Fine Dining, Coffee Shop, Hair Salon"
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Details & Hours */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Business Details & Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BusinessHoursInput
              value={businessHours}
              onChange={setBusinessHours}
            />
            
            <div>
              <Label htmlFor="business_tagline" className="text-white">Business Tagline <span className="text-red-500">*</span></Label>
              <Input
                id="business_tagline"
                value={formData.business_tagline}
                onChange={(e) => handleInputChange('business_tagline', e.target.value)}
                className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                placeholder="Your catchy one-liner (e.g., 'Best coffee in Bournemouth')"
                maxLength={50}
              />
              <p className="text-xs text-gray-400 mt-1">Short tagline that appears on your business card</p>
            </div>

            <div>
              <Label htmlFor="business_description" className="text-white">Business Description <span className="text-red-500">*</span></Label>
              <textarea
                id="business_description"
                value={formData.business_description}
                onChange={(e) => handleInputChange('business_description', e.target.value)}
                className="w-full bg-slate-900 text-white border border-slate-600 focus:border-[#00d083] rounded-md p-3 min-h-[100px] resize-y"
                placeholder="Describe your business, atmosphere, what makes you special, and what customers can expect..."
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1">
                Required for customers to discover you • {formData.business_description.length}/500 characters
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="business_address" className="text-white">Business Address <span className="text-red-500">*</span></Label>
              <Input
                id="business_address"
                value={formData.business_address}
                onChange={(e) => handleInputChange('business_address', e.target.value)}
                className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="business_town" className="text-white">Town <span className="text-red-500">*</span></Label>
                <select
                  id="business_town"
                  value={formData.business_town}
                  onChange={(e) => handleInputChange('business_town', e.target.value)}
                  className="w-full bg-slate-900 text-white border-slate-600 focus:border-[#00d083] rounded-md p-2"
                >
                  <option value="">Select town</option>
                  {BUSINESS_TOWN_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="business_postcode" className="text-white">Postcode</Label>
                <Input
                  id="business_postcode"
                  value={formData.business_postcode}
                  onChange={(e) => handleInputChange('business_postcode', e.target.value)}
                  className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                  placeholder="BH1 2AB"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Online Presence */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
              Online Presence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="website_url" className="text-white">Website URL</Label>
              <Input
                id="website_url"
                value={formData.website_url}
                onChange={(e) => handleInputChange('website_url', e.target.value)}
                className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                placeholder="https://yourwebsite.com"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="instagram_handle" className="text-white">Instagram Handle</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                  <Input
                    id="instagram_handle"
                    value={formData.instagram_handle}
                    onChange={(e) => handleInputChange('instagram_handle', e.target.value)}
                    className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083] pl-8"
                    placeholder="yourbusiness"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="facebook_url" className="text-white">Facebook Page URL</Label>
                <Input
                  id="facebook_url"
                  value={formData.facebook_url}
                  onChange={(e) => handleInputChange('facebook_url', e.target.value)}
                  className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Featured Menu Items */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Featured Menu Items <span className="text-red-500">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400 mb-4">
              Add 3-5 of your most popular items. These will be displayed on your business card to attract customers.
            </p>
            
            {menuItems.map((item, index) => (
              <div key={index} className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-medium">Menu Item #{index + 1}</h4>
                  {menuItems.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMenuItem(index)}
                      className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white">Item Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={item.name}
                      onChange={(e) => updateMenuItem(index, 'name', e.target.value)}
                      className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                      placeholder="e.g., Fish & Chips"
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <Label className="text-white">Price <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">£</span>
                      <Input
                        value={item.price}
                        onChange={(e) => updateMenuItem(index, 'price', e.target.value)}
                        className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083] pl-8"
                        placeholder="12.99"
                        type="number"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="text-white">Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateMenuItem(index, 'description', e.target.value)}
                    className="bg-slate-900 text-white border-slate-600 focus:border-[#00d083]"
                    placeholder="Brief description of the item"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-400 mt-1">{item.description.length}/100 characters</p>
                </div>
              </div>
            ))}
            
            {menuItems.length < 5 && (
              <Button
                type="button"
                variant="outline"
                onClick={addMenuItem}
                className="w-full border-[#00d083] text-[#00d083] hover:bg-[#00d083] hover:text-black"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Menu Item ({menuItems.length}/5)
              </Button>
            )}
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-4">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-300 font-medium text-sm">Tip</span>
              </div>
              <p className="text-blue-200 text-xs">
                Choose your most popular or signature items. These will appear on your business card and help customers discover what you're famous for.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white px-8"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
