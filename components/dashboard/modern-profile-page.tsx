'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateBusinessInfo } from '@/lib/actions/business-actions'
import { Profile, BUSINESS_TYPE_OPTIONS, BUSINESS_TOWN_OPTIONS, MenuPreviewItem } from '@/types/profiles'
import { BusinessHoursInput } from '@/components/business-hours-input'
import { BusinessHoursStructured } from '@/types/business-hours'
import { FilesPage } from '@/components/dashboard/files-page'

interface ModernProfilePageProps {
  profile: Profile
}

export function ModernProfilePage({ profile }: ModernProfilePageProps) {
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

  const SaveButton = ({ saved, saving, onClick, children }: any) => (
    <Button
      onClick={onClick}
      disabled={saving}
      className={`px-8 py-3 rounded-2xl font-bold text-sm uppercase tracking-wide transition-all duration-300 transform hover:scale-105 ${
        saved 
          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25' 
          : saving
            ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
            : 'bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white shadow-lg shadow-[#00d083]/25'
      }`}
    >
      {saved ? (
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Saved
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
    <div className="min-h-screen bg-slate-900">
      {/* Simple Header */}
      <div className="bg-slate-800/50 border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Business Profile</h1>
              <p className="text-slate-400">Complete your business information</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* Success/Error Message */}
        {message && (
          <div className={`p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* Single Column Layout */}
        <div className="space-y-8">
          
          {/* Personal Information */}
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700/30 overflow-hidden">
            <div className="p-6 border-b border-slate-700/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                  <p className="text-sm text-slate-400">Your contact details and personal info</p>
                </div>
              </div>
            </div>
              
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm">First Name</Label>
                  <Input
                    value={personalData.first_name}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, first_name: e.target.value }))}
                    className="bg-slate-700/30 border-slate-600/30 text-white focus:border-slate-500 focus:ring-slate-500/20"
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">Last Name</Label>
                  <Input
                    value={personalData.last_name}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, last_name: e.target.value }))}
                    className="bg-slate-700/30 border-slate-600/30 text-white focus:border-slate-500 focus:ring-slate-500/20"
                    placeholder="Enter your last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">Email</Label>
                  <Input
                    type="email"
                    value={personalData.email}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-slate-700/30 border-slate-600/30 text-white focus:border-slate-500 focus:ring-slate-500/20"
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white text-sm">Phone</Label>
                  <Input
                    value={personalData.phone}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-slate-700/30 border-slate-600/30 text-white focus:border-slate-500 focus:ring-slate-500/20"
                    placeholder="Enter your phone"
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-slate-700/30">
                <SaveButton saved={personalSaved} saving={personalSaving} onClick={savePersonalInfo}>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Personal Info
                  </div>
                </SaveButton>
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700/30 overflow-hidden">
            <div className="p-6 border-b border-slate-700/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Business Information</h2>
                  <p className="text-sm text-slate-400">Your business details and branding</p>
                </div>
              </div>
            </div>
              
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-white font-bold text-sm uppercase tracking-wider">Business Name</Label>
                    <Input
                      value={businessData.business_name}
                      onChange={(e) => setBusinessData(prev => ({ ...prev, business_name: e.target.value }))}
                      className="bg-slate-700/50 border-slate-600/50 text-white h-14 rounded-2xl text-lg focus:border-[#00d083] focus:ring-[#00d083]/20 transition-all duration-300"
                      placeholder="Enter business name"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-white font-bold text-sm uppercase tracking-wider">Business Type</Label>
                    <select
                      value={businessData.business_type}
                      onChange={(e) => setBusinessData(prev => ({ ...prev, business_type: e.target.value }))}
                      className="w-full h-14 px-4 bg-slate-700/50 border border-slate-600/50 rounded-2xl text-white text-lg focus:border-[#00d083] focus:ring-[#00d083]/20 transition-all duration-300"
                    >
                      <option value="">Select business type</option>
                      {BUSINESS_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value} className="bg-slate-800">{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-white font-bold text-sm uppercase tracking-wider">Business Tagline</Label>
                  <Input
                    value={businessData.business_tagline}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, business_tagline: e.target.value }))}
                    className="bg-slate-700/50 border-slate-600/50 text-white h-14 rounded-2xl text-lg focus:border-[#00d083] focus:ring-[#00d083]/20 transition-all duration-300"
                    placeholder="A catchy tagline for your business"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-white font-bold text-sm uppercase tracking-wider">Business Description</Label>
                  <textarea
                    value={businessData.business_description}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, business_description: e.target.value }))}
                    className="w-full p-4 bg-slate-700/50 border border-slate-600/50 rounded-2xl text-white text-lg min-h-[120px] focus:border-[#00d083] focus:ring-[#00d083]/20 transition-all duration-300 resize-none"
                    placeholder="Describe your business, what you offer, and what makes you special..."
                  />
                </div>
                
                <div className="flex justify-end pt-6 border-t border-slate-700/50">
                  <SaveButton saved={businessSaved} saving={businessSaving} onClick={saveBusinessInfo}>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Business Info
                    </div>
                  </SaveButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Width Sections */}
        
        {/* Business Hours */}
        <div className="group relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-700/30 to-slate-800/30 p-8 border-b border-slate-700/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Opening Hours</h2>
                  <p className="text-slate-400 text-lg">Set your business operating hours</p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <BusinessHoursInput
                value={businessHours}
                onChange={setBusinessHours}
                className="border-none bg-transparent p-0"
              />
              
              <div className="flex justify-end pt-6 border-t border-slate-700/50 mt-8">
                <SaveButton saved={hoursSaved} saving={hoursSaving} onClick={() => businessHours && saveBusinessHours(businessHours)}>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Business Hours
                  </div>
                </SaveButton>
              </div>
            </div>
          </div>
        </div>

        {/* Files Section */}
        <div className="group relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-[#00a05c] to-[#008f54] rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-700/30 to-slate-800/30 p-8 border-b border-slate-700/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-[#00a05c] to-[#008f54] rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Files & Media</h2>
                  <p className="text-slate-400 text-lg">Upload your logos, menus, and business photos</p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <FilesPage profile={profile} hideOfferImage={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
