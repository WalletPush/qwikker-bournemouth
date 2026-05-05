# Qwikker Intake Pack — OpusReach Integration

> Source of truth for the OpusReach AI copywriting agent. Grounded in the live codebase and production database as of April 2026. `[VERIFY]` = needs human confirmation. `[ROADMAP]` = not yet shipped.

## 1. Product Overview

Qwikker is a multi-tenant, wallet-based city companion. Travellers and locals get curated offers, secret menus, loyalty cards, and an AI concierge through an Apple/Google Wallet pass — no app download. Each city runs as an independent franchise on its own subdomain (`bali.qwikker.com`, `bournemouth.qwikker.com`) with its own admin dashboard, pricing, currency, and AI instance. The platform is built on Next.js + Supabase + Stripe Connect (`app/page.tsx`, `lib/supabase/middleware.ts`).

**Value loop — consumers**: Install free wallet pass → get push notifications with live offers → unlock secret menu items → earn loyalty stamps at venues → chat with AI concierge for personalised recommendations → browse Atlas interactive map.

**Value loop — businesses**: Verified listing on a curated platform → create offers and secret menus → issue digital loyalty cards (replacing paper stamp cards) → real-time analytics → reach customers via wallet push. Zero dev work.

**What Qwikker is NOT**: Not a scraped review aggregator. Not a coupon/discount app. Not a booking engine (links to business booking URLs; ride/table booking integration planned — see §13). Not a food delivery platform. The AI concierge never recommends external platforms like Booking.com or Airbnb (`lib/ai/hybrid-chat.ts` — `NEVER RECOMMEND EXTERNAL PLATFORMS` system prompt rule).

## 2. Business-Facing Features

| Feature | Status | What it does | Code reference |
|---------|--------|-------------|----------------|
| **Listing / profile** | Shipped | Name, category, hours, address, tagline, description, website, socials, booking URL, vibe tags, Google verification with auto-fill | `components/dashboard/clean-profile-page.tsx` |
| **Offers & deals** | Shipped | Multi-offer with start/end dates, claim frequency (single/repeat), terms, images. Goes through admin approval. Pushes to wallet with 12h expiry | `components/dashboard/offers-page.tsx`, `lib/actions/business-actions.ts` |
| **Secret Menu Club** | Shipped | Name, description, price, image, ordering instructions. Admin-approved. Tier-limited | `components/dashboard/secret-menu-page.tsx` |
| **Loyalty cards** | Shipped (Spotlight) | Stamps or points mode, configurable threshold/reward, QR earn with rotating security tokens, WalletPush-backed digital pass, stats dashboard | `components/dashboard/loyalty-page-client.tsx`, `supabase/migrations/20260209120000_create_loyalty_system.sql` |
| **Analytics** | Shipped (tier-gated) | 30-day profile views, offer claims, saves, booking clicks, loyalty metrics, daily time series, Atlas map widget | `lib/actions/business-analytics-actions.ts` |
| **Push notifications** | Shipped (Spotlight) | Compose and send to wallet pass holders with audience targeting and stats | `components/dashboard/notifications-page-client.tsx` |
| **Events** | Shipped | Types, recurrence, dates. Tier-limited | `app/dashboard/events/page.tsx` |
| **Files & menus** | Shipped | Logo, offer image, gallery (reorder/delete), PDF menu uploads via Cloudinary | `components/dashboard/files-page.tsx` |
| **Contact centre** | Shipped | Ticketing/support threads between business and city admin | `components/dashboard/contact-centre-client.tsx` |
| **Social Wizard** | `[ROADMAP]` | AI-generated social content. Route exists, marked "Soon" in nav | `app/dashboard/social-wizard/page.tsx` |
| **Customer DMs** | `[ROADMAP]` | No direct business-to-customer messaging yet |  |
| **Multi-location** | `[ROADMAP]` | Single address per profile today |  |
| **Team accounts** | Partial | DB schema exists (`business_user_roles`: owner/manager/staff). No full UI | `supabase/migrations/20260204000000_create_business_user_roles.sql` |

## 3. Pricing, Tiers & Plans

Pricing is **fully customisable per city** via `franchise_crm_configs.pricing_cards` JSONB (`supabase/migrations/20251014000000_create_franchise_billing_system.sql`). Each franchise operator sets their own prices, currency, and feature copy. Below are two representative cities:

### Bali (IDR)

| | Starter | Featured | Spotlight |
|---|---------|----------|-----------|
| **Monthly** | Rp 200,000 | Rp 600,000 | Rp 2,000,000 |
| **Annual** | Rp 2,000,000 | Rp 6,000,000 | Rp 20,000,000 |

