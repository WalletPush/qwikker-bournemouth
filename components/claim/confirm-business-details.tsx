'use client'

import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Building2, Upload, X, Check, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { VIBE_TAG_CATEGORIES, MAX_CUSTOM_TAGS, MAX_CUSTOM_TAG_LENGTH } from '@/lib/constants/vibe-tags'
import { BusinessHoursInput } from '@/components/business-hours-input'
import { BusinessHoursStructured, convertStructuredToText } from '@/types/business-hours'

interface BusinessData {
  id: string
  name: string
  address: string
  phone?: string
  website?: string
  category?: string
  type?: string
  description?: string
  tagline?: string
  hours?: string
  rating?: number
  reviewCount?: number
}

interface TrialConfig {
  trialTier: string
  trialDays: number
}

interface ConfirmBusinessDetailsProps {
  business: BusinessData
  smsOptInAvailable: boolean
  trialConfig?: TrialConfig | null
  onConfirm: (editedData: {
    business_name: string
    address: string
    phone: string
    website: string
    category: string
    type: string
    description: string
    tagline: string
    hours: string
    logo?: File
    heroImage?: File
    sms_opt_in?: boolean
    phone_e164?: string
    booking_preference?: string
    booking_url?: string
    vibe_tags?: string
    plan_choice?: string
  }) => void
  onBack: () => void
}

