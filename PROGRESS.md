# Progress Tracker

> Quick reference for new chats. Full plan is in `.cursor/plans/platform_audit_roadmap_7ed16549.plan.md`
>
> Start any new chat with: "Read PROGRESS.md and the plan file, then continue with the next pending item."

## Current Status

- **Tier 0:** 14/16 complete. Remaining: 0.14 (marketing pages), 0.22 (pre-launch env vars)
- **Tier 1:** 6/7 complete. Remaining: 1.6 (vibes bugs)
- **Tier 2:** 2.1-2.4 complete. 2.5 complete. 2.15 + 2.16 + 2.18 + 2.19 complete. 2.6-2.11, 2.17 pending. 2.20, 2.21, 2.22 added.
- **Tier 3:** Not started
- **Tier 4:** Backlog

## Next up (in order per execution rule)

1. Finish Tier 0 remaining (0.14, 0.22)
2. Finish Tier 1 (1.6 vibes bugs)
3. Finish Tier 2 (2.6-2.11, 2.17)

## Change Impact Map

| Change | Files | Risk | What could break |
|--------|-------|------|-----------------|
| 0.19 GHL Retirement | `lib/integrations.ts`, `lib/integrations-secure.ts`, `lib/actions/business-actions.ts`, `lib/actions/seamless-updates.ts`, `lib/actions/file-actions.ts`, `app/api/admin/approve/route.ts`, `app/api/admin/approve-change/route.ts`, `app/api/franchise/crm-sync/route.ts`, `components/simplified-onboarding-form.tsx`, `components/founding-member-form.tsx`, + 7 deleted GHL routes/files | Low | All GHL functions are no-ops. All callers were fire-and-forget or try/catch. Webhook routes return 200 to prevent retry loops. If GHL was secretly still in use somewhere, that call now silently does nothing. |
| 0.21 HQ Impersonate | `app/api/hq/impersonate/route.ts` (new), `app/api/hq/stop-impersonate/route.ts` (new), `components/admin/impersonation-banner.tsx` (new), `app/admin/page.tsx`, `app/hqadmin/franchises/[id]/page.tsx` | Low | New feature only — no existing flows modified. Cookie-based with 2h expiry. If cookie parsing fails, admin page falls back to normal session. Localhost redirect goes to `/admin` not subdomain. |
| 2.16 Business Welcome Email | `lib/email/templates/business-notifications.ts`, `lib/notifications/email-notifications.ts`, `lib/actions/signup-actions.ts`, `lib/actions/business-actions.ts` | Low | Welcome email fires on signup; submitted email fires on review submit. Both non-blocking (`.catch`). If Resend is down emails silently fail — no user-facing impact. |
| 2.16 Support Email Franchise-Aware | `lib/email/send-franchise-email.ts`, `lib/actions/signup-actions.ts`, `lib/actions/business-actions.ts`, `app/api/admin/approve/route.ts`, `app/api/admin/approve-change/route.ts`, `app/api/admin/approve-claim/route.ts`, `lib/actions/event-actions.ts`, `app/api/admin/test-emails/route.ts` | Low | All email body "Questions?" links + reply-to now resolve from `franchise_crm_configs.resend_from_email` per city. Falls back to `hello@qwikker.com` if no config. Non-breaking — only changes displayed email address in templates. |
| 2.15 Consumer Welcome Email | `lib/email/templates/consumer-notifications.ts` (new), `app/api/walletpass/create-main-pass/route.ts`, `app/api/admin/test-emails/route.ts` | Low | Fires after wallet pass creation, non-blocking. All URLs include `wallet_pass_id` and use city-specific base URL. Only sends if email consent is not explicitly false. |
| 2.18 Auto-Generate Franchise Emails | `lib/email/send-franchise-email.ts`, `components/admin/admin-setup-page.tsx` | Low | "From Email" field is now read-only and auto-derived from subdomain. `getFranchiseSupportEmail` is now synchronous (returns `hello@{city}.qwikker.com`). Existing `await` calls still work (await on sync = instant resolve). No DB changes. |
| 0.13 HQ Admin Slack Notifications | `lib/utils/dynamic-notifications.ts`, `lib/actions/signup-actions.ts`, `lib/actions/business-actions.ts`, `app/api/claim/submit/route.ts`, `app/api/admin/approve/route.ts`, `app/api/user/support/route.ts` | Low | New `sendHQSlackNotification` added alongside existing city notifications. All fire-and-forget. Silently no-ops when `HQ_SLACK_WEBHOOK_URL` is not set. Zero risk to existing flows. |
| 2.19 Native Google Wallet | `app/api/walletpass/create-main-pass/route.ts`, `components/wallet/pass-installer-client.tsx`, `components/wallet-pass/improved-wallet-installer.tsx`, `lib/email/templates/consumer-notifications.ts` | Medium | Android users now redirected to Google Wallet save URL instead of .pkpass download. Falls back to .pkpass if `googleWalletUrl` is null. If WalletPush API stops returning `google.saveUrl`, Android falls back to old behaviour automatically. |
| 0.12 Stripe Integration | `lib/stripe/checkout.ts`, `app/api/stripe/create-checkout-session/route.ts`, `app/api/webhooks/stripe/route.ts`, `app/api/stripe/create-portal-session/route.ts`, `components/dashboard/pricing-plans.tsx`, `components/dashboard/settings-page.tsx`, `components/dashboard/founding-member-banner.tsx` | Medium | New payment pipeline. Pricing reads from `franchise_crm_configs.pricing_cards` (same source as UI). Founding member discount applied server-side. Monthly/annual toggle. Feature gating syncs on plan change via `getFeaturesForTier()`. Requires `STRIPE_WEBHOOK_SECRET` env var + Connect webhook in Stripe Dashboard. |
| 0.12a Subscription Upgrade Fix | `app/api/stripe/update-subscription/route.ts` (new), `app/api/webhooks/stripe/route.ts`, `components/dashboard/pricing-plans.tsx`, `components/dashboard/settings-page.tsx`, `app/dashboard/settings/page.tsx` | Medium | Upgrades/downgrades now update existing Stripe subscription in-place with proration (no new subscription created). UI routes through update API when `stripeSubscriptionId` exists. `customer.subscription.updated` webhook syncs tier/plan/features. Safety net: `checkout.session.completed` auto-cancels orphaned old subscriptions. Risk: Stripe Portal plan changes don't carry our metadata so features won't sync (businesses should use in-app UI). |
| 0.12b Stripe API + Confirmation Fixes | `app/api/stripe/update-subscription/route.ts`, `components/dashboard/pricing-plans.tsx` | Medium | **Bug 1:** `subscriptions.update()` does not support `price_data.product_data` (only `checkout.sessions.create` does). Fixed: find or create a Stripe Product per tier+city with metadata, use `product: productId`. **Bug 2:** Checkout-created Products are immutable — `products.update()` throws. Fixed: never mutate Checkout-created products; maintain our own Products via metadata lookup. **Bug 3:** No confirmation dialog on plan change — one misclick could change billing. Fixed: added Dialog showing current plan, new plan, new price, and proration explanation before executing. First-time purchases still go to Stripe Checkout (has built-in confirmation). |
| 0.12c Stripe Period Date Fix | `app/api/webhooks/stripe/route.ts`, `app/api/stripe/cancel-subscription/route.ts` | Medium | Stripe basil API (2025-03-31) moved `current_period_start/end` from top-level subscription to `items.data[]`. Webhook `handleSubscriptionUpdated` crashed with `RangeError: Invalid time value`. Cancel route returned `accessUntil: null`. Fixed: read period dates from `subscription.items.data[0]`, added `typeof === 'number'` guards on all date conversions. Cancel subscription + confirmation dialog now working end-to-end. |
| 0.11 Mobile Optimization Pass | `components/admin/pricing-card-editor.tsx`, `comprehensive-business-crm-card.tsx`, `business-crm-card.tsx`, `admin-dashboard.tsx`, `admin-analytics.tsx`, `comprehensive-admin-analytics.tsx`, `improved-dashboard-home.tsx`, `simple-post-editor.tsx`, `user-business-detail-page.tsx`, `user-chat-page.tsx`, `user-dashboard-layout.tsx`, `app/hqadmin/layout.tsx`, `components/hqadmin/hq-admin-shell.tsx` (new) | Low | Fixed dense multi-column grids (4-6 cols) without mobile breakpoints across admin, dashboard, and user pages. Added responsive stacking at `sm:`/`md:` breakpoints. HQ admin got mobile hamburger drawer (was fixed sidebar only). Admin dashboard got iOS safe-area insets. AI Chat refactored to iMessage-style layout: input pinned at screen bottom via JS-measured height, messages anchored near input via dynamic paddingTop + ResizeObserver. Desktop unchanged. |

