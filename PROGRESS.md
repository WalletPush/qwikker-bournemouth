# Progress Tracker

> Quick reference for new chats. Full plan is in `.cursor/plans/platform_audit_roadmap_7ed16549.plan.md`
>
> Start any new chat with: "Read PROGRESS.md and the plan file, then continue with the next pending item."

## Current Status

- **Tier 0:** 20/20 complete. All P0/P1 critical bugs fixed (April 2026). Remaining: 0.14 (marketing pages), 0.22 (pre-launch env vars).
- **Tier 1:** 7/7 complete (subject to testing)
- **Tier 2:** 2.1-2.4, 2.6-2.7, 2.12-2.16, 2.18-2.26, 2.28 complete. 2.5 partially done. **No PRE-LAUNCH BLOCKERS remaining.** Pending: 2.27 (wizard), 2.8-2.11, 2.17.
- **Tier 3:** Intelligence plumbing (3.1-3.4) scoped — wire existing user data into AI chat + feed. No new tables for Phase 1.
- **Tier 4:** Backlog

## Execution Priority (April 2026)

1. ~~**0.23 Trial System Fix**~~ — DONE. Root cause: stale DB trigger `setup_free_trial_on_approval` racing the RPC. Trigger dropped. Code fixes already in place.
2. ~~**0.24 Loyalty Pass Fix**~~ — DONE. Removed unused `Earn_Url` field from join + retry routes.
3. ~~**0.25 Email Recipient Bug**~~ — DONE. All notification functions now use `data.email`. Interfaces updated.
4. ~~**2.26 Submit CTA + Menu Tab**~~ — DONE. Submit CTA hidden for pending_review/approved. Menu tab checks menuPreview before AI prompt.
5. ~~**0.26 Pricing Card Overflow**~~ — DONE. Responsive fonts + min-w-0 + break-words on pricing cards.
6. ~~**USER ACTION: Data fix SQL**~~ — DONE. Coastal Pantry subscription + features + business_tier fixed.
7. ~~**2.24 Claim Flow Trial**~~ — DONE. Plan choice cards in claim flow, approve-claim routes to RPC for trial. USER ACTION: Run `ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS plan_choice TEXT DEFAULT 'free'`
8. ~~**2.25 Loyalty System Audit**~~ — DONE. Earn route now issues WalletPush pass on auto-create. Wallet buttons in earn page + QR scanner.
9. ~~**2.28 Google Review Gate**~~ — DONE. Self-reported rating input on manual onboarding, admin verify button on CRM card, soft 4.4 gate on approve routes.
10. ~~**0.29 Identity + Shortlink Critical Fix**~~ — DONE. Three bugs: (a) `updatePassLinksAsync` scoping error since March 4 = zero passes got shortlinks, (b) cookie never set reliably = identity lost across pages, (c) layout nav links lost wallet_pass_id on first render.
11. ~~**0.30 Loyalty Pass Front Update Fix**~~ — DONE. Sequential awaits with delays on WalletPush PUT calls. Status text cleaned up for reward states.
12. ~~**0.31 Wallet Install Banner Fix**~~ — DONE. Banner no longer shows false positive after pass installed. Emoji replaced with proper icon.
13. ~~**0.32 AI Chat Loyalty Nudge Fix**~~ — DONE. Strengthened prompt from "may" to "MUST" for reward-ready businesses. Context-aware: leads with rewards on broad discovery, PS footnote on specific intent.
14. **3.1 Intelligence Plumbing — Wire Existing Data Into AI Chat** — HIGH PRIORITY. Read `preferred_categories`, `dietary_restrictions`, recent vibes, saved businesses, offer claims from existing tables and inject as `USER PROFILE` section in chat system prompt. No new tables needed — just plumbing. Data exists in 8+ tables but none of it reaches the AI today.
15. **3.2 Persist Chat Context** — Save chat messages to a `chat_messages` table. Load last N messages on new chat instead of relying on client-side history. AI remembers conversations across sessions.
16. **3.3 Feed Personalization** — Wire `preferred_categories` + user lat/lng into `buildHomeFeed`. Boost matching businesses in home feed. Feed the "Based on what you like" section with dietary restrictions.
17. **3.4 Lightweight User Insights** — Nightly/weekly aggregation of top cuisines, visit patterns, average time. Store as jsonb on `app_users`. Feed into chat + feed ranking. Only after 3.1-3.3 prove value.
18. **2.27 Action Items Wizard** — UX redesign of action items as multi-step wizard.
19. **TEST SESSION** — Full end-to-end test of trial system + claim trial flow.
20. Finish Tier 0 remaining (0.14, 0.22)
21. Finish Tier 2 (2.8-2.11, 2.17)

