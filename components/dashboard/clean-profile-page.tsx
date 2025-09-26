'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateBusinessInfo } from '@/lib/actions/business-actions'
import { Profile, BUSINESS_TYPE_OPTIONS, BUSINESS_TOWN_OPTIONS, MenuPreviewItem } from '@/types/profiles'
import { BusinessHoursInput } from '@/components/business-hours-input'
import { BusinessHoursStructured } from '@/types/business-hours'
import { uploadToCloudinary } from '@/lib/integrations'
import { updateProfileFile } from '@/lib/actions/file-actions'

interface CleanProfilePageProps {
  profile: Profile
}

export function CleanProfilePage({ profile }: CleanProfilePageProps) {
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

  // File upload state
  const [uploading, setUploading] = useState<string | null>(null)

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
    setHoursSaving(true)
    setHoursSaved(false)
    try {
      const result = await updateBusinessInfo(profile.user_id, {
        business_hours_structured: hours,
        business_hours: null
      })
      if (result.success) {
        setHoursSaved(true)
        setMessage({ type: 'success', text: 'Business hours saved successfully!' })
        setBusinessHours(hours)
        router.refresh()
        setTimeout(() => setHoursSaved(false), 3000)
      } else {
        throw new Error(result.error || 'Failed to save business hours')
      }
    } catch (error) {
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

  // Helper functions
  const addMenuItem = () => {
    setMenuItems([...menuItems, { name: '', price: '', description: '' }])
  }

  const removeMenuItem = (index: number) => {
    setMenuItems(menuItems.filter((_, i) => i !== index))
  }

  const updateMenuItem = (index: number, field: keyof MenuPreviewItem, value: string) => {
    const updated = menuItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    )
    setMenuItems(updated)
  }

  // File upload handler
  const handleFileUpload = async (file: File, type: 'logo' | 'business_image') => {
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please upload a valid image file (JPEG, PNG, or WebP)' })
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 10MB' })
      return
    }

    setUploading(type)
    try {
      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(file, type === 'logo' ? 'logo' : 'business')
      
      if (uploadResult.success && uploadResult.url) {
        // Update profile with new file URL
        const result = await updateProfileFile(profile.user_id, type === 'logo' ? 'logo' : 'business_images', uploadResult.url)
        
        if (result.success) {
          setMessage({ 
            type: 'success', 
            text: `${type === 'logo' ? 'Logo' : 'Business image'} uploaded successfully!` 
          })
          router.refresh()
        } else {
          throw new Error(result.error || 'Failed to update profile')
        }
      } else {
        throw new Error(uploadResult.error || 'Upload failed')
      }
    } catch (error) {
      console.error('File upload error:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Upload failed' 
      })
    } finally {
      setUploading(null)
    }
  }

  const SaveButton = ({ saved, saving, onClick, children }: any) => (
    <Button
      onClick={onClick}
      disabled={saving}
      className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg ${
        saved 
          ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-green-500/25' 
          : saving
            ? 'bg-slate-600 text-slate-300 cursor-not-allowed shadow-none'
            : 'bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white shadow-[#00d083]/25'
      }`}
    >
      {saved ? (
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Saved!
        </div>
      ) : saving ? (
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Saving...
        </div>
      ) : children}
    </Button>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Clean Professional Header */}
      <div className="relative bg-slate-800/50 border-b border-slate-700/50 p-8 mb-8">
        <div className="relative flex items-center gap-8 max-w-4xl mx-auto">
          <div className="relative group">
            {profile.logo ? (
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-600 shadow-xl group-hover:scale-105 transition-transform duration-300">
                <img 
                  src={profile.logo} 
                  alt="Profile Picture" 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center border-2 border-slate-600 shadow-xl group-hover:scale-105 transition-transform duration-300">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <button 
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    await handleFileUpload(file, 'logo')
                  }
                }
                input.click()
              }}
              disabled={uploading === 'logo'}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 rounded-full border-2 border-slate-800 flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-110"
            >
              <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{profile.business_name || 'Business Profile'}</h1>
            <p className="text-lg text-slate-400">Complete your profile to get discovered by customers</p>
            {profile.logo && (
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                <p className="text-sm text-slate-500">Profile picture synced with business logo</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-4xl mx-auto px-6 pb-12 space-y-8">

      {/* Success/Error Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

        {/* Personal Information Section */}
        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                Personal Information
              </CardTitle>
              <p className="text-slate-400 mt-2">Your contact details and personal info</p>
            </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name" className="text-white">First Name</Label>
              <Input
                id="first_name"
                value={personalData.first_name}
                onChange={(e) => setPersonalData(prev => ({ ...prev, first_name: e.target.value }))}
                className="bg-slate-700/50 border-slate-600/50 text-white"
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <Label htmlFor="last_name" className="text-white">Last Name</Label>
              <Input
                id="last_name"
                value={personalData.last_name}
                onChange={(e) => setPersonalData(prev => ({ ...prev, last_name: e.target.value }))}
                className="bg-slate-700/50 border-slate-600/50 text-white"
                placeholder="Enter your last name"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={personalData.email}
                onChange={(e) => setPersonalData(prev => ({ ...prev, email: e.target.value }))}
                className="bg-slate-700/50 border-slate-600/50 text-white"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-white">Phone</Label>
              <Input
                id="phone"
                value={personalData.phone}
                onChange={(e) => setPersonalData(prev => ({ ...prev, phone: e.target.value }))}
                className="bg-slate-700/50 border-slate-600/50 text-white"
                placeholder="Enter your phone number"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-700/50">
            <SaveButton saved={personalSaved} saving={personalSaving} onClick={savePersonalInfo}>
              Save Personal Info
            </SaveButton>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Business Information Section */}
        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00b86f] to-[#00a05c] rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#00b86f] to-[#00a05c] rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                Business Information
              </CardTitle>
              <p className="text-slate-400 mt-2">Your business details and branding</p>
            </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business_name" className="text-white">Business Name</Label>
              <Input
                id="business_name"
                value={businessData.business_name}
                onChange={(e) => setBusinessData(prev => ({ ...prev, business_name: e.target.value }))}
                className="bg-slate-700/50 border-slate-600/50 text-white"
                placeholder="Enter your business name"
              />
            </div>
            <div>
              <Label htmlFor="business_type" className="text-white">Business Type</Label>
              <select
                id="business_type"
                value={businessData.business_type}
                onChange={(e) => setBusinessData(prev => ({ ...prev, business_type: e.target.value }))}
                className="w-full h-10 px-3 bg-slate-700/50 border border-slate-600/50 rounded-md text-white"
              >
                <option value="">Select business type</option>
                {BUSINESS_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value} className="bg-slate-800">{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="business_town" className="text-white">Business Town</Label>
              <select
                id="business_town"
                value={businessData.business_town}
                onChange={(e) => setBusinessData(prev => ({ ...prev, business_town: e.target.value }))}
                className="w-full h-10 px-3 bg-slate-700/50 border border-slate-600/50 rounded-md text-white"
              >
                <option value="">Select town</option>
                {BUSINESS_TOWN_OPTIONS.map(town => (
                  <option key={town.value} value={town.value} className="bg-slate-800">{town.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="business_address" className="text-white">Business Address</Label>
              <Input
                id="business_address"
                value={businessData.business_address}
                onChange={(e) => setBusinessData(prev => ({ ...prev, business_address: e.target.value }))}
                className="bg-slate-700/50 border-slate-600/50 text-white"
                placeholder="Enter your business address"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="business_tagline" className="text-white">Business Tagline</Label>
            <Input
              id="business_tagline"
              value={businessData.business_tagline}
              onChange={(e) => setBusinessData(prev => ({ ...prev, business_tagline: e.target.value }))}
              className="bg-slate-700/50 border-slate-600/50 text-white"
              placeholder="A catchy tagline for your business"
            />
          </div>
          <div>
            <Label htmlFor="business_description" className="text-white">Business Description</Label>
            <textarea
              id="business_description"
              value={businessData.business_description}
              onChange={(e) => setBusinessData(prev => ({ ...prev, business_description: e.target.value }))}
              className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-md text-white min-h-[100px] resize-none"
              placeholder="Describe your business..."
            />
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-700/50">
            <SaveButton saved={businessSaved} saving={businessSaving} onClick={saveBusinessInfo}>
              Save Business Info
            </SaveButton>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Business Hours Section */}
        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Opening Hours
              </CardTitle>
              <p className="text-slate-400 mt-2">Set your business operating hours</p>
            </CardHeader>
        <CardContent>
          <BusinessHoursInput
            value={businessHours}
            onChange={setBusinessHours}
            className="border-none bg-transparent p-0"
          />
          
          <div className="flex justify-end pt-4 border-t border-slate-700/50 mt-6">
            <SaveButton saved={hoursSaved} saving={hoursSaving} onClick={() => businessHours && saveBusinessHours(businessHours)}>
              Save Business Hours
            </SaveButton>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Featured Items Section */}
        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                Featured Items
              </CardTitle>
              <p className="text-slate-400 mt-2">Showcase your best menu items</p>
            </CardHeader>
        <CardContent className="space-y-4">
          {menuItems.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-700/30 rounded-lg">
              <div>
                <Label className="text-white text-sm">Item Name</Label>
                <Input
                  value={item.name}
                  onChange={(e) => updateMenuItem(index, 'name', e.target.value)}
                  className="bg-slate-600/50 border-slate-500/50 text-white"
                  placeholder="Item name"
                />
              </div>
              <div>
                <Label className="text-white text-sm">Price</Label>
                <Input
                  value={item.price}
                  onChange={(e) => updateMenuItem(index, 'price', e.target.value)}
                  className="bg-slate-600/50 border-slate-500/50 text-white"
                  placeholder="£0.00"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => removeMenuItem(index)}
                  variant="outline"
                  size="sm"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          
          <div className="flex justify-between pt-4 border-t border-slate-700/50">
            <Button
              onClick={addMenuItem}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Add Item
            </Button>
            <SaveButton saved={menuSaved} saving={menuSaving} onClick={saveMenuItems}>
              Save Featured Items
            </SaveButton>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Business Logo Section */}
        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                Business Logo
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full font-bold">REQUIRED</span>
              </CardTitle>
              <p className="text-slate-400 mt-2">Upload your business logo (also used as profile picture)</p>
            </CardHeader>
        <CardContent>
          {profile?.logo ? (
            <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-2">
                <img 
                  src={profile.logo} 
                  alt="Business Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <p className="text-white font-medium">Logo Uploaded</p>
                </div>
                <p className="text-green-400 text-sm">REQUIRED COMPLETE</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) {
                      await handleFileUpload(file, 'logo')
                    }
                  }
                  input.click()
                }}
                disabled={uploading === 'logo'}
                className="border-slate-600 text-gray-300 hover:bg-slate-700"
              >
                {uploading === 'logo' ? 'Uploading...' : 'Replace'}
              </Button>
            </div>
          ) : (
            <div 
              className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-slate-500 transition-colors"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    await handleFileUpload(file, 'logo')
                  }
                }
                input.click()
              }}
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Upload Business Logo</h3>
              <p className="text-gray-400 text-sm mb-4">
                Upload your business logo. This will also be used as your profile picture.
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, WEBP up to 10MB
              </p>
            </div>
          )}
          </CardContent>
        </Card>
      </div>

        {/* Business Photo Section */}
        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                Business Photo
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full font-bold">HIGH PRIORITY</span>
              </CardTitle>
              <p className="text-slate-400 mt-2">Upload one stunning hero image of your business</p>
            </CardHeader>
        <CardContent>
          {profile?.business_images && Array.isArray(profile.business_images) && profile.business_images.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="w-20 h-16 rounded-lg overflow-hidden">
                  <img 
                    src={profile.business_images[0]} 
                    alt="Business Photo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <p className="text-white font-medium">Business Photo Uploaded</p>
                  </div>
                  <p className="text-green-400 text-sm">HIGH PRIORITY COMPLETE</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(profile.business_images[0], '_blank')}
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                  >
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) {
                          await handleFileUpload(file, 'business_image')
                        }
                      }
                      input.click()
                    }}
                    disabled={uploading === 'business_image'}
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                  >
                    {uploading === 'business_image' ? 'Uploading...' : 'Replace'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-slate-500 transition-colors"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    await handleFileUpload(file, 'business_image')
                  }
                }
                input.click()
              }}
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Upload Business Photo</h3>
              <p className="text-gray-400 text-sm mb-4">
                Upload one high-quality photo of your business. This will be the hero image customers see.
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Recommended: 1200x800px or larger
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, WEBP up to 10MB
              </p>
            </div>
          )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
