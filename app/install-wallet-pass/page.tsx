import { ImprovedWalletInstaller } from '@/components/wallet-pass/improved-wallet-installer'

interface WalletInstallPageProps {
  searchParams: Promise<{
    firstName?: string
    lastName?: string
    email?: string
    city?: string
  }>
}

export default async function WalletInstallPage({ searchParams }: WalletInstallPageProps) {
  const params = await searchParams
  const { firstName, lastName, email, city } = params

  if (!firstName || !lastName || !email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Missing Information</h1>
          <p className="text-gray-400">Required user information is missing.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center text-white mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Qwikker!</h1>
          <p className="text-gray-400">
            Let's get your personalized wallet pass installed
          </p>
        </div>

        {/* Main Installer */}
        <ImprovedWalletInstaller
          firstName={firstName}
          lastName={lastName}
          email={email}
          city={city}
        />

        {/* Troubleshooting Section */}
        <div className="bg-slate-800/50 rounded-lg p-6 space-y-4">
          <h3 className="text-white font-semibold">Troubleshooting Tips</h3>
          
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start space-x-2">
              <span className="text-[#00d083] font-bold">iOS:</span>
              <span>Use Safari browser and ensure you're on WiFi (not cellular)</span>
            </div>
            
            <div className="flex items-start space-x-2">
              <span className="text-[#00d083] font-bold">Android:</span>
              <span>Use Chrome browser and enable downloads from unknown sources</span>
            </div>
            
            <div className="flex items-start space-x-2">
              <span className="text-[#00d083] font-bold">International:</span>
              <span>Download may take longer due to location. Please be patient.</span>
            </div>
            
            <div className="flex items-start space-x-2">
              <span className="text-[#00d083] font-bold">Corporate WiFi:</span>
              <span>Try switching to personal hotspot if download fails</span>
            </div>
          </div>
        </div>

        {/* Support Contact */}
        <div className="text-center text-gray-400 text-sm">
          Still having issues? Contact support at{' '}
          <a href="mailto:support@qwikker.com" className="text-[#00d083] hover:underline">
            support@qwikker.com
          </a>
        </div>
      </div>
    </div>
  )
}
