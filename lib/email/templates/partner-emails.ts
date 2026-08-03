import { EmailTemplate } from '../email-service'
import { commercialCopy } from '@/lib/partners/commercial-copy'

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
    <div style="padding:32px 30px 24px;text-align:center;border-bottom:2px solid #00C46A;">
      <img src="${LOGO_URL}" alt="QWIKKER" style="height:40px;width:auto;display:block;margin:0 auto;border:0;" />
    </div>
    ${content}
    <div style="padding:24px 30px;text-align:center;border-top:1px solid #333;">
      <p style="font-size:12px;color:#666;margin:0;">QWIKKER &mdash; Territory Partners</p>
    </div>
  </div>
</body>
</html>`.trim()
}

export function createPartnerVerifyEmail(data: {
  full_name: string
  city_name: string
  verifyUrl: string
}): EmailTemplate {
  const subject = `Verify your email to continue — ${data.city_name}`
  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h1 style="font-size:24px;font-weight:700;margin:0 0 16px;color:#ffffff;">Confirm your email</h1>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 16px;">Hi ${data.full_name},</p>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 24px;">
        Please verify your email to submit your territory enquiry for <strong style="color:#fff;">${data.city_name}</strong>.
      </p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${data.verifyUrl}" style="display:inline-block;background:#00C46A;color:#050505;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:8px;">Verify email</a>
      </p>
      <p style="font-size:13px;line-height:1.6;color:#9ca3af;margin:0;">This link expires in 24 hours. If you did not request this, you can ignore this email.</p>
    </div>
  `)
  const text = `Hi ${data.full_name},\n\nVerify your email to continue your enquiry for ${data.city_name}:\n${data.verifyUrl}\n\nThis link expires in 24 hours.`
  return { subject, html, text }
}

export function createPartnerEnquiryReceivedEmail(data: {
  full_name: string
  city_name: string
}): EmailTemplate {
  const subject = `Territory enquiry received — ${data.city_name}`
  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h1 style="font-size:24px;font-weight:700;margin:0 0 16px;color:#ffffff;">Enquiry received</h1>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 16px;">Hi ${data.full_name},</p>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 16px;">
        Thanks for verifying your email. Your enquiry for <strong style="color:#fff;">${data.city_name}</strong> is with our team for review.
      </p>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 16px;">
        ${commercialCopy.slaReviewCopy}
      </p>
      <p style="font-size:14px;line-height:1.6;color:#9ca3af;margin:24px 0 0;">
        Questions? <a href="mailto:support@qwikker.com" style="color:#00C46A;text-decoration:none;">support@qwikker.com</a>
      </p>
    </div>
  `)
  const text = `Hi ${data.full_name},\n\nYour enquiry for ${data.city_name} is with our team.\n\n${commercialCopy.slaReviewCopy}`
  return { subject, html, text }
}

/** @deprecated Prefer createPartnerEnquiryReceivedEmail / createPartnerHoldApprovedEmail */
export function createPartnerClaimEmail(data: {
  full_name: string
  city_name: string
}): EmailTemplate {
  return createPartnerEnquiryReceivedEmail(data)
}

export function createPartnerHoldApprovedEmail(data: {
  full_name: string
  city_name: string
  expiresAt: string
}): EmailTemplate {
  const subject = `Territory held — ${data.city_name}`
  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h1 style="font-size:24px;font-weight:700;margin:0 0 16px;color:#ffffff;">Territory held</h1>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 16px;">Hi ${data.full_name},</p>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 16px;">
        <strong style="color:#fff;">${data.city_name}</strong> is now held for you while we complete onboarding.
      </p>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 16px;">
        ${commercialCopy.holdExplainer}
      </p>
      <div style="background:#111;border:1px solid #333;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="font-size:14px;color:#9ca3af;margin:0 0 8px;">Hold expires</p>
        <p style="font-size:16px;color:#ffffff;margin:0;font-weight:600;">${data.expiresAt}</p>
      </div>
    </div>
  `)
  const text = `Hi ${data.full_name},\n\n${data.city_name} is held for you until ${data.expiresAt}.\n\n${commercialCopy.holdExplainer}`
  return { subject, html, text }
}

export function createPartnerHoldExpiredEmail(data: {
  full_name: string
  city_name: string
}): EmailTemplate {
  const subject = `Territory hold expired — ${data.city_name}`
  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h1 style="font-size:24px;font-weight:700;margin:0 0 16px;color:#ffffff;">Hold expired</h1>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 16px;">Hi ${data.full_name},</p>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 16px;">
        Your hold on <strong style="color:#fff;">${data.city_name}</strong> has expired and the territory is available again for enquiry.
      </p>
    </div>
  `)
  const text = `Hi ${data.full_name},\n\nYour hold on ${data.city_name} has expired.`
  return { subject, html, text }
}

export function createPartnerWaitlistEmail(data: {
  full_name: string
  city_name: string
}): EmailTemplate {
  const subject = `You're on the waitlist for ${data.city_name}`
  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h1 style="font-size:24px;font-weight:700;margin:0 0 16px;color:#ffffff;">Waitlist confirmed</h1>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 16px;">Hi ${data.full_name},</p>
      <p style="font-size:16px;line-height:1.6;color:#d1d5db;margin:0 0 16px;">
        You&rsquo;ve been added to the waitlist for <strong style="color:#ffffff;">${data.city_name}</strong>. We&rsquo;ll notify you if this territory becomes available.
      </p>
    </div>
  `)
  const text = `Hi ${data.full_name},\n\nYou're on the waitlist for ${data.city_name}.`
  return { subject, html, text }
}

export function createPartnerHqEnquiryNotification(data: {
  full_name: string
  email: string
  city_name: string
  claimId: string
}): EmailTemplate {
  const subject = `[HQ] Territory enquiry — ${data.city_name}`
  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#ffffff;">New verified enquiry</h1>
      <p style="font-size:15px;line-height:1.6;color:#d1d5db;margin:0;">
        <strong>${data.city_name}</strong><br/>
        ${data.full_name} &lt;${data.email}&gt;<br/>
        Claim ID: ${data.claimId}
      </p>
    </div>
  `)
  const text = `New verified enquiry for ${data.city_name}: ${data.full_name} <${data.email}> (${data.claimId})`
  return { subject, html, text }
}
