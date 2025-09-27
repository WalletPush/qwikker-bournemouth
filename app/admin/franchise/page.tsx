import { createServiceRoleClient } from '@/lib/supabase/server'
import { FranchiseConfigManager } from '@/components/admin/franchise-config-manager'

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
        
        <FranchiseConfigManager 
          initialConfigs={franchiseConfigs || []} 
        />
      </div>
    </div>
  )
}