### Bournemouth (GBP — most refined feature copy)

| | Starter (£25.99/mo) | Featured (£59.99/mo) | Spotlight (£129.99/mo) |
|---|---------------------|---------------------|----------------------|
| AI-powered discovery listing | Yes | Yes | Yes |
| Menu/service indexing | Basic | Advanced | Advanced |
| Active offers | Up to 3 | Up to 5 | Unlimited |
| Secret Menu Club | Limited | Full | Full |
| Social media | Welcome | Featuring | Social Wizard Tool |
| Push notifications | — | — | Yes (to all users) |
| White-label loyalty system | — | — | Yes |
| AI booking | — | — | Yes |
| Advanced AI insights | — | — | Yes |
| Dashboard & support | Yes | Yes | Yes |

**Hard-coded tier limits** (`lib/utils/tier-limits.ts`): offers (free:1, starter:3, featured:5, spotlight:25), secret menu items (free:0, starter:5, featured:10, spotlight:25), events (free:0, starter:3, featured:5, spotlight:unlimited).

**Feature flags** (`lib/utils/features-for-tier.ts`): Only Spotlight unlocks `analytics`, `loyalty_cards`, `social_wizard`, `push_notifications`. All other tiers get these as `false`.

### Free Tier (no payment)
Businesses on the free tier get a basic listing visible in Discover. They are **not** permanently excluded from AI or Atlas — an admin can toggle `admin_chat_fallback_approved` to include them in the Tier 3 AI fallback pool, and claimed-free businesses with featured menu items appear as Tier 2 text mentions. See §6 for the three-tier system.

### Founding Member Perks
Per-franchise config: `founding_member_enabled` (all cities: `true`), `founding_member_discount_percent` (all: 20%), `founding_member_total_spots` (all: 150), `founding_member_trial_days` (Bournemouth/Brighton: 30 days, all others: 90 days). Upgrading during trial locks in 20% lifetime discount on annual plans (`app/api/stripe/create-checkout-session/route.ts`).

### Billing
Stripe Connect — fully wired, not stubbed. Each franchise has its own Stripe Connect account. Checkout uses inline `price_data` (no pre-created Stripe Price IDs needed). Customer portal, webhooks for invoice/subscription lifecycle all implemented (`lib/stripe/checkout.ts`, `app/api/webhooks/stripe/route.ts`).

## 4. Business Onboarding Flow

1. **Land** on `{city}.qwikker.com/onboarding` (`app/onboarding/page.tsx`)
2. **Verify** — Google Places autocomplete (auto-fills name, address, lat/lng, rating, reviews) or manual entry (`components/simplified-onboarding-form.tsx`)
3. **Steps 1–6** — Business name → type & category → location → contact → password → plan choice (free vs trial)
4. **Submit** — Auth user created, `business_profiles` inserted with `status: 'incomplete'`, Slack + welcome email sent (`lib/actions/signup-actions.ts`)
5. **Complete profile** — Dashboard prompts: hours, description, tagline, logo, photos
6. **Admin review** — Appears in franchise admin "Pending" queue. SLA: 24–48 hours
7. **Approved** → `status: 'approved'`, trial activated, visible to consumers

**Claim flow** (for pre-imported Google Places listings): Search → confirm → email verify → account → `pending_claim` → admin approval (4.4★ threshold, override available) (`app/claim/page.tsx`, `app/api/admin/approve-claim/route.ts`).

**Time**: Form ~5–10 min (faster with Google), profile completion ~15–30 min, admin approval 24–48h.

## 5. Eligible Business Categories

20 categories in `lib/constants/system-categories.ts`: `restaurant`, `cafe`, `bakery`, `bar`, `pub`, `dessert`, `takeaway`, `fast_food`, `salon`, `barber`, `tattoo`, `wellness`, `retail`, `fitness`, `sports`, `hotel`, `venue`, `entertainment`, `professional`, `other`.

Google Places import uses strict mapping with global deny lists and per-category rules (`lib/constants/category-mapping.ts`, `lib/import/category-filters.ts`).

**Bali focus**: F&B (restaurants, cafes, bars), wellness (spas, yoga, massage), activities/entertainment, experiential retail. Transport is not a supported category.

## 6. Consumer Mechanics & Three-Tier AI System

### Wallet Pass
Provider: WalletPush (per-franchise credentials). User enters name + email → pass created → Apple `.pkpass` or Google Wallet save. Pass fields: `Current_Offer`, `Last_Message`, `AI_Url` (shortlink `/c/{code}`), `Offers_Url` (`/o/{code}`). Offers push with 12h expiry. No app download required (`app/api/walletpass/create-main-pass/route.ts`, `lib/config/wallet-pass-fields.ts`).