### WalletPush SDK Investigation (Backlog)
Spoke to WalletPush about using the Mobile Wallet SDK for loyalty card creation inside Qwikker. The SDK has template creation and batch field update APIs, but each template has its own API key and the `templateJson` schema is undocumented. Need to confirm: (1) Can an API key with `admin:full` scope create new templates? (2) What's the `templateJson` schema? (3) Is there a batch field update REST endpoint? If answers are positive, could automate loyalty card setup from the business dashboard without city admins leaving Qwikker.

## Critical Issues Found (April 2026 Audit)

### 0.23 Trial System Critical Fix (P0) -- FIXED
**Symptoms:** Bournemouth configured for 30-day Spotlight trial. Dashboard showed 119 days. All Spotlight features locked. Admin CRM showed 90 days. Subscription pointed to free tier instead of trial tier.

**ROOT CAUSE: Stale database trigger `setup_free_trial_on_approval`** (verified via `pg_trigger` + `pg_get_functiondef` on live DB). This trigger from the original billing system (Sept 2025) was never removed when the `approve_business_with_trial` RPC replaced it. The trigger fires `AFTER UPDATE ON business_profiles` when status changes to 'approved', creating a subscription with the FREE tier and hardcoded 120 days — racing the RPC and winning every time because the approve route set status='approved' before calling the RPC.

**Fix applied:**
1. Trigger dropped: `DROP TRIGGER trigger_setup_free_trial_on_approval ON business_profiles`
2. Approve route already fixed (previous session): trial path doesn't set status in initial update, lets RPC handle it
3. Features update already added after RPC call
4. `isFeatureUnlocked()` already fixed to check tier before JSONB
5. Admin CRM defaults already fixed (30 days, plan-aware features)
6. **USER ACTION NEEDED:** Run data fix SQL for existing businesses (see plan file)

### 0.24 Loyalty Pass Earn_Url Fix (P0) -- FIXED
**Symptom:** 400 Bad Request on every loyalty pass join attempt. "Form field Earn_Url does not match any template placeholder"

**Root cause:** WalletPush template no longer has an `Earn_Url` placeholder. Code was sending it anyway.

**Fix:** Removed unused `earnUrl` variable from `join/route.ts` and `retry-pass/route.ts`.

### 0.25 Business Email Recipient Bug (P1) -- FIXED
**Symptom:** Business owners never receive approval or rejection emails.

**Root cause:** Email functions used `businessName` as the `to:` address instead of actual email.

**Fix (already applied in previous session):** All three notification functions (`approval`, `rejection`, `offer`) now use `data.email`. Interfaces include `email: string`. Callers pass `data.email`.

### 0.26 Pricing Card Overflow (P2) -- FIXED
**Symptom:** Bali pricing cards (IDR currency) overflow card borders on MacBook screens.

**Root cause:** 4-col grid + `text-3xl` + long IDR strings (Rp1,600,000) + no `min-w-0` + no responsive font.

**Fix:** Added `min-w-0` to card elements, responsive font sizes (`text-2xl lg:text-3xl`), and `break-words` on price containers. Both `pricing-plans.tsx` and `pricing-card-editor.tsx`.

### 2.26 Submit CTA + Menu Tab Fixes (P1) -- FIXED
**Issue A:** Submit CTA now hidden for `pending_review` and `approved` statuses. "Under Review" banner shows when `pending_review`.
**Issue B:** Menu tab now checks `menuPreview.length > 0` before showing AI prompt. Shows "No Menu Items Yet" for claimed businesses without menu data.

