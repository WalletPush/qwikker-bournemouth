import { EmailTemplate } from '../email-service'

const LOGO_URL = process.env.CLOUDINARY_LOGO_URL || 'https://res.cloudinary.com/dsh32kke7/image/upload/f_png,q_auto,w_320/v1768348190/Qwikker_Logo_web_lbql19.svg'

/**
 * Shared dark premium email shell — fully inline-styled for Gmail compatibility.
 * Exported for Email Suite templates that must match transactional branding.
 */
export function wrapInLayout(content: string, city: string): string {
  const cityDisplay = city.charAt(0).toUpperCase() + city.slice(1)
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QWIKKER</title>
  <style>
    /* Responsive helpers — supported by iOS Mail, Apple Mail, Gmail app & Outlook mobile.
       Desktop/Outlook-Windows ignore these and keep the fixed layout. */
    @media only screen and (max-width:480px) {
      .qw-pad { padding: 28px 20px !important; }
      .qw-col { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
    }
  </style>
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

export interface FreeTierTrialNudgeEmailData {
  firstName: string
  businessName: string
  city: string
  /** Human-readable trial tier name, e.g. "Featured" — from franchise_crm_configs.default_trial_tier */
  trialTierDisplayName: string
  /** Trial length in days — from franchise_crm_configs.founding_member_trial_days */
  trialDays: number
  /**
   * The exact feature bullets for the trial tier. MUST be sourced from
   * getTierFeatures(default_trial_tier) so the email matches what the tier
   * actually includes (and what the pricing/claim pages advertise).
   */
  features: string[]
  /** One-click path to start the trial / upgrade */
  upgradeUrl: string
  dashboardUrl: string
  supportEmail: string
  /** Absolute base URL used to load hosted email icons from /public/email (e.g. https://city.qwikker.com). */
  assetBaseUrl: string
  /** Optional hosted screenshots. When omitted, image rows are skipped (no broken images). */
  featureImages?: {
    analytics?: string
    loyalty?: string
  }
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
  /** Optional signed Present-Mode demo link — a live, interactive preview of
   * their listing (offers, loyalty, AI, wallet pass, analytics) in their brand. */
  demoUrl?: string | null
  /** Optional AI-drafted listing preview to show "look what we've built" content. */
  listingTeaser?: {
    tagline?: string | null
    description?: string | null
  }
  /** Optional AI-drafted offers to showcase (already filtered for non-declined). */
  offers?: Array<{ name: string; value: string; rationale?: string | null }>
  /** Real Google social proof (from business_profiles) — never fabricated. */
  socialProof?: { rating?: number | null; reviewCount?: number | null }
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

export function createFreeTierTrialNudgeEmail(data: FreeTierTrialNudgeEmailData): EmailTemplate {
  const tier = data.trialTierDisplayName
  const days = data.trialDays
  const subject = `${data.firstName}, try ${tier} free for ${days} days`

  // Derive capabilities from the tier's REAL feature list (single source of
  // truth = getTierFeatures) so a benefit only appears if the tier includes it.
  const feats = (data.features || []).join(' | ').toLowerCase()
  const hasLoyalty = /stamp|loyalt/.test(feats)
  const hasPush = /push/.test(feats)
  const hasAnalytics = /analytic/.test(feats)
  const hasBadge = /badge|pick|featured|higher/.test(feats)

  // Compact, benefit-led items — icon + short title + one line. Tier-gated so an
  // item only appears if the tier actually includes it.
  const ASSET = `${data.assetBaseUrl}/email`
  type Benefit = { icon: string; title: string; line: string }
  const benefits: Benefit[] = [
    { icon: 'ic-visibility.png', title: 'Get found first', line: 'Rank higher in the AI concierge so nearby customers discover you.' },
    { icon: 'ic-offers.png', title: 'Win the decision', line: 'Put timely offers in front of people as they choose where to spend.' },
  ]
  if (hasBadge) benefits.push({ icon: 'ic-badge.png', title: 'Stand out', line: 'A premium badge and priority placement in the listings.' })
  if (hasLoyalty) benefits.push({ icon: 'ic-loyalty.png', title: 'Keep them coming back', line: 'A digital stamp card that lives in the customer&rsquo;s phone wallet.' })
  if (hasPush) benefits.push({ icon: 'ic-push.png', title: 'Reach them instantly', line: 'Send offers straight to customers&rsquo; phones &mdash; no ad budget.' })
  if (hasAnalytics) benefits.push({ icon: 'ic-analytics.png', title: 'See what works', line: 'Track views, saves and redemptions &mdash; stop guessing.' })

  const iconCard = (b: Benefit) => `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
          <tr>
            <td style="background:#1c1c1c;border:1px solid #2a2a2a;border-radius:10px;padding:18px 16px;">
              <img src="${ASSET}/${b.icon}" width="42" height="42" alt="" style="display:block;border:0;border-radius:9px;margin:0 0 12px;" />
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">${b.title}</p>
              <p style="margin:0;font-size:13px;line-height:1.55;color:#999999;">${b.line}</p>
            </td>
          </tr>
        </table>`

  // 2-column grid (pairs of cards per row) — table-based for email clients.
  let grid = ''
  for (let i = 0; i < benefits.length; i += 2) {
    const left = benefits[i]
    const right = benefits[i + 1]
    grid += `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:0 0 12px;">
        <tr>
          <td class="qw-col" width="50%" valign="top" style="padding:0 6px 0 0;">${iconCard(left)}</td>
          <td class="qw-col" width="50%" valign="top" style="padding:0 0 0 6px;">${right ? iconCard(right) : ''}</td>
        </tr>
      </table>`
  }

  // "Did you know?" strip — one concise, genuine retention truth (no invented
  // Qwikker stats), themed to the loyalty angle when the tier includes it.
  const factLine = hasLoyalty
    ? 'A paper stamp card gets lost in a pocket &mdash; a digital one lives in the phone they never put down. And keeping a customer costs a fraction of winning a new one.'
    : 'Keeping a customer costs a fraction of winning a new one &mdash; so getting found, and giving people a reason to return, is where growth compounds.'

  // Optional screenshots (only rendered when a hosted URL is supplied)
  const screenshots = [
    data.featureImages?.analytics
      ? `<img src="${data.featureImages.analytics}" alt="Your analytics dashboard" style="width:100%;max-width:540px;border-radius:8px;border:1px solid #2e2e2e;display:block;margin:0 0 12px;" />`
      : '',
    data.featureImages?.loyalty
      ? `<img src="${data.featureImages.loyalty}" alt="Digital loyalty card" style="width:100%;max-width:540px;border-radius:8px;border:1px solid #2e2e2e;display:block;margin:0 0 12px;" />`
      : '',
  ].join('')

  const screenshotBlock = screenshots
    ? `<p style="font-size:12px;font-weight:700;color:#00d083;text-transform:uppercase;letter-spacing:1.5px;margin:32px 0 14px;">See it in action</p>${screenshots}`
    : ''

  const html = wrapInLayout(`
    <div class="qw-pad" style="padding:40px 34px;">
      <h2 style="font-size:23px;font-weight:700;color:#ffffff;margin:0 0 18px;line-height:1.35;letter-spacing:-0.3px;">Welcome to QWIKKER, ${data.firstName}.</h2>
      <p style="font-size:15px;line-height:1.75;color:#d8d8d8;margin:0 0 16px;"><strong style="color:#fff;">${data.businessName}</strong> is now live on the free listing. Before you settle in, there&rsquo;s something worth knowing: you can unlock the full <strong style="color:#fff;">${tier}</strong> experience <strong style="color:#00d083;">free for ${days} days</strong> &mdash; with nothing to lose.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:26px 0;">
        <tr>
          <td style="background:#141414;border:1px solid #00d083;border-radius:10px;padding:26px 24px;text-align:center;">
            <p style="margin:0 0 8px;font-size:11px;color:#00d083;text-transform:uppercase;letter-spacing:2px;">Your free trial</p>
            <h3 style="margin:0;font-size:24px;color:#ffffff;font-weight:700;letter-spacing:-0.3px;">${days} days of ${tier}, free</h3>
            <p style="margin:12px 0 0;font-size:13px;color:#8f8f8f;">No commitment &nbsp;&middot;&nbsp; No card required &nbsp;&middot;&nbsp; Cancel anytime</p>
          </td>
        </tr>
      </table>

      <p style="font-size:12px;font-weight:700;color:#00d083;text-transform:uppercase;letter-spacing:1.5px;margin:34px 0 16px;">How ${tier} helps you win &mdash; and keep &mdash; customers</p>

      ${grid}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:24px 0;">
        <tr>
          <td style="background:#181818;border:1px solid #2e2e2e;border-radius:8px;padding:20px 22px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#00d083;text-transform:uppercase;letter-spacing:1.5px;">Did you know</p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#c4c4c4;">${factLine}</p>
          </td>
        </tr>
      </table>

      ${screenshotBlock}

      <div style="margin:34px 0 12px;text-align:center;">
        <a href="${data.upgradeUrl}" style="display:inline-block;background:#00d083;color:#000000;padding:15px 38px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;letter-spacing:0.2px;">Start your free trial</a>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#7d7d7d;margin:10px 0 0;text-align:center;">Around 60 seconds to set up &mdash; and you won&rsquo;t be charged during your trial.</p>
      <p style="font-size:13px;line-height:1.6;color:#7d7d7d;margin:6px 0 0;text-align:center;">Prefer to look around first? <a href="${data.dashboardUrl}" style="color:#00d083;text-decoration:none;">Open your dashboard</a>.</p>

      <p style="font-size:15px;line-height:1.75;color:#d8d8d8;margin:34px 0 16px;">Any questions before you begin, simply reply to this email or reach us at <a href="mailto:${data.supportEmail}" style="color:#00d083;text-decoration:none;">${data.supportEmail}</a>.</p>
      <p style="font-size:15px;line-height:1.75;color:#d8d8d8;margin:0;">Best,<br>The QWIKKER Team</p>
    </div>`, data.city)

  // Plain-text mirror (benefit-led, no HTML entities)
  const textBenefits: string[] = [
    '- Get found first: rank higher in the AI concierge so nearby customers discover you.',
    '- Win the decision: put timely offers in front of people as they choose where to spend.',
  ]
  if (hasBadge) textBenefits.push('- Stand out: a premium badge and priority placement in the listings.')
  if (hasLoyalty) textBenefits.push('- Keep them coming back: a digital stamp card in the customer\'s phone wallet.')
  if (hasPush) textBenefits.push('- Reach them instantly: send offers straight to customers\' phones, no ad budget.')
  if (hasAnalytics) textBenefits.push('- See what works: track views, saves and redemptions, so you stop guessing.')

  const text = `Welcome to QWIKKER, ${data.firstName}\n\n${data.businessName} is now live on the free listing. You can unlock the full ${tier} experience free for ${days} days — no commitment, no card required, cancel anytime.\n\nHow ${tier} helps you win and keep customers:\n${textBenefits.join('\n')}\n\nDid you know? Industry research puts the cost of winning a new customer at roughly five times the cost of keeping one you already have — getting found by the right people, and giving them a reason to return, is where the growth is.\n\nStart your free trial: ${data.upgradeUrl}\nOr look around first: ${data.dashboardUrl}\n\nQuestions? Simply reply, or email ${data.supportEmail}.\n\nBest,\nThe QWIKKER Team`

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

  // Optional "look what we've built" preview blocks (listing + offers)
  const teaser = data.listingTeaser
  const hasTeaser = !!(teaser && (teaser.description || teaser.tagline))
  const listingPreviewHtml = hasTeaser
    ? `
      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:0 0 20px;">
        <h3 style="margin:0 0 10px;font-size:15px;color:#ffffff;">Here's the listing we've already written for you</h3>
        ${teaser?.tagline ? `<p style="margin:0 0 10px;font-size:15px;font-style:italic;color:#00d083;">&ldquo;${teaser.tagline}&rdquo;</p>` : ''}
        ${teaser?.description ? `<p style="margin:0;font-size:14px;line-height:1.7;color:#e0e0e0;">${teaser.description}</p>` : ''}
      </div>`
    : ''

  // Real Google social proof — only shown when we actually have the numbers.
  const rating = data.socialProof?.rating
  const reviewCount = data.socialProof?.reviewCount
  const hasSocialProof = typeof rating === 'number' && typeof reviewCount === 'number' && reviewCount > 0
  const socialProofHtml = hasSocialProof
    ? `
      <div style="background:rgba(0,208,131,0.06);border:1px solid rgba(0,208,131,0.35);border-radius:8px;padding:14px 18px;margin:0 0 20px;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#e0e0e0;">
          <span style="color:#00d083;font-weight:700;">&#9733; ${rating}</span> from <strong style="color:#fff;">${reviewCount.toLocaleString()} Google reviews</strong> &mdash; your reputation is already doing the work. QWIKKER puts it in front of nearby customers at the moment they&rsquo;re deciding.
        </p>
      </div>`
    : ''

  const offers = data.offers || []
  const offerRows = offers
    .map(
      (o) => `
          <tr>
            <td style="padding:14px 16px;border:1px solid rgba(0,208,131,0.35);background:rgba(0,208,131,0.06);border-radius:8px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#ffffff;">${o.name}</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:#00d083;">${o.value}</p>
              ${o.rationale ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.55;color:#b0b0b0;"><span style="color:#00d083;font-weight:600;">Why this works:</span> ${o.rationale}</p>` : ''}
            </td>
          </tr>
          <tr><td style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>`
    )
    .join('')
  const offersPreviewHtml =
    offers.length > 0
      ? `
      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px 20px 10px;margin:0 0 24px;">
        <h3 style="margin:0 0 6px;font-size:15px;color:#ffffff;">We've even drafted ${offers.length === 1 ? 'an offer' : `${offers.length} offers`} you could launch on day one</h3>
        <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#b0b0b0;">Suggested from your menu and reviews &mdash; edit, swap or remove them once you claim.</p>
        <table style="width:100%;border-collapse:collapse;">${offerRows}</table>
      </div>`
      : ''

  const html = wrapInLayout(`
    <div style="padding:36px 30px;">
      <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Your listing is ready to claim.</h2>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Hey ${data.businessName},</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Good news &mdash; <strong style="color:#fff;">${data.businessName}</strong> has been added to <strong style="color:#00d083;">QWIKKER ${cityDisplay}</strong>, the local app that connects nearby customers to businesses by what they're craving &mdash; not keywords or ads.</p>
      <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">We've already built your listing from public information. Claim it (it's free) to take control, add offers, and start reaching local customers.</p>

      ${socialProofHtml}
      ${listingPreviewHtml}
      ${offersPreviewHtml}

      <div style="margin:28px 0 12px;text-align:center;">
        <a href="${data.claimUrl}" style="display:inline-block;background:#00d083;color:#000000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;">Claim My Listing</a>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#888;margin:0 0 ${data.demoUrl ? '20px' : '28px'};text-align:center;">Takes under 5 minutes &mdash; no need to search, this link opens your business directly.</p>
      ${data.demoUrl ? `
      <div style="margin:0 0 28px;text-align:center;">
        <a href="${data.demoUrl}" style="display:inline-block;background:transparent;color:#00d083;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;border:1px solid #00d083;">See your listing come alive &rarr;</a>
        <p style="font-size:13px;line-height:1.6;color:#888;margin:10px 0 0;">A live, interactive preview &mdash; your offers, loyalty stamp card, AI recommendations, wallet pass and analytics, all in your brand.</p>
      </div>` : ''}

      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:0 0 24px;">
        <h3 style="margin:0 0 12px;font-size:15px;color:#ffffff;">Why local businesses use QWIKKER</h3>
        <table style="width:100%;border-collapse:collapse;">
          ${benefitRows}
        </table>
      </div>

      <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:0 0 24px;">
        <h3 style="margin:0 0 8px;font-size:15px;color:#ffffff;">Turn first-timers into regulars</h3>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#e0e0e0;">QWIKKER includes a <strong style="color:#fff;">digital loyalty stamp card</strong> that lives in your customers&rsquo; phone wallet &mdash; no app to download, no paper cards to lose. Reward repeat visits and keep people coming back, all managed from your dashboard.</p>
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
${hasSocialProof ? `\n★ ${rating} from ${reviewCount!.toLocaleString()} Google reviews — your reputation is already doing the work. QWIKKER puts it in front of nearby customers as they decide.\n` : ''}${hasTeaser ? `\nThe listing we've written for you:${teaser?.tagline ? `\n"${teaser.tagline}"` : ''}${teaser?.description ? `\n${teaser.description}` : ''}\n` : ''}${offers.length > 0 ? `\nOffers we've drafted for you:\n${offers.map((o) => `• ${o.name} — ${o.value}${o.rationale ? `\n  Why this works: ${o.rationale}` : ''}`).join('\n')}\n` : ''}
Claim your listing: ${data.claimUrl}
(Takes under 5 minutes — this link opens your business directly, no need to search.)
${data.demoUrl ? `\nSee your listing come alive (live, interactive preview — offers, loyalty, AI, wallet pass & analytics, all in your brand): ${data.demoUrl}\n` : ''}

Why local businesses use QWIKKER:
• Intent-first discovery — customers arrive already looking for what you offer.
• You control your offers — no discount wars, no coupon landfill.
• Local by design — you compete locally, not with national chains or ad budgets.

Turn first-timers into regulars: QWIKKER includes a digital loyalty stamp card that lives in your customers' phone wallet — no app to download, no paper cards to lose. Reward repeat visits and keep people coming back, all from your dashboard.

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