### Three-Tier AI Chat System
The AI concierge uses a three-tier business visibility model (`supabase/migrations/20260128000001_three_tier_chat_system.sql`, `lib/ai/hybrid-chat.ts`):

- **Tier 1 — Paid/Trial**: Rich AI recommendations with full detail. Carousel cards (image-based business cards in chat) are built but currently disabled. Query: `business_profiles_chat_eligible` view. Only eligible tiers: `qwikker_picks`, `featured`, `free_trial`, `recommended` (`lib/atlas/eligibility.ts`).
- **Tier 2 — Claimed-Free "Lite"**: Text-only mentions (no carousel cards) for claimed businesses with at least 1 featured menu item. Query: `business_profiles_lite_eligible` view. Max 3 shown, below Tier 1 with divider.
- **Tier 3 — Unclaimed Fallback**: Admin-curated directory. Requires `admin_chat_fallback_approved = true` toggle (set per-business by franchise admin). Text-only, basic contact info + Google reviews with disclaimer. Query: `business_profiles_ai_fallback_pool` view.

**Key**: Free tier businesses ARE visible in AI/Atlas when admin-approved (Tier 3) or claimed with menu items (Tier 2). Carousel cards (premium visual treatment) are built for Tier 1 only but currently disabled across all tiers. When enabled, they will be the primary monetisation lever — paid businesses get rich visual cards, free/claimed get text-only mentions.

