import { NextRequest, NextResponse } from 'next/server'
import { requireCityAdmin } from '@/lib/email/admin-email-auth'
import { getSuiteManualTemplates } from '@/lib/email/suite-template-catalog'

export async function GET(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // Only ops-facing templates — system receipts stay out of the picker
  return NextResponse.json({ templates: getSuiteManualTemplates() })
}
