# Qwikker Business Autopilot — Master Spec

**Status:** Spec (strategy + build plan). **Date:** 2026-07-10
**Purpose:** Unify the scattered business-value items (BV-*, FT-*, the acquisition AI-offer idea, Goal-Based Autopilot) into ONE coherent product: Qwikker acts as an autonomous marketing department for each business, and *proves* it drove money.
**Relationship to other docs:** This is the business-side counterpart to `QWIKKER_VISION_AMBIENT_AGENTIC_CONCIERGE.md` (consumer side). The consumer doc = "the pass is the product, the AI is the concierge." This doc = "the AI is the business's marketing team, and Qwikker proves ROI."

---

## 1. Thesis (one line)

> **Qwikker does the marketing work *for* the business and *proves* it drove footfall — automatically, so the owner does nothing but approve.**

Businesses don't want tools; they want **outcomes and proof**. Qwikker already captures the raw truth (views, claims, redemptions, saves, QR scans, vibes, AI mentions, Atlas directions, loyalty). Autopilot turns that captured data into **actions taken on the business's behalf** and **a weekly "here's the money we made you" story**.

### The reframe
- **Value = outcomes, not features.** Retention comes from *feeling* the ROI, not from a bigger feature list.
- **The AI-offer-on-claim is Act 1, not a gimmick.** It's the first act of a lifelong autopilot relationship: hook with "we already built you an offer," then never stop ("Tuesdays are quiet — here's your next move, it drove 14 visits, want another?").
- **Less work = the whole point.** Every step is drafted by Qwikker; the business approves with one tap.

---

## 2. Interaction model — "Assistant" (approve-each) ✅ DECIDED 2026-07-10

Qwikker **drafts** every action (offer, push, campaign, response) and the business **approves each with one tap**. Not silent full-auto (trust risk), not manual (defeats "less work").

- Draft → notify (in-app Activity + email + optional wallet) → **[Approve] / [Edit] / [Skip]** → Qwikker executes → reports result.
- Builds trust + engagement (business sees Qwikker working every week) while keeping a human in the loop.
- **Future option:** full-auto ("set a goal, don't ask me") can be unlocked on Spotlight later — monetizes the autonomy itself. Not in v1.

---

## 3. The Autopilot loop

```
AI drafts offer (category playbook + real business data + season/town signals)
   → business one-tap approves
   → auto-publishes to listing + wallet Current_Offer
   → timed / geofenced push to city pass holders (FT-1, BV-16)
   → tracks claims → redemptions → visits (existing analytics tables)
   → "£X tracked footfall this week" ROI story (weekly digest email + pass)
   → "Tuesdays still quiet — here's your next move" → loop
```

The business approves once per action (or accepts a suggested cadence). Qwikker becomes the autonomous marketing department. This is the flagship ~£99/mo product, not the £29 listing.

---

## 4. Building blocks (what exists, what's new)

Legend: **BUILT** / **PARTIAL** / **SPEC** (existing doc) / **NEW** (not in any doc).

### Spine (build these in order — see §7)
| # | Block | Status | Notes |
|---|-------|--------|-------|
| S1 | **ROI proof / weekly digest** ("what Qwikker did for you") | SPEC (BV-1 ROI + BV-2/BV-14 digest; data layer READY) | Biggest retention lever. All source data already real: `user_business_visits`, `user_offer_claims`, `user_saved_items`, `qr_code_scans`, `qwikker_vibes`, AI-mention heuristic. |
| S2 | **AI offer generation** (category playbook + LLM polish + rationale) | NEW (Acquisition Engine spec names it, unbuilt) | Two-layer: deterministic category archetypes → LLM personalisation. Output maps to `business_offers` shape + `rationale`. Reuse Social Wizard `contextBuilder.ts`/`promptBuilder.ts` grounded-prompt pattern. **No fabricated stats.** |
| S3 | **Automated push** (timed/geofenced to pass holders) | PARTIAL (push BUILT Spotlight; FT-1 geofence + BV-16 scan-push SPEC) | Push updates `Last_Message`; extend to also set `Current_Offer`. |
| S4 | **The loop / orchestration** (draft→approve→execute→measure→suggest-next) | NEW | Ties S1–S3 + Goal-Based Autopilot (`QWIKKER_VISION` §flagships) + FT-6 flash offers into one engine. |

### Acquisition entry (Act 1)
| Block | Status | Notes |
|-------|--------|-------|
| **AI pre-built offer on import** | NEW | Store in new `prospect_offers` table (survives the import trigger that wipes offer fields; keeps prospects separate from live `business_offers`). Doubles as admin prospecting dashboard. |
| **"Look what we built you" personalised preview link** | NEW | `qwikker.com/preview/<business>` — live mock of their listing + offer + rationale. Turns outreach into a *gift*, not a signup ask. Drop into email/postcard-QR/DM. |
| **Claim-time Accept / Edit / Decline** | NEW | On claim, wizard surfaces the pre-built offer → one tap. Accept flows into existing `business_changes → approve → business_offers` pipeline (auto-live since admin curated). |
| **Non-spam outreach stack** | PARTIAL/SPEC | Ranked: **physical postcard** (Lob/PostGrid/Gelato — highest trust, in Acquisition Engine spec) + **preview link** + **SEO self-discovery** > warm email (separate warmed domain) > manual DM (high-value only). ⚠️ Automated IG cold-DM = Meta ToS/ban risk — manual only. |

