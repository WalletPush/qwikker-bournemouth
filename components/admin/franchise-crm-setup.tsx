'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useElegantModal } from '@/components/ui/elegant-modal'
import { getFranchiseCRMConfigWithEnvOverrides, validateCRMConfig, FranchiseCRMConfig } from '@/lib/utils/franchise-crm-config'
import { FranchiseCity } from '@/lib/utils/city-detection'

interface FranchiseCRMSetupProps {
  city: FranchiseCity
  cityDisplayName: string
}

export function FranchiseCRMSetup({ city, cityDisplayName }: FranchiseCRMSetupProps) {
  const [config, setConfig] = useState<FranchiseCRMConfig | null>(null)
  const [validation, setValidation] = useState<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const { showSuccess, showError, showInfo, ModalComponent } = useElegantModal()

  useEffect(() => {
    loadCRMConfig()
  }, [city])

  const loadCRMConfig = () => {
    try {
      const crmConfig = getFranchiseCRMConfigWithEnvOverrides(city)
      const crmValidation = validateCRMConfig(city)
      
      setConfig(crmConfig)
      setValidation(crmValidation)
    } catch (error) {
      console.error('Failed to load CRM config:', error)
      showError('Configuration Error', 'Failed to load CRM configuration')
    } finally {
      setIsLoading(false)
    }
  }

  const testWebhookConnection = async (webhookUrl: string, type: 'signup' | 'update') => {
    try {
      const testData = {
        test: true,
        webhookType: type,
        franchise_city: city,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-[#00d083] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="text-center p-8">
        <p className="text-red-400">Failed to load CRM configuration</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${validation?.isValid ? 'bg-green-500' : 'bg-red-500'}`} />
            CRM Integration Status - {cityDisplayName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Validation Results */}
          {validation?.errors && validation.errors.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <h4 className="text-red-400 font-semibold mb-2">❌ Configuration Errors:</h4>
              <ul className="text-red-300 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {validation?.warnings && validation.warnings.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Configuration Warnings:</h4>
              <ul className="text-yellow-300 space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {validation?.isValid && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-green-400 font-semibold">✅ CRM Integration Active</h4>
              <p className="text-green-300">All systems are properly configured and operational.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">GoHighLevel Webhook Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Signup Webhook */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-slate-300 font-medium">Signup Webhook</h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => testWebhookConnection(config.ghl_webhook_url, 'signup')}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Test Connection
              </Button>
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <code className="text-sm text-slate-300 break-all">
                {config.ghl_webhook_url}
              </code>
            </div>
            <p className="text-sm text-slate-400">
              Used for new business signups. Triggers contact creation and notifications.
            </p>
          </div>

          {/* Update Webhook */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-slate-300 font-medium">Update Webhook</h4>
              {config.ghl_update_webhook_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testWebhookConnection(config.ghl_update_webhook_url!, 'update')}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Test Connection
                </Button>
              )}
            </div>
            <div className="bg-slate-900 rounded-lg p-3">
              <code className="text-sm text-slate-300 break-all">
                {config.ghl_update_webhook_url || 'Not configured - using main webhook'}
              </code>
            </div>
            <p className="text-sm text-slate-400">
              Used for contact updates. Should NOT trigger signup notifications.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Franchise Owner Info */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Franchise Owner Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
              <div className="bg-slate-900 rounded-lg p-3 text-slate-300">
                {config.franchise_owner.name}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <div className="bg-slate-900 rounded-lg p-3 text-slate-300">
                {config.franchise_owner.email}
              </div>
            </div>
            {config.franchise_owner.phone && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                <div className="bg-slate-900 rounded-lg p-3 text-slate-300">
                  {config.franchise_owner.phone}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Timezone</label>
              <div className="bg-slate-900 rounded-lg p-3 text-slate-300">
                {config.timezone}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Variable Instructions */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Environment Variable Override</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-300">
            You can override the default webhook URLs using environment variables:
          </p>
          <div className="bg-slate-900 rounded-lg p-4 space-y-2">
            <div className="text-sm text-slate-300">
              <code>{city.toUpperCase()}_GHL_WEBHOOK_URL</code> - Main signup webhook
            </div>
            <div className="text-sm text-slate-300">
              <code>{city.toUpperCase()}_GHL_UPDATE_WEBHOOK_URL</code> - Update webhook (optional)
            </div>
            <div className="text-sm text-slate-300">
              <code>{city.toUpperCase()}_SLACK_WEBHOOK_URL</code> - Slack notifications (optional)
            </div>
          </div>
          <p className="text-sm text-slate-400">
            Set these in your deployment environment or .env.local file to override the default configuration.
          </p>
        </CardContent>
      </Card>

      <ModalComponent />
    </div>
  )
}
