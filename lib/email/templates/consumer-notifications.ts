import { EmailTemplate } from '../email-service'

const LOGO_URL = process.env.CLOUDINARY_LOGO_URL || 'https://res.cloudinary.com/dsh32kke7/image/upload/f_png,q_auto,w_320/v1768348190/Qwikker_Logo_web_lbql19.svg'

/**
 * Shared dark premium email shell — identical to business-notifications layout.
 */
function wrapInLayout(content: string, city: string): string {
  const cityDisplay = city.charAt(0).toUpperCase() + city.slice(1)
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
      <p style="font-size:12px;color:#666;margin:0;">QWIKKER &mdash; ${cityDisplay}</p>
    </div>

  </div>
</body>
</html>`.trim()
}

export interface ConsumerWelcomeEmailData {
  firstName: string
  city: string
  dashboardUrl: string
  chatUrl: string
  offersUrl: string
  supportEmail: string
}

export function createConsumerWelcomeEmail(data: ConsumerWelcomeEmailData): EmailTemplate {
  const cityDisplay = data.city.charAt(0).toUpperCase() + data.city.slice(1)
  const subject = `Welcome to QWIKKER ${cityDisplay}, ${data.firstName}`

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">You're in.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Hi ${data.firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Your QWIKKER pass for <strong style="color:#fff;">${cityDisplay}</strong> is set up. Here's what you've unlocked:</p>

      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:24px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;font-size:14px;color:#ccc;vertical-align:top;">
              <span style="color:#00d083;font-weight:600;">AI Companion</span><br>
              <span style="color:#999;font-size:13px;">Ask for recommendations, find what's open, discover hidden gems</span>
            </td>
          </tr>
          <tr><td style="padding:0;"><div style="border-top:1px solid #333;margin:4px 0;"></div></td></tr>
          <tr>
            <td style="padding:8px 0;font-size:14px;color:#ccc;vertical-align:top;">
              <span style="color:#00d083;font-weight:600;">Exclusive Offers</span><br>
              <span style="color:#999;font-size:13px;">Deals from local businesses you won't find anywhere else</span>
            </td>
          </tr>
          <tr><td style="padding:0;"><div style="border-top:1px solid #333;margin:4px 0;"></div></td></tr>
          <tr>
            <td style="padding:8px 0;font-size:14px;color:#ccc;vertical-align:top;">
              <span style="color:#00d083;font-weight:600;">Secret Menus</span><br>
              <span style="color:#999;font-size:13px;">Off-menu items only QWIKKER members can access</span>
            </td>
          </tr>
          <tr><td style="padding:0;"><div style="border-top:1px solid #333;margin:4px 0;"></div></td></tr>
          <tr>
            <td style="padding:8px 0;font-size:14px;color:#ccc;vertical-align:top;">
              <span style="color:#00d083;font-weight:600;">Loyalty Rewards</span><br>
              <span style="color:#999;font-size:13px;">Earn points and unlock rewards at your favourite spots</span>
            </td>
          </tr>
        </table>
      </div>

      <div style="margin:24px 0 8px;text-align:center;">
        <a href="${data.dashboardUrl}" style="display:inline-block;background:#00d083;color:#000000;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Open Your Dashboard</a>
      </div>

      <div style="margin:12px 0 24px;text-align:center;">
        <a href="${data.chatUrl}" style="color:#00d083;font-size:13px;text-decoration:underline;">Talk to the AI</a>
        <span style="color:#444;margin:0 8px;">|</span>
        <a href="${data.offersUrl}" style="color:#00d083;font-size:13px;text-decoration:underline;">Browse Offers</a>
      </div>

      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:18px;margin:0 0 24px;">
        <p style="font-size:13px;font-weight:600;color:#ffffff;margin:0 0 10px;">Access your dashboard any time from your wallet pass:</p>
        <p style="font-size:13px;line-height:1.8;color:#999;margin:0 0 6px;"><strong style="color:#ccc;">iPhone:</strong> Open the Wallet app, tap your QWIKKER pass, then tap the info icon <span style="color:#ccc;">(i)</span> to view your personalised links.</p>
        <p style="font-size:13px;line-height:1.8;color:#999;margin:0;"><strong style="color:#ccc;">Android:</strong> Open Google Wallet, tap your QWIKKER pass, then tap the three-dot menu to view your personalised links.</p>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER Team</p>
    </div>`, data.city)

  const text = `Welcome to QWIKKER ${cityDisplay}, ${data.firstName}\n\nYour pass is set up. Here's what you've unlocked:\n\n- AI Companion: Ask for recommendations and discover hidden gems\n- Exclusive Offers: Deals from local businesses\n- Secret Menus: Off-menu items only QWIKKER members can access\n- Loyalty Rewards: Earn points at your favourite spots\n\nDashboard: ${data.dashboardUrl}\nAI Chat: ${data.chatUrl}\nOffers: ${data.offersUrl}\n\nAccess your dashboard any time from your wallet pass:\n- iPhone: Open the Wallet app, tap your QWIKKER pass, then tap the info icon (i) to view your personalised links.\n- Android: Open Google Wallet, tap your QWIKKER pass, then tap the three-dot menu to view your personalised links.\n\nBest,\nThe QWIKKER Team`

  return { subject, html, text }
}
