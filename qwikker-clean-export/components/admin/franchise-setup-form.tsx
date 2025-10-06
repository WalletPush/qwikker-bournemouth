'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useElegantModal } from '@/components/ui/elegant-modal'

interface FranchiseFormData {
  city: string
  display_name: string
  subdomain: string
  ghl_webhook_url: string
  ghl_update_webhook_url: string
  slack_webhook_url: string
  slack_channel: string
  owner_name: string
  owner_email: string
  owner_phone: string
  timezone: string
}

export function FranchiseSetupForm() {
  const [formData, setFormData] = useState<FranchiseFormData>({
    city: '',
    display_name: '',
    subdomain: '',
    ghl_webhook_url: '',
    ghl_update_webhook_url: '',
    slack_webhook_url: '',
    slack_channel: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    timezone: 'UTC'
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showSuccess, showError, ModalComponent } = useElegantModal()

  const handleInputChange = (field: keyof FranchiseFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Auto-generate subdomain from city
    if (field === 'city') {
      const subdomain = value.toLowerCase().replace(/[^a-z0-9]/g, '-')
      setFormData(prev => ({
        ...prev,
        subdomain
      }))
    }
    
    // Auto-generate display name from city
    if (field === 'city') {
      const displayName = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
      setFormData(prev => ({
        ...prev,
        display_name: displayName
      }))
    }
  }

  const testWebhook = async (webhookUrl: string, type: 'signup' | 'update') => {
    if (!webhookUrl) {
      showError('Webhook Test Failed', 'Please enter a webhook URL first')
      return
    }

    try {
      const testData = {
        test: true,
        webhookType: type,
        franchise_city: formData.city,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@qwikker.com',
        businessName: 'Test Business',
        timestamp: new Date().toISOString()
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      })

      if (response.ok) {
        showSuccess('Webhook Test Successful', `${type} webhook is working correctly!`)
      } else {
        showError('Webhook Test Failed', `${type} webhook returned ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      showError('Webhook Test Error', `Failed to test ${type} webhook: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.city || !formData.ghl_webhook_url || !formData.owner_name || !formData.owner_email) {
      showError('Validation Error', 'Please fill in all required fields')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/admin/franchise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        showSuccess('Franchise Created Successfully', `${formData.display_name} has been added to the system. The subdomain ${formData.subdomain}.qwikker.com is now ready for deployment.`)
        
        // Reset form
        setFormData({
          city: '',
          display_name: '',
          subdomain: '',
          ghl_webhook_url: '',
          ghl_update_webhook_url: '',
          slack_webhook_url: '',
          slack_channel: '',
          owner_name: '',
          owner_email: '',
          owner_phone: '',
          timezone: 'UTC'
        })
      } else {
        showError('Creation Failed', result.error || 'Failed to create franchise')
      }
    } catch (error) {
      showError('Creation Error', 'An unexpected error occurred while creating the franchise')
    } finally {
      setIsSubmitting(false)
    }
  }

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'America/Edmonton',
    'America/Toronto',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Australia/Sydney'
  ]

  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Add New Franchise Location</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    City * <span className="text-red-400">Required</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
                    placeholder="Calgary"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Display Name</label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => handleInputChange('display_name', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
                    placeholder="Calgary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Subdomain</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.subdomain}
                    onChange={(e) => handleInputChange('subdomain', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
                    placeholder="calgary"
                  />
                  <span className="text-slate-400">.qwikker.com</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                <select
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* CRM Integration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">GoHighLevel Integration</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Main Webhook URL * <span className="text-red-400">Required</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.ghl_webhook_url}
                    onChange={(e) => handleInputChange('ghl_webhook_url', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
                    placeholder="https://services.leadconnectorhq.com/hooks/..."
                    required
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => testWebhook(formData.ghl_webhook_url, 'signup')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Test
                  </Button>
                </div>
                <p className="text-sm text-slate-400 mt-1">Used for new business signups</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Update Webhook URL (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.ghl_update_webhook_url}
                    onChange={(e) => handleInputChange('ghl_update_webhook_url', e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
                    placeholder="https://services.leadconnectorhq.com/hooks/..."
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => testWebhook(formData.ghl_update_webhook_url, 'update')}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!formData.ghl_update_webhook_url}
                  >
                    Test
                  </Button>
                </div>
                <p className="text-sm text-slate-400 mt-1">Used for contact updates (recommended separate webhook)</p>
              </div>
            </div>

            {/* Slack Integration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Slack Integration (Optional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Slack Webhook URL</label>
                  <input
                    type="url"
                    value={formData.slack_webhook_url}
                    onChange={(e) => handleInputChange('slack_webhook_url', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Slack Channel</label>
                  <input
                    type="text"
                    value={formData.slack_channel}
                    onChange={(e) => handleInputChange('slack_channel', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
                    placeholder="#qwikker-calgary"
                  />
                </div>
              </div>
            </div>

            {/* Franchise Owner */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Franchise Owner Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Owner Name * <span className="text-red-400">Required</span>
                  </label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => handleInputChange('owner_name', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
                    placeholder="John Smith"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Owner Email * <span className="text-red-400">Required</span>
                  </label>
                  <input
                    type="email"
                    value={formData.owner_email}
                    onChange={(e) => handleInputChange('owner_email', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
                    placeholder="john@calgary.qwikker.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Owner Phone</label>
                <input
                  type="tel"
                  value={formData.owner_phone}
                  onChange={(e) => handleInputChange('owner_phone', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-[#00d083]"
                  placeholder="+1 403 123 4567"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-6 border-t border-slate-700">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#00d083] hover:bg-[#00b86f] text-white py-3"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Creating Franchise...
                  </div>
                ) : (
                  'Create Franchise Location'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ModalComponent />
    </>
  )
}
