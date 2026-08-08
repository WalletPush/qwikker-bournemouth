/**
 * Email Suite template renderers — all use the shared Qwikker dark email shell.
 */

import {
  createClaimInvitationEmail,
  createCompletionReminderEmail,
  createBusinessWelcomeEmail,
  createFreeTierTrialNudgeEmail,
  createBusinessApprovalEmail,
  wrapInLayout,
} from '@/lib/email/templates/business-notifications'
import { getFranchiseSupportEmail, getFranchiseBaseUrl } from '@/lib/email/send-franchise-email'
import type { EmailTemplate } from '@/lib/email/email-service'
import { buildUnsubUrl } from '@/lib/email/unsub-token'
import { getTierFeatures } from '@/lib/utils/tier-limits'
import {
  SUITE_TEMPLATES,
  type SuiteTemplateCategory,
  type SuiteTemplateDef,
} from '@/lib/email/suite-template-catalog'

export { SUITE_TEMPLATES }
export type { SuiteTemplateCategory, SuiteTemplateDef }

export interface SuiteOfferIdea {
  name: string
  value: string
  rationale?: string | null
}

export interface RenderContext {
  city: string
  businessName: string
  firstName?: string | null
  email: string
  businessId?: string
  missingItems?: string[]
  trialDays?: number
  /** Franchise default_trial_tier code, e.g. spotlight */
  trialTier?: string
  trialTierDisplayName?: string
  trialFeatures?: string[]
  loyaltyUrl?: string
  claimUrl?: string
  demoUrl?: string
  customSubject?: string
  customHtml?: string
  customText?: string
  offers?: SuiteOfferIdea[]
  stats?: {
    profileViews?: number
    offerClaims?: number
    saves?: number
    periodDays?: number
  }
  sendIdForUnsub?: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function injectUnsub(html: string, city: string, ctx: RenderContext): string {
  const base = getFranchiseBaseUrl(city)
  const unsub = buildUnsubUrl(base, {
    city,
    email: ctx.email,
    businessId: ctx.businessId,
    scope: 'all_marketing',
    sendId: ctx.sendIdForUnsub,
  })
  const footer = `<div style="padding:16px 30px 24px;text-align:center;border-top:1px solid #333;">
    <p style="font-size:12px;color:#666;margin:0;">You're receiving this from QWIKKER ${escapeHtml(city)}.
    <a href="${unsub}" style="color:#00d083;">Unsubscribe</a></p>
  </div>`
  if (html.includes('</body>')) return html.replace('</body>', `${footer}</body>`)
  return html + footer
}

function shell(content: string, city: string, subject: string, text: string): EmailTemplate {
  return { subject, html: wrapInLayout(content, city), text }
}

export function renderSuiteTemplate(key: string, ctx: RenderContext): EmailTemplate {
  const city = ctx.city
  const support = getFranchiseSupportEmail(city)
  const base = getFranchiseBaseUrl(city)
  // Business emails greet the venue — never a personal first name
  const def = SUITE_TEMPLATES.find((t) => t.key === key)
  const biz = escapeHtml(ctx.businessName)
  const hiHtml = `Hi ${biz},`
  const hiText = `Hi ${ctx.businessName},`
  // Kept only for create* call sites that still accept firstName (ignored in greetings)
  const first = ''

  let template: EmailTemplate

  switch (key) {
    case 'claim_invitation':
      template = createClaimInvitationEmail({
        businessName: ctx.businessName,
        city,
        claimUrl: ctx.claimUrl || `${base}/claim?business_id=${ctx.businessId || ''}`,
        forBusinessUrl: `${base}/for-business`,
        demoUrl: ctx.demoUrl || `${base}/for-business`,
        supportEmail: support,
      })
      break
    case 'claim_reminder': {
      const cityEsc = escapeHtml(city)
      const cityLabel = city.charAt(0).toUpperCase() + city.slice(1)
      const claimUrl = ctx.claimUrl || `${base}/claim?business_id=${ctx.businessId || ''}`
      const demoUrl = ctx.demoUrl || `${base}/for-business`
      template = shell(
        `<div style="padding:36px 30px;">
          <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Quick reminder — your listing is waiting</h2>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">${hiHtml}</p>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Just checking in &mdash; <strong style="color:#fff;">${biz}</strong> is already on <strong style="color:#00d083;">QWIKKER ${cityEsc}</strong>, but it hasn&rsquo;t been claimed yet.</p>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Your listing is built and ready. Claiming is free and takes a few minutes &mdash; then you can edit details, add offers, and take control of how locals find you.</p>

          <div style="background:rgba(0,208,131,0.06);border:1px solid rgba(0,208,131,0.35);border-radius:8px;padding:16px 18px;margin:0 0 24px;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#e0e0e0;">If you already saw our first email, this is just a nudge. If not &mdash; you&rsquo;re live in ${cityEsc} once you claim.</p>
          </div>

          <div style="margin:28px 0 12px;text-align:center;">
            <a href="${claimUrl}" style="display:inline-block;background:#00d083;color:#000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;">Claim my listing</a>
          </div>
          <p style="font-size:13px;line-height:1.6;color:#888;margin:0 0 20px;text-align:center;">Takes under 5 minutes &mdash; this link opens your business directly.</p>

          <div style="margin:0 0 28px;text-align:center;">
            <a href="${demoUrl}" style="display:inline-block;background:transparent;color:#00d083;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;border:1px solid #00d083;">See a preview &rarr;</a>
          </div>

          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Questions? Reply or email <a href="mailto:${support}" style="color:#00d083;">${support}</a>.</p>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER ${escapeHtml(cityLabel)} Team</p>
        </div>`,
        city,
        `Reminder: claim your QWIKKER listing for ${ctx.businessName}`,
        `Quick reminder — your listing is waiting\n\n${hiText}\n\nJust checking in — ${ctx.businessName} is already on QWIKKER ${city}, but it hasn't been claimed yet.\n\nYour listing is built and ready. Claiming is free and takes a few minutes.\n\nClaim: ${claimUrl}\nPreview: ${demoUrl}\n\nQuestions? ${support}\n\nBest,\nThe QWIKKER ${cityLabel} Team`
      )
      break
    }
    case 'completion_reminder':
      template = createCompletionReminderEmail({
        firstName: first,
        businessName: ctx.businessName,
        city,
        missingItems: ctx.missingItems || ['Complete your profile'],
        completionPercentage: Math.max(0, 100 - (ctx.missingItems?.length || 1) * 15),
        dashboardUrl: `${base}/dashboard`,
        contactCentreUrl: `${base}/dashboard/contact-centre`,
        supportEmail: support,
      })
      break
    case 'business_welcome':
      template = createBusinessWelcomeEmail({
        firstName: first,
        businessName: ctx.businessName,
        city,
        dashboardUrl: `${base}/dashboard`,
        supportEmail: support,
      })
      break
    case 'business_approval':
      template = createBusinessApprovalEmail({
        email: ctx.email,
        firstName: first,
        businessName: ctx.businessName,
        city,
        dashboardUrl: `${base}/dashboard`,
        supportEmail: support,
      })
      break
    case 'free_trial_nudge': {
      const tierCode = (ctx.trialTier || 'featured').toLowerCase()
      const tierDisplay =
        ctx.trialTierDisplayName ||
        tierCode.charAt(0).toUpperCase() + tierCode.slice(1)
      template = createFreeTierTrialNudgeEmail({
        firstName: first,
        businessName: ctx.businessName,
        city,
        trialTierDisplayName: tierDisplay,
        trialDays: ctx.trialDays || 30,
        features: ctx.trialFeatures?.length ? ctx.trialFeatures : getTierFeatures(tierCode),
        upgradeUrl: `${base}/dashboard/settings`,
        dashboardUrl: `${base}/dashboard`,
        supportEmail: support,
        assetBaseUrl: base,
      })
      break
    }
    case 'spotlight_benefits': {
      const cityEsc = escapeHtml(city)
      template = shell(
        `<div style="padding:36px 30px;">
          <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Unlock Spotlight for ${biz}</h2>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">${hiHtml}</p>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;"><strong style="color:#fff;">${biz}</strong> is already on QWIKKER ${cityEsc}. Spotlight is how local businesses get found first — when nearby customers are deciding where to go, not scrolling past an ad.</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:24px 0;">
            <tr>
              <td style="background:#141414;border:1px solid #00d083;border-radius:10px;padding:22px 20px;text-align:center;">
                <p style="margin:0 0 6px;font-size:11px;color:#00d083;text-transform:uppercase;letter-spacing:1.5px;">Why Spotlight</p>
                <p style="margin:0;font-size:18px;color:#ffffff;font-weight:700;line-height:1.4;">Show up at the moment of intent</p>
                <p style="margin:10px 0 0;font-size:13px;color:#8f8f8f;">Priority placement &nbsp;&middot;&nbsp; Push &nbsp;&middot;&nbsp; Loyalty &nbsp;&middot;&nbsp; Analytics</p>
              </td>
            </tr>
          </table>

          <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:0 0 24px;">
            <h3 style="margin:0 0 12px;font-size:15px;color:#ffffff;">What you get</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;line-height:1.6;color:#e0e0e0;vertical-align:top;">
                  <span style="color:#00d083;margin-right:8px;">&#9679;</span><strong style="color:#fff;">Priority AI placement</strong> — rank higher when locals ask what&rsquo;s nearby
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;line-height:1.6;color:#e0e0e0;vertical-align:top;">
                  <span style="color:#00d083;margin-right:8px;">&#9679;</span><strong style="color:#fff;">Push to wallets</strong> — put offers on phones without an ad budget
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;line-height:1.6;color:#e0e0e0;vertical-align:top;">
                  <span style="color:#00d083;margin-right:8px;">&#9679;</span><strong style="color:#fff;">Digital loyalty</strong> — a stamp card that lives in Apple/Google Wallet
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:14px;line-height:1.6;color:#e0e0e0;vertical-align:top;">
                  <span style="color:#00d083;margin-right:8px;">&#9679;</span><strong style="color:#fff;">Clearer analytics</strong> — views, saves, claims — so you know what works
                </td>
              </tr>
            </table>
          </div>

          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 8px;">You compete locally on QWIKKER — not against national ad spend. Spotlight just puts ${biz} at the front of that queue.</p>

          <div style="margin:28px 0 12px;text-align:center;">
            <a href="${base}/dashboard/settings" style="display:inline-block;background:#00d083;color:#000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;">See Spotlight plans</a>
          </div>
          <p style="font-size:13px;line-height:1.6;color:#888;margin:0 0 24px;text-align:center;">Questions? Reply or email <a href="mailto:${support}" style="color:#00d083;">${support}</a>.</p>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER Team</p>
        </div>`,
        city,
        `${ctx.businessName} — unlock Spotlight on Qwikker`,
        `${hiText}\n\nSpotlight puts ${ctx.businessName} at the front of discovery in ${city}: priority AI placement, push, loyalty, and analytics.\n\nSee plans: ${base}/dashboard/settings\n\n${support}`
      )
      break
    }
    case 'try_qwikker_loyalty': {
      const cityEsc = escapeHtml(city)
      template = shell(
        `<div style="padding:36px 30px;">
          <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Turn first-timers into regulars</h2>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">${hiHtml}</p>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Paper stamp cards get lost. With <strong style="color:#fff;">Spotlight</strong> on QWIKKER ${cityEsc}, <strong style="color:#fff;">${biz}</strong> gets a digital loyalty card that lives in your customers&rsquo; Apple or Google Wallet — no app for them to download, and <strong style="color:#fff;">no till or POS integration</strong> for you to install.</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:24px 0;">
            <tr>
              <td style="background:#141414;border:1px solid #00d083;border-radius:10px;padding:22px 20px;text-align:center;">
                <p style="margin:0 0 6px;font-size:11px;color:#00d083;text-transform:uppercase;letter-spacing:1.5px;">Qwikker loyalty</p>
                <p style="margin:0;font-size:18px;color:#ffffff;font-weight:700;line-height:1.4;">Stamp card in their wallet</p>
                <p style="margin:10px 0 0;font-size:13px;color:#8f8f8f;">You set the reward &nbsp;&middot;&nbsp; Staff stamp with a QR scan</p>
              </td>
            </tr>
          </table>

          <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:0 0 20px;">
            <h3 style="margin:0 0 12px;font-size:15px;color:#ffffff;">How it actually works</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;line-height:1.6;color:#e0e0e0;vertical-align:top;">
                  <span style="color:#00d083;margin-right:8px;">&#9679;</span><strong style="color:#fff;">Join in seconds</strong> — customer scans your QR, card lands in Apple/Google Wallet. Always on their phone.
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;line-height:1.6;color:#e0e0e0;vertical-align:top;">
                  <span style="color:#00d083;margin-right:8px;">&#9679;</span><strong style="color:#fff;">No POS required</strong> — stamp visits with a simple QR scan on your phone or tablet. Nothing to wire into your till.
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;line-height:1.6;color:#e0e0e0;vertical-align:top;">
                  <span style="color:#00d083;margin-right:8px;">&#9679;</span><strong style="color:#fff;">Progress that sticks</strong> — every stamp is tracked. Customers (and you) can see how close they are to the reward.
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;line-height:1.6;color:#e0e0e0;vertical-align:top;">
                  <span style="color:#00d083;margin-right:8px;">&#9679;</span><strong style="color:#fff;">AI companion reminders</strong> — when locals chat with Qwikker&rsquo;s AI, it can nudge them back: &ldquo;you&rsquo;re 1 stamp from a free coffee at ${biz}&rdquo; — so loyalty works even when they&rsquo;re not thinking about you.
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:14px;line-height:1.6;color:#e0e0e0;vertical-align:top;">
                  <span style="color:#00d083;margin-right:8px;">&#9679;</span><strong style="color:#fff;">Part of Spotlight</strong> — loyalty ships with the plan that also boosts discovery, push, and analytics.
                </td>
              </tr>
            </table>
          </div>

          <div style="background:rgba(0,208,131,0.06);border:1px solid rgba(0,208,131,0.35);border-radius:8px;padding:16px 18px;margin:0 0 24px;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#e0e0e0;"><strong style="color:#00d083;">Tip:</strong> Pair loyalty with a first-visit offer — get them in once; the wallet card + AI nudges bring them back.</p>
          </div>

          <div style="margin:28px 0 12px;text-align:center;">
            <a href="${base}/dashboard/loyalty" style="display:inline-block;background:#00d083;color:#000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;">Explore loyalty</a>
          </div>
          <p style="font-size:13px;line-height:1.5;color:#888;margin:0 0 8px;text-align:center;">On free? Start a Spotlight trial from <a href="${base}/dashboard/settings" style="color:#00d083;">Settings</a> first.</p>
          <p style="font-size:13px;line-height:1.6;color:#888;margin:0 0 24px;text-align:center;">Questions? <a href="mailto:${support}" style="color:#00d083;">${support}</a></p>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER Team</p>
        </div>`,
        city,
        `${ctx.businessName} — try Qwikker loyalty (Spotlight)`,
        `${hiText}\n\nSpotlight on Qwikker includes digital loyalty for ${ctx.businessName}:\n- Stamp card in Apple/Google Wallet (no app)\n- No till/POS integration — staff stamp with a QR scan\n- Progress tracked toward the reward\n- AI companion can remind customers they're close to a freebie\n\nExplore: ${base}/dashboard/loyalty\nPlans: ${base}/dashboard/settings\n\n${support}`
      )
      break
    }
    case 'offer_suggestions': {
      const offers = ctx.offers || []
      const offerRows =
        offers.length > 0
          ? offers
              .map(
                (o) => `
            <tr>
              <td style="padding:14px 16px;border:1px solid rgba(0,208,131,0.35);background:rgba(0,208,131,0.06);border-radius:8px;">
                <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#ffffff;">${escapeHtml(o.name)}</p>
                <p style="margin:0;font-size:14px;font-weight:600;color:#00d083;">${escapeHtml(o.value)}</p>
                ${o.rationale ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.55;color:#b0b0b0;"><span style="color:#00d083;font-weight:600;">Why this works:</span> ${escapeHtml(o.rationale)}</p>` : ''}
              </td>
            </tr>
            <tr><td style="height:10px;font-size:0;">&nbsp;</td></tr>`
              )
              .join('')
          : `
            <tr>
              <td style="padding:14px 16px;border:1px solid rgba(0,208,131,0.35);background:rgba(0,208,131,0.06);border-radius:8px;">
                <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#ffffff;">Weekday lunch special</p>
                <p style="margin:0;font-size:14px;font-weight:600;color:#00d083;">% off mains Mon–Thu before 3pm</p>
                <p style="margin:8px 0 0;font-size:13px;line-height:1.55;color:#b0b0b0;"><span style="color:#00d083;font-weight:600;">Why this works:</span> Fills quieter weekday covers without discounting your busiest nights.</p>
              </td>
            </tr>
            <tr><td style="height:10px;font-size:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:14px 16px;border:1px solid rgba(0,208,131,0.35);background:rgba(0,208,131,0.06);border-radius:8px;">
                <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#ffffff;">First-visit welcome</p>
                <p style="margin:0;font-size:14px;font-weight:600;color:#00d083;">Free drink / dessert with any main</p>
                <p style="margin:8px 0 0;font-size:13px;line-height:1.55;color:#b0b0b0;"><span style="color:#00d083;font-weight:600;">Why this works:</span> Converts new discoverers into first bookings.</p>
              </td>
            </tr>
            <tr><td style="height:10px;font-size:0;">&nbsp;</td></tr>`

      template = shell(
        `<div style="padding:36px 30px;">
          <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Fresh offer ideas for ${biz}</h2>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">${hiHtml}</p>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">Offers are how QWIKKER turns discovery into footfall. ${
            offers.length
              ? `Here are ideas drafted for <strong style="color:#fff;">${biz}</strong> from your listing — edit, swap, or publish in a few taps.`
              : `Here are proven offer patterns that work well for local businesses like <strong style="color:#fff;">${biz}</strong> — customise them in your dashboard.`
          }</p>

          <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px 20px 10px;margin:0 0 20px;">
            <h3 style="margin:0 0 6px;font-size:15px;color:#ffffff;">${offers.length ? `Drafted for you` : `Ideas to steal`}</h3>
            <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#b0b0b0;">Limited-time beats forever discounts. Keep one live, measure claims, then rotate.</p>
            <table style="width:100%;border-collapse:collapse;">${offerRows}</table>
          </div>

          <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:18px 20px;margin:0 0 24px;">
            <h3 style="margin:0 0 8px;font-size:15px;color:#ffffff;">Quick tip</h3>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#e0e0e0;">Pair an offer with your loyalty stamp card — first visit gets them in; the wallet card brings them back.</p>
          </div>

          <div style="margin:28px 0 12px;text-align:center;">
            <a href="${base}/dashboard/offers" style="display:inline-block;background:#00d083;color:#000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;">Create or publish an offer</a>
          </div>
          <p style="font-size:13px;line-height:1.6;color:#888;margin:0 0 24px;text-align:center;">Need a hand? Reply or email <a href="mailto:${support}" style="color:#00d083;">${support}</a>.</p>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER Team</p>
        </div>`,
        city,
        `Fresh offer ideas for ${ctx.businessName}`,
        `${hiText}\n\nOffer ideas for ${ctx.businessName}:\n${offers.map((o) => `• ${o.name} — ${o.value}`).join('\n') || '• Weekday special\n• First-visit welcome'}\n\n${base}/dashboard/offers`
      )
      break
    }
    case 'trial_extension': {
      const days = ctx.trialDays || 7
      template = shell(
        `<div style="padding:36px 30px;">
          <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Great news for ${biz}</h2>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">We&rsquo;ve extended the free trial for <strong style="color:#fff;">${biz}</strong> by <strong style="color:#00d083;">${days} days</strong> — so you have more time to see what Spotlight / Featured can do for you.</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:24px 0;">
            <tr>
              <td style="background:#141414;border:1px solid #00d083;border-radius:10px;padding:22px 20px;text-align:center;">
                <p style="margin:0 0 6px;font-size:11px;color:#00d083;text-transform:uppercase;letter-spacing:1.5px;">Trial extended</p>
                <p style="margin:0;font-size:24px;color:#ffffff;font-weight:700;">+${days} days</p>
                <p style="margin:10px 0 0;font-size:13px;color:#8f8f8f;">No card required &nbsp;&middot;&nbsp; Cancel anytime</p>
              </td>
            </tr>
          </table>

          <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:0 0 24px;">
            <h3 style="margin:0 0 12px;font-size:15px;color:#ffffff;">Make the extra days count</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:#e0e0e0;"><span style="color:#00d083;margin-right:8px;">1.</span> Publish at least one live offer this week</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:#e0e0e0;"><span style="color:#00d083;margin-right:8px;">2.</span> Turn on / share your loyalty stamp card</td></tr>
              <tr><td style="padding:8px 0;font-size:14px;color:#e0e0e0;"><span style="color:#00d083;margin-right:8px;">3.</span> Check analytics after a few days — views, saves, claims</td></tr>
            </table>
          </div>

          <div style="margin:28px 0 12px;text-align:center;">
            <a href="${base}/dashboard" style="display:inline-block;background:#00d083;color:#000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;">Open your dashboard</a>
          </div>
          <p style="font-size:13px;line-height:1.6;color:#888;margin:0 0 24px;text-align:center;">Questions? <a href="mailto:${support}" style="color:#00d083;">${support}</a></p>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER Team</p>
        </div>`,
        city,
        'Your Qwikker trial has been extended',
        `Great news for ${ctx.businessName}. We've extended the free trial by ${days} days.\n\n${base}/dashboard\n\n${support}`
      )
      break
    }
    case 'loyalty_card_ready': {
      const loyaltyUrl = ctx.loyaltyUrl || `${base}/dashboard/loyalty`
      template = shell(
        `<div style="padding:36px 30px;">
          <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Your loyalty card is ready</h2>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">${hiHtml}</p>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">The digital stamp card for <strong style="color:#fff;">${biz}</strong> is live. It sits in your customers&rsquo; Apple or Google Wallet — no app to download, no paper cards to lose.</p>

          <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:0 0 20px;">
            <h3 style="margin:0 0 12px;font-size:15px;color:#ffffff;">Why this matters</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;font-size:14px;line-height:1.6;color:#e0e0e0;">
                  <span style="color:#00d083;margin-right:8px;">&#9679;</span><strong style="color:#fff;">Always in their pocket</strong> — phones don&rsquo;t get left in a drawer
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;font-size:14px;line-height:1.6;color:#e0e0e0;">
                  <span style="color:#00d083;margin-right:8px;">&#9679;</span><strong style="color:#fff;">Turns first-timers into regulars</strong> — reward the 2nd, 3rd, 5th visit
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;line-height:1.6;color:#e0e0e0;">
                  <span style="color:#00d083;margin-right:8px;">&#9679;</span><strong style="color:#fff;">You control the rules</strong> — stamps, rewards, and copy from your dashboard
                </td>
              </tr>
            </table>
          </div>

          <div style="background:rgba(0,208,131,0.06);border:1px solid rgba(0,208,131,0.35);border-radius:8px;padding:16px 18px;margin:0 0 24px;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#e0e0e0;"><strong style="color:#00d083;">Tip:</strong> Put a table tent or QR near the till — &ldquo;Add our stamp card to your wallet&rdquo; — and pair it with a first-visit offer.</p>
          </div>

          <div style="margin:28px 0 12px;text-align:center;">
            <a href="${loyaltyUrl}" style="display:inline-block;background:#00d083;color:#000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;">Open loyalty settings</a>
          </div>
          <p style="font-size:13px;line-height:1.6;color:#888;margin:0 0 24px;text-align:center;">Questions? <a href="mailto:${support}" style="color:#00d083;">${support}</a></p>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER Team</p>
        </div>`,
        city,
        `Your loyalty card is ready — ${ctx.businessName}`,
        `${hiText}\n\nYour Qwikker loyalty program for ${ctx.businessName} is ready to share.\n${loyaltyUrl}\n\n${support}`
      )
      break
    }
    case 'weekly_digest': {
      const s = ctx.stats || {}
      const days = s.periodDays || 7
      const views = s.profileViews ?? 0
      const claims = s.offerClaims ?? 0
      const saves = s.saves ?? 0
      const quiet = views === 0 && claims === 0 && saves === 0
      template = shell(
        `<div style="padding:36px 30px;">
          <h2 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 20px;">Your Qwikker week</h2>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 16px;">${hiHtml}</p>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0 0 20px;">Here&rsquo;s what QWIKKER did for <strong style="color:#fff;">${biz}</strong> in the last ${days} days — real activity from your listing, not vanity estimates.</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:0 0 20px;">
            <tr>
              <td width="33%" style="padding:4px;">
                <div style="background:#141414;border:1px solid #333;border-radius:10px;padding:18px 12px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:28px;font-weight:700;color:#00d083;">${views}</p>
                  <p style="margin:0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Profile views</p>
                </div>
              </td>
              <td width="33%" style="padding:4px;">
                <div style="background:#141414;border:1px solid #333;border-radius:10px;padding:18px 12px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:28px;font-weight:700;color:#00d083;">${claims}</p>
                  <p style="margin:0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Offer claims</p>
                </div>
              </td>
              <td width="33%" style="padding:4px;">
                <div style="background:#141414;border:1px solid #333;border-radius:10px;padding:18px 12px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:28px;font-weight:700;color:#00d083;">${saves}</p>
                  <p style="margin:0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Saves</p>
                </div>
              </td>
            </tr>
          </table>

          <div style="background:rgba(255,255,255,0.04);border:1px solid #333;border-radius:8px;padding:20px;margin:0 0 24px;">
            <h3 style="margin:0 0 10px;font-size:15px;color:#ffffff;">${quiet ? 'A quiet week — easy wins' : 'How to push next week'}</h3>
            <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#e0e0e0;">${
              quiet
                ? 'Low numbers usually mean the listing needs a fresh offer or a loyalty nudge. Publish one limited-time offer and mention your stamp card in-store.'
                : claims > 0
                  ? 'People are claiming offers — keep one live and consider a midweek special to keep momentum.'
                  : views > 0
                    ? 'You&rsquo;re getting views. Add or refresh an offer so discovery turns into visits.'
                    : 'Check your profile completeness and keep an offer live so interest has somewhere to go.'
            }</p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#b0b0b0;">Tip: pair an offer with your wallet loyalty card — first visit in, repeat visits back.</p>
          </div>

          <div style="margin:28px 0 12px;text-align:center;">
            <a href="${base}/dashboard/analytics" style="display:inline-block;background:#00d083;color:#000;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;">View full analytics</a>
          </div>
          <p style="font-size:13px;line-height:1.6;color:#888;margin:0 0 8px;text-align:center;">
            <a href="${base}/dashboard/offers" style="color:#00d083;">Manage offers</a>
            &nbsp;&nbsp;·&nbsp;&nbsp;
            <a href="${base}/dashboard/loyalty" style="color:#00d083;">Loyalty</a>
          </p>
          <p style="font-size:13px;line-height:1.6;color:#888;margin:0 0 24px;text-align:center;">Questions? <a href="mailto:${support}" style="color:#00d083;">${support}</a></p>
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;">Best,<br>The QWIKKER Team</p>
        </div>`,
        city,
        `${ctx.businessName}: your Qwikker week in ${city}`,
        `${hiText}\n\nLast ${days} days for ${ctx.businessName}:\n- Views: ${views}\n- Claims: ${claims}\n- Saves: ${saves}\n\n${base}/dashboard/analytics`
      )
      break
    }
    case 'custom': {
      // Admin writes the message body; shell + support + city team sign-off are preloaded
      const cityLabel = city.charAt(0).toUpperCase() + city.slice(1)
      const bodyHtml = ctx.customHtml
        ? ctx.customHtml
        : `<p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:0;white-space:pre-wrap;">${escapeHtml(ctx.customText || 'Your message here…').replace(/\n/g, '<br/>')}</p>`
      template = shell(
        `<div style="padding:36px 30px;">${bodyHtml}
          <p style="font-size:15px;line-height:1.7;color:#e0e0e0;margin:28px 0 0;">Best,<br>The QWIKKER ${escapeHtml(cityLabel)} Team</p>
          <p style="font-size:14px;line-height:1.6;color:#b0b0b0;margin:20px 0 0;">Questions? Reply or email <a href="mailto:${support}" style="color:#00d083;">${support}</a>.</p>
        </div>`,
        city,
        ctx.customSubject || `Message from Qwikker ${city}`,
        `${ctx.customText || 'Your message here…'}\n\nBest,\nThe QWIKKER ${cityLabel} Team\n\nQuestions? ${support}`
      )
      break
    }
    default:
      throw new Error(`Unknown template: ${key}`)
  }

  if (def?.requiresMarketingUnsub) {
    return {
      ...template,
      html: injectUnsub(template.html, city, ctx),
      text: `${template.text || ''}\n\n---\nUnsubscribe: ${buildUnsubUrl(base, {
        city,
        email: ctx.email,
        businessId: ctx.businessId,
        scope: 'all_marketing',
        sendId: ctx.sendIdForUnsub,
      })}`,
    }
  }
  return template
}