### High-value plug-ins (after the spine)
| Block | Status | Value |
|-------|--------|-------|
| **Named Customer Intelligence** ("8 saved but never visited → nudge them"; top regulars; first-timers) | NEW (biggest whitespace) | The CRM businesses actually want; respects privacy/RLS via segments+triggers not raw identities. Feeds automated campaigns. |
| **Competitor benchmarks** ("your claim rate is 40% below cafés in {town}") | SPEC (BV-7) | Upsell rocket fuel — FOMO backed by data only Qwikker has. |
| **Reputation loop** (vibes → Google review nudge; respond to vibes) | SPEC (BV-10 + vision loop) | Improves their *whole* online presence, not just Qwikker. |
| **AI performance transparency for ALL tiers** ("recommended 31×, ranked #4 — add a lunch offer to rank higher") | PARTIAL (Spotlight-only today) | Turns opaque ranking into coaching + upgrade reason. |
| **Automated campaigns** (win-back, birthday, welcome, seasonal, quiet-period) | SPEC (BV-5) | The recurring engine Autopilot drives. |

### New monetization ideas (not in any doc)
| Idea | Value |
|------|-------|
| **Sponsored boost** — one-tap paid bump in feed/AI for a day | Micro-monetization on top of subscriptions; businesses already grok "boost post". |
| **Offer bundles / prepaid vouchers** — stored value ("£20 for £15") | Turns Qwikker into a revenue channel + real GMV, not just discovery. |
| **"Quiet now" real-time offer** — one-tap "it's dead, push a 1-hr deal nearby" | Instant visceral value a bar/café owner feels immediately (beyond scheduled flash offers). |

---

## 5. Data foundation (already real — the moat)

All captured today, per business (see business-dashboard audit):
- `user_business_visits` (views, unique, first vs returning, booking clicks)
- `user_offer_claims` (claims, top offers)
- `user_saved_items` (saves)
- `qr_code_scans` (scans, time-of-day, device)
- `qwikker_vibes` (❤️/👍/👎)
- `atlas_analytics` (directions clicked)
- `chat_messages` (AI mentions — heuristic slug match today; upgrade to impression-level logging)
- loyalty tables (memberships, earn, redemptions)

**Gap to close for ROI:** redemption verification (dennis-15) so the "£X footfall" story is trustworthy, and Atlas Track A hardening (under-reported map events).

---

## 6. Monetization framing

- **Free/Starter:** see ROI digest (light) + accept AI offers → proves value, drives upgrade.
- **Featured:** advanced analytics + benchmarks + more automated actions.
- **Spotlight (~£99 tier):** full Autopilot (offers + push + campaigns + reputation loop), premium analytics, loyalty. Future: full-auto autonomy toggle.
- **À la carte:** sponsored boost, vouchers/GMV take-rate.

---

## 7. Sequencing (build the spine, not breadth)

1. **S1 — ROI proof / weekly digest.** Retention first; data already exists; best upsell surface. (= BV-1 + BV-2)
2. **S2 — AI offer generation** (`prospect_offers` + category playbook + LLM + rationale). Powers both acquisition (Act 1) and Autopilot.
3. **S3 — Automated push** (extend push to set `Current_Offer`; add timed send; FT-1 geofence later).
4. **S4 — The loop** (draft→approve→execute→measure→suggest-next orchestration + Goal-Based goals + FT-6 flash offers).
5. **Plug-ins**, in value order: Named Customer Intelligence → Benchmarks (BV-7) → Reputation loop → AI transparency → Automated campaigns (BV-5).
6. **Monetization add-ons:** sponsored boost, vouchers, quiet-now.

**Dependencies:** redemption verification (dennis-15) and Atlas hardening make the ROI numbers trustworthy — pull them forward under S1/S4.

---

## 8. Open decisions (for later)
- Redemption verification mechanism (staff PIN / QR at counter / NFC tap — FT-2) — needed for trustworthy ROI. Ties to dennis-08/15.
- Preview-link privacy: public URL vs tokenised (avoid competitors scraping prospect offers).
- `prospect_offers` generation trigger: cheap template at import vs LLM on-demand at outreach (leaning: template at import, LLM polish on-demand).
- Full-auto autonomy: if/when to unlock the "don't ask me" toggle on Spotlight.

---

## 9. Cross-references
- Consumer side: `QWIKKER_VISION_AMBIENT_AGENTIC_CONCIERGE.md`
- Acquisition funnel: `PROGRESS.md` "Qwikker Acquisition Engine" + BV-17 Smart Promo Packs
- Vibes/reputation: `QWIKKER_VIBES_ROADMAP.md`
- Roadmap items: `platform_audit_roadmap_7ed16549.plan.md` (BV-1/2/5/7/10/14, FT-1/6, `business-autopilot`, `ai-prospect-offers`)
