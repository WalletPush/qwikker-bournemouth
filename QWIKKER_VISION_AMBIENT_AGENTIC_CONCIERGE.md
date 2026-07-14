# Qwikker Vision — The Ambient, Agentic Local Concierge

**Status:** North-star vision (strategy, not a build ticket). **Date:** 2026-07-09
**Purpose:** the thesis everything else slots under. Individual features become tickets in the roadmap plan file; this doc is *why* they matter and how they compound.

---

## 1. The thesis (one line)

> **Qwikker knows what your town wants tonight — and acts on it, automatically, for both sides.**

An **ambient, agentic local concierge**: the wallet pass is the primary surface (always on the lock screen), the AI is the brain, and an action layer (MCP/agent tools) is the hands. Both sides — consumers and businesses — are served by one real-time, per-city **taste-and-redemption graph**.

### Reframe (the mindset shift)
- **The pass is the product, not the app.** Nobody opens a local-discovery app daily; a wallet pass is always present. Treat the pass as the primary surface and the app/AI as the brain behind it.
- **The concierge is agentic, not conversational.** It doesn't just answer — it *acts* (adds to wallet, plans, morphs the pass, creates/pushes offers) through a governed action layer.
- **Living pass + MCP are not two features.** They're the body (pass) and hands (MCP) of one organism.

---

## 2. The moat: the data flywheel

Every **save, claim, redemption, vibe rating, Atlas visit, and chat query** builds a real-time **taste graph of a town** — *intent + actual redemption truth*. This is what Google/TripAdvisor structurally lack (stale reviews, not "what does this town want tonight").

```
More usage → richer taste graph → better recommendations + better targeting
   → more redemptions (proven value) → businesses stay/upgrade + users trust it
   → more usage ...
```

**Design rule:** every feature must feed the flywheel (produce or exploit graph data) or it's a distraction. **Redemption truth is the critical faucet** — until offers are actually redeemed (not honour-system), the graph is half-blind. That's why the redemption flow is sequenced first.

---

## 3. What we already have (the unfair head start)

- **Wallet pass as a live channel** with individually-addressable fields (`Current_Offer`, `Last_Message`, `Offers_Url`, `AI_Url`, `Dashboard_Url`, `MEMBER_ID`) — supports **silent morph** (field `PUT`, no notification) *and* **selective push** (`Last_Message` + `push:true`). Body + voice already exist.
- **A local-aware AI concierge** (offers/events/menus/vibes, multilingual via GPT-4o).
- **Multi-tenant per city** — a network effect per city, and cross-city taste portability.
- **Behavioural data** — saves, claims, vibes, Atlas visits, chat queries (redemption still to come).
- **Acquisition engine + promo packs** (roadmap) to get both sides onto the platform.
- Existing roadmap items that are really *parts of this vision*: **BV-16** (QR-scan auto-push), **FT-1** (geofenced wallet push), **BV-5** (automated campaigns), **FT-6** (dynamic flash offers), **FT-4** (AI itinerary), **dennis-08/15** (offer expiry + redemption).

---

## 4. The two flagships (bet on these)

### A. Demand side — the Night-Planner Living Pass
Not "here are restaurants" — **outcomes**. "Plan my Friday for £40." The concierge builds a multi-stop night (dinner → drinks → late) and drops the *whole evening* into the wallet as a **sequenced pass that advances stop-by-stop** — each venue's offer surfaces as you arrive; the pass guides you through the night.
- Delivers FT-4 (itinerary) through the living pass. **Nothing in local does this.**
- Produces rich demand signals for the graph.

### B. Supply side — Goal-Based Business Autopilot (the MCP's killer app)
Businesses set **goals, not campaigns**: "Fill my Tuesdays." "Move 20 covers before 7pm." The AI watches analytics for quiet periods → auto-generates a flash offer → pushes only to nearby, taste-matched pass-holders → measures redemption → learns.
- FT-6 + BV-5, made **agentic and accountable to a KPI**.
- The strongest Spotlight upsell possible: "marketing that runs itself and proves it worked."

**Why the pair:** they reinforce each other through the graph — night-plans create demand, autopilot lets businesses meet it, both generate redemption data → better plans + better targeting.

---

## 5. The "Living Pass" state machine (foundation for A + demand ideas)

The pass has **states**; each state = a look (versioned background/strip image + colours) + fields + action buttons. A small scheduler + event triggers move between states.

