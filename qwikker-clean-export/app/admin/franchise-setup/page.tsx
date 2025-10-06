import { Suspense } from 'react'
import { FranchiseSetupForm } from '@/components/admin/franchise-setup-form'

export default function FranchiseSetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Franchise CRM Setup
          </h1>
          <p className="text-slate-300">
            Configure CRM integration for new franchise locations
          </p>
        </div>
        
        <Suspense fallback={
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-[#00d083] border-t-transparent rounded-full" />
          </div>
        }>
          <FranchiseSetupForm />
        </Suspense>
      </div>
    </div>
  )
}
