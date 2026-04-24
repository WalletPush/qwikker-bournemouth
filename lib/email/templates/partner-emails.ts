import { EmailTemplate } from '../email-service'

const LOGO_URL = process.env.CLOUDINARY_LOGO_URL || 'https://res.cloudinary.com/dsh32kke7/image/upload/f_png,q_auto,w_320/v1768348190/Qwikker_Logo_web_lbql19.svg'

function wrapInLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QWIKKER</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;">
  <div style="max-width:600px;margin:0 auto;background:#1a1a1a;">

    <div style="padding:32px 30px 24px;text-align:center;border-bottom:2px solid #00d083;">
      <img src="${LOGO_URL}" alt="QWIKKER" style="height:40px;width:auto;display:block;margin:0 auto;border:0;" />
    </div>

    ${content}

    <div style="padding:24px 30px;text-align:center;border-top:1px solid #333;">
      <p style="font-size:12px;color:#666;margin:0;">QWIKKER &mdash; City Partnerships</p>
    </div>

  </div>
</body>
</html>`.trim()
}

export function createPartnerClaimEmail(data: {
  full_name: string
  city_name: string
}): EmailTemplate {
  const subject = `You've claimed ${data.city_name} on QWIKKER`

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h1 style="font-size:24px;font-weight:700;margin:0 0 16px;color:#ffffff;">
        City Claimed
      </h1>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 24px;">
        Hi ${data.full_name},
      </p>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 24px;">
        You&rsquo;ve successfully claimed <strong style="color:#ffffff;">${data.city_name}</strong> as your city on Qwikker. Your claim is held for 30 days.
      </p>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 24px;">
        A member of our team will be in touch within 48 hours to discuss next steps and walk you through the partner onboarding process.
      </p>
      <div style="background:#111;border:1px solid #333;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="font-size:14px;color:#9ca3af;margin:0 0 8px;">Your claim details</p>
        <p style="font-size:16px;color:#ffffff;margin:0;font-weight:600;">${data.city_name}</p>
        <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">Hold expires in 30 days</p>
      </div>
      <p style="font-size:14px;line-height:1.6;color:#9ca3af;margin:24px 0 0;">
        If you have any questions in the meantime, reply to this email.
      </p>
    </div>
  `)

  const text = `Hi ${data.full_name},\n\nYou've successfully claimed ${data.city_name} as your city on Qwikker. Your claim is held for 30 days.\n\nA member of our team will be in touch within 48 hours to discuss next steps.\n\nIf you have any questions, reply to this email.`

  return { subject, html, text }
}

export function createPartnerWaitlistEmail(data: {
  full_name: string
  city_name: string
}): EmailTemplate {
  const subject = `You're on the waitlist for ${data.city_name}`

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h1 style="font-size:24px;font-weight:700;margin:0 0 16px;color:#ffffff;">
        Waitlist Confirmed
      </h1>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 24px;">
        Hi ${data.full_name},
      </p>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 24px;">
        You&rsquo;ve been added to the waitlist for <strong style="color:#ffffff;">${data.city_name}</strong>. This city is currently claimed by another partner.
      </p>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 24px;">
        We&rsquo;ll notify you immediately if this city becomes available. In the meantime, if you&rsquo;d like to explore other cities, visit our partners page.
      </p>
      <p style="font-size:14px;line-height:1.6;color:#9ca3af;margin:24px 0 0;">
        If you have any questions, reply to this email.
      </p>
    </div>
  `)

  const text = `Hi ${data.full_name},\n\nYou've been added to the waitlist for ${data.city_name}. This city is currently claimed by another partner.\n\nWe'll notify you immediately if this city becomes available.\n\nIf you have any questions, reply to this email.`

  return { subject, html, text }
}
