import { verifyUnsubToken } from '@/lib/email/unsub-token'
import { suppressEmail } from '@/lib/email/suppressions'
import type { SuppressionScope } from '@/lib/email/suppressions'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function UnsubPage({ params }: PageProps) {
  const { token } = await params
  const payload = verifyUnsubToken(token)

  if (!payload) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-semibold">Link invalid</h1>
          <p className="text-slate-400 text-sm">
            This unsubscribe link is invalid or expired. Contact hello@ for help.
          </p>
        </div>
      </main>
    )
  }

  const scope = (payload.scope || 'all_marketing') as SuppressionScope
  const result = await suppressEmail({
    city: payload.city,
    email: payload.email,
    businessId: payload.businessId,
    scope,
    reason: 'one_click_unsub',
    sourceSendId: payload.sendId,
  })

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-semibold">
          {result.ok ? 'You’re unsubscribed' : 'Something went wrong'}
        </h1>
        <p className="text-slate-400 text-sm">
          {result.ok
            ? `We’ve removed ${payload.email} from Qwikker ${payload.city} marketing emails.`
            : result.error || 'Please try again later or email support.'}
        </p>
        <p className="text-slate-500 text-xs">
          Transactional messages about your listing (approvals, security) may still be sent.
        </p>
      </div>
    </main>
  )
}
