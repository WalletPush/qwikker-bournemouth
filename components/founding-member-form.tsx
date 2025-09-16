'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { uploadToCloudinary, sendToGoHighLevel } from '@/lib/integrations'
import { createOrUpdateProfile } from '@/lib/actions/profile-actions'

// Form validation schema
const formSchema = z.object({
  // Personal Information
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password confirmation is required'),
  
  // Business Information
  businessName: z.string().min(1, 'Business name is required'),
  businessType: z.string().min(1, 'Business type is required'),
  businessCategory: z.string().min(1, 'Business category is required'),
  businessAddress: z.string().min(1, 'Business address is required'),
  town: z.string().min(1, 'Town is required'),
  postcode: z.string().min(1, 'Postcode is required'),
  website: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  
  // Offer Information (optional)
  offerName: z.string().optional(),
  offerType: z.string().optional(),
  offerValue: z.string().optional(),
  claimAmount: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  terms: z.string().optional(),
  
  // Additional Information
  referralSource: z.string().optional(),
  goals: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type FormData = z.infer<typeof formSchema>

interface FileUpload {
  logo: File | null
  menu: File[]
  offer: File | null
}

const steps = [
  { id: 1, title: 'Personal Information', subtitle: "Let's start with your contact details" },
  { id: 2, title: 'Account Security', subtitle: 'Create a secure password for your account' },
  { id: 3, title: 'Business Information', subtitle: 'Tell us about your business' },
  { id: 4, title: 'Menu Upload?', subtitle: 'Would you like to upload your menu now?' },
  { id: 5, title: 'Menu & Price List', subtitle: 'Upload your menu or service price list (PDF files only)' },
  { id: 6, title: 'Create an Offer?', subtitle: 'Would you like to create your first offer now?' },
  { id: 7, title: 'QWIKKER Exclusive Offer', subtitle: 'Create your first customer offer' },
  { id: 8, title: 'Additional Information', subtitle: 'Help us serve you better' },
  { id: 9, title: 'Review Registration', subtitle: 'Please review your information before submitting' },
]

interface FoundingMemberFormProps {
  referralCode?: string | null
}

export function FoundingMemberForm({ referralCode }: FoundingMemberFormProps = {}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [files, setFiles] = useState<FileUpload>({ logo: null, menu: [], offer: null })
  const [showFounderPopup, setShowFounderPopup] = useState(false)
  const [optionalSteps, setOptionalSteps] = useState<{
    wantsMenuUpload: boolean | null
    wantsOfferCreation: boolean | null
  }>({
    wantsMenuUpload: null,
    wantsOfferCreation: null,
  })
  const router = useRouter()
  
  // Calculate dynamic step count based on optional steps
  const getEffectiveSteps = () => {
    const baseSteps = [1, 2, 3] // Personal, Security, Business
    const optionalConfirmSteps = []
    const actualSteps = []
    const finalSteps = [] // Additional Info, Review
    
    // Menu upload confirmation (step 4)
    optionalConfirmSteps.push(4)
    
    // Menu upload actual step (step 5) - only if user wants it
    if (optionalSteps.wantsMenuUpload === true) {
      actualSteps.push(5)
    }
    
    // Offer creation confirmation (step 6)
    optionalConfirmSteps.push(6)
    
    // Offer creation actual step (step 7) - only if user wants it
    if (optionalSteps.wantsOfferCreation === true) {
      actualSteps.push(7)
    }
    
    // Final steps (Additional Info = 8, Review = 9)
    finalSteps.push(8, 9)
    
    return [...baseSteps, ...optionalConfirmSteps, ...actualSteps, ...finalSteps]
  }
  
  const effectiveSteps = getEffectiveSteps()
  const totalSteps = effectiveSteps.length
  
  // Consistent input styling
  const inputClassName = "bg-slate-900 text-white border-slate-600 focus:border-[#00d083] focus:ring-1 focus:ring-[#00d083] placeholder:text-slate-400"
  const selectClassName = "bg-slate-900 text-white border-slate-600 focus:border-[#00d083] focus:ring-1 focus:ring-[#00d083] rounded-md"
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  })

  // Show founder popup after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFounderPopup(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fieldsToValidate)
    
    if (!isValid) return
    
    const nextStepNumber = getNextStep(currentStep)
    if (nextStepNumber) {
      setCurrentStep(nextStepNumber)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const prevStep = () => {
    const prevStepNumber = getPrevStep(currentStep)
    if (prevStepNumber) {
      setCurrentStep(prevStepNumber)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  
  const getNextStep = (current: number): number | null => {
    const currentIndex = effectiveSteps.indexOf(current)
    if (currentIndex >= 0 && currentIndex < effectiveSteps.length - 1) {
      return effectiveSteps[currentIndex + 1]
    }
    return null
  }
  
  const getPrevStep = (current: number): number | null => {
    const currentIndex = effectiveSteps.indexOf(current)
    if (currentIndex > 0) {
      return effectiveSteps[currentIndex - 1]
    }
    return null
  }
  
  const handleOptionalStepChoice = (stepType: 'menu' | 'offer', choice: boolean) => {
    if (stepType === 'menu') {
      setOptionalSteps(prev => ({ ...prev, wantsMenuUpload: choice }))
    } else if (stepType === 'offer') {
      setOptionalSteps(prev => ({ ...prev, wantsOfferCreation: choice }))
    }
    
    // Move to next step after choice
    setTimeout(() => {
      const nextStepNumber = getNextStep(currentStep)
      if (nextStepNumber) {
        setCurrentStep(nextStepNumber)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 100)
  }

  const getFieldsForStep = (step: number): (keyof FormData)[] => {
    switch (step) {
      case 1:
        return ['firstName', 'lastName', 'email', 'phone']
      case 2:
        return ['password', 'confirmPassword']
      case 3:
        return ['businessName', 'businessType', 'businessCategory', 'businessAddress', 'town', 'postcode']
      default:
        return []
    }
  }

  const handleFileUpload = (type: keyof FileUpload, file: File | File[]) => {
    setFiles(prev => ({
      ...prev,
      [type]: file
    }))
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    
    try {
      // Use the new server-side signup action
      const { createUserAndProfile } = await import('@/lib/actions/signup-actions')
      
      const result = await createUserAndProfile(data, files, referralCode)
      
      if (!result.success) {
        throw new Error(result.error || 'Signup failed')
      }

      // Send to external services (non-blocking)
      const externalData = {
        ...data,
        logo_url: result.profile?.logo || '',
        menuservice_url: '', // Will be handled in server action
        offer_image_url: result.profile?.offer_image || '',
        phone: normalizePhoneNumber(data.phone),
      }

      // Send to GHL (server-side notifications handled in signup-actions.ts)
      sendToGoHighLevel(externalData).catch(err => 
        console.error('GHL webhook failed:', err)
      )

      // Redirect to success page with email for auto-fill
      router.push(`/onboarding/success?email=${encodeURIComponent(data.email)}`)
      
    } catch (error) {
      console.error('Form submission error:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const normalizePhoneNumber = (phone: string): string => {
    const cleaned = phone.trim()
    if (cleaned.startsWith('0')) {
      return '+44' + cleaned.slice(1)
    }
    return cleaned
  }

  const currentStepIndex = effectiveSteps.indexOf(currentStep)
  const progressPercentage = currentStepIndex >= 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0

  return (
    <>
      {/* Founder Popup */}
      {showFounderPopup && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-slate-800 border-yellow-500/30 shadow-2xl">
            <CardHeader className="text-center">
              <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide mb-4">
                Limited Time Offer
              </div>
              <CardTitle className="text-2xl text-yellow-400">Founding Member Exclusive</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-gray-300 space-y-2">
                <p><strong>Get 16 months for the price of 10</strong> + <strong>20% OFF the Spotlight Plan for life</strong></p>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm">
                  <div className="text-yellow-400 font-semibold">Offer expires: January 20, 2026</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:from-yellow-500 hover:to-orange-600"
                  onClick={() => setShowFounderPopup(false)}
                >
                  Take Me to the Spotlight Plan
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  onClick={() => setShowFounderPopup(false)}
                >
                  Continue with Free Trial for Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Form */}
      <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            {/* QWIKKER Logo */}
            <div className="flex justify-center mb-6">
              <img 
                src="/Qwikker Logo web.svg" 
                alt="QWIKKER" 
                className="h-12 w-auto sm:h-16"
              />
            </div>
          <div className="text-xl text-gray-400">Business Registration</div>
          <div className="inline-block bg-[#00d083] text-black px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-wide">
            Invitation Only
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-4">
          <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-full transition-all duration-500 shadow-lg shadow-[#00d083]/30"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Step {currentStepIndex + 1} of {totalSteps}</span>
            <span>{steps[currentStep - 1]?.title}</span>
          </div>
        </div>

        {/* Form Card */}
        <Card className="bg-slate-800/90 border-slate-700 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              {steps[currentStep - 1]?.title}
            </CardTitle>
            <p className="text-gray-400 text-lg">{steps[currentStep - 1]?.subtitle}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        className={inputClassName}
                        {...form.register('firstName')}
                      />
                      {form.formState.errors.firstName && (
                        <p className="text-red-500 text-sm">{form.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="lastName"
                        placeholder="Smith"
                        className={inputClassName}
                        {...form.register('lastName')}
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-red-500 text-sm">{form.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@company.com"
                        className={inputClassName}
                        {...form.register('email')}
                      />
                      {form.formState.errors.email && (
                        <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
                      )}
                  </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+44 7890 123456"
                        className={inputClassName}
                        {...form.register('phone')}
                      />
                      {form.formState.errors.phone && (
                        <p className="text-red-500 text-sm">{form.formState.errors.phone.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Account Security */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <h3 className="text-blue-400 font-semibold">Account Security</h3>
                    </div>
                    <p className="text-blue-200 text-sm">Create a secure password to protect your QWIKKER dashboard and business data.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="password">Create Password <span className="text-red-500">*</span></Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter a secure password"
                        className={inputClassName}
                        {...form.register('password')}
                      />
                      {form.formState.errors.password && (
                        <p className="text-red-500 text-sm">{form.formState.errors.password.message}</p>
                      )}
                      <p className="text-gray-500 text-sm">Minimum 8 characters required</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-500">*</span></Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        className={inputClassName}
                        {...form.register('confirmPassword')}
                      />
                      {form.formState.errors.confirmPassword && (
                        <p className="text-red-500 text-sm">{form.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-800/60 border border-slate-600 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Password Requirements:</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${form.watch('password')?.length >= 8 ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                        At least 8 characters long
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${/[A-Z]/.test(form.watch('password') || '') ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                        Contains uppercase letter (recommended)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${/[0-9]/.test(form.watch('password') || '') ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                        Contains number (recommended)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${/[^A-Za-z0-9]/.test(form.watch('password') || '') ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                        Contains special character (recommended)
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Step 3: Business Information */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="businessName"
                        placeholder="Your Business Name"
                        className={inputClassName}
                        {...form.register('businessName')}
                      />
                      {form.formState.errors.businessName && (
                        <p className="text-red-500 text-sm">{form.formState.errors.businessName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type <span className="text-red-500">*</span></Label>
                      <select
                        id="businessType"
                        className={`w-full px-3 py-2 ${selectClassName}`}
                        {...form.register('businessType')}
                      >
                        <option value="">Select your business type</option>
                        <option value="Restaurant">Restaurant</option>
                        <option value="Cafe/Coffee Shop">Cafe/Coffee Shop</option>
                        <option value="Bar/Pub">Bar/Pub</option>
                        <option value="Dessert/Ice Cream">Dessert/Ice Cream</option>
                        <option value="Takeaway/Street Food">Takeaway/Street Food</option>
                        <option value="Salon/Spa">Salon/Spa</option>
                        <option value="Hairdresser/Barber">Hairdresser/Barber</option>
                        <option value="Tattoo/Piercing">Tattoo/Piercing</option>
                        <option value="Clothing/Fashion">Clothing/Fashion</option>
                        <option value="Gift Shop">Gift Shop</option>
                        <option value="Fitness/Gym">Fitness/Gym</option>
                        <option value="Sports/Outdoors">Sports/Outdoors</option>
                        <option value="Hotel/BnB">Hotel/BnB</option>
                        <option value="Venue/Event Space">Venue/Event Space</option>
                        <option value="Entertainment/Attractions">Entertainment/Attractions</option>
                        <option value="Professional Services">Professional Services</option>
                        <option value="Other">Other</option>
                      </select>
                      {form.formState.errors.businessType && (
                        <p className="text-red-500 text-sm">{form.formState.errors.businessType.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessCategory">What category would you say you fall into? <span className="text-red-500">*</span></Label>
                    <Input
                      id="businessCategory"
                      placeholder="e.g. Chinese Restaurant, Burger Bar, Hair Salon, Rock Climbing Centre"
                      className="bg-[#0a0a0a] border-gray-600 focus:border-[#00d083]"
                      {...form.register('businessCategory')}
                    />
                    <p className="text-gray-500 text-sm">Be specific - this helps customers find you</p>
                    {form.formState.errors.businessCategory && (
                      <p className="text-red-500 text-sm">{form.formState.errors.businessCategory.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessAddress">Business Address <span className="text-red-500">*</span></Label>
                    <Input
                      id="businessAddress"
                      placeholder="123 High Street, Your Town"
                      className="bg-[#0a0a0a] border-gray-600 focus:border-[#00d083]"
                      {...form.register('businessAddress')}
                    />
                    {form.formState.errors.businessAddress && (
                      <p className="text-red-500 text-sm">{form.formState.errors.businessAddress.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="town">Town/City <span className="text-red-500">*</span></Label>
                      <select
                        id="town"
                        className={`w-full px-3 py-2 ${selectClassName}`}
                        {...form.register('town')}
                      >
                        <option value="">Select town</option>
                        <option value="bournemouth">Bournemouth</option>
                        <option value="christchurch">Christchurch</option>
                        <option value="poole">Poole</option>
                        <option value="other">Other (please specify in notes)</option>
                      </select>
                      {form.formState.errors.town && (
                        <p className="text-red-500 text-sm">{form.formState.errors.town.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postcode">Postcode <span className="text-red-500">*</span></Label>
                      <Input
                        id="postcode"
                        placeholder="BH1 2AB"
                        className={inputClassName}
                        {...form.register('postcode')}
                      />
                      {form.formState.errors.postcode && (
                        <p className="text-red-500 text-sm">{form.formState.errors.postcode.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website URL</Label>
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://yourbusiness.com"
                        className={inputClassName}
                        {...form.register('website')}
                      />
                      <p className="text-gray-500 text-sm">We'll scan your website for business hours and information</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram Handle</Label>
                      <Input
                        id="instagram"
                        placeholder="@yourbusiness"
                        className={inputClassName}
                        {...form.register('instagram')}
                      />
                      <p className="text-gray-500 text-sm">For social media integration and promotion</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook Page</Label>
                      <Input
                        id="facebook"
                        type="url"
                        placeholder="https://facebook.com/yourbusiness"
                        className={inputClassName}
                        {...form.register('facebook')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Logo</Label>
                      <div 
                        className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-[#00d083] hover:bg-slate-800/50 transition-all duration-200"
                        onClick={() => document.getElementById('logoUpload')?.click()}
                      >
                        <div className="text-gray-400">
                          <div className="text-2xl mb-2">IMG</div>
                          <div className="font-medium">Upload your logo</div>
                          <div className="text-sm mt-1">PNG, JPG, SVG up to 5MB</div>
                        </div>
                      </div>
                      <input
                        id="logoUpload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('logo', e.target.files[0])}
                      />
                      {files.logo && (
                        <div className="flex items-center text-[#00d083] text-sm">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {files.logo.name}
                        </div>
                      )}
                      <p className="text-gray-500 text-sm">High resolution logo for best results</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Menu Upload Confirmation */}
              {currentStep === 4 && (
                <div className="space-y-6 text-center">
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-lg p-8 border border-slate-700">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[#00d083]/10 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Upload your menu?</h3>
                      <p className="text-gray-300 mb-6">
                        Would you like to upload your menu or price list now? This helps customers discover your offerings through AI recommendations.
                      </p>
                      <p className="text-sm text-gray-400 mb-6">
                        Don't worry - you can always upload it later in your dashboard
                      </p>
                      <div className="flex gap-4 justify-center">
                        <Button
                          type="button"
                          onClick={() => handleOptionalStepChoice('menu', true)}
                          className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white px-8"
                        >
                          Yes, upload now
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleOptionalStepChoice('menu', false)}
                          className="border-slate-600 text-white hover:bg-slate-800 px-8"
                        >
                          Skip for now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Menu Upload */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Menu or Service Price List</Label>
                    <div 
                      className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center cursor-pointer hover:border-[#00d083] hover:bg-slate-800/50 transition-all duration-200"
                      onClick={() => document.getElementById('menuUpload')?.click()}
                    >
                      <div className="text-gray-400">
                        <div className="text-3xl mb-3">PDF</div>
                        <div className="font-medium text-lg">Upload PDF files</div>
                        <div className="text-sm mt-2">PDF files only, up to 10MB each</div>
                      </div>
                    </div>
                    <input
                      id="menuUpload"
                      type="file"
                      accept=".pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && handleFileUpload('menu', Array.from(e.target.files))}
                    />
                    {files.menu.length > 0 && (
                      <div className="space-y-2">
                        {files.menu.map((file, index) => (
                          <div key={index} className="text-[#00d083] text-sm">
                            <div className="flex items-center text-[#00d083]">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-gray-500 text-sm">This will be added to the QWIKKER database and featured in AI chat responses</p>
                  </div>
                </div>
              )}

              {/* Step 6: Offer Creation Confirmation */}
              {currentStep === 6 && (
                <div className="space-y-6 text-center">
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-lg p-8 border border-slate-700">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[#00d083]/10 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Create your first offer?</h3>
                      <p className="text-gray-300 mb-6">
                        Would you like to create an exclusive offer for your customers? This helps attract new customers and boost sales.
                      </p>
                      <p className="text-sm text-gray-400 mb-6">
                        Don't worry - you can always create offers later in your dashboard
                      </p>
                      <div className="flex gap-4 justify-center">
                        <Button
                          type="button"
                          onClick={() => handleOptionalStepChoice('offer', true)}
                          className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white px-8"
                        >
                          Yes, create offer
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleOptionalStepChoice('offer', false)}
                          className="border-slate-600 text-white hover:bg-slate-800 px-8"
                        >
                          Skip for now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 7: Offer Creation */}
              {currentStep === 7 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="offerName">Offer Name</Label>
                    <Input
                      id="offerName"
                      placeholder="New Customer Welcome Offer"
                      className="bg-[#0a0a0a] border-gray-600 focus:border-[#00d083]"
                      {...form.register('offerName')}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="offerType">Offer Type</Label>
                      <select
                        id="offerType"
                        className={`w-full px-3 py-2 ${selectClassName}`}
                        {...form.register('offerType')}
                      >
                        <option value="">Select offer type</option>
                        <option value="percentage">Percentage Discount</option>
                        <option value="fixed">Fixed Amount Off</option>
                        <option value="bogo">Buy One Get One</option>
                        <option value="free-item">Free Item/Service</option>
                        <option value="bundle">Bundle Deal</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="offerValue">Offer Value</Label>
                      <Input
                        id="offerValue"
                        placeholder="20% or £10 or BOGO"
                        className={inputClassName}
                        {...form.register('offerValue')}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        className={inputClassName}
                        {...form.register('startDate')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        className={inputClassName}
                        {...form.register('endDate')}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="terms">Terms & Conditions</Label>
                    <textarea
                      id="terms"
                      rows={3}
                      placeholder="Valid for new customers only. Cannot be combined with other offers. Valid ID required..."
                      className={`w-full px-3 py-2 ${selectClassName} resize-vertical`}
                      {...form.register('terms')}
                    />
                    <p className="text-gray-500 text-sm">Clear terms help avoid confusion and disputes</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Offer Image (Optional)</Label>
                    <div 
                      className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-[#00d083] transition-colors"
                      onClick={() => document.getElementById('offerImage')?.click()}
                    >
                      <div className="text-gray-400">
                        <div className="text-2xl mb-2">IMG</div>
                        <div className="font-medium">Upload offer image</div>
                        <div className="text-sm mt-1">Leave blank - we'll create professional artwork</div>
                      </div>
                    </div>
                    <input
                      id="offerImage"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('offer', e.target.files[0])}
                    />
                    {files.offer && (
                      <div className="flex items-center text-[#00d083] text-sm">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {files.offer.name}
                      </div>
                    )}
                    <p className="text-gray-500 text-sm">Our design team will create stunning visuals if you don't upload one</p>
                  </div>
                </div>
              )}

              {/* Step 8: Additional Information */}
              {currentStep === 8 && (
                <div className="space-y-6">
                  {/* Show referral code if provided */}
                  {referralCode && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <div>
                          <p className="text-green-400 font-medium">Referral Code Applied!</p>
                          <p className="text-green-300 text-sm">Code: <span className="font-mono">{referralCode}</span></p>
                          <p className="text-green-300 text-sm">You're helping another business owner earn rewards!</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="referralSource">How did you hear about QWIKKER?</Label>
                    <select
                      id="referralSource"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-600 rounded-md focus:border-[#00d083] focus:ring-1 focus:ring-[#00d083] text-white"
                      {...form.register('referralSource')}
                    >
                      <option value="">Please select</option>
                      <option value="founding-member">Founding Member Invitation</option>
                      <option value="business-referral">Business Referral</option>
                      <option value="google-search">Google Search</option>
                      <option value="social-media">Social Media</option>
                      <option value="word-of-mouth">Word of Mouth</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goals">Primary Business Goals (Optional)</Label>
                    <textarea
                      id="goals"
                      rows={3}
                      placeholder="Increase foot traffic, attract new customers, improve customer retention, boost revenue..."
                      className={`w-full px-3 py-2 ${selectClassName} resize-vertical`}
                      {...form.register('goals')}
                    />
                    <p className="text-gray-500 text-sm">This helps us customize your QWIKKER experience</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <textarea
                      id="notes"
                      rows={2}
                      placeholder="Anything else you'd like us to know about your business?"
                      className={`w-full px-3 py-2 ${selectClassName} resize-vertical`}
                      {...form.register('notes')}
                    />
                  </div>
                </div>
              )}

              {/* Step 9: Review */}
              {currentStep === 9 && (
                <div className="space-y-6">
                  <div className="bg-slate-800/70 rounded-lg p-6 space-y-4 border border-slate-700">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-[#00d083]">Personal Information</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentStep(1)}
                        className="border-slate-600 text-gray-300 hover:bg-gray-800"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><span className="text-gray-400">Name:</span> {form.watch('firstName')} {form.watch('lastName')}</div>
                      <div><span className="text-gray-400">Email:</span> {form.watch('email')}</div>
                      <div><span className="text-gray-400">Phone:</span> {form.watch('phone')}</div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/70 rounded-lg p-6 space-y-4 border border-slate-700">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-[#00d083]">Business Information</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentStep(3)}
                        className="border-slate-600 text-gray-300 hover:bg-gray-800"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><span className="text-gray-400">Business:</span> {form.watch('businessName')}</div>
                      <div><span className="text-gray-400">Type:</span> {form.watch('businessType')}</div>
                      <div><span className="text-gray-400">Category:</span> {form.watch('businessCategory')}</div>
                      <div><span className="text-gray-400">Location:</span> {form.watch('town')}, {form.watch('postcode')}</div>
                      <div className="flex items-center">
                        <span className="text-gray-400 mr-2">Logo:</span> 
                        {files.logo ? (
                          <div className="flex items-center text-[#00d083]">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Uploaded
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-500">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Not uploaded
                          </div>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-400 mr-2">Menu:</span> 
                        {files.menu.length > 0 ? (
                          <div className="flex items-center text-[#00d083]">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {files.menu.length} file(s)
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-500">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Not uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Show menu upload section if user chose to upload */}
                  {optionalSteps.wantsMenuUpload && (
                    <div className="bg-slate-800/70 rounded-lg p-6 space-y-4 border border-slate-700">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-[#00d083]">Menu Upload</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentStep(5)}
                          className="border-slate-600 text-gray-300 hover:bg-gray-800"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Button>
                      </div>
                      <div className="text-sm">
                        <div className="flex items-center">
                          <span className="text-gray-400 mr-2">Files:</span> 
                          {files.menu.length > 0 ? (
                            <div className="flex items-center text-[#00d083]">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {files.menu.map(f => f.name).join(', ')}
                            </div>
                          ) : (
                            <span className="text-gray-500">No files uploaded</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {form.watch('offerName') && (
                    <div className="bg-slate-800/70 rounded-lg p-6 space-y-4 border border-slate-700">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-[#00d083]">Launch Offer</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentStep(7)}
                          className="border-slate-600 text-gray-300 hover:bg-gray-800"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><span className="text-gray-400">Offer:</span> {form.watch('offerName')}</div>
                        <div><span className="text-gray-400">Type:</span> {form.watch('offerType')}</div>
                        <div><span className="text-gray-400">Value:</span> {form.watch('offerValue')}</div>
                        <div className="flex items-center">
                          <span className="text-gray-400 mr-2">Image:</span> 
                          {files.offer ? (
                            <div className="flex items-center text-[#00d083]">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Uploaded
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-500">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Not uploaded
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {(form.watch('referralSource') || form.watch('notes')) && (
                    <div className="bg-slate-800/70 rounded-lg p-6 space-y-4 border border-slate-700">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-[#00d083]">Additional Information</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentStep(8)}
                          className="border-slate-600 text-gray-300 hover:bg-gray-800"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Button>
                      </div>
                      <div className="text-sm space-y-2">
                        {form.watch('referralSource') && (
                          <div><span className="text-gray-400">Referral Source:</span> {form.watch('referralSource')}</div>
                        )}
                        {form.watch('notes') && (
                          <div><span className="text-gray-400">Notes:</span> {form.watch('notes')}</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-900/70 border border-slate-600 rounded-lg p-6">
                    <p className="text-sm text-gray-400 mb-2"><strong>By clicking "Start Free Trial" below, you agree to:</strong></p>
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>• Our Terms of Service and Privacy Policy</p>
                      <p>• Receive important updates and notifications about your QWIKKER account</p>
                      <p>• Our team contacting you to help optimize your business offers</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              {/* Hide navigation buttons for confirmation steps */}
              {currentStep !== 4 && currentStep !== 6 && (
                <div className="flex gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    ← Previous
                  </Button>
                  {currentStep < 9 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="flex-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] to-[#00a05c] text-white font-semibold"
                    >
                      Continue →
                    </Button>
                  ) : (
                    <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] to-[#00a05c] text-white font-semibold"
                  >
                    {isSubmitting ? 'Starting Free Trial...' : 'Start Free Trial'}
                  </Button>
                )}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