- **Default (Qwikker)** — branded home; buttons: *Talk to concierge*, *What's on near me*, *My offers*.
- **Offer-claimed** — morphs to the business's branded card, live **countdown**, **"Show to redeem"**; on expiry (dennis-08) auto-reverts.
- **Time-of-day** (silent, no push) — breakfast/lunch/happy-hour/night swaps.
- **Loyalty-progress** — "heats up" toward a reward, flips to celebratory at reward-ready (reuse existing reward-ready logic).
- **Location-aware** (FT-1) — near a business, surfaces on lock screen + swaps to their offer + "You're here — claim it."
- **Event-tonight** (ties City Events) — "Tonight in {town}: …" + directions.
- **Streak/explorer** — gamify Atlas visits (weekly silent refresh).
- **Personal greeting** — time-aware "Morning, {first_name}".

### Technical honesty (design around these)
- **One pass = one template.** Morph via fields/images/colours on the same serial; do NOT swap templates.
- **Apple caches images by URL** → use a **versioned image URL per state** or the device keeps the cached look.
- **Silent vs push** → field `PUT` refreshes quietly; only `Last_Message` push fires a notification. Use silent morph liberally, push sparingly.
- **Update fatigue is the enemy** → governance (caps, quiet hours, consent) is load-bearing.

### ⚠️ Confirm with WalletPush (Dad) before committing designs
1. Which **visual fields** can we `PUT` (background/strip/logo, not just text/URLs)?
2. Does the new **generic/poster card** expose **action buttons** via the API?
3. Does it support **Apple relevance** (time/location lock-screen surfacing) + **semantic fields**?
These three answers decide how much is "ship now" vs "fake with text/colour / needs workaround."

---

## 6. The MCP / action layer (the hands)

An MCP that wraps **Qwikker's own actions** so any AI surface can drive the platform safely. Audiences:
- **Business "Qwikker Assistant"** (highest value): "send my Friday cocktail deal to everyone who saved us" → governed `create_offer` / `update_pass_state` / `send_push` / `schedule_campaign` / `get_analytics`.
- **Consumer concierge**: "add this to my wallet," "remind me at 6," "plan my night."
- **Internal/admin/ops**: promo-pack welcome pushes, seed city events, acquisition.

**Governance is not optional — build it FIRST, expose tools SECOND:** tier gating, per-user frequency caps + quiet hours, explicit opt-in/consent, full audit log. An ungoverned "AI that pushes" burns the channel and risks platform policy.

---

## 7. Bigger bets (after the flagships)

- **Serendipity engine** — one perfectly-timed, taste-aware, geofenced "go here now" push. The emotional hook that makes people keep the pass.
- **Tourist / arrival mode** — geofence airport/ferry/hotels → "Welcome to {City}" + concierge in the visitor's language; partner with hotels/rentals to hand the pass at check-in. Huge for tourist economies (Kefalonia), dovetails with promo packs.
- **Cross-city taste portability** — a user's profile follows them city-to-city → instant personalization in a new city. Network effect that grows with every city.
- **Honest post-visit loop** — after a real redemption, one tasteful "how was it?" → feeds vibes, (carefully/within policy) nudges a review → social proof flywheel.
- **Sell the graph** — anonymised, aggregate demand insight to businesses ("tapas demand +30% Fridays") and to city/tourism boards (footfall, visitor wants). Turns Qwikker into a strategic data asset (the £10m+ narrative).
- **Group/social** — share a night-plan or offer to a friend; group loyalty ("bring 3 friends") → viral loop, ties to referrals.
- **Voice / hands-free concierge** on the pass (later) — tap-to-talk while walking.

---

## 7a. Arrival Layer — one-tap ride to the offer ⭐ (wanted BEFORE launch)

Kills the last friction between *wanting* and *arriving*: the concierge proactively offers a ride to the deal. *"You're only 7 min from 50% cocktails at Pablo's — want me to book you a ride?"* This is the arrival step of the funnel (want → plan → **get there** → redeem → data) and directly lifts redemptions. The **magic is the concierge intelligence** (proactive, taste + location + ETA aware), not who renders the final confirm — and the confirm happening inside the ride app is *better* for trust/payment/liability.

**Intelligence layer (global, no partnership, powers the whole thing):**
- User location (geofence / app-open geolocation, FT-1) + business coords + **travel time via Google Distance Matrix / Mapbox** (your own key) → the "7 min away" hook works in *every* city regardless of ride provider.
- A relevant live offer + governance (caps / quiet-hours / consent) so it feels like a friend, not a stalker.

