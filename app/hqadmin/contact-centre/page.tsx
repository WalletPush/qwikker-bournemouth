import { HQContactCentreClient } from '@/components/hqadmin/hq-contact-centre-client'

export default function HQContactCentrePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Contact Centre</h1>
        <p className="text-slate-400 text-sm mt-1">Escalations and messages from City Admins</p>
      </div>
      <HQContactCentreClient />
    </div>
  )
}
