# City Events (Admin) — Spec

**Status:** SPEC ONLY — not built. **Date:** 2026-07-09
**Covers roadmap items:** `dennis-02` (events intake + CSV bulk upload), `dennis-09` (event PDFs not used by AI), `dennis-14` (event → venue linking).

---

## 1. Problem & goal

Dennis needs a way to get **city / community / organiser events** (municipality agenda, bands, festivals — e.g. the 18 `inkefalonia.gr` PDFs) into Qwikker so they:
- show on the user **Events** page, and
- are answered by the **AI** when a user asks "what's on".

Today the only way in is the **business dashboard** (a business creates its own event, admin approves). There is no admin/city intake and no bulk upload.

**Goal:** an admin **"City Events"** feature that can **bulk-import events from CSV**, create them as **individual live event listings automatically**, and let the admin **assign each event to a business later** (claimed, paid, or unclaimed).

---

## 2. Critical finding that shapes the design (read first)

There are **two** event stores and they are NOT the same:

1. **`business_events`** (structured table) — this is what the **user Events page** and the **AI "what's on" query** read. The AI's hard event queries (`isKbDisabled`) **bypass the knowledge base entirely** and read ONLY this table (`lib/ai/hybrid-chat.ts` ~L1861, joined to `business_profiles` and filtered by `business_profiles.city`).
2. **`knowledge_base`** (embeddings/text) — this is where the **existing KB-tab "Add Event"** writes, via `createEventKnowledge()` (`lib/actions/knowledge-base-actions.ts` L277, `knowledge_base` insert L310, even supports `business_id: null` → tag `city_event`).

**Consequence / the trap:** events added through the current KB-tab "Add Event" (and the 18 uploaded PDFs) live in `knowledge_base`, which the event-query path ignores — so they **never appear when a user asks "what's on".** That is exactly `dennis-09`.

**Therefore City Events MUST write to `business_events`, not the knowledge base.** (KB sync still happens automatically on approval, so mixed/discovery queries also benefit.)

---

## 3. Key architectural constraint

`business_events.business_id` is **`NOT NULL`** (`ON DELETE CASCADE`), and an event's **city is derived from its linked business** (the AI query filters `business_profiles.city`, not an event-level city). So every event needs a valid `business_id` to have a city and be visible.

To support "imported but not yet assigned to a real business", we use a **per-city host business as the holding pen** (see §4). This avoids ANY schema migration, RLS change, or AI-query change — everything rides the existing approval → KB-sync → display pipeline.

> Rejected alternative (Option B): make `business_id` nullable + add an event-level `city` column + `LEFT JOIN`/`COALESCE` in the AI query + update the view + the user Events page. Cleaner data model but much larger blast radius on a live multi-tenant system. Not needed now.

---

## 4. The "City Events" host business (the unassigned bucket)

Seed **one host `business_profiles` row per franchise/city**, e.g. `"What's On in {City}"`.