**Provider handoff — two-tier model (verified Jul 9, 2026; both tiers need ZERO partnership):**
- **Tier 1 — native deep-link** (best UX: destination pre-filled, real price shown in-app, one tap to confirm). Providers with open deep links: **Uber, Bolt, FreeNow, Gett**. Uber format: `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=..&dropoff[longitude]=..&dropoff[nickname]=..&dropoff[formatted_address]=..`. Use for Kefalonia / Europe.
- **Tier 2 — Google Maps "Rides" universal fallback** for cities with no open deep link (all of Asia): `https://www.google.com/maps?saddr=my_location&daddr=<lat>,<lng>&dirflg=x` → opens Maps' request-a-ride tab which **aggregates every provider operating there** (Google's list includes Grab, Go-jek, DiDi, 99, Careem, Ola, Bolt, FreeNow, Uber, Lyft…). No API key, no approval. User books in the chosen provider's app. Slightly more friction (comparison handoff, not pre-filled one-tap) but real, free, and global. Use for Bali / SE Asia (surfaces Grab + Gojek), Zanzibar, etc.
- **Per-city config picks the tier + provider.** Concierge line is identical; only the button target differs. Every city gets *something* on day one.

**❌ What is NOT free (corrected — Uber tightened this):**
- **Uber price estimate in your own chat** (`GET /v1.2/estimates/price`) now **requires Uber approval** (BD contact); server tokens are deprecated. So you cannot print Uber's exact £ in your chat pre-approval — but the deep-link shows the real surge-accurate fare inside Uber a half-second after the tap anyway.
- **Grab / Gojek / DiDi / inDrive have NO open consumer ride deep link.** Grab's platform is fully partnership-gated (Business account + NDA + docs + deposit). That's exactly why Asia uses the Google Maps Rides fallback.

**Hybrid (near, optional):** show a self-computed rough £ range ("approx ~£5–7", clearly labelled) alongside the real ETA, then hand off. Gets a price hint without any approval; avoid quoting a hard number you can't guarantee.

**Full in-chat booking (V2 — real but gated, Uber only):** Uber Rides API does the dream flow — `POST /v1.2/requests/estimate` (fare_id + price) → `POST /v1.2/requests` (books on the user's behalf) → `GET /v1.2/requests/{id}` (live driver ETA/tracking) → `DELETE` (cancel). THREE catches make it a partnership project: (1) the `request` scope is **privileged** — works only for your ~5 registered dev accounts until Uber grants **Full Access** (app review); (2) each user must **connect their Uber account once via OAuth** + have a payment method on file (payment/liability stay with Uber); (3) **Uber-specific** — Grab/Bolt are separate, harder. Start the Uber Full Access application + build the "Connect Uber" OAuth flow in parallel, but DON'T block launch on it.

**Spicy future — Sponsored rides:** "Pablo's will cover your ride if you come in the next 30 min" (via Uber Vouchers). A business-funded acquisition tool nobody else has — pairs perfectly with Goal-Based Autopilot.

**Verdict:** the pre-launch build = **ETA intelligence (Distance Matrix) + two-tier handoff (native deep-link where available → Google Maps Rides everywhere else)**. Zero partnerships, works globally, ships now. Exact-fare-in-chat, full API booking, and sponsored rides are the V2 escalation.

---

## 8. Sequencing (ruthless — avoid ten features at 60%)

1. **Redemption + Living-Pass state layer** — the data faucet. Redemption truth + versioned-image morphing + silent-vs-push + governance (caps/quiet-hours/consent). *(Also closes dennis-15.)* Nothing else works well without this.
2. **One demand flagship** — offer-claimed → countdown → **redeem** → revert first (tangible, closes dennis-15), then the Night-Planner.
3. **One supply flagship** — Goal-Based Autopilot (needs redemption data from step 1).
4. **Breadth** — time-of-day morph (cheap wow), serendipity, tourist mode, cross-city, graph products, social.

Governance and the taste-graph plumbing are cross-cutting — treat them as infrastructure, not features.

---

## 9. How this maps to the existing roadmap

| Vision piece | Existing roadmap item(s) |
|---|---|
| Offer-claimed pass state / expiry / redemption | dennis-08, dennis-15 |
| QR-scan → pass state trigger | BV-16 |
| Location-aware state / serendipity | FT-1 (geofenced push) |
| Goal-based autopilot | BV-5 (automated campaigns) + FT-6 (dynamic flash offers) |
| Night-planner | FT-4 (AI itinerary) + Atlas improvements |
| Event-tonight state | City Events (dennis-02/09/14) |
| Arrival Layer — one-tap ride to the offer (⭐ pre-launch deep-link; API booking + sponsored rides V2) | NEW — `arrival-layer-ride-booking` |
| Acquisition / tourist onboarding | Qwikker Acquisition Engine + Promo Packs (BV-17) |

**This vision doesn't add net-new scope so much as it gives the existing scattered items a single north star and a sequencing logic.**
