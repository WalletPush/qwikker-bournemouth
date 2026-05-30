# Progress Tracker

> Quick reference for new chats. Full plan is in `/Users/qwikker/.cursor/plans/platform_audit_roadmap_7ed16549.plan.md`
>
> Start any new chat with: "Read PROGRESS.md and the plan file, then continue with the next pending item."

## Current Status (Updated May 15, 2026)

- **Tier 0:** 22/22 complete. All P0/P1 critical bugs fixed (April 2026). 0.14 (marketing pages) DONE. Remaining: 0.22 (pre-launch env vars — Stripe live keys in progress).
- **Pricing & Tier Audit (May 5):** All business-facing pricing cards, onboarding modals, support pages, and trial upsells now use canonical `getTierFeatures()` source of truth. Prices updated to £19.99/£49.99/£129. DB migration rewrites all existing city pricing_cards. Training scripts EP1-EP6 committed.
- **Tier 1:** 7/7 complete (subject to testing)
- **Tier 2:** 2.1-2.4, 2.6-2.7, 2.12-2.16, 2.18-2.29 complete. 2.27 DONE. 2.5, 2.8, 2.9 partially done (code exists, needs testing/completion). **No PRE-LAUNCH BLOCKERS remaining.** Pending: 2.10 (Sentry), 2.11 (loyalty PDF sheets), 2.17 (AI regression test).
- **Tier 3:** Intelligence plumbing complete. **3.1 COMPLETE. 3.2 COMPLETE. 3.3 COMPLETE.** 3.4 deferred post-launch. 3.5 (real AI streaming) pending.
- **Tier 4:** Backlog
- **Home Feed:** 3 bugs fixed (tonight links, loyalty display, personalized reasons). Menu item images added. Placeholder image fallback fix for imported businesses (April 29).
- **Claim Trial Flow:** 3 critical fixes applied (April 20). **⚠️ Must test full claim-to-trial flow before recording business walkthrough video.**
- **Stripe:** Live account activated (April 29). Connect Client ID available. Redirect URI done (canonical city subdomain). **Security hardening DONE (May 5):** auth on all 4 business payment routes + admin Connect route, HMAC-signed OAuth state. Remaining: webhook endpoint + env vars in Vercel for live mode.
- **QR Code System:** Consolidation plan created (April 24). 5 parallel systems identified, 7-step plan to unify. Full plan: `/Users/qwikker/.cursor/plans/qr_code_system_consolidation_53ea0981.plan.md`. Core fixes done (May 8): scan tracking working, deep linking fixed, logo visibility fixed, business dropdown fixed, analytics live on business dashboard. **NEXT: BV-16 QR Scan Auto-Push** — auto-deliver wallet push notification with current offer when user scans a Spotlight business QR code.
- **BV-6 Social Wizard V2 (May 17):** PRD complete. Meta-verified social media management tool for Spotlight businesses. 6 phases: Meta OAuth, AI captions, hybrid image system, scheduled publishing, engagement analytics, Meta verification. Dev mode allows 40 Early Access businesses before verification. Full plan: `.cursor/plans/social_wizard_v2_prd_1773affa.plan.md`
- **BV-3 Blurred Analytics (May 15):** DONE. Tiered analytics with BlurredSection overlays. AI Discovery metrics (chat mentions + discovery queries). Dynamic 30/60/90-day toggle. Engagement Summary replaced useless Viewer Breakdown. Vibe breakdown shows individual ratings when < 5 vibes. "New" trend badge when no prior data exists. All hardcoded "this month"/"30 days" labels fixed. **NEXT: BV-14 Weekly Digest Emails** — all data infrastructure is in place via `getBusinessAnalytics()`.
- **Bug fixes (May 15):** Offer claim modal on business page was showing blank blur (missing `appendChild`). Replaced "Pass Updated" modal with proper "Offer Claimed" modal. Save button failing silently (`item_name` column doesn't exist). Admin tier change to Starter failing (`'starter'` not mapped to DB value `'recommended'`). Free downgrade writing invalid `'claimed_free'` instead of `'free_tier'`.
- **AI Chat Eligibility Leak Fix (May 10):** CRITICAL fix — expired businesses were appearing in AI chat results via a direct DB lookup bypass in the chat route's "tell me about X" detail mode. Fixed 4 locations that queried `business_profiles` directly instead of `business_profiles_chat_eligible` view. Also fixed admin dashboard filter logic that failed to catch expired paid subscriptions and trials with missing end dates.
- **Admin Dashboard Expired Filter Fix (May 10):** Live Listings and Expired Trials tabs now correctly handle 3 scenarios: (1) trial with expired end date, (2) trial with NULL end date (broken data), (3) paid subscription with lapsed `current_period_end`. Previously only caught scenario 1.
- **New features (April 24-29):** City Partner Claims system (`/partners`), AI Management dashboard (usage tracking, KB health, config), AI usage logging (`ai_usage_logs` table), "Never recommend external platforms" AI rule, OpusReach Intake Pack.

## Bournemouth Launch Strategy (Target: October 2026)

**Timeline:**
- **May-June 2026:** Finish training videos, Stripe billing, promo pack design. Platform hardening.
- **Mid-July 2026:** Begin promo pack distribution in Bournemouth (250 packs minimum).
- **July-September 2026:** 60-day Spotlight trial period for activated businesses. Peak summer season.
- **October 2026:** Conversion push. Target: **10 businesses on Spotlight, 20+ on Starter/Featured, 50+ on Free.**

**Promo Pack Trial Model:**
- Each pack includes a unique QR/code for a **60-day free Spotlight trial**.
- Businesses have **14 days from receiving the pack to activate** their trial. After 14 days the Spotlight offer expires (they can still claim a free listing).
- This creates urgency on activation, filters out disengaged businesses, and naturally staggers trial end dates.
- Expected activation: ~60-70% (150-175 businesses from 250 packs).

**Conversion Milestones:**
- **Day 30:** Automated check-in email — "You've had X AI mentions, Y loyalty joins. Here's what you'd lose when your trial ends."
- **Day 45:** Sales conversation — franchise admin reaches out personally. "Pick a plan now, switch seamlessly."
- **Day 60:** Trial expires. Business drops to Free unless they've subscribed.

**Post-Launch Pricing Evaluation (November 2026):**
- Review tier distribution. If nobody sits on Featured (Starter → Spotlight skip pattern), consider merging Starter + Featured into a single mid-tier (~£29.99-35.99). Grandfather existing Starter subscribers up for free.
- If Featured has healthy adoption, keep 4 tiers.

---

## ⚠️ Testing Needed (May 10 Changes — Not Yet Fully Tested)

### AI Chat Eligibility Fix
**What changed:** All "tell me about X" queries and detail-mode business fetches now go through `business_profiles_chat_eligible` view instead of raw `business_profiles` table.

**What could break:**
- If the view doesn't expose a column the detail mode needs (e.g. `business_description`, `booking_url`) → detail mode returns no data. Mitigated: view definition includes all BP columns.
- If a LEGITIMATE active business isn't in the view due to data issues (NULL `current_period_end` on a paid subscription) → user asks about it, AI says "I don't have info on that." Fix: ensure all active subscriptions have correct `current_period_end`.
- The `generateBusinessDetailResponse` function (carousel "More details") now uses the view — cross-city detail expansion may fail if the view only returns the current city's businesses. Low risk since it filters by ID not city.

**Files changed:**
- `app/api/ai/chat/route.ts` — DB LOOKUP and detail mode fetch now use `business_profiles_chat_eligible`
- `lib/ai/hybrid-chat.ts` — FACT MODE and `generateBusinessDetailResponse` now use the view

**How to test:** Ask "tell me about [expired business]" → should get generic "I don't have info" response. Ask "tell me about [active business]" → should still work normally.

### Admin Dashboard Expired Filter Fix
**What changed:** Live Listings now excludes businesses with expired `current_period_end` (paid) AND trials with NULL `free_trial_end_date`. Expired Trials tab catches all three scenarios.

**What could break:**
- If a real active business has `current_period_end` slightly in the past due to Stripe webhook delay → briefly disappears from Live. Low risk: Stripe webhooks update period on renewal.
- Businesses with `is_in_free_trial = true` but NULL `free_trial_end_date` will now appear in Expired tab. Correct behaviour for test data; for real businesses this would indicate a setup bug.

**Files changed:** `components/admin/admin-dashboard.tsx`

---

## Execution Priority (April/May 2026)

### NEXT UP (Most Urgent)
1. ~~**Stripe Security Hardening**~~ — **DONE (May 5).** Auth added to all 4 business Stripe routes (`create-checkout-session`, `update-subscription`, `cancel-subscription`, `create-portal-session`) via `verifyBusinessOwner()`. Admin auth on `stripe-connect` route. HMAC-signed OAuth state with timing-safe verification in callback. Canonical URL redirect already in place. **Remaining:** Register redirect URI in Stripe Dashboard, set `STRIPE_WEBHOOK_SECRET` in Vercel.
2. **Admin Onboarding Training Videos** — Screen-recorded tutorials for franchise operators covering: pass creation, admin setup wizard credentials, Google Places API, Resend email, import tool, offer/secret menu creation, loyalty setup. See "Training Video Plan" section below.
3. **⚠️ IMPORTANT — Duplicate City Name Handling (Subdomain Collisions)** — Multiple real cities share names (Newport RI / Newport Wales / Newport KY, Cambridge UK/MA, Richmond, etc.). The subdomain IS the unique tenant key (`{slug}.qwikker.com` → `franchise_crm_configs.city`), so two cities cannot both own `newport`. **Two parts:**
   - **(a) Naming convention (operational/policy):** Globally-unique names use bare slug (`bournemouth`, `zanzibar`). Collision-prone names MUST be qualified at creation: US → `{city}-{state}` (`newport-ri`, `newport-ky`); UK → `{city}-{nation/county}` (`newport-wales`, `newport-gwent`). `display_name` stays clean ("Newport") for the UI; the qualified slug only lives in the URL. Qualify on first suspicion of collision — migrating a live franchise slug later is painful. The subdomain field already accepts hyphens (`replace(/[^a-z0-9-]/g, '')`) and hyphenated franchises already work (`costa-blanca`, `koh-samui`, `las-vegas`).
   - **(b) CODE BUG to fix:** `app/api/walletpass/create-main-pass/route.ts` (line ~57) derives the wallet pass welcome name by capitalizing the SLUG (`citySubdomain.charAt(0).toUpperCase() + citySubdomain.slice(1)`), so a `newport-ri` slug produces "Welcome to Qwikker Newport-ri!". Must use the franchise `display_name` from config instead. Affects all hyphenated/multi-word cities (existing `costa-blanca`, `koh-samui` already latently broken). Low-risk fix, do before launching any multi-word city.

### Completed (April 2026)
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
14. ~~**2.29 Home Feed Fixes + Menu Item Images**~~ — DONE. Three feed bugs fixed + menu image upload feature.
15. ~~**0.33 AI Chat Quality Fixes (April 9)**~~ — DONE. Four fixes: (a) per-business data boundary rule stops hallucinated amenities, (b) secret menu queries escape hard offer gate, (c) vibe tag scoring in relevance scorer (+4 for tag match), (d) near-me location prompt shows before AI responds.
16. ~~**3.1 Intelligence Plumbing — Wire Existing Data Into AI Chat**~~ — **DONE (9/9 subtasks + hardening)**. Full spec: `/Users/qwikker/.cursor/plans/intelligence_plumbing_3.1_f9759930.plan.md`.
    **Core (9/9):** (a) `/business-signup` middleware hotfix, (b) shared constants file `lib/constants/user-preferences.ts`, (c) personalization wizard `components/user/personalization-wizard.tsx`, (d) wizard integration into `user-dashboard-home.tsx` with cold-user guard + removed old PreferencesCard, (e) settings sync (dietary section added, shared constants imported), (f) AI profile fetch via `Promise.allSettled` using `createServiceRoleClient()`, (g) AI profile inject (USER PROFILE section + 6 prompt rules + 1500 char hard cap + business name dedup), (h) feed boost (+1 interaction score for category matches using `CATEGORY_MAP` + `normalize` + `includes` matching), (i) sanity check SQLs provided.
    **Hardening:** (j) localStorage keys scoped to wallet pass ID — new pass gets fresh wizard, (k) AI loyalty prioritization — membership fetch moved before sort, +3/+2/+1 relevance boost (reward ready/almost there/member), loyalty summary moved before business list in prompt, prominent `[REWARD READY]`/`[ALMOST THERE]` tags on business headers, (l) American spelling standardization across 8 files (personalisation → personalization), (m) expanded categories (10 → 14: added Bakeries, Nightlife, Activities, Wellness) and dietary options (8 → 12: added Egg/Soy/Shellfish/Sesame allergies), (n) feed boost now matches against `display_category` + `system_category` + `business_type` for more reliable matching.
17. **VITAL: Privacy Policy & Terms Update** — Current policy is a generic template missing: AI/personalization disclosure, wallet pass identity model, specific data collected (preferences, dietary, vibes, saves, claims, loyalty), named third-party processors (Supabase, Vercel, WalletPush, Resend, Stripe, Cloudinary, OpenAI/Google), location data clarification, correct plan tier names. Remove "personalized advertisements" (no ads). Fix auto-generating date + placeholder address. Keep social media language for future social wizard. **Recommend legal review before launch, especially for AI + GDPR.**
18. ~~**3.2 Persist Chat Context**~~ — **DONE**. New `chat_messages` table (user must run CREATE TABLE + RLS SQL manually). GET `/api/user/chat-history` loads most recent session within 24-hour rolling window (up to 50 messages). POST `/api/ai/chat` now persists user + AI messages with `await` (not fire-and-forget — Next.js context teardown kills in-flight requests). Client loads history on mount, passes `sessionId` in all requests, "New Chat" generates fresh `sessionId`. 30-day cleanup SQL provided (manual or pg_cron).
    **Files:** `app/api/user/chat-history/route.ts` (new), `app/api/ai/chat/route.ts`, `components/user/user-chat-page.tsx`.
    **DB:** `chat_messages` table with RLS policies — user must run provided SQL.
19. ~~**0.35 AI Dietary + Menu Hardening (April 10-13)**~~ — **DONE**. Five fixes:
    (a) **Identity loss across all user pages** — 8 server component pages were using `createTenantAwareClient()` for `app_users` lookups, which fails under RLS in server components. Switched to `createServiceRoleClient()` for user lookups only. Other RLS-backed queries unchanged. Files: `app/user/chat/page.tsx`, `app/user/business/[slug]/page.tsx`, `app/user/secret-menu/page.tsx`, `app/user/discover/page.tsx`, `app/user/notifications/page.tsx`, `app/user/offers/page.tsx`, `app/user/badges/page.tsx`, `app/user/how-it-works/page.tsx`.
    (b) **Dietary conflict tags on businesses** — `hasDietaryConflict` helper in `hybrid-chat.ts` prepends `[DIETARY CONFLICT]` tags to businesses with conflicting keywords (grill, steakhouse, seafood etc.) when user is vegetarian/vegan. Checks KB/menu content for dietary-friendly signals first to avoid false positives.
    (c) **Secret menu item dietary tagging** — Post-processes KB content to scan individual `SECRET MENU ITEM` blocks for meat/fish keywords. Prepends `[DIETARY CONFLICT]` tag to specific items when user is vegetarian/vegan.
    (d) **Menu blindness fix** — Prompt rules strengthened: absolute ban on "I don't have menu details" when KB has menu data. Explicit instruction to list more items when asked "what else do they have?".
    (e) **Dietary prompt escalation** — DIETARY rule escalated to "ZERO TOLERANCE" with explicit examples and 4-part HARD BLOCK.
20. ~~**0.36 Google Wallet Pass Investigation + Android Redirect Fix (April 13)**~~ — **DONE (code fixes). WalletPush template fixes pending support ticket.**
    **Investigation:** Decoded the Google Wallet JWT from WalletPush API response. Found 5 issues — 3 fixable in code, 2 requiring WalletPush dashboard/support.
    **Code fixes applied:**
    (a) **MEMBER_ID in passData** — QR code barcode showed "Sample MEMBER_ID" because the code never sent this field. Now sends `MEMBER_ID` with dashboard URL at creation, updated to personalized URL via PUT post-creation. Google Wallet JWT snapshot uses initial value; self-corrects on sync. Apple Wallet unaffected (ignores unrecognized fields).
    (b) **Android redirect fix (initial)** — `window.location.href = gWalletUrl` navigated the entire page to Google's "Save to Wallet" flow, stranding users with no way back to Qwikker. Initially changed to `window.open(gWalletUrl, '_blank')` — later evolved into a full gated two-step flow in 0.37. Both `pass-installer-client.tsx` and `improved-wallet-installer.tsx` fixed. Apple/iOS flow completely unchanged (uses anchor tag `.pkpass` download).
    (c) **DASHBOARD_URL constant** — `WALLET_PASS_FIELDS.DASHBOARD_URL` was referenced in `update-existing-links/route.ts` but never defined, resolving to `undefined`. Silent bug — Dashboard_Url PUTs were always failing. Added `DASHBOARD_URL: 'Dashboard_Url'` and `MEMBER_ID: 'MEMBER_ID'` to `wallet-pass-fields.ts`.
    **Files changed:** `app/api/walletpass/create-main-pass/route.ts`, `components/wallet/pass-installer-client.tsx`, `components/wallet-pass/improved-wallet-installer.tsx`, `lib/config/wallet-pass-fields.ts`.
    **WalletPush template issues (need support ticket for template `d9110746-50d3-46b9-8799-a2b7f22ec939`):**
    - Duplicate images: strip image in both `heroImage` AND `imageModulesData`, logo in both `logo` AND `imageModulesData` — shows twice on Google Wallet
    - URLs not clickable: `AI_Url` and `Offers_Url` mapped to `textModulesData` (plain text) instead of `linksModuleData` (tappable links). WalletPush Placeholder Type dropdown has no "URL" option (only Text/Number/Currency/Date/Email/Phone)
    - Card title: `Current_Offer` mapped as Google Wallet `cardTitle` — way too long. Should be "Qwikker Bournemouth"
    - Background color: `#FFFFFF` on Google (white). Apple pass uses same setting and looks perfect, so can't change without affecting iPhone. Needs Google-specific override from WalletPush.

    **What could break:**
    | Symptom | Likely cause | How to fix |
    |---|---|---|
    | Apple pass QR code shows wrong data | `MEMBER_ID` field somehow mapped to Apple barcode (unlikely — Apple barcode is separate) | Remove `MEMBER_ID` from `passData` in `create-main-pass/route.ts` |
    | WalletPush rejects pass creation with "unmatchedFields: MEMBER_ID" | Template doesn't have `MEMBER_ID` placeholder | Remove `MEMBER_ID` from `passData`. Check WalletPush Placeholders tab |
    | Android popup blocked (Google Wallet doesn't open) | `window.open` blocked by browser popup blocker | Revert to `window.location.href` or show a manual "Save to Google Wallet" button |
    | `updatePassLinksAsync` takes longer (3 PUTs instead of 2) | New `MEMBER_ID` PUT adds ~1.5s with rate limit delay | Non-critical — fire-and-forget, user already has pass |
    | `update-existing-links` route suddenly updates Dashboard_Url | Previously `WALLET_PASS_FIELDS.DASHBOARD_URL` was `undefined`, now it's `'Dashboard_Url'` | This is a fix, not a regression. If the template doesn't have `Dashboard_Url`, the PUT will 404 harmlessly |
21. ~~**0.37 Google Wallet Button Branding + Android Gated Flow (April 13)**~~ — **DONE**.
    (a) **Android gated install flow** — Removed all auto-redirect for Android. Success page now shows a two-step flow: Step 1 shows only "Save to Google Wallet" button (must tap before seeing "Continue to Dashboard"). Step 2 reveals dashboard button + "Didn't save? Tap here to try again" link. Prevents users being stranded on Google's pay.google.com page.
    (b) **Official Google Wallet badge** — Replaced all plain-text "Add to Google Wallet" buttons with the official Google badge SVG across 8 components: `pass-installer-client.tsx`, `improved-wallet-installer.tsx`, `earn-page-client.tsx` (x2), `join-page-client.tsx`, `qr-scanner.tsx` (x2), `wallet-install-banner.tsx`.
    (c) **SVG hosted locally** — External URL (`developers.google.com`) returned an HTML sign-in page instead of the SVG. Downloaded the real asset from Google's official zip pack (`enGB_add_to_google_wallet_wallet-button.svg`) and serve from `/public/images/add-to-google-wallet.svg`.
    (d) **WalletPush class-level template issue identified** — Decoded the Google Wallet JWT. Object-level data is 100% correct (real URLs, resolved names). But Google Wallet displays CLASS-level `textModulesData` defaults ("Sample AI_Url", literal `${First_Name}`) instead of object-level values. Core identity fields (`First_Name`, `Last_Name`, `Email`) interpolate correctly in "This Pass Belongs to" but custom fields (`AI_Url`, `Offers_Url`, `Last_Message`, `Current_Offer`) fall back to class defaults. **Requires WalletPush template fix — not a code issue.**
    **Files changed:** `components/wallet/pass-installer-client.tsx`, `components/wallet-pass/improved-wallet-installer.tsx`, `components/loyalty/earn-page-client.tsx`, `components/loyalty/join-page-client.tsx`, `components/loyalty/qr-scanner.tsx`, `components/wallet/wallet-install-banner.tsx`, `public/images/add-to-google-wallet.svg`.
22. ~~**3.3 Feed Personalization (April 14)**~~ — **DONE**. Full preference-aware home feed ranking across all sections.
    **Changes:**
    (a) **User profile expanded** — `fetchUserName` → `fetchUserProfile`, now loads `dietary_restrictions` alongside `preferred_categories` from `app_users`. Returns typed `UserFeedProfile`.
    (b) **`vibe_tags` added to `fetchBusinesses`** — jsonb column now available for vibe matching in all section builders.
    (c) **`computeCompositeScore` extended** — New optional `preferenceBoost` parameter (0-27 range). Additive to existing tier/proximity/freshness/urgency scoring. Backward compatible — callers without preferences see zero boost.
    (d) **Category boost (+10)** — Businesses matching user `preferred_categories` (via `CATEGORY_MAP` token matching against `display_category`/`system_category`/`business_type`) get +10 in Tonight, Dishes, Deals, and Personalized sections.
    (e) **Vibe tag boost (+5)** — Businesses with `vibe_tags` overlapping user category tokens get +5 additional boost.
    (f) **Loyalty boost (+3/+6/+12)** — `buildLoyaltyStatusMap` converts `RewardCard[]` into `Map<businessId, LoyaltyStatus>`. Member=+3, almost_there=+6, reward_ready=+12. Applied across all sections.
    (g) **Dietary demotion (-20) in Dishes** — `hasDishDietaryConflict` checks dish name + description against meat/dairy/gluten/shellfish keywords. Conflicting dishes pushed to bottom, NOT removed (prevents empty sections in small cities).
    (h) **Reason tags** — Optional `reason?: string` added to `TonightCard`, `DishCard`, `DealCard` types. Populated with "Matches your taste", "Reward waiting", "Almost earned a reward", "Matches your vibe". Personalized section reasons enriched with preference + loyalty context.
    (i) **`RewardCard` type** — Added optional `businessId` field, populated from `m.program.business_id` in loyalty API response.
    **Files changed:** `lib/home-feed/feed-builder.ts`, `lib/home-feed/ranking.ts`, `lib/home-feed/types.ts`.
    **No new tables, no migrations, no new API routes.**
    **What could break:**

    | Symptom | Likely cause | How to fix |
    |---|---|---|
    | Feed order unchanged after setting preferences | `preferred_categories` empty in DB | Check `app_users` for the wallet_pass_id — run wizard or set manually |
    | Dishes section empty in small city | Dietary demotion (-20) combined with low tier weight pushed all dishes below 0 | Reduce penalty from -20 to -10 in `hasDishDietaryConflict` call |
    | "Matches your taste" showing on wrong business | `CATEGORY_MAP` token too broad (e.g. "bar" matching "barber") | Tighten tokens in `lib/constants/user-preferences.ts` |
    | Loyalty boost not applying | `RewardCard.businessId` undefined | Check `/api/loyalty/me` returns `program.business_id` |
    | Personalized section reason text too long | Multiple reasons concatenated | Reduce to first 2 reasons in `buildPersonalizedSection` |
22b. **3.5 Real AI Chat Streaming** — **PENDING**. Current setup makes a blocking `openai.chat.completions.create()` call (~20-35s for full response), then sends the entire text to the client where `StreamingText` fakes a typewriter effect. This is NOT real streaming — the user stares at a blank screen for the full generation time. **Fix:** Switch to `stream: true` on the OpenAI call, use a `ReadableStream` / SSE response from the API route, and consume tokens on the client as they arrive. The first token should appear in ~1-2s. System prompt is ~33K chars and KB content can be 9K+ per business — these drive the generation time but should NOT be trimmed (accuracy > speed). Streaming solves the UX problem without sacrificing context. **Files:** `app/api/ai/chat/route.ts` (switch to streaming response), `components/user/user-chat-page.tsx` (consume SSE/stream instead of JSON), `lib/ai/hybrid-chat.ts` (return stream instead of string).
22c. **3.4 Lightweight User Insights** — **DEFERRED (post-launch)**. Nightly aggregation of user behavior patterns into jsonb on `app_users`. Only valuable once real users generate enough data. Revisit if users skip the wizard and feed/chat feels generic.
23. ~~**0.38 Claim Trial Flow Critical Fixes (April 20)**~~ — **DONE (3 fixes + 1 UX improvement)**.
    (a) **UNIQUE constraint missing on `business_subscriptions.business_id`** — The `approve_business_with_trial` RPC uses `ON CONFLICT (business_id) DO NOTHING`, which requires a UNIQUE constraint. Without it, PostgreSQL throws an error, the entire RPC fails, and the fallback sets the business to `claimed_free` instead of trial. **USER ACTION DONE:** `ALTER TABLE business_subscriptions ADD CONSTRAINT business_subscriptions_business_id_key UNIQUE (business_id);`
    (b) **RPC using wrong trial duration (90 days instead of 30)** — The RPC was reading `trial_days` from `subscription_tiers.features->>'trial_days'` (global: 90) instead of `founding_member_trial_days` from `franchise_crm_configs` (Bournemouth: 30). Fixed: RPC now reads both `default_trial_tier` AND `founding_member_trial_days` from the city's franchise config. Fallback is 30 days (not 90). **USER ACTION DONE:** Ran updated `CREATE OR REPLACE FUNCTION` on production.
    (c) **"Return to Business Dashboard" button on pending-approval page** — Button linked to `/dashboard` but businesses can't sign in until approved. Changed to **"All Done — We'll Be in Touch!"** linking to home, with subtitle "You'll be able to sign in once your claim is approved".
    (d) **Dashboard guard for pending claims** — If a user signs in before their claim is approved (no `business_profiles` row linked), the dashboard now checks `claim_requests` for a pending claim and shows a clean "Hey [name], we're on it!" page with progress checklist instead of a broken/empty dashboard. If no pending claim either, redirects to `/onboarding`.
    **Files changed:** `supabase/functions/approve_business_with_trial.sql`, `components/claim/pending-approval.tsx`, `app/dashboard/page.tsx`, `components/dashboard/claim-pending-dashboard.tsx` (new).
    **Sanity check passed:** Franchise config (30 days, spotlight), unique constraint exists, RPC deployed and reads city config, Chaplin's reset to unclaimed with no subscription/claim rows.

24. **⚠️ TEST: CLAIM TRIAL FLOW BEFORE RECORDING** — Submit claim for Chaplin's with "Free Trial" selected. Before approving: sign in and verify the "claim pending" dashboard page appears. Then approve the claim and verify: (a) business lands on Spotlight trial dashboard (not free listing), (b) trial shows 30 days (not 90), (c) subscription row exists with `status='trial'` and `is_in_free_trial=true`, (d) all premium features unlocked. **Do NOT record the video until this test passes.**

25. ~~**2.27 Action Items Wizard**~~ — **DONE**. Checklist with required/recommended items, `?from=action-items` return bar on all target pages, admin-assigned tasks from Contact Centre, "Submit for Review" at end, progress tracking.
26. ~~**0.14 Marketing Pages**~~ — **DONE**. `/for-business` (benefit-led, city selection, loyalty scroll), `/about` (team story), `/privacy-policy`, `/terms-of-service` all exist.
27. **2.5 User Help / Report Issue** — **PARTIALLY DONE**. Help dialog (4 categories) + `/api/user/support` + Slack notifications working. Contact Centre exists. Remaining: auto-attach browser info. Needs testing.
28. **2.8 Loyalty & Saves Analytics** — **PARTIALLY DONE**. Loyalty stats dashboard exists (overview/members/redemptions). Analytics page has views+claims chart. Remaining: integrate loyalty joins/stamps/redemptions into main analytics. Needs testing.
29. **2.9 Business Activity Notifications** — **PARTIALLY DONE**. Code exists (8 notification types, activity page, API routes) but `business_notifications` table may not exist on production (no migration found). Email digest and real-time push not implemented. Needs DB verification.
30. ~~**Home Feed Placeholder Fix (April 29)**~~ — **DONE**. `getBusinessImage` in `ranking.ts` now falls back to `getPlaceholderUrl` when `business_images` is empty. All 6 call sites in `feed-builder.ts` updated. SQL queries for offers/events now SELECT `system_category`.
31. ~~**City Partner Claims (April 24)**~~ — **DONE**. `/partners` landing page, `partner_claims` table, claim submission with plan selection, HQ admin management UI, Slack notifications.
32. **AI Management Dashboard (April 25)** — **BUILT, NEEDS TESTING**. Usage tracking, KB health monitoring, config management. `ai_usage_logs` table with cost/token tracking. "Never recommend external platforms" AI rule. Some data display was incorrect — needs verification.
33. ~~**Stripe Security Hardening (May 5)**~~ — **DONE.** `verifyBusinessOwner()` helper checks Supabase Auth session + `business_profiles.user_id` ownership. HMAC state signing on Connect OAuth (backwards-compatible with unsigned legacy state). Admin auth on Connect initiation route. **⚠️ Watch for:** if a business owner's Supabase Auth session expires mid-dashboard-use, Stripe actions will return 401. The frontend should redirect to login on 401 responses from these endpoints.
34. **QR Code System Consolidation** — PENDING. 7-step plan to unify 5 parallel QR systems into one working system. Scan tracking, deep linking, pass-installation gate, "Edit Destination" for retargeting printed QR codes. Full plan: `/Users/qwikker/.cursor/plans/qr_code_system_consolidation_53ea0981.plan.md`.
35. **0.22 Pre-launch Env Vars** — IN PROGRESS. Stripe live keys pending (Connect Client ID available: `ca_U08l...`). Webhook endpoint needs creating. `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_WEBHOOK_SECRET` to set in Vercel.
36. **TEST SESSION** — Full end-to-end test of trial system + claim trial flow.
37. Finish Tier 2 remaining (2.10 Sentry, 2.11 Loyalty PDF sheets, 2.17 AI regression test)
38. **3.5 Real AI Chat Streaming** — Blocking OpenAI call (20-35s) → true SSE streaming. Biggest UX win remaining.
39. **~~Promo Pack QR Codes (Pre-Linked Loyalty Table Tents)~~** — SUPERSEDED by BV-17 Smart Promo Pack System. See "Priority 4c" in Business Value Enhancement Roadmap for full spec. The new system is significantly more powerful: admin-activated packs with personalised business welcome pages, full attribution funnel, and automated follow-up triggers.

### Business Value Enhancement Roadmap (May 2026)

Strategic audit of what would make Qwikker irresistible to local businesses. Findings from full codebase review of business-facing features, consumer experience, tier gating, analytics, and conversion flows.

**What's already strong (keep and amplify):**
- AI concierge that actively recommends businesses (unique moat — no competitor has this)
- Wallet pass as persistent retention layer (lock screen, push, loyalty — more present than any app)
- Secret Menu gamification (drives curiosity and repeat visits)
- Tiered AI visibility (carousel vs text-only creates real upgrade pressure)
- Loyalty baked into the wallet (no separate app, no paper cards)

**Priority 1 — High impact, moderate effort:**

| # | Feature | What it does | Why it matters |
|---|---------|-------------|----------------|
| BV-1 | **ROI Calculator on Analytics** | Show estimated revenue from claims/visits: "23 claims x ~£15 avg = £345 revenue. Plan cost: £59. ROI: 5.8x" | Single most persuasive metric. Turns abstract subscription into concrete profit centre. |
| BV-2 | **Weekly Performance Email to Businesses** | Automated summary: views, claims, saves, AI mentions, ranking vs category. Sent every Monday. | #1 retention driver. Keeps businesses aware of the platform when they're not logging in. |
| BV-3 | **Blurred Analytics for Free Tier** ✅ DONE | Tiered analytics (free/basic/advanced/full) with BlurredSection overlays. AI Discovery metrics, 30/60/90-day toggle, Engagement Summary, vibe breakdown. | Currently free tier sees nothing → no evidence that upgrading helps. This creates FOMO. |
| BV-4 | **QR Code Generator + Scan Tracking** | Self-service branded QR codes (link to Qwikker profile). Downloadable table tents/stickers. Track scans per location. | Physical-to-digital bridge. Table tent "Scan to unlock our Secret Menu" drives pass installs AND gives businesses tangible assets from Qwikker. |

**Priority 2 — High impact, higher effort:**

| # | Feature | What it does | Why it matters |
|---|---------|-------------|----------------|
| BV-5 | **Automated Campaigns** | Win-back ("Haven't visited in 30 days? Here's 10% off"), birthday, welcome series, seasonal triggers (Friday evening → restaurants). | Makes Spotlight genuinely irresistible — "marketing on autopilot." Most small businesses won't compose push notifications manually. |
| BV-6 | **Social Wizard V2 (Meta-Verified)** | Full social media management: AI caption generation, professional image templates + AI image gen, scheduled publishing to IG/FB via Meta Graph API, real engagement analytics via Meta Insights. Hybrid image system (template library + premium AI generation). Monthly cap: Featured 10/mo, Spotlight 50/mo. Meta app verification target. Early Access for first 40 Spotlight businesses (dev mode). Full PRD: `.cursor/plans/social_wizard_v2_prd_1773affa.plan.md` | The most powerful premium feature on the platform. "Qwikker writes, designs, and posts my social media" is an immediate, tangible time-saver. Meta verification makes Qwikker a legitimate marketing tech platform. |
| BV-7 | **Competitor Benchmarking Dashboard** | Anonymous category rankings ("You're #3 of 12 restaurants"), claim rate comparisons, actionable tips ("Businesses with Secret Menu saw 40% more views"). | Creates urgency AND gives actionable guidance. Makes analytics dashboard stickier. |

**Priority 3 — Medium impact, low effort:**

| # | Feature | What it does | Why it matters |
|---|---------|-------------|----------------|
| BV-8 | **"Top Rated on Qwikker" Digital Badge** | Embeddable widget/image for website and social. Auto-generated for qualifying businesses. | Free marketing for Qwikker. Businesses display it proudly = social proof flywheel. |
| BV-9 | **Print-Ready Promo Materials** | Auto-generated PDFs with QR code, business branding, Qwikker styling. One-click download from dashboard. | Low effort, high perceived value. Businesses love tangible collateral they can use immediately. |
| BV-10 | **Vibe Response** | Let businesses thank or respond to positive vibes (anonymised). | Creates engagement loop. Business logs in → sees positive feedback → feels invested → stays subscribed. |

**Priority 4 — Analytics & Value Proof:**

| # | Feature | What it does | Why it matters |
|---|---------|-------------|----------------|
| BV-13 | **Business Value Analytics (Admin)** | Redesign Business Performance tab: per-business expandable rows showing visits, QR scans, offer claims, AI chat mentions, loyalty stamps, secret unlocks, vibes, saves, push CTR. Expandable section shows 30-day trend chart + weekly digest preview card. New `chat_business_mentions` table to track when AI recommends a business. New `/api/admin/business-value-metrics` aggregation route. Sortable columns, tier filter, time range toggle. | Proves Qwikker's value to businesses during free trial. Digest preview doubles as template for automated weekly emails (Resend + Vercel Cron). Essential for retention and reducing churn. Also feeds HQ aggregate metrics. |
| BV-14 | **Automated Weekly Digest Emails** | Vercel Cron (Monday 9am) triggers per-business email via Resend using the same metrics API. Shows what Qwikker did for them that week. Includes upsell CTA for lower tiers. | Passive retention tool. Businesses see value without logging in. Key for trial-to-paid conversion. |

**Priority 4b — QR Scan Auto-Push (NEXT STEP):**

| # | Feature | What it does | Why it matters |
|---|---------|-------------|----------------|
| BV-16 | **QR Scan Auto-Push Notification** | When a user with an existing wallet pass scans a business's QR code, they automatically receive a push notification via their wallet pass with the business's current offer (e.g. "Welcome to David's Grill Shack! Today's deal: 2-for-1 Burgers"). Cooldown: max 1 push per user per business per hour. Only fires if scanner has a wallet pass (`wallet_pass_id` captured on scan). Businesses on Spotlight tier get this automatically; lower tiers see scan count data but pushes are gated behind upgrade. Fallback: if no active offer, push a welcome message with business tagline. | Turns every printed QR sticker into a live, two-way marketing channel. Creates an instant "wow" moment for consumers (scan → personalised offer on lock screen in seconds). Strongest Spotlight upgrade incentive: "Want your QR codes to talk back? Upgrade." Zero effort for businesses — fully automated. Leverages existing wallet push infrastructure + scan tracking. |

**Implementation plan for BV-16:**

**Path A — Existing pass holder scans QR:**
1. In `app/api/qr/scan/[code]/route.ts`: after recording the scan, check if `wallet_pass_id` exists and business has Spotlight tier
2. Cooldown check: query `qr_push_events` — last push to this user for this business must be > 1 hour ago
3. Fetch business's active offer (or tagline as fallback message)
4. Call WalletPush API to update `Last_Message` field with `push: true` on the scanner's pass
5. Log push event to `qr_push_events` table (`wallet_pass_id`, `business_id`, `qr_code_id`, `offer_text`, `pushed_at`)

**Path B — New user scans QR (no wallet pass yet) → queued push on install:**
1. In scan route: if no `wallet_pass_id`, set cookie `qwikker_pending_push` = `{businessId, offerTitle, businessName, scannedAt}` (30-min TTL)
2. User lands on business page → sees "Add to Wallet" → installs pass
3. In `app/api/walletpass/create-main-pass/route.ts`: after pass creation, check for `qwikker_pending_push` cookie
4. If present and < 30 minutes old: fire WalletPush `Last_Message` update with `push: true` using the queued offer text
5. Clear the cookie after push fires
6. Log to `qr_push_events` with `source: 'queued_on_install'`
7. If cookie expired (> 30 min): ignore silently, clear cookie

**Shared:**
- Admin QR dashboard: show "Auto-push enabled" badge on Spotlight business QR codes
- Business dashboard: show push delivery count in QR analytics section (total pushes, unique recipients)
- Tier gating: only Spotlight businesses trigger auto-push. Lower tiers see scan data but get upgrade CTA: "Upgrade to auto-deliver your offer to every scanner"
- DB: new `qr_push_events` table (id, wallet_pass_id, business_id, qr_code_id, offer_text, source enum ['direct_scan', 'queued_on_install'], pushed_at, city)

**Priority 4c — Promo Pack System (BV-17):**

| # | Feature | What it does | Why it matters |
|---|---------|-------------|----------------|
| BV-17 | **Smart Promo Pack System** | Pre-printed generic QR code packs (5 codes per box: 1 activation + 4 content). Franchise admin scans the outside activation code on delivery → selects business from dropdown → all codes inside instantly assign to that business. Outside code then becomes a personalised welcome page for the business owner. Full attribution funnel from print → deliver → engage → claim → active. | Solves logistics (no pre-planning), onboarding friction (one scan to claim), attribution (every step timestamped), scalability (identical boxes for any city), and follow-up automation (non-engaged businesses flagged). Physical-to-digital bridge that no competitor has. |

**BV-17 Full Specification — Smart Promo Pack System:**

**Concept:**
Generic, identical promo pack boxes are mass-printed with 5 unique QR codes each. No business-specific printing required. The franchise admin activates a pack by scanning the outside code and assigning it to a business on the spot — all 4 content codes inside instantly link to that business's pages. The outside code then transforms into a personalised welcome/onboarding page for the business owner.

**Physical Pack Contents (per box):**

| Position | Code Format | Purpose |
|----------|-------------|---------|
| Outside of box (visible) | `QWK-{CITY}-ACT-{XXXXXX}` | Activation code — admin scans to assign, then becomes business welcome page |
| Inside — Window sticker | `QWK-{CITY}-DIS-{XXXXXX}` | Discover — links to business profile page |
| Inside — Counter tent | `QWK-{CITY}-OFF-{XXXXXX}` | Offers — links to business offers page |
| Inside — Menu card | `QWK-{CITY}-SEC-{XXXXXX}` | Secret Menu — links to business secret menu page |
| Inside — Poster/flyer | `QWK-{CITY}-EVT-{XXXXXX}` | Events — links to business events page |

All 5 codes share the same `pack_id`. All use the existing redirect system (`/api/qr/scan/[code]`).

**Database Schema:**

```sql
-- Pack registry
CREATE TABLE qr_code_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_code TEXT UNIQUE NOT NULL,           -- e.g. 'PACK-BOU-000001'
  activation_qr_code TEXT UNIQUE NOT NULL,  -- e.g. 'QWK-BOU-ACT-123456'
  city TEXT NOT NULL,
  business_id UUID REFERENCES business_profiles(id),  -- NULL until assigned
  business_name TEXT,                       -- Cached for welcome page
  status TEXT DEFAULT 'unassigned',         -- unassigned | assigned | claimed | active
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,                  -- When admin scanned + assigned
  assigned_by UUID,                         -- Admin user ID
  business_first_scan_at TIMESTAMPTZ,       -- When business owner scanned outside code
  business_claimed_at TIMESTAMPTZ,          -- When business completed claim flow
  notes TEXT                                -- Admin can add delivery notes
);

-- Extend existing qr_codes table
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS pack_id UUID REFERENCES qr_code_packs(id);
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS pack_position TEXT; -- 'activation', 'discover', 'offers', 'secret_menu', 'events'

-- Pack scan events (tracks every scan of the activation code)
CREATE TABLE pack_activation_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES qr_code_packs(id),
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  scanner_type TEXT NOT NULL,               -- 'admin_assign', 'business_owner', 'unknown'
  user_agent TEXT,
  ip_address TEXT
);
```

**Activation Flow (Admin scans outside code):**

1. Admin scans `QWK-BOU-ACT-123456` with their phone
2. Scan route detects code type = `activation` and pack is `unassigned`
3. Checks if scanner is authenticated admin (via session cookie)
4. **If admin:** Redirects to `/admin/pack-assign/[pack_code]` page showing:
   - City dropdown (pre-filled from pack's city)
   - Business search/dropdown (all imported + approved businesses in that city)
   - "Assign Pack" button
5. Admin selects "David's Grill Shack" → hits Assign
6. Server action:
   - Sets `qr_code_packs.business_id`, `business_name`, `status = 'assigned'`, `assigned_at = NOW()`
   - Updates all 4 content QR codes in `qr_codes` table: sets `business_id` + computes `current_target_url` for each:
     - Discover → `https://{city}.qwikker.com/user/business/{slug}?highlight=true`
     - Offers → `https://{city}.qwikker.com/user/business/{slug}?tab=offers`
     - Secret Menu → `https://{city}.qwikker.com/user/business/{slug}?tab=secret-menu`
     - Events → `https://{city}.qwikker.com/user/business/{slug}?tab=events`
   - Logs `pack_activation_scans` with `scanner_type = 'admin_assign'`
7. Admin sees confirmation: "Pack assigned to David's Grill Shack. All 4 codes are now live."

**Business Owner Scans Outside Code (post-assignment):**

1. Business owner scans `QWK-BOU-ACT-123456`
2. Scan route detects: code type = `activation`, pack status = `assigned`, scanner is NOT admin
3. Redirects to `/pack/welcome/[pack_code]` — a personalised welcome page:

```
┌─────────────────────────────────────────┐
│                                         │
│         [Qwikker Logo]                  │
│                                         │
│   Welcome, David's Grill Shack          │
│                                         │
│   You've been hand-selected to join     │
│   Qwikker — Bournemouth's AI-powered    │
│   discovery platform.                   │
│                                         │
│   Inside this pack you'll find:         │
│                                         │
│   🪟 Window Sticker                     │
│      So customers can discover you      │
│                                         │
│   🎫 Offers Code                        │
│      Your deals, on customers'          │
│      lock screens                       │
│                                         │
│   🤫 Secret Menu Code                   │
│      Create exclusivity, drive          │
│      repeat visits                      │
│                                         │
│   📅 Events Code                        │
│      Promote what's happening           │
│                                         │
│   ─────────────────────────────         │
│                                         │
│   Ready to get started?                 │
│                                         │
│   [Claim Your Free Listing]             │
│   → /claim?business_id=xxx&pack=xxx     │
│                                         │
│   Already have an account?              │
│   [Sign In] → /dashboard               │
│                                         │
└─────────────────────────────────────────┘
```

4. Logs `pack_activation_scans` with `scanner_type = 'business_owner'`
5. Updates `qr_code_packs.business_first_scan_at = NOW()`

**Unassigned Pack Scanned (by anyone):**

- Redirects to a generic page: "This Qwikker promo pack hasn't been activated yet. If you're a business owner and received this pack, contact your local Qwikker team."
- Provides city landing page link as fallback

**Batch Generation (Admin UI):**

- New section in QR Management: "Generate Promo Packs"
- Input: Number of packs (e.g. 250), City
- Generates: 250 × 5 = 1,250 QR codes, grouped into 250 packs
- Output: Downloadable CSV/spreadsheet with columns:
  - `pack_number`, `activation_code`, `discover_code`, `offers_code`, `secret_menu_code`, `events_code`
  - This goes to the printer — they place each code in the correct position on the box template
- Also generates a "print sheet" PDF with all QR codes arranged in print-ready layout (optional, nice-to-have)

**Attribution Funnel & Analytics (Admin Dashboard):**

| Stage | Data Point | Trigger |
|-------|-----------|---------|
| Generated | Pack created in system | Batch generation |
| Assigned | Admin scanned + selected business | Admin activation scan |
| Delivered | Implicit from assignment | Same as assigned (admin is physically there) |
| Engaged | Business owner scanned outside code | Non-admin scan of assigned pack |
| Claimed | Business completed claim flow | `claim_requests` row with `pack_id` |
| Active | Business approved + codes being scanned by consumers | Consumer scans of content codes |

**Admin Pack Dashboard (new tab in QR Management):**

```
┌──────────────────────────────────────────────────────────┐
│  Promo Pack Distribution                                  │
│                                                          │
│  250 Generated  │  180 Assigned  │  142 Engaged  │  98 Claimed │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Pack       │ Business          │ Assigned │ Engaged │ │
│  │ PACK-001   │ David's Grill     │ May 15   │ May 15  │ │
│  │ PACK-002   │ Chaplin's Bar     │ May 15   │ May 16  │ │
│  │ PACK-003   │ Coastal Pantry    │ May 16   │ —       │ │
│  │ PACK-004   │ (unassigned)      │ —        │ —       │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ⚠️ 38 packs assigned > 7 days ago with no engagement   │
│     [Export Follow-Up List]                               │
└──────────────────────────────────────────────────────────┘
```

**Follow-Up Automation:**

- Pack assigned but no business scan after 3 days → flag for follow-up
- Pack assigned but no business scan after 7 days → auto-email: "Did you receive your Qwikker promo pack? Scan the QR on the outside to get started."
- Business scanned but hasn't claimed after 3 days → auto-email: "Ready to activate your listing? It takes 2 minutes."
- All follow-up lists exportable for manual outreach

**Content QR Behaviour (the 4 inside codes):**

- **Before pack assigned:** Redirect to city landing page (generic fallback)
- **After pack assigned, before business claims:** Redirect to business profile page (imported data shows — basic info, Google rating, category). Banner at top: "This business hasn't claimed their listing yet. Are you the owner? [Claim now]"
- **After business claims:** Full business pages with all their content (offers, secret menu, events, profile)

**Print Design Notes:**

- All boxes are physically identical in layout/design/branding
- Only the QR code images differ (unique per pack)
- Suggested box text: "Scan the code on the outside to get started" (works for both admin AND business owner)
- Inside instruction card explains where to place each sticker/tent
- Premium feel: matte black box, green Qwikker branding, minimal text

**Scalability:**

- Same system works for any city — just generate a batch with the city code
- New franchise partners get their own batch generated from their admin dashboard
- Print template is universal — only QR images change between production runs
- Could extend to different pack types in future (e.g. "Loyalty Pack" with NFC tag + loyalty QR, "Premium Pack" with branded table tents)

**Implementation Steps:**

1. Create `qr_code_packs` table + extend `qr_codes` with `pack_id`/`pack_position`
2. Build batch generation server action (generates N packs × 5 codes each)
3. Build admin "Generate Packs" UI in QR Management dashboard
4. Build CSV export for printer
5. Modify scan route to detect activation codes and route appropriately
6. Build `/admin/pack-assign/[pack_code]` page (business dropdown + assign button)
7. Build `/pack/welcome/[pack_code]` page (personalised welcome for business owners)
8. Build pack analytics dashboard tab
9. Wire claim flow to accept `pack_id` param and update pack status on claim
10. Add follow-up automation triggers (Vercel Cron checks for stale packs)

**Priority 4c — AI Chat Quality:**

| # | Feature | What it does | Why it matters |
|---|---------|-------------|----------------|
| BV-15 | **Day-of-Week Offer Filtering** | AI chat context includes offer validity days. System prompt instructs model to only recommend offers active on the current day. Offers with `valid_days` that don't include today are excluded or flagged as "available on [days]". | Prevents embarrassing recommendations (e.g. showing Mon-Thu deal on Friday). Builds user trust in AI accuracy. Directly impacts offer redemption rates. |

**Priority 5 — UI/UX polish:**

| # | Feature | What it does | Why it matters |
|---|---------|-------------|----------------|
| BV-11 | **Compare Plans Table** | Full comparison table below pricing cards on business settings page. Shows all features per tier in rows with tick/cross columns. | Businesses can see exactly what each tier includes at a glance. Removes ambiguity and drives informed upgrade decisions. |
| BV-12 | **Bridge Content: AI Description Generator (Admin)** | "Generate Description" button on unclaimed business CRM cards. Uses OpenAI with imported Google data (category, type, rating, location, features) to produce a factual 2-3 sentence placeholder description. Admin can edit/add context before saving (e.g. "Known for..." input for local knowledge). Batch select option for multiple businesses. Stores `description_source: 'ai_generated'`. **Rules:** Must not misrepresent businesses — descriptions must be factual and generic (type, location, rating). Must not copy or paraphrase business website content (copyright). Must not invent specific menu items, awards, or claims. Descriptions are clearly bridge content until the business claims and writes their own. **Training:** Include in EP9 (Import Tool) or dedicated "Managing Unclaimed Listings" episode. | Cities feel alive from day one instead of empty directories. AI chat has natural language to match against for unclaimed businesses. Businesses see their listing already working when pitched — stronger conversion hook for promo packs. ~£0.001 per description. |

**Flow gap identified — the upgrade escalation ladder:**

Current flow has a dead zone between "claims listing" and "upgrades":
```
Imported → Claims listing → Gets 1 offer, no analytics → ... silence ... → Hopefully upgrades?
```

Ideal flow with BV-1/2/3 implemented:
```
Imported → AI starts mentioning them → Business gets weekly email: "mentioned 23 times"
→ Claims listing → Sees blurred analytics: "47 views — upgrade to see details"
→ Creates 1st offer → Gets 5 claims → Gets notification for each
→ Weekly email: "Competitors with paid plans get 4x more visibility"
→ Upgrades to Starter → Full analytics → Secret Menu → More engagement
→ Sees benchmarking: "#3 in category, #1 has loyalty enabled"
→ Upgrades to Spotlight → Loyalty + Push + Priority AI + Campaigns
```

**The pitch test:** Currently the answer to "why pay £59/month?" is features. With BV-1 and BV-2 implemented, the answer becomes: "Last month, businesses on your plan averaged 67 new customer visits and £890 in estimated revenue. Your plan pays for itself by day 3."

### Business Operations (BO) — May 2026

| # | Item | Status | Notes |
|---|------|--------|-------|
| BO-1 | **HQ Revenue Tracking Dashboard** | PENDING | Per-city GPV (gross platform volume), business subscription counts by tier, pass holder counts, growth trends. Data already in Supabase (`business_subscriptions`, `app_users`, `franchise_crm_configs`). Build as HQ admin page. |
| BO-2 | **Franchise Agreement Template** | PENDING | Legal template covering: territory exclusivity, fee structure lock, term length + renewal, transfer/sale clause, termination protections, revenue model lock. Get reviewed by commercial solicitor. Essential before onboarding more cities. |

---

### EXIT-CRITICAL: HQ Intelligence Dashboard (Post-Revenue, 3+ Active Cities)

Build once real data exists. These are the metrics that take Qwikker from "local business" to £10m+ strategic asset. Acquirers buy momentum + AI moat + retention proof.

| Pillar | Metrics | Why it matters |
|--------|---------|---------------|
| **1. Velocity** | Shadow-to-claim conversion rate, menu refresh frequency, time-to-first-stamp | Proves growth momentum and platform pull |
| **2. Intelligence (AI Moat)** | Query success rate, unmatched queries log (recruitment gold), intent-to-wallet conversion | Proves the AI is working AND shows exactly what businesses to recruit next |
| **3. Retention (Wallet Real Estate)** | Pass removal/unsubscribe rate, push→refresh rate, cross-city switching | Low wallet churn = #1 valuation driver. Cross-city proves global utility |
| **4. Unit Economics (Franchise Multiplier)** | CAC per city partner, LTV of Spotlight subscriber, partner payback period (target <6 months) | Proves infinite scalability |

**Bonus features:** Real-time global heat map of AI intent queries across all cities. Data portability export (structured data for buyer's LLM/Map system — reduces integration risk, increases valuation).

---

### Future Innovation Features (Tier 5 — Post-Launch)

Features that leverage Qwikker's unique position (wallet pass + AI + local business network) to create experiences no competitor can replicate. Not immediate priorities, but worth building towards.

**Wallet Pass / Location:**

| # | Feature | What it does | Technical notes |
|---|---------|-------------|-----------------|
| FT-1 | **Geofenced Wallet Push** | Consumer walks past a business with an active offer → pass appears on lock screen with offer text. No app needed. | Apple Wallet supports up to 10 `relevantLocations` per pass. Google Wallet has `locations` field. WalletPush API likely supports setting these. Rotate the 10 most relevant based on active offers + user preferences + proximity patterns. |
| FT-2 | **NFC Tap for Loyalty** | NFC tag at counter. Customer taps phone → instant loyalty stamp. No camera, no scanning, 1 second. | NFC tags cost ~£0.15 each. iOS + Android support background NFC reading. Tag contains URL → hits earn endpoint. More premium feel than QR codes. |

**AI-Driven Experiences:**

| # | Feature | What it does | Technical notes |
|---|---------|-------------|-----------------|
| FT-3 | **Voice AI Concierge (Input + Output)** | User speaks to AI → AI speaks back. Full voice conversation with the city concierge. | **Input:** Web Speech API (browser-native, free) for speech-to-text. Mic button in chat UI. **Output:** OpenAI TTS API (`tts-1`, ~$0.015/1K chars, natural voices) or free browser `SpeechSynthesis` (robotic but zero cost). Layer on top of existing text chat — response text piped through TTS and auto-played. Combined with real streaming (3.5), first words arrive in ~1-2s. |
| FT-4 | **AI Itinerary Builder** | "Plan my Saturday in Bournemouth" → AI builds a full day: brunch 10am → activity 12pm → drinks 5pm → dinner 8pm. All Qwikker businesses with live offers. Shareable link. | Extends existing AI chat. New intent detection for "plan my day/evening/weekend". Output formatted as timeline with business cards. Shareable via unique URL (organic growth). Could push itinerary stops to wallet pass as the day progresses. |
| FT-5 | **Predictive Push Recommendations** | Time + weather + history → proactive push. "It's raining and you usually get coffee on Fridays — [Cafe] has 20% off right now." | Requires: weather API (free tier of OpenWeatherMap), visit pattern analysis from `atlas_analytics`, cron job for trigger evaluation. Push via WalletPush `Last_Message` with `push: true`. The "it just knows" moment that creates real loyalty. |
| FT-6 | **Dynamic Flash Offers** | AI analyses a business's quiet periods and auto-suggests time-limited offers. "Tuesdays 2-4pm you average 3 visits — want to auto-run a flash offer?" Business just toggles it on. | Needs: analytics aggregation by hour-of-week, offer auto-creation API, scheduled push to relevant consumers. Businesses see it as "AI-powered marketing." |
| FT-7 | **AI Menu Writer** | Business uploads photo of physical menu or types bullet points → AI generates polished descriptions, dietary tags, recommended pairings. | Uses OpenAI Vision API for menu photo parsing. Text generation from existing integration. Directly improves AI chat recommendations (better KB = better answers). |
| FT-8 | **Cross-Promotion Engine** | AI identifies complementary businesses from consumer behaviour. "72% of people who visit [Coffee Shop] also visit [Bookstore] — create a joint offer?" | Needs: visit correlation analysis from `atlas_analytics` + `user_offer_claims`. Suggest pairings to businesses. Joint offers split between two businesses. Network effect — makes both businesses stickier. |
| FT-9 | **Business AI Dashboard Copilot** | AI chat inside business dashboard. "How did I do this week vs last?", "What should I change about my offer?", "Write me an Instagram caption for my new dish." Uses their own analytics as context. | Separate system prompt with business-specific data. Reuses existing OpenAI integration. Lower stakes than consumer chat (no recommendation accuracy concerns). |
| FT-10 | **Event Intelligence** | AI monitors local events (festivals, sports, concerts) and nudges businesses. "Music festival this weekend with 5,000 expected attendees — create a 'Festival Fuel' offer." | Requires: local event data source (public APIs, admin input, or scraping). Notification to relevant business categories. Auto-suggested offer templates. |

**Engagement & Gamification:**

| # | Feature | What it does | Technical notes |
|---|---------|-------------|-----------------|
| FT-11 | **Explorer Badges & Streaks** | Visit streaks, category completion ("Tried all 8 coffee shops"), seasonal challenges ("Summer Cocktail Trail — visit 6 bars"). Badges unlock real rewards from partner businesses. | Badge system already partially exists. Extend with streak tracking, category counters, time-limited challenges. Admin creates challenges per city. |
| FT-12 | **City Leaderboard** | Anonymous weekly leaderboard: "Top Explorer: visited 12 places." Businesses can sponsor prizes for top explorers. | Low effort — aggregate `atlas_analytics` visits per `wallet_pass_id` per week. Display on dashboard. Opt-in (privacy). |
| FT-13 | **Secret Menu Hunts** | Time-limited treasure hunts: "This weekend: find and unlock 5 hidden secret items across the city. Complete the hunt → win a £50 reward." | Admin creates hunts (select participating businesses + items). Track unlock progress per user. Timer + completion rewards. Drives massive foot traffic for participating businesses. |
| FT-14 | **Group Decision Engine** | "We're 4 people, 2 vegetarian, budget-friendly, walking distance" → AI finds places that satisfy ALL constraints. Shareable group link. | Extends AI chat with multi-constraint filtering. Already has dietary data, location, pricing signals. Share via URL for group chat. Solves the "where should we eat" paralysis. |

---

### Admin Onboarding Training Video Plan

**Target audience**: New franchise operators setting up their city from scratch. Format: Short screen-recorded walkthroughs (Loom or similar), 3-8 minutes each.

**Video 1: Welcome & Platform Overview** (~5 min)
- What Qwikker is and how the franchise model works
- The admin dashboard layout (tabs: CRM, Setup, Import, Landing, Analytics)
- How consumers interact (wallet pass, no app)
- The three-tier AI visibility system (paid → claimed-free → unclaimed fallback)

**Video 2: Admin Setup Wizard — Account & Details** (~4 min)
- Step 1: Admin account (login credentials, password)
- Step 2: Franchise details (display name, owner info, timezone, currency, tax)
- Step 4: Integrations overview (what each one does)
- Step 5: Activating the franchise

**Video 3: Google Places API Setup** (~5 min)
- Why it's needed (onboarding form autocomplete, import tool, rating verification)
- Google Cloud Console walkthrough: create project, enable Places + Maps JS APIs, create API key
- Key restrictions (HTTP referrers for production subdomain)
- Pasting into admin setup wizard (Step 3: "Your API Services")
- Testing: try the onboarding form, try the import tool search

**Video 4: Resend Email Setup** (~4 min)
- Why it's needed (transactional emails: approvals, rejections, welcome emails)
- Resend dashboard: create account, verify domain (`{city}.qwikker.com`)
- DNS records (DKIM, SPF, Return-Path) — add to Cloudflare/registrar
- Copy API key into admin setup wizard
- Auto-generated from-email (`no-reply@{city}.qwikker.com`)
- Testing: approve a test business, check email arrives

**Video 5: WalletPush Setup** (~6 min)
- Why it's needed (wallet pass creation, push notifications, loyalty cards)
- WalletPush account: create template (Apple + Google), branding (logo, strip image, colours)
- Template ID + API key → admin setup wizard
- Important: separate template per franchise (branding)
- Testing: create a test pass from `/join`

**Video 6: Stripe Connect** (~4 min)
- Why it's needed (businesses pay subscription through your franchise)
- One-click connect via admin setup wizard → Stripe onboarding
- What happens: account ID saved, charges go directly to franchise bank account
- Testing: trial business → upgrade → payment received

**Video 7: Slack Notifications** (~3 min)
- Create Slack workspace or channel for the franchise
- Slack Apps → Incoming Webhooks → create webhook for channel
- Paste URL into admin setup wizard
- What notifications you'll receive (new signups, claims, support requests, approvals)

**Video 8: The Import Tool** (~8 min)
- What it does (bulk import businesses from Google Places as unclaimed listings)
- Setting search radius and city centre coordinates
- Running a search: categories, filters, radius
- Reviewing results: duplicates, deny list, category mapping
- Importing a batch: what happens (unclaimed, free_tier, AI fallback pool)
- Post-import: approving for AI visibility (`admin_chat_fallback_approved`)
- Placeholder images: how they're assigned per category

**Video 9: Business Onboarding & Approval** (~6 min)
- The two paths: fresh signup (`/onboarding`) vs claim existing (`/claim`)
- Admin CRM queue: reviewing pending businesses
- Google rating verification (4.4★ threshold)
- Approving with trial vs free listing
- What happens on approval (email sent, features unlocked, visible to consumers)

**Video 10: Day-to-Day Operations** (~6 min)
- Monitoring the CRM (active, pending, flagged businesses)
- Managing offers & secret menu approvals
- Checking analytics
- Landing page editor (hero, sections, featured businesses)
- Using the Contact Centre (support tickets from businesses)
- Pricing card customisation

**Prerequisites before recording:**
- [ ] Stripe canonical URL fix implemented (Video 6 needs working flow)
- [ ] Claim trial flow tested end-to-end (Video 9 demo)
- [ ] Clean test franchise available (or use existing city in demo mode)

**Existing videos (older, may need updating):**
- User walkthrough: youtu.be/-n8up4zOkjc
- Business walkthrough: youtu.be/pf6NQKAvIgA
- Admin walkthrough: youtu.be/PLhVjjpShF4

---

### WalletPush SDK Investigation (Backlog)
Investigated using the Mobile Wallet SDK for automated loyalty card creation inside Qwikker.

**Confirmed (from SDK docs + ChatGPT analysis):**
- `admin:full` scoped API key should allow `admin.templates.create()` — template creation via SDK
- `admin.pass.updateValues()` exists for batch field updates (solves our sequential PUT race condition)
- `admin.templates.images.set()` exists for uploading logo/strip images

**Unknown / needs testing:**
- `templateJson` schema is undocumented (the `{ ... }` in the docs) — need to inspect an existing template via `admin.templates.get()` to reverse-engineer it
- No REST endpoints documented separately — SDK wraps a REST API but URLs are not exposed
- Need to either: (a) inspect SDK network calls in browser DevTools to find REST URLs, (b) ask WalletPush for REST API docs, or (c) test if the SDK runs in Node.js

**Security caveat:** `admin:full` key must NEVER be exposed client-side. All SDK/REST calls must happen server-side from Next.js API routes. The SDK is designed for `window.MobileWallet` (browser) — may not work in Node.js. REST endpoint discovery is the safer path.

**Next step:** Create a sandbox test — load SDK in browser, call `admin.templates.create()` / `admin.templates.get()` / `admin.pass.updateValues()` with an `admin:full` key, inspect Network tab for REST endpoints and `templateJson` schema. If viable, build server-side API routes that call those REST endpoints directly.

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
| 2.29 Home Feed + Menu Images | `lib/home-feed/types.ts`, `lib/home-feed/feed-builder.ts`, `components/user/user-dashboard-home.tsx`, `components/dashboard/clean-profile-page.tsx`, `components/dashboard/secret-menu-page.tsx`, `lib/actions/business-actions.ts`, `components/user/user-secret-menu-page.tsx`, `app/user/secret-menu/page.tsx`, `components/user/user-business-detail-page.tsx` | Low-Medium | **Bug fixes:** Tonight/dish/personalized cards now link to `/user/business/{slug}` (generated from business_name, no DB slug column). Loyalty section shows membership progress + filters discover by joined. Personalized reasons combined with separator. **Menu images:** `image_url` added to MenuPreviewItem JSONB (no migration). Cloudinary upload in dashboard. Dish cards use dishImage with businessImage fallback. Secret menu items support optional image. AI chat images removed (LLM unreliable). |
| 0.33 AI Chat Quality Fixes | `lib/ai/hybrid-chat.ts`, `lib/ai/relevance-scorer.ts`, `components/user/user-chat-page.tsx` | Low | **Hallucination fix:** Per-business data boundary rule in system prompt — AI cannot transfer amenities between businesses. **Secret menu gate:** Queries mentioning "secret menu" no longer treated as hard offer queries (were hitting "no offers" bailout). **Vibe tag scoring:** `relevance-scorer.ts` now checks `vibe_tags` JSONB before early return — tag matches score +4, plus priority callout injected into AI context for top match. **Near-me UX:** Client-side "near me" detection intercepts query before API call, shows location prompt only, then resends after user picks location. |

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

### 2.29 Home Feed Fixes + Menu Item Images (DONE — April 2026)
**Three bug fixes:**
1. **Tonight/dish/personalized card links:** Cards under "What's hot", "Must try dishes", and "Based on what you like" were navigating to `/user/discover` instead of the business detail page. Fixed by generating slugs from `business_name` and linking to `/user/business/{slug}`. No DB `slug` column exists — slugs are computed at render time.
2. **Loyalty cards section:** "Start collecting" was shown even for programs the user had already joined. Fixed by fetching `/api/loyalty/me` alongside `/api/loyalty/discover`, rendering joined memberships with progress, and filtering discover list to exclude already-joined programs.
3. **Personalised reasons:** "Based on what you like" only showed vibe-based businesses. Fixed by pulling saved businesses, offer claims, and atlas selections into the reasons. Multiple reasons now combined with " · " separator.

**Menu item images feature:**
- Business dashboard: optional Cloudinary image upload per featured menu item (stored in `menu_preview` JSONB `image_url` field — no migration needed).
- Home feed: "Must try dishes" cards show dish image when available, fallback to business image.
- Business detail page: featured menu items show thumbnail when image uploaded.
- Secret menu: optional image upload per secret item, displayed on both dashboard and user-facing page.
- AI chat images: attempted but reverted — LLM did not consistently embed markdown images when instructed. Kept text-only for reliability.

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

### BV-3 Blurred Analytics for Free Tier (DONE — May 15, 2026)

**What was built:**
1. **Tiered analytics system** (`subscription-helpers.ts`): New `analyticsLevel` property (free/basic/advanced/full) computed from subscription tier. Exposed via `/api/user/feature-access`.
2. **BlurredSection component** (`analytics-page-client.tsx`): Reusable overlay that blurs content and shows upgrade nudge. Applied per-section based on analytics level.
3. **AI Discovery metrics** (`business-analytics-actions.ts`): Queries `chat_messages` for AI responses mentioning the business (via slug matching). Extracts discovery queries (first user message per session). Shows "What People Asked" with counts.
4. **Dynamic period toggle**: 30/60/90-day selector. All labels, subtitles, and trend comparisons update dynamically.
5. **Smart trend badges**: Shows "New — no data last month" (blue) when current > 0 but previous = 0. Hides badge entirely when no data at all.
6. **Engagement Summary**: Replaced useless "Viewer Breakdown" (registered/anonymous — meaningless since all users have wallet passes) with profile views, claims, saves, QR scans as relative bars.
7. **Vibe breakdown**: Shows individual vibe ratings (loved_it/it_was_good/not_for_me) when < 5 vibes. Switches to percentage view at 5+.
8. **Sidebar unlock**: Analytics page always accessible, gating at section level not page level.
9. **Atlas tracking fix** (`AtlasMode.tsx`): `atlas_search_performed` events now log returned business IDs for future per-business discovery query tracking.

**Bug fixes included:**
- Offer claim modal on business page: `modal` div was never appended to `modalOverlay` (blank blur screen)
- Offer claim modal content: replaced "Pass Updated" with proper "Offer Claimed" modal with View Claimed Offers / Add to Wallet / Dismiss buttons
- Save button: `user_saved_items` insert was sending non-existent `item_name` column (every save silently failed)
- Admin tier management: `'starter'` not mapped to DB value `'recommended'` (CHECK constraint violation)
- Admin free downgrade: writing invalid `'claimed_free'` instead of `'free_tier'` (CHECK constraint violation)

**Files changed:** `analytics-page-client.tsx`, `business-analytics-actions.ts`, `subscription-helpers.ts`, `feature-access/route.ts`, `dashboard-layout.tsx`, `improved-dashboard-home.tsx`, `user-business-detail-page.tsx`, `user-saved-actions.ts`, `admin-crm-actions.ts`, `AtlasMode.tsx`

**Next:** BV-14 Weekly Digest Emails — `getBusinessAnalytics()` already returns all data needed. Wire up Vercel Cron + Resend template.

## Key Rules

- Complete each tier fully before starting the next
- DB changes: provide SQL for manual execution + sanity checks
- No emojis in UI. No AI slop. Premium tone.
- Multi-tenant: everything city/franchise-aware
- Identity: wallet_pass_id, no login/logout
