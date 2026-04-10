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
import { GoogleVerificationSection } from './GoogleVerificationSection'
import { VIBE_TAG_CATEGORIES, MAX_CUSTOM_TAGS, MAX_CUSTOM_TAG_LENGTH, type VibeTagsData } from '@/lib/constants/vibe-tags'

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
    booking_url: profile.booking_url || '',
    booking_preference: profile.booking_preference || '',
  })
  const [businessSaving, setBusinessSaving] = useState(false)
  const [businessSaved, setBusinessSaved] = useState(false)
  const [bookingSaving, setBookingSaving] = useState(false)
  const [bookingSaved, setBookingSaved] = useState(false)

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

  // Vibe Tags State
  const existingVibeTags = (profile as unknown as Record<string, unknown>).vibe_tags as VibeTagsData | null
  const [selectedVibeTags, setSelectedVibeTags] = useState<string[]>(existingVibeTags?.selected || [])
  const [customVibeTags, setCustomVibeTags] = useState<string[]>(existingVibeTags?.custom || [])
  const [customVibeInput, setCustomVibeInput] = useState('')
  const [vibeTagsSaving, setVibeTagsSaving] = useState(false)
  const [vibeTagsSaved, setVibeTagsSaved] = useState(false)

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

  // Save Booking Preferences
  const saveBooking = async () => {
    setBookingSaving(true)
    setBookingSaved(false)
    try {
      const result = await updateBusinessInfo(profile.user_id, {
        booking_preference: businessData.booking_preference,
        booking_url: businessData.booking_url,
      })
      if (result.success) {
        setBookingSaved(true)
        setMessage({ type: 'success', text: 'Booking preferences saved successfully!' })
        router.refresh()
        setTimeout(() => setBookingSaved(false), 3000)
      } else {
        throw new Error(result.error || 'Failed to save booking preferences')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save booking preferences' })
    } finally {
      setBookingSaving(false)
    }
  }

  // Save Business Hours
  const saveBusinessHours = async (hours: BusinessHoursStructured) => {
    setHoursSaving(true)
    setHoursSaved(false)
    try {
      // Format structured hours to text for consistency
      const { formatBusinessHours } = await import('@/lib/utils/business-hours-formatter')
      const formattedHours = formatBusinessHours(null, hours)
      
      const result = await updateBusinessInfo(profile.user_id, {
        business_hours_structured: hours,
        business_hours: formattedHours  // Keep both formats in sync
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

  // Vibe Tag helpers
  const toggleVibeTag = (slug: string) => {
    setSelectedVibeTags(prev =>
      prev.includes(slug) ? prev.filter(t => t !== slug) : [...prev, slug]
    )
  }

  const addCustomVibeTag = () => {
    const tag = customVibeInput.trim()
    if (!tag || customVibeTags.length >= MAX_CUSTOM_TAGS || customVibeTags.includes(tag)) return
    setCustomVibeTags(prev => [...prev, tag.slice(0, MAX_CUSTOM_TAG_LENGTH)])
    setCustomVibeInput('')
  }

  const removeCustomVibeTag = (tag: string) => {
    setCustomVibeTags(prev => prev.filter(t => t !== tag))
  }

  const saveVibeTags = async () => {
    setVibeTagsSaving(true)
    setVibeTagsSaved(false)
    try {
      const vibeData: VibeTagsData = { selected: selectedVibeTags, custom: customVibeTags }
      const result = await updateBusinessInfo(profile.user_id, { vibe_tags: vibeData })
      if (result.success) {
        setVibeTagsSaved(true)
        setMessage({ type: 'success', text: 'Vibe tags saved successfully!' })
        router.refresh()
        setTimeout(() => setVibeTagsSaved(false), 3000)
      } else {
        throw new Error(result.error || 'Failed to save vibe tags')
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save vibe tags' })
    } finally {
      setVibeTagsSaving(false)
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
  const [menuImageUploading, setMenuImageUploading] = useState<number | null>(null)

  const handleMenuItemImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be under 5MB' })
      return
    }
    setMenuImageUploading(index)
    try {
      const url = await uploadToCloudinary(file, 'qwikker/menu-items')
      const updated = menuItems.map((item, i) =>
        i === index ? { ...item, image_url: url } : item
      )
      setMenuItems(updated)
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload image. Please try again.' })
    } finally {
      setMenuImageUploading(null)
    }
  }

  const removeMenuItemImage = (index: number) => {
    const updated = menuItems.map((item, i) =>
      i === index ? { ...item, image_url: undefined } : item
    )
    setMenuItems(updated)
  }

  const addMenuItem = () => {
    if (profile?.status === 'claimed_free' && menuItems.length >= 5) {
      return
    }
    setMenuItems([...menuItems, { name: '', price: '', description: '' }])
  }

  const removeMenuItem = (index: number) => {
    try {
      if (!menuItems || index < 0 || index >= menuItems.length) {
        console.error('Invalid menu item index for removal:', { index, menuItemsLength: menuItems?.length })
        return
      }
      setMenuItems(menuItems.filter((_, i) => i !== index))
    } catch (error) {
      console.error('Error removing menu item:', error)
      setMessage({ type: 'error', text: 'Error removing menu item. Please try again.' })
    }
  }

  const updateMenuItem = (index: number, field: keyof MenuPreviewItem, value: string) => {
    try {
      if (!menuItems || index < 0 || index >= menuItems.length) {
        console.error('Invalid menu item index or menuItems array:', { index, menuItemsLength: menuItems?.length })
        return
      }
      
      const updated = menuItems.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
      setMenuItems(updated)
    } catch (error) {
      console.error('Error updating menu item:', error)
      setMessage({ type: 'error', text: 'Error updating menu item. Please try again.' })
    }
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
      const uploadedUrl = await uploadToCloudinary(file, type === 'logo' ? 'logo' : 'business')
      
      if (uploadedUrl) {
        // Update profile with new file URL
        const result = await updateProfileFile(profile.user_id, type === 'logo' ? 'logo' : 'business_images', uploadedUrl)
        
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
        throw new Error('Upload failed - no URL returned')
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
      variant="outline"
      className={`px-6 py-2.5 rounded-lg font-medium transition-colors duration-200 min-w-[140px] ${
        saved 
          ? 'border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20 hover:border-green-500/40' 
          : saving
            ? 'bg-slate-600 text-slate-300 cursor-not-allowed border-slate-600'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40'
      }`}
    >
      {saved ? 'Saved!' : saving ? 'Saving...' : children}
    </Button>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Clean Professional Header */}
      <div className="relative bg-slate-800/50 border-b border-slate-700/50 p-8 mb-8">
        <div className="relative flex items-center gap-8 max-w-4xl mx-auto">
          <div className="relative group">
            {profile.logo ? (
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-600 shadow-xl transition-colors duration-300">
                <img 
                  src={profile.logo} 
                  alt="Profile Picture" 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center border-2 border-slate-600 shadow-xl transition-colors duration-300">
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
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 rounded-full border-2 border-slate-800 flex items-center justify-center transition-colors duration-300 shadow-lg"
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
        <div id="personal-info" className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
          <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 rounded-xl flex items-center justify-center shadow-lg border border-emerald-500/30">
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
        <div id="business-info" className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
          <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 rounded-xl flex items-center justify-center shadow-lg border border-emerald-500/30">
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
              <Label htmlFor="business_name" className="text-white">Business Name <span className="text-red-500">*</span></Label>
              <Input
                id="business_name"
                value={businessData.business_name}
                onChange={(e) => setBusinessData(prev => ({ ...prev, business_name: e.target.value }))}
                className="bg-slate-700/50 border-slate-600/50 text-white"
                placeholder="Your business name"
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
          </div>

          <div>
            <Label htmlFor="business_category" className="text-white">Business Category <span className="text-red-500">*</span></Label>
            <Input
              id="business_category"
              value={businessData.business_category}
              onChange={(e) => setBusinessData(prev => ({ ...prev, business_category: e.target.value }))}
              className="bg-slate-700/50 border-slate-600/50 text-white"
              placeholder="e.g., Fine Dining, Coffee Shop, Hair Salon"
            />
          </div>

          {/* Location sub-section */}
          <div className="space-y-4 pt-6 border-t border-slate-700/50">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Location
            </h3>
            <div>
              <Label htmlFor="business_address" className="text-white">Business Address <span className="text-red-500">*</span></Label>
              <Input
                id="business_address"
                value={businessData.business_address}
                onChange={(e) => setBusinessData(prev => ({ ...prev, business_address: e.target.value }))}
                className="bg-slate-700/50 border-slate-600/50 text-white"
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="business_town" className="text-white">Town <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="business_postcode" className="text-white">Postcode</Label>
                <Input
                  id="business_postcode"
                  value={businessData.business_postcode}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, business_postcode: e.target.value }))}
                  className="bg-slate-700/50 border-slate-600/50 text-white"
                  placeholder="BH1 2AB"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="business_tagline" className="text-white">Business Tagline <span className="text-red-500">*</span></Label>
            <Input
              id="business_tagline"
              value={businessData.business_tagline}
              onChange={(e) => setBusinessData(prev => ({ ...prev, business_tagline: e.target.value }))}
              className="bg-slate-700/50 border-slate-600/50 text-white"
              placeholder="What you're known for in one line"
              maxLength={50}
            />
            <p className="text-xs text-gray-400 mt-1">Appears on your business card and in search results</p>
          </div>
          <div>
            <Label htmlFor="business_description" className="text-white">Business Description <span className="text-red-500">*</span></Label>
            <textarea
              id="business_description"
              value={businessData.business_description}
              onChange={(e) => setBusinessData(prev => ({ ...prev, business_description: e.target.value }))}
              className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-md text-white min-h-[100px] resize-y"
              placeholder="Tell your story -- who you are, what you do, and why people love coming here..."
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1">
              Our AI uses this to recommend you to the right customers &bull; {businessData.business_description.length}/500 characters
            </p>
          </div>
          
          {/* Social Media & Website Section */}
          <div className="space-y-4 pt-6 border-t border-slate-700/50">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Social Media & Website
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="website_url" className="text-white">Website URL</Label>
                <Input
                  id="website_url"
                  value={businessData.website_url}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, website_url: e.target.value }))}
                  className="bg-slate-700/50 border-slate-600/50 text-white"
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div>
                <Label htmlFor="instagram_handle" className="text-white">Instagram Handle</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                  <Input
                    id="instagram_handle"
                    value={businessData.instagram_handle}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, instagram_handle: e.target.value }))}
                    className="bg-slate-700/50 border-slate-600/50 text-white pl-8"
                    placeholder="yourbusiness"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="facebook_url" className="text-white">Facebook Page URL</Label>
                <Input
                  id="facebook_url"
                  value={businessData.facebook_url}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, facebook_url: e.target.value }))}
                  className="bg-slate-700/50 border-slate-600/50 text-white"
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-700/50">
            <SaveButton saved={businessSaved} saving={businessSaving} onClick={saveBusinessInfo}>
              Save Business Info
            </SaveButton>
            </div>
          </CardContent>
          </Card>
        </div>

        {/* Google Location Verification Section */}
        <GoogleVerificationSection profile={profile} />

        {/* Business Hours Section */}
        <div id="business-hours" className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl flex items-center justify-center shadow-lg border border-purple-500/30">
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

        {/* Booking Section */}
        <div id="booking" className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
          <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/30 to-teal-500/30 rounded-xl flex items-center justify-center shadow-lg border border-cyan-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                Booking
              </CardTitle>
              <p className="text-slate-400 mt-2">How customers can book with you</p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="text-white">How do customers book with you?</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  {[
                    { value: 'url', label: 'Online booking link' },
                    { value: 'phone', label: 'Phone or email' },
                    { value: 'none', label: "We don't take bookings" },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBusinessData(prev => ({ ...prev, booking_preference: option.value }))}
                      className={`p-3 rounded-lg border text-sm text-left transition-colors ${
                        businessData.booking_preference === option.value
                          ? 'border-[#00d083] bg-[#00d083]/10 text-white'
                          : 'border-slate-600/50 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {businessData.booking_preference === 'url' && (
                <div>
                  <Label htmlFor="booking_url" className="text-white">Booking Link</Label>
                  <Input
                    id="booking_url"
                    value={businessData.booking_url}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, booking_url: e.target.value }))}
                    className="bg-slate-700/50 border-slate-600/50 text-white"
                    placeholder="https://book.yoursystem.com/yourvenue"
                  />
                  <p className="text-xs text-gray-400 mt-1">OpenTable, Resy, DesignMyNight, or any booking page URL</p>
                </div>
              )}

              {businessData.booking_preference === 'phone' && (
                <p className="text-sm text-slate-400">
                  Your contact phone number and email from the business details above will be used as the booking method.
                </p>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-700/50">
                <SaveButton saved={bookingSaved} saving={bookingSaving} onClick={saveBooking}>
                  Save Booking
                </SaveButton>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vibe Tags Section */}
        <div id="vibe-tags" className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/20 to-violet-500/20 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
          <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500/30 to-violet-500/30 rounded-xl flex items-center justify-center shadow-lg border border-pink-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                Vibe Tags
              </CardTitle>
              <p className="text-slate-400 mt-2">Help customers find you by describing your vibe</p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {VIBE_TAG_CATEGORIES.map(category => (
                <div key={category.id}>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">{category.label}</h4>
                  <div className="flex flex-wrap gap-2">
                    {category.tags.map(tag => {
                      const isSelected = selectedVibeTags.includes(tag.slug)
                      return (
                        <button
                          key={tag.slug}
                          type="button"
                          onClick={() => toggleVibeTag(tag.slug)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-[#00d083]/20 text-[#00d083] border border-[#00d083]/50'
                              : 'bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:border-slate-500'
                          }`}
                        >
                          {tag.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Custom tags */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2">
                  Custom Tags ({customVibeTags.length}/{MAX_CUSTOM_TAGS})
                </h4>
                {customVibeTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {customVibeTags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-violet-500/20 text-violet-300 border border-violet-500/40">
                        {tag}
                        <button type="button" onClick={() => removeCustomVibeTag(tag)} className="ml-1 hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                )}
                {customVibeTags.length < MAX_CUSTOM_TAGS && (
                  <div className="flex gap-2">
                    <Input
                      value={customVibeInput}
                      onChange={e => setCustomVibeInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomVibeTag())}
                      maxLength={MAX_CUSTOM_TAG_LENGTH}
                      placeholder="Add a custom tag..."
                      className="bg-slate-700/50 border-slate-600/50 text-white max-w-xs"
                    />
                    <Button variant="outline" size="sm" onClick={addCustomVibeTag} className="border-slate-600 text-slate-300 hover:text-white">
                      Add
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-700/50">
                <SaveButton saved={vibeTagsSaved} saving={vibeTagsSaving} onClick={saveVibeTags}>
                  Save Vibe Tags
                </SaveButton>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Featured Items Section */}
        <div id="featured-items" className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-xl flex items-center justify-center shadow-lg border border-yellow-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                Featured Items
                <span className="ml-auto px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs font-medium text-blue-300">
                  Max 5 items
                </span>
              </CardTitle>
              <p className="text-slate-400 mt-2">
                Showcase your top menu items or services
              </p>
            </CardHeader>
        <CardContent className="space-y-4">
          {menuItems.map((item, index) => (
            <div key={index} className="p-4 bg-slate-700/30 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <div className="md:col-span-2">
                  <Label className="text-white text-sm">Description</Label>
                  <textarea
                    value={item.description}
                    onChange={(e) => updateMenuItem(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500/50 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#00d083] focus:border-transparent resize-none"
                    placeholder="Brief description of the item"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                {item.image_url ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image_url}
                      alt={item.name || 'Item'}
                      className="w-16 h-16 rounded-lg object-cover border border-slate-600"
                    />
                    <Button
                      onClick={() => removeMenuItemImage(index)}
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"
                    >
                      Remove image
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-600/30 border border-dashed border-slate-500/50 rounded-lg cursor-pointer hover:bg-slate-600/50 transition-colors">
                    {menuImageUploading === index ? (
                      <span className="text-xs text-slate-400">Uploading...</span>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-slate-400">Add photo (optional)</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={menuImageUploading === index}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleMenuItemImageUpload(index, file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                )}
                <div className="ml-auto">
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
            </div>
          ))}
          
          <div className="flex justify-between pt-4 border-t border-slate-700/50">
            <Button
              onClick={addMenuItem}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              disabled={menuItems.length >= 5}
            >
              Add Item
              {menuItems.length >= 5 && (
                <span className="ml-2 text-xs">(Limit reached)</span>
              )}
            </Button>
            <SaveButton saved={menuSaved} saving={menuSaving} onClick={saveMenuItems}>
              Save Featured Items
            </SaveButton>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Business Logo Section */}
        <div id="business-logo" className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-xl flex items-center justify-center shadow-lg border border-blue-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                Business Logo
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
        <div id="business-photo" className="group relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <Card className="relative bg-slate-800/80 backdrop-blur-xl border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800/60 to-slate-700/40 p-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-500/30 to-pink-500/30 rounded-xl flex items-center justify-center shadow-lg border border-rose-500/30">
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
