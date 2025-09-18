'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateBusinessInfo } from '@/lib/actions/business-actions'
import { Profile, BUSINESS_TYPE_OPTIONS, BUSINESS_TOWN_OPTIONS } from '@/types/profiles'

interface BusinessInfoPageProps {
  profile: Profile
}

export function BusinessInfoPage({ profile }: BusinessInfoPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [formData, setFormData] = useState({
    business_name: profile.business_name || '',
    business_type: profile.business_type || '',
    business_category: profile.business_category || '',
    business_address: profile.business_address || '',
    business_town: profile.business_town || '',
    business_postcode: profile.business_postcode || '',
    website_url: profile.website_url || '',
    instagram_handle: profile.instagram_handle || '',
    facebook_url: profile.facebook_url || '',
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const result = await updateBusinessInfo(profile.user_id, formData)
      
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
                <Label htmlFor="business_name" className="text-white">Business Name</Label>
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
              <Label htmlFor="business_category" className="text-white">Business Category</Label>
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
              <Label htmlFor="business_address" className="text-white">Business Address</Label>
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
                <Label htmlFor="business_town" className="text-white">Town</Label>
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