## Task Descriptions

### 2.19 Native Google Wallet Support for Android (DONE)
WalletPush API returns `google.saveUrl` — now captured and returned to client. Android users redirected to native Google Wallet save flow instead of .pkpass download. WalletPasses app no longer required. Consumer welcome email updated.

### 2.18 Auto-Generate Franchise Email Addresses (DONE)
"From Email" field is now read-only, auto-derived from subdomain. From: `no-reply@{city}.qwikker.com`, Reply-to/support: `hello@{city}.qwikker.com`. Owner email never exposed.

### 0.22 Pre-Launch Environment Variables (pending — ESSENTIAL before go-live)
Environment variables that must be set in Vercel before production launch:
- **`STRIPE_SECRET_KEY`** — Live secret key from Stripe Dashboard → Developers → API keys (starts with `sk_live_`). Replaces the test key.
- **`STRIPE_CONNECT_CLIENT_ID`** — Platform Connect Client ID from Stripe Dashboard → Settings → Connect (starts with `ca_`). Required for franchise onboarding OAuth flow.
- **`STRIPE_WEBHOOK_SECRET`** — Signing secret from the production webhook endpoint. Must register webhook in Stripe Dashboard → Developers → Webhooks → "Listen to events on Connected accounts" → URL: `https://yourapp.com/api/webhooks/stripe`. Events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- **`NEXT_PUBLIC_APP_URL`** — Production URL (e.g. `https://bournemouth.qwikker.com`). Used for Stripe Connect OAuth redirect URI.
- **Stripe Connect setup** — Enable Connect in Stripe Dashboard → Settings → Connect. Add OAuth redirect: `https://yourapp.com/api/admin/billing/stripe-callback`. Set platform type to direct charges.
- **`HQ_SLACK_WEBHOOK_URL`** — Slack incoming webhook for the HQ admin channel. Required for HQ to receive platform-wide notifications (new signups, claims, approvals, user support). Create at: Slack → Apps → Incoming Webhooks → Add to your HQ channel.
- **`SENTRY_DSN`** — (optional, only if Sentry is integrated later) Error monitoring DSN.
- Verify all city-specific env vars are set: `{CITY}_SLACK_WEBHOOK_URL`, Resend API keys in `franchise_crm_configs`, WalletPush credentials.
- Verify `hello@{city}.qwikker.com` email forwarding is configured in DNS (Resend/Cloudflare) for each live city.

