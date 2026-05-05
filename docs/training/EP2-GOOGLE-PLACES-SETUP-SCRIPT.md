# Episode 2: Setting Up Google Places API

> **Format:** Screen recording with voiceover
> **Runtime:** ~6 minutes
> **Prerequisites:** A Google account (Gmail) and a credit/debit card for Google Cloud billing
> **Output:** One Google API key to save for Episode 6

---

## [TITLE CARD — 0:00-0:05]

*Show: Episode title card slide — "Episode 2: Google Places API" (dark background, green accent, Qwikker branding)*

---

## ["IN THIS EPISODE" SLIDE — 0:05-0:15]

*Show: agenda slide (same visual style) with bullet points:*

> In this episode:
> - Create a Google Cloud project
> - Enable the 4 required APIs
> - Create and restrict your API key
> - Set a billing alert
> - Copy your key for Episode 6

*Voiceover:*

> In this episode, we'll set up Google Cloud with the four APIs that Qwikker needs, create a secure API key, set a billing alert so there are no surprises, and save the key for later. Let's go.

---

## ["WHAT YOU'LL NEED" SLIDE — 0:15-0:20]

*Show: branded slide (same visual style) with:*

> **What You'll Need:**
> - A Google account (Gmail)
> - A credit or debit card (for identity verification only — you won't be charged)

*Voiceover:*

> Before we start — make sure you have a Google account ready and a card for identity verification. Google won't charge you, it's just to activate the free trial.

---

## [CONTEXT — 0:20-0:40]

*Show: Qwikker import tool or autocomplete in action (screenshot)*

> Google Places powers three things in Qwikker.
>
> **One** — the autocomplete when a business types their name during onboarding. It pulls in their address, phone, hours, and Google rating automatically.
>
> **Two** — the import tool that lets you bulk-add hundreds of businesses from Google to your city.
>
> **Three** — rating verification so you can check a business's real Google rating before approving them.
>
> Without this key, onboarding forms won't autocomplete, the import tool won't search, and rating checks won't work.

---

## [SECTION 1: SIGN IN + ACTIVATE FREE TRIAL — 0:35-1:30]

*Show: browser navigating to console.cloud.google.com, landing on the "Try Google Cloud with $300 in free credits" page*

> Open your browser and go to **console.cloud.google.com**. Sign in with a Google account — this will be the account that owns the billing.
>
> The first thing you'll see is this banner — **"Try Google Cloud with $300 in free credits."** Click **Try for free**.
>
> Google will ask you to enter a credit or debit card. You won't be charged during the trial — it's just to verify your identity. You get **$300 in free credit for 90 days**, which is far more than Qwikker will ever use.
>
> I'm not going to enter my card details on camera, but the process is straightforward — fill in your details, confirm, and you're done. If you skip this step now, you can always come back to it from the **Billing** section in the sidebar.
>
> Once billing is active, typical Qwikker usage is around **$5-10 per month** for a city. Very low.

*Note to recorder: Don't enter real card details on screen. Just show the banner and narrate.*

---

## [SECTION 2: CREATE A GOOGLE CLOUD PROJECT — 1:30-2:15]

*Show: clicking "Select a project" dropdown at the top → "New Project"*

> Now we need a project. At the top of the page, click the **project dropdown** and then **New Project**.
>
> Name it something clear — I'd suggest **"Qwikker [City]"**, like "Qwikker Bali" or "Qwikker London". This is just for your reference.
>
> Leave the organisation as "No organization" and location as defaults. Click **Create**.
>
> Wait a few seconds, then make sure your new project is selected in the dropdown at the top.

---

## [SECTION 3: ENABLE THE FIRST API + RESTRICT YOUR KEY — 2:15-3:30]

*Show: navigating to APIs & Services → Library*

> Now we need to enable the APIs that Qwikker uses. Go to **APIs & Services → Library** in the sidebar.
>
> Search for **"Maps JavaScript API"** and click **Enable**. This is the autocomplete widget that loads when businesses type their name during onboarding.

*Show: the "Protect your API key" popup appearing after enabling*

> When you enable the first API, Google automatically creates an API key and asks you to restrict it. In the **"Select restriction type"** dropdown, choose **"API restriction"**.
>
> Now select only these four APIs:
> - Maps JavaScript API
> - Places API
> - Places API (New)
> - Geocoding API
>
> This means even if someone got hold of your key, they could only use it for these four services — nothing else on your Google account. Click **Restrict key**.

*Note: Restricting the key to these APIs does NOT enable them — we still need to enable the other three manually.*

---

## [SECTION 4: ENABLE THE REMAINING 3 APIS — 3:30-4:15]

*Show: going back to APIs & Services → Library*

> We've restricted the key to four APIs, but we've only enabled one so far. Let's go enable the other three. Back in **Library**:

*Show: searching for and enabling each remaining API*

> **Places API** — search for "Places API". Sometimes shown as "Places API (Legacy)". Enable it. This handles business detail lookups and rating verification.
>
> **Places API (New)** — search for "Places API New". This is a separate product. Enable it. This powers the import tool's nearby search, text search, and photo loading.
>
> Quick note — yes, you need **both** Places APIs. The regular one handles older endpoints and the new one handles the import tool. They're billed separately but both are required.
>
> **Geocoding API** — search for "Geocoding API". Enable it. This converts city and area names into coordinates for the import tool.

---

## [SECTION 5: COPY YOUR API KEY — 4:15-4:45]

*Show: navigating to APIs & Services → Credentials*

> Now let's grab our key. Go to **APIs & Services → Credentials**. You'll see the key that Google auto-created listed here with today's date and the restrictions we just set.

*Show: clicking the pencil icon on the key*

> Click the **pencil icon** to edit it. Rename it to something recognisable — like "Qwikker Brighton" or "Qwikker [Your City]".
>
> Click **Show Key** and **copy the key value**. Save it somewhere secure — a password manager, a secure note, wherever you saved your WalletPush credentials from Episode 1.
>
> You can also confirm here that Application restrictions are set to "None" — that's correct because this key is used both in the browser and on the server. Click **Save**.

---

## [SECTION 6: SET A BILLING ALERT — 4:45-5:15]

*Show: navigating to Billing → Budgets & Alerts*

> Last step — set a billing alert so you're never surprised by a charge.
>
> Go to **Billing** in the sidebar, then **Budgets & Alerts**. Click **Create Budget**.
>
> Name it "Qwikker API" or similar. Set the budget amount to **$50** — that's well above normal usage and will warn you if something unexpected happens.
>
> Under alert thresholds, keep the defaults — Google will email you at 50%, 90%, and 100% of your budget.
>
> Click **Finish**. You'll get an email if your usage ever approaches $50 in a month — which would be unusual for a single city.

---

## [RECAP CARD — 5:15-5:30]

*Show: branded recap slide (same style as title card) with:*

> **What You Should Have Now:**
> - Google Cloud project created and billing active
> - 4 APIs enabled (Maps JavaScript, Places, Places New, Geocoding)
> - API key created and restricted — saved securely
> - Billing alert set at $50
>
> **Next Up: Episode 3 — Resend Email + Domain Verification**

*Voiceover:*

> That's Episode 2 done. You've got your Google API key saved and ready for Episode 6. Typical costs are $5-10 per month — well within the $300 free credit for the first 90 days.
>
> Next up, we'll set up Resend so your city can send transactional emails. See you there.

---

## Quick Reference — Google Cloud Setup Cheat Sheet

### APIs to Enable (all 4 required)

| # | API Name | What it powers in Qwikker |
|---|----------|--------------------------|
| 1 | Maps JavaScript API | Autocomplete widget on business onboarding forms |
| 2 | Places API | Business detail lookups, rating verification |
| 3 | Places API (New) | Import tool (nearby search, text search, photos) |
| 4 | Geocoding API | Converting city/area names to coordinates for import |

### Key Restrictions

- **API restrictions:** Restrict to the 4 APIs listed above
- **Application restrictions:** None (key is used both client-side and server-side)
- **Billing alert:** $50/month recommended

### Typical Costs

- First 90 days: $300 free credit, no billing during trial
- After free credit: ~$5-10/month per city
- Autocomplete: $0.00283 per request
- Nearby/Text Search: $0.032 per request
- Place Details: $0.017 per request
- Geocoding: $0.005 per request

### Where the Key Goes

The API key gets pasted into the Qwikker admin setup wizard in **Episode 6**, Step 3: "Your API Services" → Google Places section.