### 2.27 Action Items Wizard Redesign (Feature)
Replace flat action items list with multi-step wizard. Required vs recommended steps. Auto-progression. Inline forms. Final "Submit for Review" at end. Blocks submission until required items complete.

### 2.28 Google Review Rating Gate (Feature)
**Google-verified path:** Rating is auto-captured from Google Places but never enforced — 3-star businesses sail through. Need explicit pass/fail display + soft block below 4.4.
**Manual listing path:** No input field exists at all — `rating: 0, review_count: 0` hardcoded. Need to add a "What's your Google rating?" step with numeric inputs and an "I don't have a Google listing" option. Both paths should flag below-threshold businesses for admin review (`quality_flagged`).

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
| 2.24 Claim Flow Trial Option | `components/claim/confirm-business-details.tsx`, `app/claim/page.tsx`, `app/api/claim/submit/route.ts`, `app/api/admin/approve-claim/route.ts` | Medium | Claim flow now offers Free Listing vs Free Trial choice. Trial path calls `approve_business_with_trial` RPC. Trial claims get `status = 'approved'` (not `claimed_free`) + `visibility: 'ai_enabled'`. DB: new `plan_choice` column on `claim_requests`. If column missing, defaults to free. If RPC fails, falls back to `claimed_free`. Existing pending claims unaffected — null plan_choice routes to free path. |
| 0.29 Identity + Shortlink Fix | `create-main-pass/route.ts`, `lib/supabase/middleware.ts`, `user-dashboard-layout.tsx` | Low | Fixed `updatePassLinksAsync` scoping bug (missing `walletpushDashboardUrl` param since `dce02c79` March 4 → zero shortlinks set on any pass). Middleware now sets `qwikker_wallet_pass_id` cookie from URL params (reliable — replaces broken `cookies().set()` in server components). Layout `resolvedPassId` initialised from prop (no useEffect delay). Existing passes since March 4 have stale placeholder URLs — users must reinstall or call update-existing-links API. |
| 2.25 Loyalty Earn Pass Fix | `app/api/loyalty/earn/route.ts`, `components/loyalty/earn-page-client.tsx`, `components/loyalty/qr-scanner.tsx` | Low-Medium | Earn route now issues WalletPush pass when auto-creating membership (first earn for new members). Looks up user from `app_users`, calls `issueLoyaltyPass`, stores serial. Response includes `passCreated`/`appleUrl`/`googleUrl`. Client components show wallet install buttons. Existing members unaffected. If WalletPush fails, earn still succeeds (stamp recorded), user can retry-pass later. First earn is ~1-2s slower. |
| 2.6 Business Vibe Tags | `lib/constants/vibe-tags.ts` (new), `components/dashboard/clean-profile-page.tsx`, `components/dashboard/business-info-page.tsx`, `components/dashboard/action-items-page.tsx`, `components/claim/confirm-business-details.tsx`, `app/claim/page.tsx`, `app/api/claim/submit/route.ts`, `app/api/admin/approve-claim/route.ts`, `components/user/user-business-detail-page.tsx`, `app/user/discover/page.tsx`, `lib/ai/hybrid-chat.ts`, `components/admin/comprehensive-business-crm-card.tsx`, `lib/actions/business-actions.ts`, `lib/actions/seamless-updates.ts` | Medium | **DB:** `vibe_tags` JSONB column added to `business_profiles`; `edited_vibe_tags` TEXT added to `claim_requests`. Three views updated (`business_profiles_chat_eligibility`, `business_profiles_chat_eligible`, `business_profiles_lite_eligible`). If views were recreated without the column, AI chat context and discover page would silently lose tag data. **Profile page:** Vibe Tags + Booking cards added to `clean-profile-page.tsx` — if `updateBusinessInfo` server action rejects unknown fields, saves would fail (tested: it's a pass-through, safe). **Claim flow:** `edited_vibe_tags` passed as JSON string in FormData — if approval route can't parse it, tags silently null (graceful). **Discover search:** vibe tags concatenated into search text — bad JSONB shape could cause runtime error on `.map()` (mitigated: optional chaining). **AI chat:** tags appended to context block — worst case extra whitespace if null. **Action item links:** All `/dashboard/business` hrefs replaced with `/dashboard/profile` — old page still exists at route but is unreachable from sidebar. |
| 2.23 Landing Page Sections + Claim/Trial Fixes | `components/marketing/city-landing-page.tsx`, `app/page.tsx`, `components/admin/landing-page-editor.tsx`, `app/api/admin/landing-page/route.ts`, `components/business-hours-input.tsx`, `components/claim/confirm-business-details.tsx`, `app/api/claim/search/route.ts`, `app/api/admin/approve-claim/route.ts`, `app/api/claim/submit/route.ts`, `components/dashboard/claim-welcome-modal.tsx`, `components/dashboard/improved-dashboard-home.tsx`, `components/dashboard/pricing-plans.tsx`, `app/api/admin/pricing-cards/route.ts` | Medium | 13 files touched. Landing page adds 4 new sections (no existing sections modified). Claim search now returns `business_hours` (new field in response — backwards compatible). Approval route clears `business_hours_structured` when edited hours present (could affect profile display for future approvals — intended). Welcome modal lost emoji content (intentional). Pricing cards API returns 2 new fields (additive). Free Listing features updated to match reality. |
| 0.11 Mobile Optimization Pass | `components/admin/pricing-card-editor.tsx`, `comprehensive-business-crm-card.tsx`, `business-crm-card.tsx`, `admin-dashboard.tsx`, `admin-analytics.tsx`, `comprehensive-admin-analytics.tsx`, `improved-dashboard-home.tsx`, `simple-post-editor.tsx`, `user-business-detail-page.tsx`, `user-chat-page.tsx`, `user-dashboard-layout.tsx`, `app/hqadmin/layout.tsx`, `components/hqadmin/hq-admin-shell.tsx` (new) | Low | Fixed dense multi-column grids (4-6 cols) without mobile breakpoints across admin, dashboard, and user pages. Added responsive stacking at `sm:`/`md:` breakpoints. HQ admin got mobile hamburger drawer (was fixed sidebar only). Admin dashboard got iOS safe-area insets. AI Chat refactored to iMessage-style layout: input pinned at screen bottom via JS-measured height, messages anchored near input via dynamic paddingTop + ResizeObserver. Desktop unchanged. |

| 0.30 Loyalty Pass Front Fix | `app/api/loyalty/earn/route.ts`, `app/api/loyalty/redemption/consume/route.ts`, `app/api/loyalty/redemption/reset-pass/route.ts` | Low | WalletPush field updates now sequential with `await` + 500ms delays. If WalletPush API is slow, earn/redeem response time increases by ~1.5s. Status text changed: "Reward Available!" and "Reward Redeemed!" (no stamp counter prefix). |
| 0.31 Wallet Install Banner Fix | `components/wallet/pass-installer-client.tsx`, `components/wallet/wallet-install-banner.tsx` | Low | Auto-download now clears localStorage immediately — banner won't show after normal install. Edge case: if user dismisses native iOS preview without adding pass, banner won't show as safety net (acceptable — "Add to Wallet" button still visible in installer success state). |
| 0.32 AI Chat Loyalty Nudge | `lib/ai/hybrid-chat.ts` | Low | System prompt loyalty rules strengthened. Broad discovery queries now lead with REWARD READY businesses. Specific intent queries get PS footnote. Risk: AI might over-emphasise loyalty in edge cases — monitor and tune. |

## Task Descriptions

### 0.30 Loyalty Pass Front Not Updating (DONE — April 8 2026)
**Symptom:** Front of loyalty pass showed stale progress (e.g. "2/3 Stamps") while back showed correct value (e.g. "Stamps: 3"). After redeeming, front didn't update either.

**Root cause:** All `updateLoyaltyPassField()` calls were fire-and-forget (no `await`), firing concurrently. WalletPush API drops concurrent PUT requests to the same pass — `Points` succeeded (first to arrive), `Status` silently failed (second concurrent request dropped).

**Fix:** All update calls now use `await` with 500ms delays between them: Points → (500ms) → Status → (500ms) → Last_Message. The `push: true` flag on the last call delivers all queued changes at once. Also cleaned up Status text: "Reward Available!" and "Reward Redeemed!" without redundant stamp counter prefix (e.g. was "3/3 Stamps — Reward Available!", now just "Reward Available!").

**Template mapping confirmed:** Front label "Progress" uses `${Status}` placeholder. No separate Progress field exists.

### 0.31 Wallet Install Banner False Positive (DONE — April 8 2026)
**Symptom:** Dashboard showed "Your Qwikker pass isn't in your wallet yet" banner even when the pass WAS installed. Also used an unprofessional apple emoji.

**Root cause:** Pass installer auto-downloads the .pkpass (triggering iOS native preview) but never cleared the `qwikker-pass-install` localStorage flag. Only the banner's own buttons cleared it.

**Fix:** Auto-download now clears localStorage immediately. Banner emoji replaced with SVG wallet icon. Copy made platform-aware ("Add your pass to Apple/Google Wallet" instead of presumptuous "isn't in your wallet yet").

### 0.32 AI Chat Loyalty Nudge Not Triggering (DONE — April 8 2026)
**Symptom:** User had REWARD READY at Ember & Oak, asked "where should I go tonight", AI didn't mention the reward. Only mentioned it when directly asked "do I have any rewards".

**Root cause:** System prompt used "may" language: "you may open broad discovery responses with a brief loyalty nudge". AI treated it as optional.

**Fix:** Rewrote loyalty rules to be context-aware:
- Broad discovery ("where should I go tonight") → MUST lead with REWARD READY / ALMOST THERE businesses
- Specific intent ("best Greek food") → only mention reward if business matches query; otherwise brief PS footnote
- Prevents irrelevant shoehorning while ensuring rewards are never silently ignored

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

### 2.24 Claim Flow Trial Option (DONE — April 8 2026)
Claim flow now offers "Free Listing vs Free Trial" choice, matching the onboarding flow.

**What was built:**
1. **Claim confirm step** (`confirm-business-details.tsx`): Plan choice cards at top of form. RECOMMENDED badge on trial card. Only shows when franchise has `trialDays > 0`. Defaults to "Free Listing".
2. **Claim page** (`app/claim/page.tsx`): Fetches trial config from `GET /api/admin/pricing-cards?city=X` on mount. Passes `trialConfig` to ConfirmBusinessDetails. Threads `plan_choice` through FormData.
3. **Submit API** (`app/api/claim/submit/route.ts`): Reads `planChoice`, stores as `plan_choice` on `claim_requests`. Defaults to `'free'`.
4. **Approve-claim API** (`app/api/admin/approve-claim/route.ts`): Branching logic — trial path calls `approve_business_with_trial` RPC, sets features + correct `business_tier` + `visibility: 'ai_enabled'`. Free path unchanged. Falls back to free if RPC fails. Slack message shows plan label.

**DB change needed:** `ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS plan_choice TEXT DEFAULT 'free'`

**Risk:** Medium. Trial claims get `status = 'approved'` (not `'claimed_free'`). Code checking `claimed_free` won't match trial claims — by design, trial claims get premium features. If RPC fails, safe fallback to `claimed_free`. Existing pending claims default to free path (null is not `=== 'trial'`).

**What could break:**
- Franchise without trial config → plan choice cards hidden, defaults to free (safe)
- `plan_choice` column missing → approve route treats as free (safe, but run the ALTER TABLE)
- Trial claim RPC fails → business gets `claimed_free` instead of trial (safe degradation, admin can re-set via tier management)
- Pricing-cards API returns error → trialConfig stays null, cards hidden (safe)

**Testing:** See full checklist in roadmap plan file.

### 2.25 Loyalty System Earn Pass Fix (DONE — April 8 2026)
Earn route now issues a WalletPush loyalty pass when auto-creating a membership.

**What was fixed:**
1. **Earn route** (`app/api/loyalty/earn/route.ts`): After auto-creating membership, looks up user from `app_users`, calls `issueLoyaltyPass`, stores serial. Response includes `passCreated`, `appleUrl`, `googleUrl`.
2. **Earn page client** (`earn-page-client.tsx`): Shows "Add to Apple Wallet" / "Add to Google Wallet" buttons on success/reward when pass was created.
3. **QR scanner** (`qr-scanner.tsx`): Same wallet buttons in success/reward states. `EarnResult` interface extended.

**Risk:** Low-Medium. New code path only fires on first earn (auto-create). Existing members unaffected. If WalletPush fails, earn still succeeds — user can retry-pass later. First earn ~1-2s slower.

**What could break:**
- WalletPush API failure → earn succeeds but no wallet pass (fallback: retry-pass)
- Existing members with `walletpush_serial = null` from before this fix → need retry-pass or backfill SQL
- Two simultaneous earn requests → possible duplicate pass (mitigated by hasFired ref)

### 2.28 Google Review Rating Gate (DONE — April 8 2026)
Enforces Qwikker's 4.4-star quality standard across all onboarding paths.

**What was built:**
1. **Manual onboarding form** (`simplified-onboarding-form.tsx`): New "Do you have a Google listing?" toggle. If No → blocks with message + link to set up Google Business Profile. If Yes → two inputs for Google rating + review count with amber warning for < 4.4. Form cannot proceed without completing this step.
2. **Signup persistence** (`lib/actions/signup-actions.ts`): Manual path now stores self-reported `rating` + `review_count` + `rating_source = 'self_reported'`. Google path sets `rating_source = 'google_verified'`.
3. **Admin approve routes** (`app/api/admin/approve/route.ts`, `app/api/admin/approve-claim/route.ts`): Soft 4.4 rating gate. If business rating < 4.4 and no `forceApprove` flag, returns a `warning` response. Admin must acknowledge and resend with `forceApprove: true`.
4. **CRM card** (`comprehensive-business-crm-card.tsx`): Rating source badges (green "Google Verified", amber "Self-Reported", blue "Admin Verified", grey "Not Verified"). Verify panel for self-reported/unknown ratings with "Lookup on Google" button + Google Maps fallback link. Shows claimed vs actual side-by-side. "Use Google values" or "Keep claimed values" confirm buttons.
5. **Verify API** (`app/api/admin/verify-rating/route.ts`): POST fetches real rating from Google Places (by `google_place_id` or text search). PATCH updates `rating_source` to `admin_verified` and optionally overrides rating/review_count.

**DB change needed:** `ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS rating_source TEXT DEFAULT 'unknown'`

**Types updated:** `BusinessCRMData` interface in `types/billing.ts` now includes `rating_source`. CRM data mapping in `admin-crm-actions.ts` passes it through.

**Risk:** Low-Medium. Self-reported ratings can be gamed but admin MUST verify before approval (amber badge makes it visually obvious). Businesses without Google listing are blocked from joining. Existing businesses with `rating: 0` show "Not Verified" badge. Column default is `'unknown'` — all existing rows safe.

**What could break:**
- `rating_source` column not added → code treats null as `'unknown'` (safe)
- Google Places API key missing → lookup returns error, admin can use Google Maps link as fallback
- Manual onboarding form layout may need mobile testing (new inputs added)
- Approve routes now require `forceApprove: true` for < 4.4 businesses → admin CRM UI must handle `warning` response

**Testing checklist:**
1. Manual onboarding: select "I don't have a Google listing" → form blocks with helpful message
2. Manual onboarding: enter rating 4.8 + 50 reviews → submits, check `rating_source = 'self_reported'` in DB
3. Manual onboarding: enter rating 3.9 → amber warning shows, can still submit
4. Google verification: rating auto-captured → check `rating_source = 'google_verified'` in DB
5. Admin CRM: self-reported business shows amber badge + "Lookup on Google" button
6. Admin clicks "Lookup on Google" → shows real vs claimed rating side-by-side
7. Admin clicks "Use Google values" → `rating_source` updated to `admin_verified`, rating overwritten
8. Franchise admin tries to approve business with rating < 4.4 → warning response returned
9. Existing businesses with `rating: 0` show grey "Not Verified" badge

### 0.29 Identity + Shortlink Critical Fix (P0 — DONE — April 8 2026)
**Symptoms:** User identity ("New User" instead of name) lost on every page except Dashboard. Pass back-of-card links open pages without identity. Vibes fail with security warnings. Loyalty auto-fill broken.

**ROOT CAUSES (three separate bugs, all contributing):**

**Bug A — `updatePassLinksAsync` scoping error (commit `dce02c79`, March 4)**
The "Add per-city WalletPush URLs" commit added `walletpushDashboardUrl = credentials.dashboardUrl` inside the `POST()` function, then referenced it inside the separate `updatePassLinksAsync()` function without passing it as a parameter. JavaScript throws `ReferenceError: walletpushDashboardUrl is not defined`. The `.catch()` swallows it. **Every pass created since March 4 has placeholder URLs** (`/user/chat`, `/user/offers`) instead of shortlinks (`/c/{code}`, `/o/{code}`). Shortlinks contain user identity; placeholders don't.

**Bug B — Cookie never set reliably**
All page server components (`dashboard`, `events`, `rewards`, etc.) call `setWalletPassCookie()` which uses `cookies().set()`. In Next.js 15, `cookies().set()` only works in Server Actions and Route Handlers — NOT in page server components. These calls silently fail. The only place the cookie was being set was from the `create-main-pass` API route response (added in this session), but any existing pass users relied on the broken page-level cookie setting.

**Bug C — Layout nav links missing wallet_pass_id on first render**
`UserDashboardLayout` initialised `resolvedPassId` as `useState(null)`, then set it in `useEffect`. SSR-rendered nav links had no `wallet_pass_id`. After hydration, useEffect fires and links update — but any click in between would navigate without identity.

**Fixes applied:**
1. **`app/api/walletpass/create-main-pass/route.ts`**: Added `walletpushDashboardUrl` as 5th parameter to `updatePassLinksAsync()`. Function signature and call site both updated.
2. **`lib/supabase/middleware.ts`**: Added cookie propagation at the middleware level. If `wallet_pass_id` is in URL searchParams, the middleware sets the `qwikker_wallet_pass_id` cookie on the response. Runs on every request. Reliable and guaranteed to work.
3. **`components/user/user-dashboard-layout.tsx`**: Changed `useState(null)` to `useState(walletPassId || null)` so nav links include wallet_pass_id from the very first SSR render.
4. **`app/api/walletpass/create-main-pass/route.ts`** (from earlier in session): API response now sets the cookie directly on the JSON response.

**Risk:** Low. All changes are additive/hardening. Existing flows unchanged. Middleware cookie is a belt-and-suspenders addition.

**What could break:**
- If middleware is skipped (e.g. static files, `_next` paths) → no cookie set from URL, but these paths don't need it
- If `wallet_pass_id` URL param has garbage value → middleware sets garbage cookie → `getValidatedUser` returns `isValid: false` → "New User" (same as before, no worse)
- For passes created between March 4 and this fix: back-of-card links still have placeholder URLs (not shortlinks). Users must reinstall pass OR call `/api/walletpass/update-existing-links` to patch them. Alternatively, the middleware cookie fix means if a user visits ANY page with `?wallet_pass_id=xxx` in the URL, the cookie persists — so dashboard → sidebar navigation will work even without shortlinks.

**Testing checklist:**
1. **Delete existing pass, clear cookies, reinstall from /join**. After install → welcome page → dashboard should show your name.
2. **Navigate to Events, Rewards, Secret Menu, Settings** via sidebar. ALL should show your name, not "New User".
3. **Check server logs** for `✅ Updated AI_Url → .../c/{code}` and `✅ Updated Offers_Url → .../o/{code}` (confirms shortlinks set on pass).
4. **Tap pass back-of-card AI Chat link** on phone. Should open `/c/{code}` → redirect to `/user/chat?wallet_pass_id=xxx` → identity preserved.
5. **Tap pass back-of-card Offers link** on phone. Same flow via `/o/{code}`.
6. **Close browser entirely, reopen dashboard URL** (no `?wallet_pass_id`). Cookie should persist. Name should show.
7. **Scan loyalty Join QR with native camera** (not in-app). Should redirect to start page → "Already have a pass?" email lookup should be available.
8. **Earn a stamp** → vibe popup should NOT show security warnings. Vibe submission should succeed.

### 2.23 Landing Page New Sections, Claim Hours Fix, Trial/Pricing Cleanup (DONE — NEEDS TESTING)

**Landing page sections** (city-landing-page.tsx, page.tsx, landing-page-editor.tsx, landing-page API):
- Business CTA banner between Features Grid and CTA (links to /for-business, shows free trial mention if `founding_member_trial_days > 0`)
- "Why Qwikker?" editorial section (3 value props) between CTA and How it works
- Pass holder count ("Join X people exploring {city}") — admin toggleable via `show_pass_count` in landing config, queries `app_users` count
- FAQ accordion (3 questions, always visible) between Featured Businesses and Supporters
- Admin editor: new "Pass Holder Count" toggle card

**Claim hours selector** (business-hours-input.tsx, confirm-business-details.tsx):
- `BusinessHoursInput` now accepts `compact` prop (renders without Card wrapper)
- Claim form "No, I'll enter my own" now shows the structured hours picker instead of a plain textarea
- On submit, structured hours are converted to text via `convertStructuredToText`

**Claim hours bugs fixed** (claim/search API, approve-claim API):
- Search API was NOT returning `business_hours` from DB — always showed "No hours found from Google". Fixed: added `business_hours` to select + response.
- Approval route was writing `edited_hours` to `business_hours` (text) but NOT clearing `business_hours_structured` (jsonb). Old structured data persisted on profile page. Fixed: now sets `business_hours_structured = null` when custom hours are provided.

**Trial/pricing fixes** (claim submit API, welcome modal, dashboard home, pricing-plans, pricing-cards API):
- Claim email: uses `default_trial_tier` from `franchise_crm_configs` instead of hardcoded "Featured"
- Welcome modal: all emojis removed, shows "Start your X-day free [Tier] trial" when trial data available, clean 2x3 benefit grid
- Dashboard home upgrade banner: trial-aware messaging ("Start your 30-day free Spotlight trial") with dynamic CTA button
- Free Listing pricing card: corrected features (was showing "No AI chat visibility" etc — free listings DO get basic AI chat, 5 menu items, 1 offer/month)
- Pricing cards API: now returns `default_trial_tier` and `founding_member_trial_days`

**Testing checklist:**
1. **Landing page sections:** Visit a city subdomain landing page. Verify: Business CTA banner visible below features grid, "Why Qwikker?" section between CTA and How it works, FAQ accordion works (click to expand/collapse), no horizontal scroll on mobile.
2. **Pass holder count:** In admin Landing Page editor, toggle "Show Pass Holder Count" on, save. Refresh landing page — "Join X people exploring {city}" should appear if there are app_users in that city.
3. **Business CTA trial mention:** If `founding_member_trial_days > 0` for the city, the Business CTA should show "Start with a free trial — no commitment."
4. **Claim hours (Google hours showing):** Start a new claim, search for a business that has `business_hours` populated in the DB. Confirm page should show the hours under "From Google Places", NOT "No hours found."
5. **Claim hours (custom entry):** Select "No, I'll enter my own" — structured hours picker should appear (pattern selector + time dropdowns). Enter hours, submit. Check `claim_requests.edited_hours` — should contain formatted text.
6. **Claim hours (approval overwrite):** Approve the claim. Check `business_profiles` — `business_hours` should match edited text, `business_hours_structured` should be NULL (not stale data).
7. **Welcome modal:** Log in as a newly approved `claimed_free` business. Modal should appear with NO emojis, trial CTA should show correct tier/days from franchise config.
8. **Dashboard home:** For `claimed_free` business, upgrade banner should show "Start your X-day free [Tier] trial" and CTA button should say "Start X-Day Free Trial".
9. **Pricing cards:** View Plans page — Free Listing card should show: Basic AI chat visibility, Up to 5 menu items, 1 offer per month. Should NOT show "No AI chat visibility" or "No offers or events".
10. **Claim email:** Submit a new claim — email should say "[X]-day FREE [correct tier] tier trial" (matching `default_trial_tier` in franchise config), not hardcoded "Featured".

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
