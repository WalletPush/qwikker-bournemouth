import { EmailTemplate } from '../email-service'

const LOGO_URL = process.env.CLOUDINARY_LOGO_URL || 'https://res.cloudinary.com/dsh32kke7/image/upload/f_png,q_auto,w_320/v1768348190/Qwikker_Logo_web_lbql19.svg'

/**
 * Shared dark premium email shell — fully inline-styled for Gmail compatibility.
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

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface BusinessApprovalEmailData {
  firstName: string
  businessName: string
  city: string
  dashboardUrl: string
  supportEmail: string
}

export interface OfferApprovalEmailData {
  firstName: string
  businessName: string
  offerName: string
  offerValue: string
  city: string
  dashboardUrl: string
}

export interface MenuApprovalEmailData {
  firstName: string
  businessName: string
  menuName: string
  menuType: string
  city: string
  dashboardUrl: string
}

export interface BusinessRejectionEmailData {
  firstName: string
  businessName: string
  rejectionReason?: string
  city: string
  supportEmail: string
}

export interface EventApprovalEmailData {
  firstName: string
  businessName: string
  eventName: string
  city: string
  dashboardUrl: string
}

export interface SecretMenuApprovalEmailData {
  firstName: string
  businessName: string
  itemName: string
  city: string
  dashboardUrl: string
}

export interface ImageApprovalEmailData {
  firstName: string
  businessName: string
  imageType: string
  city: string
  dashboardUrl: string
}

export interface ChangeRejectionEmailData {
  firstName: string
  businessName: string
  changeType: string
  changeName?: string
  rejectionReason?: string
  city: string
  dashboardUrl: string
  supportEmail: string
}

// ---------------------------------------------------------------------------
// Templates — all inline styles for email client compatibility
// ---------------------------------------------------------------------------

export function createBusinessApprovalEmail(data: BusinessApprovalEmailData): EmailTemplate {
  const subject = `${data.businessName} is now live on QWIKKER`

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">You're live.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Hi ${data.firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;"><strong style="color:#fff;">${data.businessName}</strong> has been approved and is now visible to QWIKKER users in ${data.city}.</p>

      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
        <h3 style="margin:0 0 6px;font-size:17px;color:#00d083;">${data.businessName}</h3>
        <p style="margin:0;font-size:14px;color:#999;">Now discoverable in ${data.city}</p>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 12px;">What happens next:</p>
      <ul style="padding-left:20px;margin:0 0 16px;">
        <li style="font-size:14px;line-height:1.8;color:#ccc;">Customers can find you through our AI assistant and discovery feed</li>
        <li style="font-size:14px;line-height:1.8;color:#ccc;">Your offers and information are live</li>
        <li style="font-size:14px;line-height:1.8;color:#ccc;">You can manage everything from your dashboard</li>
      </ul>

      <div style="margin:24px 0 8px;">
        <a href="${data.dashboardUrl}" style="display:inline-block;background:#00d083;color:#000000;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Open Dashboard</a>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:24px 0 16px;">Questions? Reach out at <a href="mailto:${data.supportEmail}" style="color:#00d083;">${data.supportEmail}</a>.</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER Team</p>
    </div>`, data.city)

  const text = `${data.businessName} is now live on QWIKKER\n\nHi ${data.firstName},\n\n${data.businessName} has been approved and is now visible to QWIKKER users in ${data.city}.\n\nDashboard: ${data.dashboardUrl}\n\nBest,\nThe QWIKKER Team`

  return { subject, html, text }
}

export function createOfferApprovalEmail(data: OfferApprovalEmailData): EmailTemplate {
  const subject = `Your offer "${data.offerName}" is now live`

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Offer approved.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Hi ${data.firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Your offer for <strong style="color:#fff;">${data.businessName}</strong> is live and visible to customers in ${data.city}.</p>

      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
        <h3 style="margin:0 0 6px;font-size:17px;color:#00d083;">${data.offerName}</h3>
        <p style="margin:0;font-size:14px;color:#999;">${data.offerValue}</p>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Customers can now find and claim this through the QWIKKER platform and AI assistant.</p>

      <div style="margin:24px 0 8px;">
        <a href="${data.dashboardUrl}" style="display:inline-block;background:#00d083;color:#000000;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">View in Dashboard</a>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:16px 0 0;">Best,<br>The QWIKKER Team</p>
    </div>`, data.city)

  const text = `Offer approved: ${data.offerName}\n\nHi ${data.firstName},\n\nYour offer for ${data.businessName} is live on QWIKKER.\n\nOffer: ${data.offerName}\nValue: ${data.offerValue}\n\nDashboard: ${data.dashboardUrl}\n\nBest,\nThe QWIKKER Team`

  return { subject, html, text }
}

export function createMenuApprovalEmail(data: MenuApprovalEmailData): EmailTemplate {
  const subject = `Your ${data.menuType} menu has been approved`

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Menu approved.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Hi ${data.firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Your menu for <strong style="color:#fff;">${data.businessName}</strong> has been approved and added to our AI knowledge base.</p>

      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
        <h3 style="margin:0 0 6px;font-size:17px;color:#00d083;">${data.menuName}</h3>
        <p style="margin:0;font-size:14px;color:#999;text-transform:capitalize;">${data.menuType.replace('_', ' ')} menu</p>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 12px;">What this means:</p>
      <ul style="padding-left:20px;margin:0 0 16px;">
        <li style="font-size:14px;line-height:1.8;color:#ccc;">Customers can ask our AI about your specific menu items</li>
        <li style="font-size:14px;line-height:1.8;color:#ccc;">Better discovery through food and drink searches</li>
        <li style="font-size:14px;line-height:1.8;color:#ccc;">More accurate recommendations based on your offerings</li>
      </ul>

      <div style="margin:24px 0 8px;">
        <a href="${data.dashboardUrl}" style="display:inline-block;background:#00d083;color:#000000;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Manage Menus</a>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:16px 0 0;">Best,<br>The QWIKKER Team</p>
    </div>`, data.city)

  const text = `Menu approved: ${data.menuName}\n\nHi ${data.firstName},\n\nYour menu for ${data.businessName} has been approved.\n\nMenu: ${data.menuName}\nType: ${data.menuType.replace('_', ' ')}\n\nDashboard: ${data.dashboardUrl}\n\nBest,\nThe QWIKKER Team`

  return { subject, html, text }
}

export function createBusinessRejectionEmail(data: BusinessRejectionEmailData): EmailTemplate {
  const subject = `Action needed: ${data.businessName} application`

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Updates required.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Hi ${data.firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">We've reviewed your application for <strong style="color:#fff;">${data.businessName}</strong> in ${data.city} and need a few things before we can approve it.</p>

      ${data.rejectionReason ? `
      <div style="background:rgba(245,158,11,0.08);border:1px solid #92400e;border-radius:6px;padding:18px;margin:20px 0;">
        <h3 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#f59e0b;text-transform:uppercase;letter-spacing:0.5px;">Feedback</h3>
        <p style="margin:0;font-size:14px;color:#e0e0e0;">${data.rejectionReason}</p>
      </div>` : ''}

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Once updated, our team will review again within 24-48 hours.</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Questions? <a href="mailto:${data.supportEmail}" style="color:#00d083;">${data.supportEmail}</a></p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER Team</p>
    </div>`, data.city)

  const text = `Action needed: ${data.businessName} application\n\nHi ${data.firstName},\n\nWe need a few things before we can approve ${data.businessName}.\n\n${data.rejectionReason ? `Feedback: ${data.rejectionReason}` : ''}\n\nQuestions? ${data.supportEmail}\n\nBest,\nThe QWIKKER Team`

  return { subject, html, text }
}

export function createEventApprovalEmail(data: EventApprovalEmailData): EmailTemplate {
  const subject = `Your event "${data.eventName}" is now live`

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Event approved.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Hi ${data.firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Your event for <strong style="color:#fff;">${data.businessName}</strong> has been approved and is visible to QWIKKER users in ${data.city}.</p>

      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
        <h3 style="margin:0 0 6px;font-size:17px;color:#00d083;">${data.eventName}</h3>
        <p style="margin:0;font-size:14px;color:#999;">Now live in ${data.city}</p>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Customers can discover your event through the platform and AI assistant.</p>

      <div style="margin:24px 0 8px;">
        <a href="${data.dashboardUrl}" style="display:inline-block;background:#00d083;color:#000000;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">View in Dashboard</a>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:16px 0 0;">Best,<br>The QWIKKER Team</p>
    </div>`, data.city)

  const text = `Event approved: ${data.eventName}\n\nHi ${data.firstName},\n\nYour event for ${data.businessName} is now live in ${data.city}.\n\nDashboard: ${data.dashboardUrl}\n\nBest,\nThe QWIKKER Team`

  return { subject, html, text }
}

export function createSecretMenuApprovalEmail(data: SecretMenuApprovalEmailData): EmailTemplate {
  const subject = `Your secret menu item "${data.itemName}" is live`

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Secret menu item approved.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Hi ${data.firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Your secret menu item for <strong style="color:#fff;">${data.businessName}</strong> is now available to QWIKKER users in ${data.city}.</p>

      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
        <h3 style="margin:0 0 6px;font-size:17px;color:#00d083;">${data.itemName}</h3>
        <p style="margin:0;font-size:14px;color:#999;">Now discoverable in ${data.city}</p>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Customers with access to your secret menu will now see this item.</p>

      <div style="margin:24px 0 8px;">
        <a href="${data.dashboardUrl}" style="display:inline-block;background:#00d083;color:#000000;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">View in Dashboard</a>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:16px 0 0;">Best,<br>The QWIKKER Team</p>
    </div>`, data.city)

  const text = `Secret menu item approved: ${data.itemName}\n\nHi ${data.firstName},\n\nYour secret menu item for ${data.businessName} is now available in ${data.city}.\n\nDashboard: ${data.dashboardUrl}\n\nBest,\nThe QWIKKER Team`

  return { subject, html, text }
}

export function createImageApprovalEmail(data: ImageApprovalEmailData): EmailTemplate {
  const subject = `Your ${data.imageType} update for ${data.businessName} is live`

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Image update approved.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Hi ${data.firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Your <strong style="color:#fff;">${data.imageType}</strong> update for <strong style="color:#fff;">${data.businessName}</strong> is now live on QWIKKER in ${data.city}.</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Quality visuals make a real difference. Your listing is looking sharp.</p>

      <div style="margin:24px 0 8px;">
        <a href="${data.dashboardUrl}" style="display:inline-block;background:#00d083;color:#000000;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">View Your Profile</a>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:16px 0 0;">Best,<br>The QWIKKER Team</p>
    </div>`, data.city)

  const text = `Image update approved\n\nHi ${data.firstName},\n\nYour ${data.imageType} update for ${data.businessName} is now live on QWIKKER in ${data.city}.\n\nDashboard: ${data.dashboardUrl}\n\nBest,\nThe QWIKKER Team`

  return { subject, html, text }
}

export function createChangeRejectionEmail(data: ChangeRejectionEmailData): EmailTemplate {
  const itemLabel = data.changeName
    ? `${data.changeType} "${data.changeName}"`
    : data.changeType

  const subject = `Update required: your ${itemLabel} for ${data.businessName}`

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Update required.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Hi ${data.firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Your ${itemLabel} for <strong style="color:#fff;">${data.businessName}</strong> wasn't approved in its current form. Review the feedback below and resubmit from your dashboard.</p>

      ${data.rejectionReason ? `
      <div style="background:rgba(245,158,11,0.08);border:1px solid #92400e;border-radius:6px;padding:18px;margin:20px 0;">
        <h3 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#f59e0b;text-transform:uppercase;letter-spacing:0.5px;">Feedback</h3>
        <p style="margin:0;font-size:14px;color:#e0e0e0;">${data.rejectionReason}</p>
      </div>` : ''}

      <div style="margin:24px 0 8px;">
        <a href="${data.dashboardUrl}" style="display:inline-block;background:#00d083;color:#000000;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Go to Dashboard</a>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:16px 0 16px;">Questions? <a href="mailto:${data.supportEmail}" style="color:#00d083;">${data.supportEmail}</a></p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER Team</p>
    </div>`, data.city)

  const text = `Update required: your ${itemLabel} for ${data.businessName}\n\nHi ${data.firstName},\n\nYour ${itemLabel} for ${data.businessName} wasn't approved.\n\n${data.rejectionReason ? `Feedback: ${data.rejectionReason}` : ''}\n\nDashboard: ${data.dashboardUrl}\n\nQuestions? ${data.supportEmail}\n\nBest,\nThe QWIKKER Team`

  return { subject, html, text }
}