### AI Concierge
Models: GPT-4o-mini (most queries) / GPT-4o (complex). Per-franchise OpenAI API key. Data: business KB embeddings (`text-embedding-ada-002`), city knowledge, live profiles. Multi-language (responds in user's detected language). Guardrails: never recommends competitors, post-processing filters, fact-mode for verified data (`lib/ai/hybrid-chat.ts`, `lib/ai/embeddings.ts`).

### Loyalty (Consumer Side)
Business QR at counter → scan → earn endpoint validates token + rate limits → membership auto-created → stamps incremented → pass updated → at threshold → "Redeem" → deducts stamps + push (`app/api/loyalty/earn/route.ts`, `app/api/loyalty/redemption/consume/route.ts`).

### Atlas Map
Mapbox-based interactive map. Per-franchise feature flag (`atlas_enabled` + `mapbox_public_token`). Business pins, category/vibe/rating filters, directions. Analytics: selections, directions clicks (`components/atlas/AtlasMode.tsx`).

### Home Feed
Algorithmic sections: Tonight's Events, Featured Dishes, Live Deals, Personalised (based on interactions), Loyalty Rewards, Secret Menu teaser. Composite scoring with tier priority, dedup, franchise timezone awareness (`lib/home-feed/feed-builder.ts`).

## 7. Data & Integrations

| Integration | Status | Notes |
|------------|--------|-------|
| **Stripe Connect** | Live | Per-franchise billing. Checkout, portal, webhooks |
| **WalletPush** | Live | Wallet creation, field updates, push. Per-franchise |
| **OpenAI** | Live | AI chat (GPT-4o/4o-mini), embeddings. Per-franchise key |
| **Google Places** | Live | Onboarding, import, photo proxy. Per-franchise keys |
| **Mapbox** | Live | Atlas map. Per-franchise token |
| **Resend** | Live | Transactional email. Per-franchise |
| **Slack** | Live | Admin notifications. Per-franchise webhook |
| **Cloudinary** | Live | Image/file storage |
| **GHL** | Partial | Marketing webhooks; some helpers deprecated |
| **Twilio** | Partial | SMS capability in code. `[VERIFY]` active use |
| **Instagram** | None | Handle stored only, no API pull |
| **POS** | None | No Square/Clover/Toast integration |

**Auto-populated**: Name, address, lat/lng, rating, reviews, types (via Google Places at onboarding). **Manual**: Hours, description, menus, offers, secret items, loyalty config.

**Bahasa Indonesia**: No full UI translation framework. IDR currency + `id-ID` locale formatting supported. AI chat responds in Bahasa via GPT language detection. Dashboard UI is English-only.

## 8. Bali Deployment

- **Status**: ACTIVE (`franchise_crm_configs.status = 'active'`). Live and open for business signups at `bali.qwikker.com`
- **Currency**: IDR (Rp). Pricing: Rp 200K / 600K / 2M monthly (starter/featured/spotlight)
- **Founding members**: Enabled, 150 spots, 90-day trial, 20% lifetime discount
- **Pre-imported businesses**: 110 auto-imported from Google Places (all `unclaimed` / `free_tier`). 103 are AI-approved and visible in the AI concierge as Tier 3 fallback mentions
- **Knowledge base**: 10 entries (8 custom, 2 PDF documents) seeded for Bali city knowledge
- **Infrastructure**: Admin account active, Slack (`#all-qwikker-bali`), WalletPush, and OpenAI all configured and operational
- **Sub-regions**: Not yet implemented. Businesses have a `business_town` field for locality. Bali area targeting (Canggu, Ubud, Seminyak, Uluwatu) would need to be built `[ROADMAP]`

## 9. Upgrade Triggers

1. **Trial expiry** → configurable per franchise via `founding_member_trial_days` (e.g. Bali: 90 days, Bournemouth: 30 days, range 7–365) → business hidden from users after expiry → urgency to convert
2. **Feature gates** → hitting offer limits, wanting loyalty/push/analytics
3. **Carousel exclusion** (when enabled) → free/claimed businesses get text-only AI mentions; paid get rich carousel cards with images — visible upgrade incentive
4. **Founding discount countdown** → 20% lifetime lock-in only during trial
5. **In-dashboard prompts** → `LockedFeaturePage` on gated features

**Free tier limits**: 1 offer, 0 secret items, 0 events, no loyalty, no push, no analytics, no social wizard. Appears in Discover and (if admin-approved) AI text mentions — but never as a carousel card.

## 10. Proof Points & Assets

- **Demo city**: Bournemouth (`bournemouth.qwikker.com`) — fully functional demo environment with mock data and test users. Not a live commercial deployment
- **Videos**: User (youtu.be/-n8up4zOkjc), Business (youtu.be/pf6NQKAvIgA), Admin (youtu.be/PLhVjjpShF4)
- **Partner page**: `qwikker.com/partners` — city claim mechanic with 30-day holds
- **Metrics**: No live commercial data yet. Bali will be the first commercial launch. Analytics dashboard is fully built and ready to track all engagement from day one

## 11. Brand & Messaging Guardrails

**Voice**: Curated not aggregated. Local-first. No-app convenience. Confident but honest.

**MUST NOT claim**: Specific user volume numbers (unless approved), guaranteed ROI, "better than Google/TripAdvisor" (position as *different*), pricing guarantees beyond current plans, "free forever".

**Approved differentiators**: Curated (not scraped), AI concierge with local-only knowledge, wallet pass (no app), city partner operated, digital loyalty replacing paper, secret menu exclusivity.

## 12. Known Gaps & Honest Answers

**"How will customers find me?"** — "You're joining as a founding member before the demand push. Once we reach critical mass of quality businesses, we activate consumer distribution through hotels, airports, and travel media. Early businesses lock in the best placement and founding pricing. You pay nothing to wait. Bali will be Qwikker's first commercial city launch."

**"What's my ROI?"** — "During the free trial, your ROI is the listing, loyalty card replacement, and AI visibility at zero cost. We track offer claims, profile views, and loyalty engagement — real numbers in your dashboard."

**"Another platform to manage?"** — "No app for your customers (wallet pass only). Onboarding: 5–10 minutes. Creating an offer: 2 minutes. Your loyalty card replaces paper stamp cards entirely."

**"How does AI know about my business?"** — "Your profile, offers, and menu items are automatically embedded into the AI knowledge base. It answers based only on your real data — never guesses."

**"What happens after trial?"** — "Choose a plan or your listing pauses. Upgrade during trial = 20% founding member discount locked in for life on annual."

## 13. Roadmap (Next 90 Days)

**Recently shipped**: AI Management dashboard (usage/cost tracking per franchise), partner city claim page, multi-language AI chat.

**In development / planned**:
- `[ROADMAP]` **Uber / Grab integration** — ride booking directly from AI concierge ("take me there" → launches ride request)
- `[ROADMAP]` **OpenTable integration** — table booking directly from AI concierge ("book a table" → reservation flow)
- `[ROADMAP]` Social Wizard full launch (AI-generated social content)
- `[ROADMAP]` Referral program for businesses
- `[ROADMAP]` QR code system overhaul (tracking, deep linking)
- `[ROADMAP]` Enhanced AI concierge — gated concierge with curated city knowledge
- `[ROADMAP]` Full team management UI

**Safe to tease**: AI concierge in any language, digital loyalty cards, real-time analytics, founding member pricing, no-app wallet experience, upcoming ride/table booking from AI.

**Keep silent on**: Specific launch dates, internal pricing negotiations, competitor comparisons by name, unverified user/revenue numbers.

---

*Generated from codebase + production DB audit, April 2026. All code refs relative to `/Users/qwikker/qwikkerdashboard/`. `[VERIFY]` items need human confirmation before outreach use.*
