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

export interface BusinessWelcomeEmailData {
  firstName: string
  businessName: string
  city: string
  dashboardUrl: string
  supportEmail: string
}

export interface BusinessSubmittedEmailData {
  firstName: string
  businessName: string
  city: string
  supportEmail: string
}

export interface BusinessApprovalEmailData {
  email: string
  firstName: string
  businessName: string
  city: string
  dashboardUrl: string
  supportEmail: string
}

export interface OfferApprovalEmailData {
  email: string
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
  email: string
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

export interface CompletionReminderEmailData {
  firstName: string
  businessName: string
  city: string
  dashboardUrl: string
  contactCentreUrl: string
  supportEmail: string
  missingItems: string[]
  completionPercentage: number
}

export interface ClaimInvitationEmailData {
  businessName: string
  city: string
  claimUrl: string
  forBusinessUrl: string
  supportEmail: string
}

// ---------------------------------------------------------------------------
// Templates — all inline styles for email client compatibility
// ---------------------------------------------------------------------------

export function createBusinessWelcomeEmail(data: BusinessWelcomeEmailData): EmailTemplate {
  const subject = `Welcome to QWIKKER, ${data.firstName}`

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Welcome to QWIKKER.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Hi ${data.firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Thanks for registering <strong style="color:#fff;">${data.businessName}</strong>. Your dashboard is ready and waiting.</p>

      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:24px 0;">
        <h3 style="margin:0 0 12px;font-size:15px;color:#ffffff;">Before you go live, complete these:</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;font-size:14px;color:#ccc;">Upload your logo</td><td style="text-align:right;color:#666;font-size:14px;">Required</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#ccc;">Add a business photo</td><td style="text-align:right;color:#666;font-size:14px;">Required</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#ccc;">Write a description</td><td style="text-align:right;color:#666;font-size:14px;">Required</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#ccc;">Set your opening hours</td><td style="text-align:right;color:#666;font-size:14px;">Required</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#ccc;">Add a tagline</td><td style="text-align:right;color:#666;font-size:14px;">Required</td></tr>
        </table>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Once your profile is complete, hit <strong style="color:#fff;">Submit for Review</strong> and our team will check everything within 24 hours.</p>

      <div style="margin:24px 0 8px;">
        <a href="${data.dashboardUrl}" style="display:inline-block;background:#00d083;color:#000000;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Open Your Dashboard</a>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:24px 0 16px;">Questions? Reach out at <a href="mailto:${data.supportEmail}" style="color:#00d083;">${data.supportEmail}</a>.</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER Team</p>
    </div>`, data.city)

  const text = `Welcome to QWIKKER, ${data.firstName}\n\nThanks for registering ${data.businessName}. Your dashboard is ready.\n\nBefore you go live, complete your profile: logo, photo, description, hours, and tagline. Then hit Submit for Review.\n\nDashboard: ${data.dashboardUrl}\n\nQuestions? ${data.supportEmail}\n\nBest,\nThe QWIKKER Team`

  return { subject, html, text }
}

export function createBusinessSubmittedEmail(data: BusinessSubmittedEmailData): EmailTemplate {
  const subject = `${data.businessName} is under review`

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">We're on it.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Hi ${data.firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;"><strong style="color:#fff;">${data.businessName}</strong> has been submitted for review. Our team will check your listing and get back to you within 24 hours.</p>

      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
        <p style="margin:0 0 4px;font-size:14px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Status</p>
        <h3 style="margin:0;font-size:17px;color:#f59e0b;">Under Review</h3>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 12px;">What happens next:</p>
      <ul style="padding-left:20px;margin:0 0 16px;">
        <li style="font-size:14px;line-height:1.8;color:#ccc;">We verify your business details</li>
        <li style="font-size:14px;line-height:1.8;color:#ccc;">If anything needs updating, we'll let you know</li>
        <li style="font-size:14px;line-height:1.8;color:#ccc;">Once approved, you'll be live and discoverable by customers</li>
      </ul>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Questions? <a href="mailto:${data.supportEmail}" style="color:#00d083;">${data.supportEmail}</a></p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER Team</p>
    </div>`, data.city)

  const text = `${data.businessName} is under review\n\nHi ${data.firstName},\n\n${data.businessName} has been submitted for review. Our team will check your listing within 24 hours.\n\nWe'll email you when it's approved.\n\nQuestions? ${data.supportEmail}\n\nBest,\nThe QWIKKER Team`

  return { subject, html, text }
}

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

export function createCompletionReminderEmail(data: CompletionReminderEmailData): EmailTemplate {
  const subject = `Finish your QWIKKER listing for ${data.businessName}`

  const itemsRows = data.missingItems
    .map(
      (item) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:#e0e0e0;">
              <span style="color:#f59e0b;margin-right:8px;">&#9679;</span>${item}
            </td>
          </tr>`
    )
    .join('')

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">You're almost there.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Hi ${data.firstName},</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Your listing for <strong style="color:#fff;">${data.businessName}</strong> is <strong style="color:#00d083;">${data.completionPercentage}% complete</strong>. Just a few more details and you'll be ready to go live and start reaching customers in ${data.city.charAt(0).toUpperCase() + data.city.slice(1)}.</p>

      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:24px 0;">
        <h3 style="margin:0 0 12px;font-size:15px;color:#ffffff;">Still to complete:</h3>
        <table style="width:100%;border-collapse:collapse;">
          ${itemsRows}
        </table>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Once everything's filled in, hit <strong style="color:#fff;">Submit for Review</strong> and our team will check it over within 24 hours.</p>

      <div style="margin:24px 0 8px;">
        <a href="${data.dashboardUrl}" style="display:inline-block;background:#00d083;color:#000000;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Finish My Listing</a>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:24px 0 16px;">Need help completing your listing? <a href="${data.contactCentreUrl}" style="color:#00d083;font-weight:600;">Reach out to us here</a> and our team will give you a hand &mdash; or email <a href="mailto:${data.supportEmail}" style="color:#00d083;">${data.supportEmail}</a>.</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER Team</p>
    </div>`, data.city)

  const text = `You're almost there.\n\nHi ${data.firstName},\n\nYour listing for ${data.businessName} is ${data.completionPercentage}% complete. Just a few more details and you'll be ready to go live.\n\nStill to complete:\n${data.missingItems.map((i) => `• ${i}`).join('\n')}\n\nOnce everything's filled in, hit Submit for Review and our team will check it within 24 hours.\n\nFinish your listing: ${data.dashboardUrl}\n\nNeed help completing your listing? Reach out to us here: ${data.contactCentreUrl} — or email ${data.supportEmail}\n\nBest,\nThe QWIKKER Team`

  return { subject, html, text }
}

/**
 * Outreach email inviting an (unclaimed) business to claim their pre-built listing.
 * The CTA deep-links straight to the claim flow pre-selected for this business
 * (/claim?business_id=...), so they never have to search for themselves.
 */
export function createClaimInvitationEmail(data: ClaimInvitationEmailData): EmailTemplate {
  const cityDisplay = data.city.charAt(0).toUpperCase() + data.city.slice(1)
  const subject = `Claim your QWIKKER listing for ${data.businessName}`

  // Why-claim benefits (mirrors the /for-business page copy)
  const benefits = [
    '<strong style="color:#fff;">Intent-first discovery</strong> &mdash; customers arrive already looking for what you offer, not casually browsing.',
    '<strong style="color:#fff;">You control your offers</strong> &mdash; no discount wars, no coupon landfill.',
    '<strong style="color:#fff;">Local by design</strong> &mdash; you compete locally, not with national chains or ad budgets.',
  ]
  const benefitRows = benefits
    .map(
      (b) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;font-size:14px;line-height:1.6;color:#e0e0e0;vertical-align:top;">
              <span style="color:#00d083;margin-right:8px;">&#9679;</span>${b}
            </td>
          </tr>`
    )
    .join('')

  // Compact FAQ for cold outreach
  const faqs = [
    ['Is it free?', 'Yes &mdash; claiming your listing is completely free, with no hidden costs.'],
    ['How long does it take?', "Under 5 minutes. Your listing is already built &mdash; you just verify ownership and tweak the details."],
    ['How do you verify it\'s me?', 'We email a 6-digit code to your business email address to confirm you own the business.'],
    ['What if some details are wrong?', "No problem &mdash; you can edit everything (hours, photos, description and more) once you've claimed it."],
  ]
  const faqRows = faqs
    .map(
      ([q, a]) => `
        <div style="margin:0 0 14px;">
          <p style="font-size:14px;font-weight:600;color:#ffffff;margin:0 0 4px;">${q}</p>
          <p style="font-size:14px;line-height:1.6;color:#b0b0b0;margin:0;">${a}</p>
        </div>`
    )
    .join('')

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Your listing is ready to claim.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Hey ${data.businessName},</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Good news &mdash; <strong style="color:#fff;">${data.businessName}</strong> has been added to <strong style="color:#00d083;">QWIKKER ${cityDisplay}</strong>, the local app that connects nearby customers to businesses by what they're craving &mdash; not keywords or ads.</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">We've already built your listing from public information. Claim it (it's free) to take control, add offers, and start reaching local customers.</p>

      <div style="margin:28px 0 12px;text-align:center;">
        <a href="${data.claimUrl}" style="display:inline-block;background:#00d083;color:#000000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;">Claim My Listing</a>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#888;margin:0 0 28px;text-align:center;">Takes under 5 minutes &mdash; no need to search, this link opens your business directly.</p>

      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:0 0 24px;">
        <h3 style="margin:0 0 12px;font-size:15px;color:#ffffff;">Why local businesses use QWIKKER</h3>
        <table style="width:100%;border-collapse:collapse;">
          ${benefitRows}
        </table>
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 28px;">Want the full picture? <a href="${data.forBusinessUrl}" style="color:#00d083;font-weight:600;">See how QWIKKER works for businesses &rarr;</a></p>

      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px 20px 6px;margin:0 0 24px;">
        <h3 style="margin:0 0 16px;font-size:15px;color:#ffffff;">Quick questions</h3>
        ${faqRows}
      </div>

      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Any questions? Just reply to this email or reach us at <a href="mailto:${data.supportEmail}" style="color:#00d083;">${data.supportEmail}</a>.</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER Team</p>
    </div>`, data.city)

  const text = `Your listing is ready to claim.

Hey ${data.businessName},

Good news — ${data.businessName} has been added to QWIKKER ${cityDisplay}, the local app that connects nearby customers to businesses by what they're craving — not keywords or ads.

We've already built your listing from public information. Claim it (it's free) to take control, add offers, and start reaching local customers.

Claim your listing: ${data.claimUrl}
(Takes under 5 minutes — this link opens your business directly, no need to search.)

Why local businesses use QWIKKER:
• Intent-first discovery — customers arrive already looking for what you offer.
• You control your offers — no discount wars, no coupon landfill.
• Local by design — you compete locally, not with national chains or ad budgets.

See how QWIKKER works for businesses: ${data.forBusinessUrl}

Quick questions:
• Is it free? Yes — claiming your listing is completely free, with no hidden costs.
• How long does it take? Under 5 minutes. Your listing is already built — you just verify ownership and tweak the details.
• How do you verify it's me? We email a 6-digit code to your business email to confirm you own the business.
• What if some details are wrong? You can edit everything once you've claimed it.

Any questions? Reply to this email or reach us at ${data.supportEmail}.

Best,
The QWIKKER Team`

  return { subject, html, text }
}