export function ConfirmBusinessDetails({ business, smsOptInAvailable, trialConfig, onConfirm, onBack }: ConfirmBusinessDetailsProps) {
  // Plan choice state
  const [planChoice, setPlanChoice] = useState<'free' | 'trial'>('free')
  const tierDisplayName = (trialConfig?.trialTier || 'featured').charAt(0).toUpperCase() + (trialConfig?.trialTier || 'featured').slice(1)
  const trialDays = trialConfig?.trialDays || 30

  // Form state
  const [businessName, setBusinessName] = useState(business.name || '')
  const [address, setAddress] = useState(business.address || '')
  const [phone, setPhone] = useState(business.phone || '')
  const [website, setWebsite] = useState(business.website || '')
  const [category, setCategory] = useState(business.category || '')
  const [type, setType] = useState(business.type || '')
  const [description, setDescription] = useState(business.description || '')
  const [tagline, setTagline] = useState(business.tagline || '')
  const [hours, setHours] = useState(business.hours || '')
  
  // Hours confirmation state
  const [googleHoursCorrect, setGoogleHoursCorrect] = useState<boolean | null>(null)
  const [customHours, setCustomHours] = useState('')
  const [structuredHours, setStructuredHours] = useState<BusinessHoursStructured | null>(null)
  
  // SMS opt-in state (only relevant if smsOptInAvailable)
  const [smsOptIn, setSmsOptIn] = useState(false)
  const [phoneE164, setPhoneE164] = useState('')

  // Booking preference state
  const [bookingPreference, setBookingPreference] = useState('')
  const [bookingUrl, setBookingUrl] = useState('')

  // Vibe tags state
  const [selectedVibeTags, setSelectedVibeTags] = useState<string[]>([])
  const [customVibeTags, setCustomVibeTags] = useState<string[]>([])
  const [customVibeInput, setCustomVibeInput] = useState('')
  
  // Image upload state
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null)
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null)
  
  const logoInputRef = useRef<HTMLInputElement>(null)
  const heroImageInputRef = useRef<HTMLInputElement>(null)
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, logo: 'Please upload an image file' })
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, logo: 'Image must be less than 5MB' })
        return
      }
      
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
      setErrors({ ...errors, logo: '' })
    }
  }

  const handleHeroImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, heroImage: 'Please upload an image file' })
        return
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ ...errors, heroImage: 'Image must be less than 10MB' })
        return
      }
      
      setHeroImageFile(file)
      setHeroImagePreview(URL.createObjectURL(file))
      setErrors({ ...errors, heroImage: '' })
    }
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const removeHeroImage = () => {
    setHeroImageFile(null)
    setHeroImagePreview(null)
    if (heroImageInputRef.current) heroImageInputRef.current.value = ''
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!businessName.trim()) newErrors.businessName = 'Business name is required'
    if (!address.trim()) newErrors.address = 'Address is required'
    if (!category.trim()) newErrors.category = 'Category is required'
    if (!type.trim()) newErrors.type = 'Business type is required'
    
    // ✅ CRITICAL: Cover image is REQUIRED (logo is optional)
    if (!heroImageFile) {
      newErrors.heroImage = 'Cover image is required - this will be your business\'s main photo on QWIKKER'
    }
    
    // Optional but validate format if provided
    if (phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) {
      newErrors.phone = 'Invalid phone number format'
    }
    
    if (website && !website.startsWith('http')) {
      newErrors.website = 'Website must start with http:// or https://'
    }
    
    // Tagline validation (optional but has max length)
    if (tagline && tagline.length > 80) {
      newErrors.tagline = 'Tagline must be 80 characters or less'
    }

    // Booking URL validation
    if (bookingPreference === 'url' && bookingUrl && !bookingUrl.startsWith('http')) {
      newErrors.bookingUrl = 'Booking URL must start with http:// or https://'
    }
    
    // SMS opt-in validation
    if (smsOptIn && smsOptInAvailable) {
      if (!phoneE164.trim()) {
        newErrors.phoneE164 = 'Phone number is required for SMS updates'
      } else if (!/^\+[1-9]\d{1,14}$/.test(phoneE164.trim())) {
        newErrors.phoneE164 = 'Phone must be in E.164 format (e.g., +447700900123)'
      }
    }
    
    return newErrors
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      // Scroll to first error
      const firstErrorKey = Object.keys(newErrors)[0]
      document.getElementById(firstErrorKey)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    
    setErrors({})
    
    setIsSubmitting(true)
    
    onConfirm({
      business_name: businessName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      website: website.trim(),
      category: category.trim(),
      type: type.trim(),
      description: description.trim(),
      tagline: tagline.trim(),
      hours: googleHoursCorrect === false
        ? (structuredHours ? convertStructuredToText(structuredHours) : customHours.trim())
        : hours.trim(),
      logo: logoFile || undefined,
      heroImage: heroImageFile || undefined,
      // Include SMS opt-in data only if available and opted in
      sms_opt_in: smsOptInAvailable && smsOptIn,
      phone_e164: (smsOptInAvailable && smsOptIn) ? phoneE164.trim() : undefined,
      booking_preference: bookingPreference || undefined,
      booking_url: bookingPreference === 'url' ? bookingUrl.trim() : undefined,
      vibe_tags: (selectedVibeTags.length > 0 || customVibeTags.length > 0)
        ? JSON.stringify({ selected: selectedVibeTags, custom: customVibeTags })
        : undefined,
      plan_choice: planChoice,
    })
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4 text-neutral-400 hover:text-white hover:bg-white/[0.05]">
        ← Back
      </Button>

      <div className="relative">
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-[#00d083]/20 via-white/[0.06] to-transparent" />
        <Card className="relative bg-[#111315]/80 backdrop-blur-xl border-0 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <CardHeader className="px-8 pt-8">
            <div className="w-16 h-16 rounded-2xl bg-[#00d083]/10 border border-[#00d083]/20 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-[#00d083]" />
            </div>
            <CardTitle className="text-center text-xl text-white">Confirm Business Details</CardTitle>
            <CardDescription className="text-center text-neutral-500">
              Please review and update your business information. Add a logo and cover image to make your listing stand out.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Plan Choice */}
            {trialConfig && trialConfig.trialDays > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Choose your plan</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setPlanChoice('free')}
                    className={`relative rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                      planChoice === 'free'
                        ? 'border-2 border-[#00d083] bg-[#00d083]/5'
                        : 'border-2 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
                  >
                    {planChoice === 'free' && (
                      <div className="absolute top-3 right-3">
                        <Check className="w-5 h-5 text-[#00d083]" />
                      </div>
                    )}
                    <h4 className="font-bold text-lg mb-1">Free Listing</h4>
                    <p className="text-sm text-muted-foreground mb-3">Basic directory presence</p>
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        Listed in the directory
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        Basic business profile
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        Upgrade anytime
                      </li>
                    </ul>
                    <p className="mt-3 pt-2 border-t text-sm font-bold">Free forever</p>
                  </div>

                  <div
                    onClick={() => setPlanChoice('trial')}
                    className={`relative rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                      planChoice === 'trial'
                        ? 'border-2 border-[#00d083] bg-[#00d083]/5'
                        : 'border-2 border-blue-500/30 hover:border-blue-500/50'
                    }`}
                  >
                    <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2">
                      <span className="bg-[#00d083] text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full">RECOMMENDED</span>
                    </div>
                    {planChoice === 'trial' && (
                      <div className="absolute top-3 right-3">
                        <Check className="w-5 h-5 text-[#00d083]" />
                      </div>
                    )}
                    <h4 className="font-bold text-lg mb-1">Free Trial</h4>
                    <p className="text-sm text-muted-foreground mb-3">{tierDisplayName} plan for {trialDays} days</p>
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#00d083] flex-shrink-0" />
                        Full {tierDisplayName} tier access
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#00d083] flex-shrink-0" />
                        AI-powered discovery
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#00d083] flex-shrink-0" />
                        No card required
                      </li>
                    </ul>
                    <p className="mt-3 pt-2 border-t text-sm font-bold text-[#00d083]">FREE for {trialDays} days</p>
                  </div>
                </div>
              </div>
            )}

            {/* Divider */}
            {trialConfig && trialConfig.trialDays > 0 && <div className="border-t pt-2" />}
            
            {/* Logo Upload */}
            <div id="logo" className="space-y-2">
              <Label htmlFor="logo-input">Business Logo (Optional)</Label>
              <div className="flex items-start gap-4">
                {logoPreview ? (
                  <div className="relative w-32 h-32 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden">
                    <Image 
                      src={logoPreview} 
                      alt="Logo preview" 
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => logoInputRef.current?.click()}
                    className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-xs text-slate-500">Upload Logo</p>
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    <strong>Optional:</strong> Upload a square logo (recommended: 400x400px). Max size: 5MB.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Logos are not displayed on discover cards. Accepted formats: JPG, PNG, WebP
                  </p>
                  {errors.logo && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.logo}
                    </p>
                  )}
                </div>
              </div>
              <input
                ref={logoInputRef}
                id="logo-input"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>

            {/* Hero Image Upload */}
            <div id="heroImage" className="space-y-2">
              <Label htmlFor="heroImage-input" className="flex items-center gap-2">
                Cover Image *
                <span className="text-xs font-normal text-muted-foreground">(Required)</span>
              </Label>
              <div className="flex items-start gap-4">
                {heroImagePreview ? (
                  <div className="relative w-full h-48 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900">
                    <Image 
                      src={heroImagePreview} 
                      alt="Hero image preview" 
                      fill
                      className="object-contain"
                    />
                    <button
                      type="button"
                      onClick={removeHeroImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => heroImageInputRef.current?.click()}
                    className={`w-full h-48 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      errors.heroImage 
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20' 
                        : 'border-slate-300 dark:border-slate-700 hover:border-blue-500'
                    }`}
                  >
                    <Upload className="w-12 h-12 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">Upload Cover Image</p>
                    <p className="text-xs text-slate-400 mt-1">Recommended: 1200x600px</p>
                  </div>
                )}
              </div>
              {!heroImagePreview && (
                <p className="text-sm text-muted-foreground">
                  <strong>Required:</strong> Upload a high-quality cover image to showcase your business. This will be your main photo on QWIKKER. Max size: 10MB.
                </p>
              )}
              {errors.heroImage && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.heroImage}
                </p>
              )}
              <input
                ref={heroImageInputRef}
                id="heroImage-input"
                type="file"
                accept="image/*"
                onChange={handleHeroImageUpload}
                className="hidden"
              />
            </div>

            {/* Divider */}
            <div className="border-t pt-6" />

            {/* Business Name */}
            <div className="space-y-2" id="businessName">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value)
                  if (errors.businessName) setErrors({ ...errors, businessName: '' })
                }}
                placeholder="e.g., The Coffee Lab"
                className={errors.businessName ? 'border-destructive' : ''}
              />
              {errors.businessName && (
                <p className="text-sm text-destructive">{errors.businessName}</p>
              )}
            </div>

            {/* Tagline */}
            <div className="space-y-2" id="tagline">
              <Label htmlFor="tagline">Business Tagline</Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => {
                  setTagline(e.target.value)
                  if (errors.tagline) setErrors({ ...errors, tagline: '' })
                }}
                placeholder="e.g., Artisan coffee & fresh pastries daily"
                maxLength={80}
                className={errors.tagline ? 'border-destructive' : ''}
              />
              {errors.tagline && (
                <p className="text-sm text-destructive">{errors.tagline}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {tagline.length}/80 characters · This appears on your discover card
              </p>
            </div>

            {/* Address */}
            <div className="space-y-2" id="address">
              <Label htmlFor="address">Full Address *</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  if (errors.address) setErrors({ ...errors, address: '' })
                }}
                placeholder="123 High Street, Bournemouth, BH1 2AB"
                className={errors.address ? 'border-destructive' : ''}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address}</p>
              )}
            </div>

            {/* Phone & Website (Row) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2" id="phone">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    if (errors.phone) setErrors({ ...errors, phone: '' })
                  }}
                  placeholder="01202 123456"
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-2" id="website">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value)
                    if (errors.website) setErrors({ ...errors, website: '' })
                  }}
                  placeholder="https://www.example.com"
                  className={errors.website ? 'border-destructive' : ''}
                />
                {errors.website && (
                  <p className="text-sm text-destructive">{errors.website}</p>
                )}
              </div>
            </div>

            {/* Category & Type (Row) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2" id="category">
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value)
                    if (errors.category) setErrors({ ...errors, category: '' })
                  }}
                  placeholder="e.g., Cafe, Restaurant, Barber"
                  className={errors.category ? 'border-destructive' : ''}
                />
                {errors.category && (
                  <p className="text-sm text-destructive">{errors.category}</p>
                )}
              </div>

              <div className="space-y-2" id="type">
                <Label htmlFor="type">Business Type *</Label>
                <Input
                  id="type"
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value)
                    if (errors.type) setErrors({ ...errors, type: '' })
                  }}
                  placeholder="e.g., Coffee Shop, Italian"
                  className={errors.type ? 'border-destructive' : ''}
                />
                {errors.type && (
                  <p className="text-sm text-destructive">{errors.type}</p>
                )}
              </div>
            </div>

            {/* Opening Hours Confirmation */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Are these your opening hours?</Label>
              
              {/* Show Google hours if available */}
              {hours ? (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600" />
                    From Google Places
                  </p>
                  <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
                    {hours}
                  </pre>
                </div>
              ) : (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No hours found from Google Places
                  </p>
                </div>
              )}
              
              {/* Y/N Radio buttons */}
              <div className="space-y-2">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hoursCorrect"
                      checked={googleHoursCorrect === true}
                      onChange={() => setGoogleHoursCorrect(true)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Yes, these are correct</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hoursCorrect"
                      checked={googleHoursCorrect === false}
                      onChange={() => setGoogleHoursCorrect(false)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">No, I'll enter my own</span>
                  </label>
                </div>
              </div>
              
              {/* Show structured hours input if user selects No */}
              {googleHoursCorrect === false && (
                <div className="space-y-2">
                  <Label>Set your opening hours</Label>
                  <BusinessHoursInput
                    compact
                    value={structuredHours}
                    onChange={(hours) => setStructuredHours(hours)}
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Business Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell customers about your business, what makes you special, and what services you offer..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/500 characters (optional)
              </p>
            </div>

            {/* Booking Preference */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">How do customers book with you?</Label>
              <p className="text-sm text-muted-foreground">Optional — you can set this up later from your dashboard.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: 'url', label: 'Online booking link' },
                  { value: 'phone', label: 'Phone or email' },
                  { value: 'none', label: "We don't take bookings" },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setBookingPreference(option.value)}
                    className={`p-3 rounded-lg border text-sm text-left transition-colors ${
                      bookingPreference === option.value
                        ? 'border-primary bg-primary/10 font-medium'
                        : 'border-slate-300 dark:border-slate-700 text-muted-foreground hover:border-slate-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {bookingPreference === 'url' && (
                <div className="space-y-2" id="bookingUrl">
                  <Label htmlFor="bookingUrl">Booking Link</Label>
                  <Input
                    id="bookingUrl"
                    type="url"
                    value={bookingUrl}
                    onChange={(e) => {
                      setBookingUrl(e.target.value)
                      if (errors.bookingUrl) setErrors({ ...errors, bookingUrl: '' })
                    }}
                    placeholder="https://book.yoursystem.com/yourvenue"
                    className={errors.bookingUrl ? 'border-destructive' : ''}
                  />
                  {errors.bookingUrl && (
                    <p className="text-sm text-destructive">{errors.bookingUrl}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    OpenTable, Resy, DesignMyNight, or any booking page URL
                  </p>
                </div>
              )}

              {bookingPreference === 'phone' && (
                <p className="text-sm text-muted-foreground">
                  Your contact phone number from above will be used as the booking method.
                </p>
              )}
            </div>

            {/* Vibe Tags (optional) */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Describe your vibe (optional)</Label>
              <p className="text-sm text-muted-foreground">
                Help customers find you by selecting tags that describe your business. You can always change these later.
              </p>

              {VIBE_TAG_CATEGORIES.map(category => (
                <div key={category.id}>
                  <p className="text-sm font-medium mb-1.5">{category.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {category.tags.map(tag => {
                      const isSelected = selectedVibeTags.includes(tag.slug)
                      return (
                        <button
                          key={tag.slug}
                          type="button"
                          onClick={() =>
                            setSelectedVibeTags(prev =>
                              isSelected ? prev.filter(t => t !== tag.slug) : [...prev, tag.slug]
                            )
                          }
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'border-slate-300 dark:border-slate-700 text-muted-foreground hover:border-slate-400'
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
                <p className="text-sm font-medium mb-1.5">Custom tags</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {customVibeTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setCustomVibeTags(prev => prev.filter(t => t !== tag))}
                        className="ml-0.5 hover:text-purple-900 dark:hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {customVibeTags.length < MAX_CUSTOM_TAGS && (
                  <div className="flex gap-2">
                    <Input
                      value={customVibeInput}
                      onChange={(e) => setCustomVibeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const tag = customVibeInput.trim().toLowerCase()
                          if (tag && !customVibeTags.includes(tag)) {
                            setCustomVibeTags(prev => [...prev, tag])
                            setCustomVibeInput('')
                          }
                        }
                      }}
                      maxLength={MAX_CUSTOM_TAG_LENGTH}
                      placeholder="e.g., rooftop views"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const tag = customVibeInput.trim().toLowerCase()
                        if (tag && !customVibeTags.includes(tag)) {
                          setCustomVibeTags(prev => [...prev, tag])
                          setCustomVibeInput('')
                        }
                      }}
                      disabled={!customVibeInput.trim()}
                    >
                      Add
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{customVibeTags.length}/{MAX_CUSTOM_TAGS} custom tags</p>
              </div>
            </div>

            {/* SMS Opt-in (only shown if franchise has verified SMS) */}
            {smsOptInAvailable && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="smsOptIn"
                      checked={smsOptIn}
                      onChange={(e) => {
                        setSmsOptIn(e.target.checked)
                        if (!e.target.checked) {
                          // Clear phone if unchecked
                          setPhoneE164('')
                          setErrors({ ...errors, phoneE164: '' })
                        }
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="smsOptIn" className="text-sm cursor-pointer">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        Get SMS updates about this claim
                      </span>
                      <span className="block text-slate-600 dark:text-slate-400 mt-0.5">
                        Transactional only. Reply STOP to opt out.
                      </span>
                    </label>
                  </div>
                  
                  {smsOptIn && (
                    <div className="space-y-2 ml-7" id="phoneE164">
                      <Label htmlFor="phoneE164" className="text-sm">
                        Phone Number (E.164 format) *
                      </Label>
                      <Input
                        id="phoneE164"
                        type="tel"
                        value={phoneE164}
                        onChange={(e) => {
                          setPhoneE164(e.target.value)
                          if (errors.phoneE164) setErrors({ ...errors, phoneE164: '' })
                        }}
                        placeholder="+447700900123 or +12025551234"
                        className={errors.phoneE164 ? 'border-destructive' : ''}
                      />
                      {errors.phoneE164 && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.phoneE164}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Include country code (+ and digits only)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Google Places Info Banner */}
            {business.rating && (
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  From Google Places
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {business.rating && (
                    <span>⭐ {business.rating.toFixed(1)} rating</span>
                  )}
                  {business.reviewCount && (
                    <span>({business.reviewCount} reviews)</span>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              size="lg" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Processing...
                </>
              ) : (
                '✅ Confirm & Continue'
              )}
            </Button>

            <p className="text-xs text-center text-neutral-600">
              You&apos;ll create your account in the next step
            </p>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

