'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Building2, User, Mail, Phone, MapPin, Clock, FileText, Settings, Copy, CheckCircle } from 'lucide-react'
import { BUSINESS_TYPE_OPTIONS, BUSINESS_TOWN_OPTIONS, SUBSCRIPTION_PLAN_OPTIONS } from '@/types/profiles'

interface BusinessCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateBusiness: (businessData: any) => Promise<{ success: boolean; data?: any; error?: string }>
  city: string
}

interface BusinessFormData {
  businessName: string
  businessType: string
  businessCategory: string
  businessTown: string
  businessAddress: string
  businessPostcode: string
  contactEmail: string
  contactPhone: string
  firstName: string
  lastName: string
  businessHours: string
  businessDescription: string
  businessTagline: string
  plan: string
  autoApprove: boolean
}

const initialFormData: BusinessFormData = {
  businessName: '',
  businessType: '',
  businessCategory: '',
  businessTown: '',
  businessAddress: '',
  businessPostcode: '',
  contactEmail: '',
  contactPhone: '',
  firstName: '',
  lastName: '',
  businessHours: '',
  businessDescription: '',
  businessTagline: '',
  plan: 'starter',
  autoApprove: false
}

export function BusinessCreationModal({ isOpen, onClose, onCreateBusiness, city }: BusinessCreationModalProps) {
  const [formData, setFormData] = useState<BusinessFormData>(initialFormData)
  const [isCreating, setIsCreating] = useState(false)
  const [creationResult, setCreationResult] = useState<{
    success: boolean
    data?: any
    error?: string
  } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleInputChange = (field: keyof BusinessFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsCreating(true)
    setCreationResult(null)

    try {
      const result = await onCreateBusiness(formData)
      setCreationResult(result)
      
      if (result.success) {
        // Don't close modal immediately - show success with credentials
      }
    } catch (error) {
      console.error('Creation error:', error)
      setCreationResult({
        success: false,
        error: 'Failed to create business'
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      setFormData(initialFormData)
      setCreationResult(null)
      onClose()
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const isFormValid = formData.businessName && formData.businessType && formData.contactEmail

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Create New Business
          </DialogTitle>
        </DialogHeader>

        {creationResult?.success ? (
          // Success View
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-green-800">Business Created Successfully!</h3>
              </div>
              <p className="text-sm text-green-700">
                The business has been created and login credentials have been generated.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Business Details:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Business Name:</span>
                  <p className="text-gray-600">{creationResult.data.businessName}</p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                    creationResult.data.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {creationResult.data.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Login Credentials:</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Email:</span>
                    <p className="text-sm text-gray-600">{creationResult.data.contactEmail}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(creationResult.data.contactEmail, 'email')}
                  >
                    {copiedField === 'email' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Temporary Password:</span>
                    <p className="text-sm text-gray-600 font-mono">{creationResult.data.tempPassword}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(creationResult.data.tempPassword, 'password')}
                  >
                    {copiedField === 'password' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Login URL:</span>
                    <p className="text-sm text-gray-600">{creationResult.data.loginUrl}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(creationResult.data.loginUrl, 'url')}
                  >
                    {copiedField === 'url' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Important:</strong> Share these credentials securely with the business owner. 
                  They should change the password on first login.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        ) : (
          // Form View
          <form onSubmit={handleSubmit} className="space-y-6">
            {creationResult?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{creationResult.error}</p>
              </div>
            )}

            {/* Business Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4" />
                <h3 className="font-medium">Business Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    placeholder="Enter business name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="businessType">Business Type *</Label>
                  <Select value={formData.businessType} onValueChange={(value) => handleInputChange('businessType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="businessCategory">Category</Label>
                  <Input
                    id="businessCategory"
                    value={formData.businessCategory}
                    onChange={(e) => handleInputChange('businessCategory', e.target.value)}
                    placeholder="e.g., Italian Restaurant"
                  />
                </div>

                <div>
                  <Label htmlFor="businessTown">Town</Label>
                  <Select value={formData.businessTown} onValueChange={(value) => handleInputChange('businessTown', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select town" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TOWN_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="businessPostcode">Postcode</Label>
                  <Input
                    id="businessPostcode"
                    value={formData.businessPostcode}
                    onChange={(e) => handleInputChange('businessPostcode', e.target.value)}
                    placeholder="BH1 1AA"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="businessAddress">Address</Label>
                  <Input
                    id="businessAddress"
                    value={formData.businessAddress}
                    onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                    placeholder="Full business address"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4" />
                <h3 className="font-medium">Contact Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Contact first name"
                  />
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Contact last name"
                  />
                </div>

                <div>
                  <Label htmlFor="contactEmail">Email Address *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    placeholder="business@example.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contactPhone">Phone Number</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    placeholder="01202 123456"
                  />
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" />
                <h3 className="font-medium">Business Details</h3>
              </div>

              <div>
                <Label htmlFor="businessTagline">Tagline</Label>
                <Input
                  id="businessTagline"
                  value={formData.businessTagline}
                  onChange={(e) => handleInputChange('businessTagline', e.target.value)}
                  placeholder="Short catchy tagline"
                />
              </div>

              <div>
                <Label htmlFor="businessDescription">Description</Label>
                <Textarea
                  id="businessDescription"
                  value={formData.businessDescription}
                  onChange={(e) => handleInputChange('businessDescription', e.target.value)}
                  placeholder="Brief business description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="businessHours">Opening Hours</Label>
                <Textarea
                  id="businessHours"
                  value={formData.businessHours}
                  onChange={(e) => handleInputChange('businessHours', e.target.value)}
                  placeholder="Mon-Fri: 9am-5pm&#10;Sat: 10am-4pm&#10;Sun: Closed"
                  rows={3}
                />
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4" />
                <h3 className="font-medium">Settings</h3>
              </div>

              <div>
                <Label htmlFor="plan">Subscription Plan</Label>
                <Select value={formData.plan} onValueChange={(value) => handleInputChange('plan', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_PLAN_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoApprove"
                  checked={formData.autoApprove}
                  onCheckedChange={(checked) => handleInputChange('autoApprove', checked as boolean)}
                />
                <Label htmlFor="autoApprove" className="text-sm">
                  Auto-approve business (skip review process)
                </Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isCreating}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || isCreating}
                className="flex-1"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4 mr-2" />
                    Create Business
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