- **Purpose:** default `business_id` for every imported/unassigned event → gives it a valid city and makes it instantly live.
- **Must be excluded from all business-facing surfaces** (it is an anchor, not a real listing). It must NOT appear in Discover, the home feed, AI business tiers, or the business carousel — **only its events surface.**
  - Mechanism: mark it with a distinguishable status/flag and ensure the discover/feed/eligibility queries exclude it. Options: a dedicated `status` value (e.g. `system_host`) **or** a small additive boolean `business_profiles.is_system_host`. Prefer the boolean (explicit, one-line filters). This is the ONLY optional schema addition; if we reuse a status value instead, zero schema change.
  - Verify it is NOT in `business_profiles_chat_eligible` / `_lite_eligible` / `_ai_fallback_pool` views (it should fall out naturally if its status isn't eligible, but confirm).
- **Display:** event cards show `custom_location_name || business_profiles.business_name`. Imported events carry the real venue/location text in `custom_location_name`, so a card reads "Summer Festival · Argostoli Square", NOT "at What's On in Kefalonia", even while unassigned.
- **Seeding:** create on demand the first time City Events is used for a city (lazy `getOrCreateCityEventsHost(city)`), or a one-off seed script per live city.

---

## 5. Data model (no required migration)

Reuse `business_events` as-is. Fields used by the importer:

| Column | Source | Notes |
|---|---|---|
| `business_id` | matched venue OR city host | anchor; drives city + ownership |
| `event_name` | CSV | required |
| `event_type` | CSV | must be one of the CHECK enum (`live_music`, `workshop`, `tasting`, `special_occasion`, `sports_viewing`, `quiz_night`, `comedy`, `open_mic`, `themed_night`, `holiday_event`, `class`, `other`); default `other` on unknown |
| `event_description` | CSV | required (NOT NULL) — fallback to `event_name` if blank |
| `event_short_description` | CSV | optional |
| `event_date` | CSV | required; parse to `YYYY-MM-DD` |
| `event_start_time` / `event_end_time` | CSV | optional `HH:MM` |
| `price_info` | CSV | free text ("Free", "€10") |
| `booking_url` | CSV | optional |
| `event_image` | CSV | optional URL |
| `custom_location_name` | CSV `venue_name`/`location` | **display location**, always set for imports |
| `custom_address` | CSV | optional |
| `status` | importer | `approved` for admin imports (see §7 decision) |

**Optional additive columns (nice-to-have, not required):**
- `business_events.source text` — `'business' | 'admin_import' | 'scrape'`. Useful to (a) exempt admin/city events from per-business tier limits even after assignment, and (b) analytics. Additive, safe.

---

## 6. CSV format

```csv
event_name,event_date,event_start_time,event_end_time,event_type,event_description,event_short_description,price_info,booking_url,event_image,venue_name,custom_address
Jazz Night,2026-07-18,20:00,23:00,live_music,Live jazz quartet at the harbour,Live jazz,€10,,,Restaurant XY,
Summer Food Festival,2026-07-25,12:00,22:00,special_occasion,Local producers market,Food festival,Free,,,,Argostoli Square
```

**Parsing rules:**
- Required per row: `event_name`, `event_date`. Everything else optional.
- `venue_name`: if it fuzzy-matches a business in the current city → link `business_id` to it (auto-assign). If blank / no confident match → link to the city host bucket and copy `venue_name` into `custom_location_name` for display.
- Unknown `event_type` → coerce to `other`.
- Invalid/missing `event_date` → row rejected with a line-numbered error (import continues for valid rows).
- **Dedupe:** skip rows where an event with the same `event_name` + `event_date` + city already exists (so re-importing the agenda is idempotent). Report skipped count.
- Return a per-row result summary: created / linked-to-venue / linked-to-host / skipped-duplicate / error(line, reason).

City is derived server-side from the subdomain (like `/api/claim/search`), never trusted from the client.

---

## 7. Admin UI

New **"City Events"** area in the admin dashboard (its own tab, or a section alongside the existing events approvals). Three parts:

1. **Add single event** — a form (mirror the KB-tab event form fields) that writes to **`business_events`** via a new server action, defaulting to the city host bucket unless a venue is picked.
2. **Bulk CSV import** — file upload → parse → **preview table** (show what will be created, which rows auto-match a venue, which go to the bucket, which are duplicates/errors) → **Confirm import**. Never import blind; always preview first.
3. **Manage / assign** — a list of city events (esp. those still in the host bucket) with an **"Assign to business"** action per row.

**Decision (recommended):** admin imports are created with `status: 'approved'` (admin is the trusted source) so they go live immediately, skipping the pending queue. Business-submitted events keep the existing pending → approve flow.

---

## 8. Assign-to-business (dennis-14, falls out for free)

"Assign each event to a business later" = **repoint `business_id`** from the host bucket (or between businesses) to the chosen business.

- **Venue picker:** clone the claim-search UX but WITHOUT the `status='unclaimed'` filter, so it finds **claimed, paid, and unclaimed** businesses in the city. New route e.g. `POST /api/admin/events/venue-search` (service role, city from subdomain, `.ilike` on name/category/type, return id + name + address).
- **Action:** `assignEventToBusiness(eventId, businessId)` (service role):
  1. `UPDATE business_events SET business_id = <new> WHERE id = <eventId>`.
  2. Re-run `syncEventToKnowledgeBase(eventId)` (KB content embeds the business name — must refresh).
  3. `revalidatePath` for `/user/events`, the OLD and NEW `business/[slug]`, `/admin`, `/dashboard/events`.
- **Same-flow benefit:** a band-books-Restaurant-XY event is just "create event + pick venue = Restaurant XY" up front; venue-less festivals stay in the bucket.
- **Trust/approval wrinkle:** because everything is admin-driven and admin-approved, linking an event to a venue the creator doesn't own is safe. (If we later add a PUBLIC submit page, that path needs its own moderation queue — out of scope here.) Optional: notify the venue owner when an event is assigned to them.

---

## 9. How dennis-09 is resolved

Once the 18 PDFs' events are entered as **structured `business_events` rows** (via CSV import), they flow to the AI automatically through the existing event-query path — **no AI change, KB stays clean/authoritative for events.** The PDFs themselves remain as background KB context but are no longer the delivery mechanism for "what's on".

**Also fix the confusion at source:** repoint the KB-tab "Add Event" to `business_events` too, OR relabel it clearly (e.g. "Add city context (AI background)") so admins don't add "events" that silently never surface. Recommended: relabel the KB one and make **City Events** the single real path for events.

---

## 10. Files (anticipated)

- **New:** `components/admin/city-events-panel.tsx` (UI: add / CSV import + preview / manage+assign).
- **New:** `app/api/admin/events/import/route.ts` (CSV parse + validate + dedupe + bulk insert; service role; city from subdomain).
- **New:** `app/api/admin/events/venue-search/route.ts` (all-status business search for the picker).
- **New/extend:** `lib/actions/event-actions.ts` — add `createCityEvent()`, `assignEventToBusiness()`, `getOrCreateCityEventsHost(city)`, `getCityEvents(city)` (service-role, admin-guarded).
- **Edit:** admin dashboard shell to mount the City Events tab (`components/admin/admin-dashboard.tsx` or the admin page).
- **Edit (exclude host):** wherever businesses are listed publicly — Discover (`app/user/discover/page.tsx`), feed (`lib/home-feed/feed-builder.ts`), and confirm the 3 chat-eligibility views — to exclude the system host.
- **Edit (fix trap):** `components/admin/knowledge-base-tab.tsx` — relabel/redirect the "Add Event" mode.
- **Optional migration:** `business_profiles.is_system_host boolean default false` and/or `business_events.source text`.
- **Guardrail:** admin auth on the new `/api/admin/events/*` routes (follow the `delete-business` / `lib/utils/admin-auth.ts` pattern — ties into the `security-admin-route-auth` work).

---

## 11. Edge cases & guardrails

- **Host business must not leak** into Discover / feed / AI business results / carousel (only its events show). Test explicitly.
- **Tier limits:** admin/city imports bypass `getMaxEvents` (service-role direct insert). Decide whether an event assigned to a real business later counts against that business's limit — recommended NO (tag `source='admin_import'`).
- **Idempotent re-import** via the name+date+city dedupe (agenda re-imports won't duplicate).
- **Past events:** importer should reject or skip `event_date < today` (the AI/user queries filter `>= today` anyway).
- **Timezone:** store dates as plain `date`; times as local `time` (matches current schema — no TZ math).
- **`event_type` enum drift:** coerce unknowns to `other` so an import never fails the CHECK constraint.
- **City correctness:** derived from the linked business (host or venue) — never from client input.

---

## 12. Build phases

1. **P1 — Core write path:** `getOrCreateCityEventsHost`, `createCityEvent` (writes `business_events`, status approved), + single-event admin form. Prove one city event shows on the user Events page AND in AI "what's on".
2. **P2 — CSV import:** parser + preview + bulk insert + dedupe + per-row report.
3. **P3 — Assign-to-business:** venue-search route + picker + `assignEventToBusiness` + KB re-sync + revalidate.
4. **P4 — Cleanup:** relabel/redirect KB "Add Event"; exclude host from public surfaces; admin-auth guards.
5. **P5 (later, optional):** scheduled `inkefalonia.gr/agenda` scrape → feeds the same importer.

## 13. Testing

- Import a sample CSV → rows appear as individual events on `/user/events` for that city.
- Ask the AI "what's on in {city}" → imported events are returned (proves it's in `business_events`, not just KB).
- Assign a bucket event to Restaurant XY → it now appears on that business's page and the card location updates; re-ask AI still works.
- Confirm the "What's On in {City}" host business does NOT appear in Discover / feed / AI business list / carousel.
- Re-import the same CSV → duplicates are skipped.
- Non-admin hit on `/api/admin/events/*` → 401.