### 2.20 Configurable Trial System & Free Listing Onboarding (pending)
Default onboarding creates a Free Listing (not a trial). Onboarding flow offers clear choice: "Get your free listing" OR "Start your free trial". Franchise admin Pricing & Billing tab gets Trial Configuration section:
- **Trial tier** dropdown (Starter / Featured / Spotlight) — franchise chooses what tier the trial gives access to
- **Trial duration** (days) — already exists as `founding_member_trial_days`, just needs UI exposure
- **Founding member toggle** (on/off, spot limit, discount %)
- **Incentive toggles** — e.g. "Extra month free for 10 loyalty members in first 30 days"
- **Trial terms text** — customisable per franchise
- Refactor all 15+ hardcoded "trial = featured" references across codebase (signup-actions, entitlement-helpers, pricing-plans, dashboard-home, AI chat, tier-management, cleanup functions, etc.)
- DB: add `trial_tier_name` column to `franchise_crm_configs`, update `setup_free_trial_on_approval` trigger
- **Depends on:** 0.12 Stripe Integration (need payments working before trial-to-paid conversion matters)

### 2.21 Founding Member Counter & Landing Page Controls (pending)
- Visible "Only X founding member spots left in {city}" counter on city landing pages
- Franchise admin toggle: show/hide counter on landing page
- Data already exists: `founding_member_total_spots` on `franchise_crm_configs`, `is_founding_member_spot_available` function in DB
- Part of a broader **Landing Page Editor** tab in franchise admin dashboard

### 2.22 Landing Page Editor & Sponsor Banners (pending)
Franchise admin tab for customising their city landing page:
- **Sponsor banner**: toggle on/off, upload sponsor logos, editable sponsor text/tagline
- **Founding member counter**: toggle on/off (from 2.21)
- **Hero section**: customisable headline, subtitle, background image
- Future: drag-and-drop section ordering, custom CTAs, featured businesses carousel config

## Key Rules

- Complete each tier fully before starting the next
- DB changes: provide SQL for manual execution + sanity checks
- No emojis in UI. No AI slop. Premium tone.
- Multi-tenant: everything city/franchise-aware
- Identity: wallet_pass_id, no login/logout
