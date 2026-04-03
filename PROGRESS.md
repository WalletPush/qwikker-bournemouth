# Progress Tracker

> Quick reference for new chats. Full plan is in `.cursor/plans/platform_audit_roadmap_7ed16549.plan.md`
>
> Start any new chat with: "Read PROGRESS.md and the plan file, then continue with the next pending item."

## Current Status

- **Tier 0:** 16/16 complete. Remaining: 0.14 (marketing pages), 0.22 (pre-launch env vars)
- **Tier 1:** 7/7 complete (subject to testing)
- **Tier 2:** 2.1-2.4, 2.6-2.7, 2.12-2.16, 2.18-2.22 complete. 2.5 partially done. 2.8-2.11, 2.17, 2.23, **2.24** pending. **2.21-2.22 need testing on production subdomain.**
- **Tier 3:** Not started
- **Tier 4:** Backlog

## Next up (in order per execution rule)

1. **2.24 — Claim Flow Trial Option (CRITICAL / PRE-LAUNCH)**
2. Finish Tier 0 remaining (0.14, 0.22)
3. Finish Tier 2 (2.8-2.11, 2.17, 2.23)

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
| 2.6 Business Vibe Tags | `lib/constants/vibe-tags.ts` (new), `components/dashboard/clean-profile-page.tsx`, `components/dashboard/business-info-page.tsx`, `components/dashboard/action-items-page.tsx`, `components/claim/confirm-business-details.tsx`, `app/claim/page.tsx`, `app/api/claim/submit/route.ts`, `app/api/admin/approve-claim/route.ts`, `components/user/user-business-detail-page.tsx`, `app/user/discover/page.tsx`, `lib/ai/hybrid-chat.ts`, `components/admin/comprehensive-business-crm-card.tsx`, `lib/actions/business-actions.ts`, `lib/actions/seamless-updates.ts` | Medium | **DB:** `vibe_tags` JSONB column added to `business_profiles`; `edited_vibe_tags` TEXT added to `claim_requests`. Three views updated (`business_profiles_chat_eligibility`, `business_profiles_chat_eligible`, `business_profiles_lite_eligible`). If views were recreated without the column, AI chat context and discover page would silently lose tag data. **Profile page:** Vibe Tags + Booking cards added to `clean-profile-page.tsx` — if `updateBusinessInfo` server action rejects unknown fields, saves would fail (tested: it's a pass-through, safe). **Claim flow:** `edited_vibe_tags` passed as JSON string in FormData — if approval route can't parse it, tags silently null (graceful). **Discover search:** vibe tags concatenated into search text — bad JSONB shape could cause runtime error on `.map()` (mitigated: optional chaining). **AI chat:** tags appended to context block — worst case extra whitespace if null. **Action item links:** All `/dashboard/business` hrefs replaced with `/dashboard/profile` — old page still exists at route but is unreachable from sidebar. |
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

### 2.24 Claim Flow Trial Option (CRITICAL — NOT STARTED)
**Priority: PRE-LAUNCH BLOCKER.** The claim flow (`/claim`) does NOT offer a Free Trial option. When a business owner claims their auto-imported listing, they are silently assigned `claimed_free` with `is_in_free_trial: false` — no choice is presented. This is a major gap because claiming businesses are the most engaged leads and should be offered the same "Free Listing vs Free Trial" choice that exists in the onboarding flow (`/onboarding`).

**What needs to happen:**
1. **Claim confirm step** (`components/claim/confirm-business-details.tsx`): Add "Free Listing vs Free Trial" card selector (same UI as onboarding Step 6). Read trial tier/days from `franchise_crm_configs` via API.
2. **Claim submit API** (`app/api/claim/submit/route.ts`): Accept and store `plan_choice` ('free' | 'trial') on the `claim_requests` row. New column needed: `plan_choice TEXT DEFAULT 'free'`.
3. **Approve claim API** (`app/api/admin/approve-claim/route.ts`): If `claim.plan_choice === 'trial'`, call `approve_business_with_trial()` SQL function instead of creating a basic free subscription. This sets `status = 'approved'` (not `claimed_free`), `is_in_free_trial = true`, and `free_trial_end_date` from franchise config.
4. **Admin CRM**: Show which plan the claimer chose so admin knows before approving.
5. **DB**: `ALTER TABLE claim_requests ADD COLUMN plan_choice TEXT DEFAULT 'free'`

**Risk:** Medium. Touches the claim → approval pipeline. Must not break existing pending claims (default to 'free'). Trial expiry, cleanup cron, and expired trials tab must all work for claim-originated trials the same as onboarding-originated trials.

**What could break:** Approving a claim with `plan_choice = 'trial'` would set status to `'approved'` instead of `'claimed_free'` — downstream code that checks for `claimed_free` status may behave differently. Need to audit `claimed_free` references.

### 2.20 Configurable Trial System & Free Listing Onboarding (DONE — core complete)
Onboarding now offers "Free Listing" vs "Free Trial" choice. Franchise admin can configure trial tier (Starter/Featured/Spotlight) and duration via City Configuration > Trial & Onboarding. All 4 SQL functions (`approve_business_with_trial`, `extend_business_trial`, `restore_trial_status`, `cleanup_expired_trials`) dynamically read from `franchise_crm_configs`. 15+ hardcoded "trial = featured" references refactored. Shared `getFeaturesForTier()` helper extracted. Pre-approval UX fixed: unapproved businesses see "Pending Approval" instead of fake countdown. Remaining: incentive toggles, trial terms text, founding member toggle UI.

### 2.21 Founding Member Counter & Landing Page Controls (DONE)
Counter on city landing pages ("Only X spots left"), admin toggle + total spots input in Landing Page editor. Wired into claim flow — auto-assigns `is_founding_member = true` on submission. Spots reserved on pending+approved claims. DB: reads from `landing_page_config` JSONB, counts from `claim_requests`.

### 2.22 Landing Page Editor & Sponsor Banners (DONE)
Landing Page sub-tab in admin city config. Hero customisation (headline, subtitle, background image via Cloudinary). Sponsor banner at bottom of page. Supporters section ("Proudly supported by" with multiple logos). Founding member counter toggle + total spots. Featured businesses carousel. API: `GET/POST /api/admin/landing-page` with Zod validation. DB: `landing_page_config` JSONB column on `franchise_crm_configs` + updated `franchise_public_info` view. **Needs testing on production subdomain.**

### 2.6 Business Vibe Tags (DONE)
JSONB `vibe_tags` column on `business_profiles` stores `{ selected: string[], custom: string[] }`. Three categories of fixed tags (Atmosphere, Good for, Amenities) defined in `lib/constants/vibe-tags.ts` plus up to 3 custom free-text tags. Integrated into: Profile editor (pill selector + custom input + save), Action Items (recommended nudge when null), Claim flow (picker in confirm step, stored as `edited_vibe_tags` on `claim_requests`, applied on approval), User-facing business detail page (pills in Overview tab), Discover page (tags included in search matching), AI chat (tags in business context block), Admin CRM card (read-only display). Profile page also backfilled missing Booking card, Business Category field, Business Postcode field, helper text/character counters, and required field markers. Featured items capped at 5 for all users. All action item links audited and fixed — no links point to inaccessible `/dashboard/business` route. Revalidation paths updated to include `/dashboard/profile`.

**DB changes applied (manual SQL, not migrations):**
- `ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS vibe_tags JSONB DEFAULT NULL`
- `ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS edited_vibe_tags TEXT DEFAULT NULL`
- `CREATE OR REPLACE VIEW` on `business_profiles_chat_eligibility`, `business_profiles_chat_eligible`, `business_profiles_lite_eligible` — each had `vibe_tags` appended to SELECT list

**Testing checklist:**
1. **Profile editor:** Go to `/dashboard/profile`, scroll to Vibe Tags card. Select several fixed tags, add 1-2 custom tags, save. Refresh page — tags should persist. Deselect some, save again — changes persist.
2. **Booking card:** On same page, set booking preference to each option. Save. Refresh — preference persists. If "Online booking link" selected, enter URL, save, verify it persists.
3. **Featured items limit:** Try adding more than 5 items — "Add Item" button should disable with "(Limit reached)".
4. **Action items:** If vibe_tags is null, "Add vibe tags" recommended item should appear. Link should go to `/dashboard/profile#vibe-tags`. If booking_preference is null, "Set up online booking" should appear linking to `/dashboard/profile#booking`.
5. **Claim flow:** Start a new claim. On the confirm details step, vibe tag picker should appear. Select some tags, submit claim. Check `claim_requests` table — `edited_vibe_tags` should contain JSON string.
6. **Admin approval:** Approve a claim that has `edited_vibe_tags`. Check `business_profiles` — `vibe_tags` should be populated with the parsed JSONB.
7. **User detail page:** View an approved business with vibe tags. Pills should render in Overview tab under "Vibes" heading.
8. **Discover page:** Search for a vibe tag term (e.g. "dog friendly"). Businesses with that tag should appear in results.
9. **AI chat:** Ask the AI about a business with vibe tags (e.g. "somewhere dog friendly"). Response should reference the tag. Check console/context — tags should appear in AVAILABLE BUSINESSES block.
10. **Admin CRM:** Open a business CRM card for a business with vibe tags. Read-only pills should display in Overview tab.
11. **Regression:** Verify all other action item links still work (business name, hours, description, tagline, address, logo, photo, featured items, offers, secret menu, files).

## Key Rules

- Complete each tier fully before starting the next
- DB changes: provide SQL for manual execution + sanity checks
- No emojis in UI. No AI slop. Premium tone.
- Multi-tenant: everything city/franchise-aware
- Identity: wallet_pass_id, no login/logout
