'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateBusinessInfo } from '@/lib/actions/business-actions'
import { updateProfileFile } from '@/lib/actions/file-actions'
import { Profile, BUSINESS_TYPE_OPTIONS, BUSINESS_TOWN_OPTIONS, MenuPreviewItem } from '@/types/profiles'
import { BusinessHoursInput } from '@/components/business-hours-input'
import { BusinessHoursStructured } from '@/types/business-hours'
import { FilesPage } from '@/components/dashboard/files-page'

interface ProfilePageProps {
  profile: Profile
}

export function ProfilePage({ profile }: ProfilePageProps) {
  const router = useRouter()
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Personal Info State
  const [personalData, setPersonalData] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
  })
  const [personalSaving, setPersonalSaving] = useState(false)
  const [personalSaved, setPersonalSaved] = useState(false)

  // Business Info State
  const [businessData, setBusinessData] = useState({
    business_name: profile.business_name || '',
    business_type: profile.business_type || '',
    business_category: profile.business_category || '',
    business_address: profile.business_address || '',
    business_town: profile.business_town || '',
    business_postcode: profile.business_postcode || '',
    business_tagline: profile.business_tagline || '',
    business_description: profile.business_description || '',
    website_url: profile.website_url || '',
    instagram_handle: profile.instagram_handle || '',
    facebook_url: profile.facebook_url || '',
  })
  const [businessSaving, setBusinessSaving] = useState(false)
  const [businessSaved, setBusinessSaved] = useState(false)

  // Business Hours State
  const [businessHours, setBusinessHours] = useState<BusinessHoursStructured | null>(
    profile.business_hours_structured as BusinessHoursStructured || null
  )
  const [hoursSaving, setHoursSaving] = useState(false)
  const [hoursSaved, setHoursSaved] = useState(false)

  // Menu Items State
  const [menuItems, setMenuItems] = useState<MenuPreviewItem[]>(
    profile.menu_preview && profile.menu_preview.length > 0 
      ? profile.menu_preview 
      : [{ name: '', price: '', description: '' }]
  )
  const [menuSaving, setMenuSaving] = useState(false)
  const [menuSaved, setMenuSaved] = useState(false)

  // Save Personal Info
  const savePersonalInfo = async () => {
    setPersonalSaving(true)
    setPersonalSaved(false)
    try {
      const result = await updateBusinessInfo(profile.user_id, personalData)
      if (result.success) {
        setPersonalSaved(true)
        setMessage({ type: 'success', text: 'Personal information saved successfully!' })
        router.refresh()
        setTimeout(() => setPersonalSaved(false), 3000)
      } else {
        throw new Error(result.error || 'Failed to save personal information')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save personal information' })
    } finally {
      setPersonalSaving(false)
    }
  }

  // Save Business Info
  const saveBusinessInfo = async () => {
    setBusinessSaving(true)
    setBusinessSaved(false)
    try {
      const result = await updateBusinessInfo(profile.user_id, businessData)
      if (result.success) {
        setBusinessSaved(true)
        setMessage({ type: 'success', text: 'Business information saved successfully!' })
        router.refresh()
        setTimeout(() => setBusinessSaved(false), 3000)
      } else {
        throw new Error(result.error || 'Failed to save business information')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save business information' })
    } finally {
      setBusinessSaving(false)
    }
  }

  // Save Business Hours
  const saveBusinessHours = async (hours: BusinessHoursStructured) => {
    console.log('saveBusinessHours called with:', hours)
    setHoursSaving(true)
    setHoursSaved(false)
    try {
      console.log('Updating business hours for user:', profile.user_id)
      const result = await updateBusinessInfo(profile.user_id, {
        business_hours_structured: hours,
        business_hours: null
      })
      console.log('Business hours update result:', result)
      if (result.success) {
        console.log('Setting hoursSaved to true')
        setHoursSaved(true)
        setMessage({ type: 'success', text: 'Business hours saved successfully!' })
        setBusinessHours(hours)
        console.log('Refreshing router...')
        router.refresh()
        setTimeout(() => {
          console.log('Resetting hoursSaved to false')
          setHoursSaved(false)
        }, 3000)
      } else {
        throw new Error(result.error || 'Failed to save business hours')
      }
    } catch (error) {
      console.error('Business hours save error:', error)
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save business hours' })
    } finally {
      setHoursSaving(false)
    }
  }

  // Save Menu Items
  const saveMenuItems = async () => {
    setMenuSaving(true)
    setMenuSaved(false)
    try {
      const validItems = menuItems.filter(item => item.name.trim())
      const result = await updateBusinessInfo(profile.user_id, {
        menu_preview: validItems
      })
      if (result.success) {
        setMenuSaved(true)
        setMessage({ type: 'success', text: 'Featured items saved successfully!' })
        router.refresh()
        setTimeout(() => setMenuSaved(false), 3000)
      } else {
        throw new Error(result.error || 'Failed to save featured items')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save featured items' })
    } finally {
      setMenuSaving(false)
    }
  }

  // Add menu item
  const addMenuItem = () => {
    setMenuItems([...menuItems, { name: '', price: '', description: '' }])
  }

  // Remove menu item
  const removeMenuItem = (index: number) => {
    setMenuItems(menuItems.filter((_, i) => i !== index))
  }

  // Update menu item
  const updateMenuItem = (index: number, field: keyof MenuPreviewItem, value: string) => {
    const updated = menuItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    )
    setMenuItems(updated)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Stunning Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#00d083] via-[#00b86f] to-[#00a05c] p-12 mb-12">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-white/10"></div>
        
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl border border-white/30">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-5xl font-black text-white mb-3 tracking-tight">Business Profile</h1>
              <p className="text-xl text-white/90 font-medium">Complete your business information to get discovered by customers</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content Container */}
      <div className="max-w-6xl mx-auto px-6 pb-12 space-y-8">

        {/* Success/Error Message */}
        {message && (
          <div className={`p-6 rounded-2xl border-2 backdrop-blur-sm ${
            message.type === 'success' 
              ? 'bg-green-500/20 border-green-400/30 text-green-300' 
              : 'bg-red-500/20 border-red-400/30 text-red-300'
          } shadow-2xl`}>
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-semibold text-lg">{message.text}</span>
            </div>
          </div>
        )}

        {/* Grid Layout for Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
        {/* Personal Information Section */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
          <Card className="relative bg-slate-800/90 border-slate-700/50 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-xl">
            <CardHeader className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                Personal Information
              </CardTitle>
              <p className="text-slate-400 mt-2">Your contact details and personal info</p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-white font-semibold text-sm uppercase tracking-wider">First Name</Label>
                  <Input
                    id="first_name"
                    value={personalData.first_name}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, first_name: e.target.value }))}
                    className="bg-slate-700/50 border-slate-600/50 text-white h-12 rounded-xl focus:border-[#00d083] focus:ring-[#00d083]/20 transition-all duration-200"
                    placeholder="Enter your first name"
                  />
                </div>
            <div>
              <Label htmlFor="last_name" className="text-white">Last Name</Label>
              <Input
                id="last_name"
                value={personalData.last_name}
                onChange={(e) => setPersonalData(prev => ({ ...prev, last_name: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Enter your last name"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-white">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={personalData.email}
                onChange={(e) => setPersonalData(prev => ({ ...prev, email: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-white">Phone Number</Label>
              <Input
                id="phone"
                value={personalData.phone}
                onChange={(e) => setPersonalData(prev => ({ ...prev, phone: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Enter your phone number"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-600">
            <Button
              onClick={savePersonalInfo}
              disabled={personalSaving}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                personalSaved 
                  ? 'bg-green-600 text-white cursor-default' 
                  : personalSaving
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'bg-[#00d083] hover:bg-[#00b86f] text-white'
              }`}
            >
              {personalSaved ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </div>
              ) : personalSaving ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Personal Info
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Business Information Section */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border-slate-600/50 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business_name" className="text-white">Business Name</Label>
              <Input
                id="business_name"
                value={businessData.business_name}
                onChange={(e) => setBusinessData(prev => ({ ...prev, business_name: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Enter your business name"
              />
            </div>
            <div>
              <Label htmlFor="business_type" className="text-white">Business Type</Label>
              <select
                id="business_type"
                value={businessData.business_type}
                onChange={(e) => setBusinessData(prev => ({ ...prev, business_type: e.target.value }))}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              >
                <option value="">Select business type</option>
                {BUSINESS_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="business_category" className="text-white">Business Category</Label>
              <Input
                id="business_category"
                value={businessData.business_category}
                onChange={(e) => setBusinessData(prev => ({ ...prev, business_category: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="e.g. Restaurant, Cafe, Retail"
              />
            </div>
            <div>
              <Label htmlFor="business_town" className="text-white">Town</Label>
              <select
                id="business_town"
                value={businessData.business_town}
                onChange={(e) => setBusinessData(prev => ({ ...prev, business_town: e.target.value }))}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              >
                <option value="">Select town</option>
                {BUSINESS_TOWN_OPTIONS.map(town => (
                  <option key={town.value} value={town.value}>{town.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="business_address" className="text-white">Business Address</Label>
            <Input
              id="business_address"
              value={businessData.business_address}
              onChange={(e) => setBusinessData(prev => ({ ...prev, business_address: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Enter your full business address"
            />
          </div>
          
          <div>
            <Label htmlFor="business_postcode" className="text-white">Postcode</Label>
            <Input
              id="business_postcode"
              value={businessData.business_postcode}
              onChange={(e) => setBusinessData(prev => ({ ...prev, business_postcode: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Enter postcode"
            />
          </div>

          <div>
            <Label htmlFor="business_tagline" className="text-white">Business Tagline</Label>
            <Input
              id="business_tagline"
              value={businessData.business_tagline}
              onChange={(e) => setBusinessData(prev => ({ ...prev, business_tagline: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="A catchy tagline for your business"
            />
          </div>

          <div>
            <Label htmlFor="business_description" className="text-white">Business Description</Label>
            <textarea
              id="business_description"
              value={businessData.business_description}
              onChange={(e) => setBusinessData(prev => ({ ...prev, business_description: e.target.value }))}
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white min-h-[100px]"
              placeholder="Describe your business, what you offer, and what makes you special..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="website_url" className="text-white">Website</Label>
              <Input
                id="website_url"
                value={businessData.website_url}
                onChange={(e) => setBusinessData(prev => ({ ...prev, website_url: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="https://yourwebsite.com"
              />
            </div>
            <div>
              <Label htmlFor="instagram_handle" className="text-white">Instagram</Label>
              <Input
                id="instagram_handle"
                value={businessData.instagram_handle}
                onChange={(e) => setBusinessData(prev => ({ ...prev, instagram_handle: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="@yourbusiness"
              />
            </div>
            <div>
              <Label htmlFor="facebook_url" className="text-white">Facebook</Label>
              <Input
                id="facebook_url"
                value={businessData.facebook_url}
                onChange={(e) => setBusinessData(prev => ({ ...prev, facebook_url: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Facebook page URL"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-600">
            <Button
              onClick={saveBusinessInfo}
              disabled={businessSaving}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                businessSaved 
                  ? 'bg-green-600 text-white cursor-default' 
                  : businessSaving
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'bg-[#00d083] hover:bg-[#00b86f] text-white'
              }`}
            >
              {businessSaved ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </div>
              ) : businessSaving ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Business Info
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours Section */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border-slate-600/50 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Opening Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <BusinessHoursInput
              value={businessHours}
              onChange={setBusinessHours}
              className="border-none bg-transparent p-0"
            />
            
            {/* Custom Save Button with proper state */}
            <div className="flex justify-end pt-4 border-t border-slate-600">
              <Button
                onClick={() => {
                  if (businessHours) {
                    saveBusinessHours(businessHours)
                  }
                }}
                disabled={hoursSaving}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  hoursSaved 
                    ? 'bg-green-600 text-white cursor-default' 
                    : hoursSaving
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : 'bg-[#00d083] hover:bg-[#00b86f] text-white'
                }`}
              >
                {hoursSaved ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved
                  </div>
                ) : hoursSaving ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Business Hours
                  </div>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Featured Items Section */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border-slate-600/50 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            Featured Items
            <span className="text-xs text-gray-400 font-normal">(Optional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {menuItems.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-700/30 rounded-lg">
              <div>
                <Label className="text-white text-sm">Item Name</Label>
                <Input
                  value={item.name}
                  onChange={(e) => updateMenuItem(index, 'name', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="e.g. Signature Burger"
                />
              </div>
              <div>
                <Label className="text-white text-sm">Price</Label>
                <Input
                  value={item.price}
                  onChange={(e) => updateMenuItem(index, 'price', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="e.g. £12.99"
                />
              </div>
              <div>
                <Label className="text-white text-sm">Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateMenuItem(index, 'description', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Brief description"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => removeMenuItem(index)}
                  variant="outline"
                  size="sm"
                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          
          <div className="flex justify-between items-center pt-4 border-t border-slate-600">
            <Button
              onClick={addMenuItem}
              variant="outline"
              className="border-slate-600 text-gray-300 hover:bg-slate-700"
            >
              Add Item
            </Button>
            
            <Button
              onClick={saveMenuItems}
              disabled={menuSaving}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                menuSaved 
                  ? 'bg-green-600 text-white cursor-default' 
                  : menuSaving
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'bg-[#00d083] hover:bg-[#00b86f] text-white'
              }`}
            >
              {menuSaved ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </div>
              ) : menuSaving ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Featured Items
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Files Section */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 border-slate-600/50 shadow-xl rounded-2xl overflow-hidden backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Files & Media
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FilesPage profile={profile} hideOfferImage={true} />
        </CardContent>
      </Card>
    </div>
  )
}
