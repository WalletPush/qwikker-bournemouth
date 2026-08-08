import { createAdminClient } from '@/lib/supabase/admin'

export async function isCityEmailConfigured(city: string): Promise<{
  configured: boolean
  fromEmail: string | null
  fromName: string | null
}> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('franchise_crm_configs')
      .select('resend_api_key, resend_from_email, resend_from_name')
      .eq('city', city.toLowerCase())
      .maybeSingle()

    const configured = Boolean(data?.resend_api_key && data?.resend_from_email)
    return {
      configured,
      fromEmail: configured ? `no-reply@${city.toLowerCase()}.qwikker.com` : null,
      fromName: data?.resend_from_name || (configured ? 'QWIKKER' : null),
    }
  } catch {
    return { configured: false, fromEmail: null, fromName: null }
  }
}
