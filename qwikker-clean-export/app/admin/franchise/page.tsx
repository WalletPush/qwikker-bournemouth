import { createServiceRoleClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'

export default async function FranchiseConfigPage() {
  const supabase = createServiceRoleClient()
  
  // Get all franchise configurations
  const { data: franchiseConfigs, error } = await supabase
    .from('franchise_crm_configs')
    .select('*')
    .order('city')
  
  if (error) {
    console.error('Error fetching franchise configs:', error)
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Franchise Configuration Manager
          </h1>
          <p className="text-slate-400">
            Manage WalletPush API keys, GHL webhooks, and settings for each franchise location.
          </p>
        </div>
        
        <div className="grid gap-6">
          {franchiseConfigs?.map((config) => (
            <Card key={config.id} className="p-6 bg-slate-800 border-slate-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                {config.display_name} ({config.city})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">WalletPush API Key:</p>
                  <p className="text-white font-mono">
                    {config.walletpush_api_key ? '••••••••••••' : 'Not configured'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Template ID:</p>
                  <p className="text-white font-mono">
                    {config.walletpush_template_id || 'Not configured'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">GHL Webhook:</p>
                  <p className="text-white font-mono text-xs">
                    {config.ghl_webhook_url || 'Not configured'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Slack Webhook:</p>
                  <p className="text-white font-mono text-xs">
                    {config.slack_webhook_url || 'Not configured'}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
