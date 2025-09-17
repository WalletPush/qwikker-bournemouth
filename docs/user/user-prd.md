PRD — Qwikker User Dashboard (v1.2)

0) Summary

Build a Qwikker User Dashboard (consumer-facing) that mirrors the Business Dashboard’s look & feel but serves end-users.
	•	Phase 1: Deliver a UI shell with mock data (styled, functional navigation, placeholder cards). Chat tab included but mocked.
	•	Phase 2: Integrate with real Qwikker backend (business data, offers, secret menus, AI chat, Wallet Pass).

The dashboard must support:
	•	Intent Routing & Deferred Deep Linking (from QR codes & Wallet Pass).
	•	Multi-City Deployment (one codebase, many subdomains, unique Wallet Pass per city).
	•	User Tabs: Discover, Offers, Secret Menu Club, AI Chat, Credits, Settings.

⸻

1) Goals
	•	Frictionless: Scan → See content instantly.
	•	Reliable: AI chat must be fail-safe and business-scoped.
	•	Consistent: Use same theme/colors as Business Dashboard.
	•	Scalable: One dashboard codebase → many cities (Bournemouth, London, Paris…).
	•	Habit-forming: Credits & personalised pushes.

⸻

2) Phases

Phase 1: UI Shell (Mock Data)
	•	Build sidebar with tabs.
	•	Each tab shows placeholder components with mock JSON (business cards, offer cards, secret menus, credits, settings).
	•	Chat tab included: input box, suggested prompts, mock chat responses, mini business cards with placeholder actions.
	•	Add TODOs for API calls, Wallet Pass hooks, and chat integration.

Phase 2: Full Integration
	•	Replace mocks with live APIs from Qwikker backend.
	•	Implement intent routing (QR SmartLinks).
	•	Enable Wallet Pass hooks, city scoping, geo-filters, and AI chat retrieval with business/context filters.

⸻

3) Personas
	•	Local User: wants quick offers & menus nearby.
	•	Tourist: wants curated picks + directions.
	•	Franchise Owner: runs a city instance, no dev work needed.

⸻

4) Sidebar Tabs
	1.	Discover 🌍
	•	Hierarchy of sections (tier-driven placement):
	•	Qwikker Picks ⭐ (top tier)
	•	Always first. Horizontal scroll carousel.
	•	“View All Picks” button.
	•	Gold badge overlay on cards.
	•	Featured 🔥 (mid tier)
	•	Grid or scroll under Picks.
	•	“View All Featured” button.
	•	Silver badge overlay on cards.
	•	Recommended 👍 (base tier)
	•	Grid of standard business cards.
	•	“View All Recommended” button.
	•	Grey badge overlay on cards.
	•	Show All Businesses CTA
	•	Expands to unified list view, still grouped Picks → Featured → Recommended.
	•	Card fields: logo, name, tagline, address, hours, menu preview (3–5 items).
	•	Actions: View Full Menu, Directions (deep-link to Maps), Chat.
	•	Filters: Near Me (3–5 miles), Category (Food, Drinks, Family), Qwikker Picks.
	•	Ordering never changes (Picks → Featured → Recommended).
	2.	Offers Gallery 💸
	•	Grid of offers with badges (“2-for-1”, “Ends Soon”).
	•	Save to Wallet button.
	•	Sorting: Near me, Expiring soon, Most popular.
	•	Intent: offer_id auto-expands correct offer.
	3.	Secret Menu Club 🔑
	•	All city secret menus in one list.
	•	Intent: secret_menu highlights the right business’s menu card.
	•	Option: View in Chat (scoped chat for that business).
	4.	Chat with Your AI Companion 🤖
	•	Phase 1: UI shell only with mock data.
	•	Input box + send button.
	•	Suggested prompts above input.
	•	Mock chat responses with mini cards + buttons (Menu, Directions, Add to Wallet).
	•	Phase 2: Integrate with real AI retrieval.
	•	Rich responses: mini business cards with live data.
	•	Strict context: if user is in a business context, only that business’s data is shown.
	•	Confidence threshold to avoid incorrect answers.
	5.	Qwikker Credits 🏆
	•	Earn points for scanning QRs, claiming offers, visiting secret menus.
	•	Balance + history + redemption (stub in Phase 1, real later).
	6.	Settings ⚙️
	•	Notification toggles:
	•	Geo push (via Wallet Pass).
	•	Web push (via optional PWA).
	•	SMS (optional).
	•	Preferences: Food/Drink/Family, days (Fri–Sun), distance radius.
	•	City switcher: suggest installing new pass if GPS != current city.

⸻

5) Intent Routing (Critical)

QR → Dashboard Flow
	•	Secret Menu Flyer → Secret Menu Club tab opens, correct menu highlighted.
	•	Explore Us Sticker → Discover tab opens, correct business card loaded.
	•	Offers Table Tent → Offers tab opens, correct offer auto-expanded + Add to Wallet CTA.
	•	Install Qwikker Flyer/Instagram → Default dashboard with Suggested Prompts shown.

Deferred Deep Linking
	•	If pass install interrupts → system saves pending_intent.
	•	When dashboard reopens with pass link → pending intent is replayed.

⸻

6) Multi-City Deployment
	•	One codebase deployed per city subdomain:
	•	bournemouth.qwikker.com
	•	london.qwikker.com
	•	paris.qwikker.com
	•	Unique Wallet Pass per city.
	•	Backend scopes every query by city.
	•	Users may have multiple passes if they travel.

⸻

7) Data Models (simplified)
	•	User: id, city, prefs, credits.
	•	Business: id, city, name, slug, lat/lng, address, hours, images, one_liner, menu_summary[].
	•	Offer: id, business_id, title, desc, dates, badges[], terms, images.
	•	SecretMenu: id, business_id, items[].
	•	Intent: user_id, type, payload, expires_at.

⸻

8) APIs (examples)
	•	GET /api/{city}/discover
	•	GET /api/{city}/offers
	•	GET /api/{city}/secret-menus
	•	POST /api/{city}/intent (create intent)
	•	GET /api/{city}/intent (resolve + clear)
	•	POST /api/{city}/pass/add-offer

⸻

9) Reliability Rules
	•	Always filter by city_id.
	•	Always filter chat by business_id if in context.
	•	Confidence threshold for AI responses (no guessing).
	•	Version menus on ingest; rollback if parse fails.

⸻

10) Rollout Plan
	1.	Create feature branch feature/user-dashboard.
	2.	Phase 1: Build UI shell (mock data, tabs, placeholder cards, mock chat).
	3.	Phase 2: Integrate with backend + Wallet Pass + live chat.
	4.	Launch in Bournemouth first.
	5.	Replicate to London/Paris by deploying same codebase on new subdomains.

⸻

11) Open Questions
	•	Persist last-opened tab per user? (default = yes).
	•	Cache geolocation for 15 min? (default = yes).
	•	Should Credits redemption be city-specific or global?

⸻
