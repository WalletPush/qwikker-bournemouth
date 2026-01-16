'use client'

import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Building2, Upload, X, Check, AlertCircle } from 'lucide-react'
import Image from 'next/image'

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

interface ConfirmBusinessDetailsProps {
  business: BusinessData
  smsOptInAvailable: boolean
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
  }) => void
  onBack: () => void
}

export function ConfirmBusinessDetails({ business, smsOptInAvailable, onConfirm, onBack }: ConfirmBusinessDetailsProps) {
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
  
  // SMS opt-in state (only relevant if smsOptInAvailable)
  const [smsOptIn, setSmsOptIn] = useState(false)
  const [phoneE164, setPhoneE164] = useState('')
  
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
      hours: hours.trim(),
      logo: logoFile || undefined,
      heroImage: heroImageFile || undefined,
      // Include SMS opt-in data only if available and opted in
      sms_opt_in: smsOptInAvailable && smsOptIn,
      phone_e164: (smsOptInAvailable && smsOptIn) ? phoneE164.trim() : undefined
    })
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        ← Back
      </Button>

      <Card>
        <CardHeader>
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-center">Confirm Business Details</CardTitle>
          <CardDescription className="text-center">
            Please review and update your business information. Add a logo and cover image to make your listing stand out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
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
                  <div className="relative w-full h-48 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden">
                    <Image 
                      src={heroImagePreview} 
                      alt="Hero image preview" 
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeHeroImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
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

            {/* Opening Hours */}
            <div className="space-y-2">
              <Label htmlFor="hours">Opening Hours</Label>
              <Textarea
                id="hours"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Mon-Fri: 9am-5pm&#10;Sat: 10am-4pm&#10;Sun: Closed"
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Enter your opening hours (one line per day, or a summary)
              </p>
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

            <p className="text-xs text-center text-muted-foreground">
              You'll create your account in the next step
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

