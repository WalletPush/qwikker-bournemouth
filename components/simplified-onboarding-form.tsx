'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

// Simplified validation schema - only essential fields
const formSchema = z.object({
  // Business Information (Step 1)
  businessName: z.string().min(1, 'Business name is required'),
  
  // Business Type & Category (Step 2)  
  businessType: z.string().min(1, 'Business type is required'),
  businessCategory: z.string().min(1, 'Business category is required'),
  
  // Address (Step 3)
  businessAddress: z.string().min(1, 'Business address is required'),
  town: z.string().min(1, 'Town is required'),
  postcode: z.string().min(1, 'Postcode is required'),
  
  // Personal Information (Step 4)
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone number is required'),
  
  // Password (Step 5)
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don&apos;t match",
  path: ["confirmPassword"],
})

type FormData = z.infer<typeof formSchema>

const steps = [
  { 
    id: 1, 
    title: 'What\'s your business name?', 
    subtitle: 'This will be displayed to customers',
    icon: (
      <svg className="w-16 h-16 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  { 
    id: 2, 
    title: 'What type of business?', 
    subtitle: 'Help customers find you in the right category',
    icon: (
      <svg className="w-16 h-16 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    )
  },
  { 
    id: 3, 
    title: 'Where are you located?', 
    subtitle: 'We\'ll help customers find your exact location',
    icon: (
      <svg className="w-16 h-16 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  { 
    id: 4, 
    title: 'Your contact details', 
    subtitle: 'So we can keep you updated about your business',
    icon: (
      <svg className="w-16 h-16 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  },
  { 
    id: 5, 
    title: 'Create your password', 
    subtitle: 'Secure access to your business dashboard',
    icon: (
      <svg className="w-16 h-16 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )
  },
]

interface SimplifiedOnboardingFormProps {
  referralCode?: string | null
}

export function SimplifiedOnboardingForm({ referralCode }: SimplifiedOnboardingFormProps = {}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const router = useRouter()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  })

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fieldsToValidate)
    
    if (!isValid) return
    
    if (currentStep < steps.length) {
      setDirection('forward')
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setDirection('backward')
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const getFieldsForStep = (step: number): (keyof FormData)[] => {
    switch (step) {
      case 1:
        return ['businessName']
      case 2:
        return ['businessType', 'businessCategory']
      case 3:
        return ['businessAddress', 'town', 'postcode']
      case 4:
        return ['firstName', 'lastName', 'email', 'phone']
      case 5:
        return ['password', 'confirmPassword']
      default:
        return []
    }
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    
    try {
      // Use the existing signup action but with simplified data
      const { createUserAndProfile } = await import('@/lib/actions/signup-actions')
      
      // Map simplified form to existing structure
      const fullFormData = {
        ...data,
        // Set optional fields to empty - they'll become "recommended" actions
        website: '',
        instagram: '',
        facebook: '',
        offerName: '',
        offerType: '',
        offerValue: '',
        claimAmount: '',
        startDate: '',
        endDate: '',
        terms: '',
        referralSource: '',
        goals: '',
        notes: referralCode ? `Referral code: ${referralCode}` : '',
      }
      
      const files = { logo: null, menu: [], offer: null }
      
      const urlParams = new URLSearchParams(window.location.search)
      const urlLocation = urlParams.get('location')
      
      const result = await createUserAndProfile(fullFormData, files, referralCode, urlLocation || undefined)
      
      if (!result.success) {
        throw new Error(result.error || 'Signup failed')
      }

      // Send to external services (non-blocking) - CRITICAL FOR GHL CONTACT CREATION
      const { sendToGoHighLevel } = await import('@/lib/integrations-secure')
      
      const normalizePhoneNumber = (phone: string): string => {
        const cleaned = phone.trim()
        if (cleaned.startsWith('0')) {
          return '+44' + cleaned.slice(1)
        }
        return cleaned
      }
      
      const externalData = {
        ...fullFormData,
        logo_url: result.profile?.logo || '',
        menuservice_url: '', // Will be handled in server action
        offer_image_url: result.profile?.offer_image || '',
        phone: normalizePhoneNumber(data.phone),
      }

      // Send to franchise-specific GHL (server-side notifications handled in signup-actions.ts)
      sendToGoHighLevel(externalData, result.profile?.city).then(() => {
        console.log('✅ GHL webhook successful for:', result.profile?.city)
      }).catch(err => {
        console.error('❌ GHL webhook failed for:', result.profile?.city, err)
        // Don't block the user flow, but log the error
      })

      // Handle redirect based on auto-login result
      if (result.redirectTo) {
        console.log('🚀 Redirecting to:', result.redirectTo)
        router.push(result.redirectTo)
      } else {
        // Fallback to success page
        router.push(`/onboarding/success?email=${encodeURIComponent(data.email)}`)
      }
      
    } catch (error) {
      console.error('Form submission error:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressPercentage = (currentStep / steps.length) * 100
  const currentStepData = steps[currentStep - 1]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="text-center space-y-6 mb-12">
          {/* QWIKKER Logo */}
          <div className="flex justify-center">
            <img 
              src="/qwikker-logo-web.svg" 
              alt="QWIKKER" 
              className="h-12 w-auto animate-fade-in-down"
            />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Join QWIKKER
            </h1>
            <div className="inline-block bg-[#00d083] text-black px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-wide">
              Invitation Only
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-4 mb-8">
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#00d083] to-[#00b86f] rounded-full transition-all duration-700 ease-out shadow-lg shadow-[#00d083]/30"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Step {currentStep} of {steps.length}</span>
            <span>{Math.round(progressPercentage)}% Complete</span>
          </div>
        </div>

        {/* Main Card */}
        <Card className="bg-slate-800/90 border-slate-700 backdrop-blur-sm shadow-2xl overflow-hidden">
          <CardContent className="p-0">
            {/* Step Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-8 text-center">
              <div className="mb-6 flex justify-center">
                {currentStepData.icon}
              </div>
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {currentStepData.title}
              </h2>
              <p className="text-gray-400 text-lg">
                {currentStepData.subtitle}
              </p>
            </div>

            {/* Form Content */}
            <div className="p-8">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Step 1: Business Name */}
                {currentStep === 1 && (
                  <div className={`space-y-6 animate-slide-in-${direction}`}>
                    <div className="space-y-2">
                      <Label htmlFor="businessName" className="text-lg font-medium">
                        Business Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="businessName"
                        placeholder="Enter your business name"
                        className="h-14 text-lg bg-slate-900 border-slate-600 focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all"
                        {...form.register('businessName')}
                      />
                      {form.formState.errors.businessName && (
                        <p className="text-red-500 text-sm animate-shake">
                          {form.formState.errors.businessName.message}
                        </p>
                      )}
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <h3 className="text-blue-400 font-medium">Quick Tip</h3>
                      </div>
                      <p className="text-blue-200 text-sm">
                        Use the exact name customers know you by. This will appear on your QWIKKER profile and in search results.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Business Type & Category */}
                {currentStep === 2 && (
                  <div className={`space-y-6 animate-slide-in-${direction}`}>
                    <div className="grid gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="businessType" className="text-lg font-medium">
                          Business Type <span className="text-red-500">*</span>
                        </Label>
                        <select
                          id="businessType"
                          className="w-full h-14 px-4 text-lg bg-slate-900 border-slate-600 rounded-lg focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all"
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
                          <p className="text-red-500 text-sm animate-shake">
                            {form.formState.errors.businessType.message}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="businessCategory" className="text-lg font-medium">
                          Specific Category <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="businessCategory"
                          placeholder="e.g. Italian Restaurant, Hair Salon, Rock Climbing Centre"
                          className="h-14 text-lg bg-slate-900 border-slate-600 focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all"
                          {...form.register('businessCategory')}
                        />
                        <p className="text-gray-500 text-sm">Be specific - this helps customers find exactly what they're looking for</p>
                        {form.formState.errors.businessCategory && (
                          <p className="text-red-500 text-sm animate-shake">
                            {form.formState.errors.businessCategory.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Address */}
                {currentStep === 3 && (
                  <div className={`space-y-6 animate-slide-in-${direction}`}>
                    <div className="space-y-2">
                      <Label htmlFor="businessAddress" className="text-lg font-medium">
                        Business Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="businessAddress"
                        placeholder="Start typing your address..."
                        className="h-14 text-lg bg-slate-900 border-slate-600 focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all"
                        {...form.register('businessAddress')}
                      />
                      {form.formState.errors.businessAddress && (
                        <p className="text-red-500 text-sm animate-shake">
                          {form.formState.errors.businessAddress.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="town" className="text-lg font-medium">
                          Town/City <span className="text-red-500">*</span>
                        </Label>
                        <select
                          id="town"
                          className="w-full h-14 px-4 text-lg bg-slate-900 border-slate-600 rounded-lg focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all"
                          {...form.register('town')}
                        >
                          <option value="">Select town</option>
                          <option value="bournemouth">Bournemouth</option>
                          <option value="christchurch">Christchurch</option>
                          <option value="poole">Poole</option>
                          <option value="other">Other</option>
                        </select>
                        {form.formState.errors.town && (
                          <p className="text-red-500 text-sm animate-shake">
                            {form.formState.errors.town.message}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="postcode" className="text-lg font-medium">
                          Postcode <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="postcode"
                          placeholder="BH1 2AB"
                          className="h-14 text-lg bg-slate-900 border-slate-600 focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all"
                          {...form.register('postcode')}
                        />
                        {form.formState.errors.postcode && (
                          <p className="text-red-500 text-sm animate-shake">
                            {form.formState.errors.postcode.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        <h3 className="text-green-400 font-medium">Coming Soon</h3>
                      </div>
                      <p className="text-green-200 text-sm">
                        Google Places integration will auto-complete your address as you type!
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 4: Personal Information */}
                {currentStep === 4 && (
                  <div className={`space-y-6 animate-slide-in-${direction}`}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-lg font-medium">
                          First Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          className="h-14 text-lg bg-slate-900 border-slate-600 focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all"
                          {...form.register('firstName')}
                        />
                        {form.formState.errors.firstName && (
                          <p className="text-red-500 text-sm animate-shake">
                            {form.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-lg font-medium">
                          Last Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="lastName"
                          placeholder="Smith"
                          className="h-14 text-lg bg-slate-900 border-slate-600 focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all"
                          {...form.register('lastName')}
                        />
                        {form.formState.errors.lastName && (
                          <p className="text-red-500 text-sm animate-shake">
                            {form.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-lg font-medium">
                        Email Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@yourbusiness.com"
                        className="h-14 text-lg bg-slate-900 border-slate-600 focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all"
                        {...form.register('email')}
                      />
                      {form.formState.errors.email && (
                        <p className="text-red-500 text-sm animate-shake">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-lg font-medium">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+44 7890 123456"
                        className="h-14 text-lg bg-slate-900 border-slate-600 focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all"
                        {...form.register('phone')}
                      />
                      {form.formState.errors.phone && (
                        <p className="text-red-500 text-sm animate-shake">
                          {form.formState.errors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 5: Password */}
                {currentStep === 5 && (
                  <div className={`space-y-6 animate-slide-in-${direction}`}>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-lg font-medium">
                        Create Password <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter a secure password"
                        className="h-14 text-lg bg-slate-900 border-slate-600 focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all"
                        {...form.register('password')}
                      />
                      {form.formState.errors.password && (
                        <p className="text-red-500 text-sm animate-shake">
                          {form.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-lg font-medium">
                        Confirm Password <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        className="h-14 text-lg bg-slate-900 border-slate-600 focus:border-[#00d083] focus:ring-2 focus:ring-[#00d083]/20 transition-all"
                        {...form.register('confirmPassword')}
                      />
                      {form.formState.errors.confirmPassword && (
                        <p className="text-red-500 text-sm animate-shake">
                          {form.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    {/* Password Strength Indicator */}
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <h4 className="text-white font-medium mb-3">Password Requirements:</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${form.watch('password')?.length >= 8 ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                          <span className="text-sm text-gray-400">At least 8 characters</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${/[A-Z]/.test(form.watch('password') || '') ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                          <span className="text-sm text-gray-400">Contains uppercase letter (recommended)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${/[0-9]/.test(form.watch('password') || '') ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                          <span className="text-sm text-gray-400">Contains number (recommended)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-4 pt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="border-slate-600 text-gray-300 hover:bg-slate-800 h-12 px-8"
                  >
                    ← Previous
                  </Button>
                  
                  {currentStep < steps.length ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="flex-1 h-12 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white font-semibold text-lg"
                    >
                      Continue →
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 h-12 bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white font-semibold text-lg"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Create My Account
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Final Step Message */}
                {currentStep === 5 && (
                  <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-lg p-6 mt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-green-400 font-semibold text-lg">Almost there!</h3>
                    </div>
                    <p className="text-green-200 mb-2">
                      Once you create your account, you'll be able to access your business dashboard to complete your profile.
                    </p>
                    <p className="text-green-300 text-sm">
                      <strong>Next steps:</strong> Add your logo, business hours, description, and photos to go live!
                    </p>
                  </div>
                )}

              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
