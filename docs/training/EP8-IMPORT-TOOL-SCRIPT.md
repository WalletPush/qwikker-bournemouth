# Episode 8: The Import Tool

> **Format:** Screen recording with voiceover
> **Runtime:** ~14 minutes
> **Prerequisites:** City launched (Episode 6), Pricing configured (Episode 7), Google Places API key connected (Episode 2 + Episode 6)
> **Output:** Real businesses imported into your city, visible in Unclaimed Listings

---

## [TITLE CARD — 0:00-0:05]

*Show: Episode title card slide — "Episode 8: The Import Tool" (dark background, green accent, Qwikker branding)*

---

## ["IN THIS EPISODE" SLIDE — 0:05-0:15]

*Show: agenda slide with bullet points:*

> In this episode:
> - Use the Import Tool to find real businesses via Google Places
> - Preview, filter, and select the best listings for your city
> - Run a bulk import and understand what gets created
> - Find your imported businesses in the admin dashboard

*Voiceover:*

> Your city is live, your pricing is set, but there are no businesses on the platform yet. That changes right now. The Import Tool lets you pull real, verified businesses from Google Places directly into Qwikker. By the end of this episode, your city will have its first batch of real listings.

---

## ["WHAT YOU'LL NEED" SLIDE — 0:15-0:30]

*Show: branded slide with:*

> **What You'll Need:**
> - Your admin dashboard (already live from Episode 6)
> - Google Places API key connected (done in Episodes 2 + 6)
> - A plan for what area/category to import first
> - Google Cloud billing enabled (Places API has a generous free tier — $200/month credit)

*Voiceover:*

> The Import Tool uses Google Places under the hood, which means it costs real API credits per search. Google gives you $200 free per month — that's plenty for importing. But don't spam searches unnecessarily. Have a rough idea of what you want to import before you start — which neighbourhood, which category. Let's get into it.

---

## [SECTION 1: OPEN THE IMPORT TOOL — 0:30-1:00]

*Show: Admin dashboard sidebar → click "Import Businesses" under Control Center*

*Voiceover:*

> From your admin dashboard, look at the sidebar under **Control Center**. Click **Import Businesses**. The import tool loads in the main area.

*Show: Import Tool landing screen*

> You'll see a clean interface with a title — "Import Businesses" — and an info card explaining how it works. There are two search modes: **Area Search** and **Find Specific Business**. Area Search is for bulk importing — "give me all the good restaurants in this neighbourhood." Find Specific Business is for adding one place you already know about. Let's start with Area Search.

---

## [SECTION 2: AREA SEARCH — CONFIGURE YOUR SEARCH — 1:00-3:30]

*Show: Area Search mode (default)*

*Voiceover:*

> Area Search is your main tool for building out a city. You define a centre point, a category, a minimum rating, and a radius — and it searches Google Places for matching businesses.

### Search Center

*Action: Click the Search Center field*

> **Search Center** — type a neighbourhood, landmark, or area name. This is the middle point of your search. For example, if I type "Bournemouth town centre" or "Lansdowne, Bournemouth", the search radiates outward from there. Be specific — "Bournemouth" alone covers a huge area.

*Action: Type a neighbourhood name*

### Category

> **Business Category** — choose what type of businesses you're looking for. Restaurants, cafes, bars, pubs, beauty salons, gyms — pick one category per search. You'll run multiple searches for different categories.

*Action: Show selecting "Restaurants" from the dropdown*

### Minimum Rating

> **Minimum Rating** — this filters out low-quality listings. The slider goes from 4.4 to 5 stars. I'd recommend starting at **4.4** for your first import — this gives you a good pool of quality businesses while filtering out the genuinely poor ones. You can always be more selective later.

*Action: Show slider at 4.4*

> Businesses also need at least 10 Google reviews to appear in Area Search results. This prevents importing brand-new places with one fake 5-star review.

### Search Radius

> **Search Radius** — how far from the centre to search. This is in miles or kilometres depending on your franchise settings. Start small — maybe half a mile from your centre — and expand if you need more results. The maximum radius is set by HQ for your franchise.

*Action: Show adjusting the radius slider*

### Maximum Results

> **Maximum Results** — cap how many results come back. For your first import, I'd suggest starting with **50 to 100**. You can always run another search later. Going higher uses more API credits.

*Action: Show setting max results to 50*

### Estimated Requests

> At the bottom you'll see an **estimated requests** count. This tells you roughly how many Google API calls this search will make. If it's showing a warning about high usage, reduce your radius or max results.

---

## [SECTION 3: RUN THE PREVIEW — 3:30-5:00]

*Action: Click "Preview Results"*

*Voiceover:*

> Click **Preview Results**. This sends your search to Google Places and returns matching businesses. It does NOT import anything yet — this is just a preview so you can choose which ones to bring in.

*Show: Preview results loading, then the results list appearing*

> Here are my results. Each row shows the business name, address, category, Google rating, and review count. You'll also see badges — the Google category, whether they have photos, and if any are flagged as "not operational" (permanently closed).

### Filtering

*Action: Show typing in the filter box*

> You can **filter** this list by typing a name or address. Useful if you're looking for a specific place in a large result set.

### Sorting

*Action: Show clicking sort options*

> **Sort** by rating, number of reviews, or distance from your search centre. I like sorting by review count — businesses with hundreds of reviews are well-established and more likely to engage with the platform.

### Selecting

*Action: Show selecting individual businesses via checkboxes*

> **Select** the businesses you want to import by ticking the checkboxes. You can also use **Select All** at the top if the entire list looks good.

*Action: Show selecting ~20 businesses*

> A few things to look for:
> - Skip anything flagged as "not operational" — that means Google thinks they're closed
> - Skip duplicates if you recognise the same business appearing twice (different Google listings)
> - Use the **Maps link** on each row if you're unsure — it opens Google Maps so you can verify

---

## [SECTION 4: WHAT HAPPENS AFTER IMPORT — 5:00-5:30]

*Show: The blue info box "What happens after import?"*

*Voiceover:*

> Before you hit Import, notice the information box that explains what happens to these businesses once they're in the system:
>
> - They'll appear as **Unclaimed Listings** in your admin dashboard
> - They're visible in the **Discover** section of the app (so consumers can browse them)
> - They are **NOT** in the AI chat recommendations until they're on a paid plan or trial
> - The real business owner can **claim** their listing later through the claim flow
>
> Essentially, imported businesses are passive listings. They exist, consumers can find them, but they don't get the full Qwikker experience until the real owner claims and activates their account.

---

## [SECTION 5: RUN THE IMPORT — 5:30-7:00]

*Action: Click "Import Selected (N)"*

*Voiceover:*

> Ready? Click **Import Selected**. The number in the button tells you how many you're importing.

*Show: Import Progress Modal appearing*

> A progress modal appears. The import runs one business at a time — for each one, it fetches the full details from Google Places (opening hours, phone number, website, exact address, coordinates) and creates a listing in your database.

*Show: Progress bar advancing, status messages appearing*

> You'll see a progress bar and status messages. Most businesses take a second or two each. If one fails — maybe Google doesn't have enough data for it — it'll be marked as skipped and the import continues with the rest.

*Show: Import completing with summary*

> Once it's done, you'll see a summary: how many were imported successfully, how many were skipped, and why. You can also **download a CSV or JSON** of the imported businesses — handy for your records or if you want to send a mailout to these businesses later inviting them to claim their listing.

*Action: Click "Close" on the modal*

> Click Close and you're back to the search screen. The results clear — ready for your next search.

---

## [SECTION 6: FIND YOUR IMPORTED BUSINESSES — 7:00-8:30]

*Action: Click "Unclaimed Listings" in the admin sidebar (or navigate to the appropriate tab)*

*Voiceover:*

> Now let's see what we just created. Go to **Unclaimed Listings** in your sidebar. This is where all imported businesses live until a real owner claims them.

*Show: Unclaimed Listings tab with the newly imported businesses visible*

> Here they are — every business you just imported. Each one has:
> - The business name and address pulled from Google
> - Their Google rating and review count
> - Their category
> - A generated tagline (based on their Google category and town)
> - Opening hours (if Google had them)
> - Phone and website (if available)
>
> These are real, verified businesses. Google has confirmed they exist, they're operational, and they have genuine customer reviews.

### What's auto-populated vs what's missing

*Voiceover:*

> Let's be clear about what the import gives you and what it doesn't:
>
> **Included automatically:**
> - Business name, address, postcode, town
> - Latitude and longitude (for maps)
> - Google rating and review count
> - Phone number and website URL
> - Opening hours (structured and text)
> - Business category
> - A placeholder image variant (until the owner uploads their own)
>
> **NOT included (requires the business owner):**
> - A real logo and photos
> - Offers and promotions
> - Menu items and secret menu
> - Business description (in their own words)
> - Social media links
>
> That's why claiming matters — the listing becomes truly useful once the real owner fills in the gaps.

---

## [SECTION 7: TEXT SEARCH — FIND A SPECIFIC BUSINESS — 8:30-10:00]

*Action: Go back to Import Businesses, switch to "Find Specific Business" mode*

*Voiceover:*

> Sometimes you don't want to bulk-import an area. You know a specific business you want to add — maybe you've spoken to them and they want to be on Qwikker, or you're filling a gap in your listings.

*Show: Text search mode*

> Switch to **Find Specific Business**. Start typing the business name — after 3 characters, a live dropdown appears with matching Google Places results.

*Action: Type a business name, show the dropdown appearing*

> Click the one you want. It loads into the preview area as a single selected result — you can see their rating, address, and category.

*Action: Click "Import Selected (1)"*

> Click **Import Selected** and that one business gets added. Same process, same data, just faster for a single place.

---

## [SECTION 8: TIPS AND BEST PRACTICES — 10:00-12:00]

*Show: Tips card slide*

*Voiceover:*

> A few tips before you start importing for real.

### Start with your strongest category

> **One** — start with your city's strongest category. If you're a food-focused city, import restaurants first. Fill that category with 50-100 quality listings before moving to the next. A city with 30 great restaurants looks better than a city with 10 of everything.

### Work neighbourhood by neighbourhood

> **Two** — work neighbourhood by neighbourhood. Run a search centred on one area, import the best, then move to the next area. This ensures even coverage across your city.

### Don't import everything

> **Three** — be selective. Just because Google returns 200 results doesn't mean you should import all 200. A curated city of 100 excellent businesses is worth more than 500 mediocre ones. Quality over quantity — always.

### Skip Duplicates

> **Four** — if you're running multiple searches in overlapping areas, tick **Skip Duplicates** before importing. The system checks if a business is already in your database (by Google Place ID) and skips it rather than creating a duplicate.

### Watch your API costs

> **Five** — be mindful of API costs. Each preview search and each imported business makes Google API calls. The $200 monthly free credit is generous, but if you're importing thousands of businesses in a day, you could exceed it. Pace yourself — your city doesn't need to be full on day one.

### The import is just the beginning

> **Six** — importing creates the listing, but the magic happens when owners claim. Your job after importing is to reach out to these businesses and invite them to Qwikker. That's a future episode — for now, focus on building a solid base of quality listings.

---

## [SECTION 9: WHAT CONSUMERS SEE — 12:00-12:45]

*Show: The user-facing Discover page with imported listings visible*

*Voiceover:*

> Let's quickly look at what consumers see. Open your city URL on a phone — or in a mobile preview — and go to the Discover section.

*Show: Business cards in Discover*

> Imported businesses appear here with their name, category, rating, and a placeholder image. Consumers can tap to see the full listing — hours, location, website link. They can't claim offers or use loyalty cards yet (because the owner hasn't set those up), but they CAN see the business exists and get directions.
>
> This is Discover-only mode. The AI chat won't recommend these businesses until they're on a paid plan or trial. But having them visible in Discover gives your city substance from day one.

---

## [SECTION 10: RECAP — 12:45-13:15]

*Show: Recap card slide:*

> **What We Did:**
> ✓ Used Area Search to find quality businesses via Google Places
> ✓ Previewed, filtered, and selected businesses to import
> ✓ Ran a bulk import (with progress tracking and export)
> ✓ Found imported businesses in Unclaimed Listings
> ✓ Used Text Search to add a specific business
> ✓ Understood what imported listings look like for consumers

*Voiceover:*

> That's Episode 8 done. Your city now has real, verified businesses. They're in Discover, waiting for their real owners to claim them. In the next episode, we'll look at how you manage and enrich these listings — editing details, setting visibility, and preparing them for when owners come on board.

---

## [NEXT EPISODE TEASER — 13:15-13:30]

*Show: "Next: Episode 9 — Managing Your Listings" slide*

*Voiceover:*

> Next up: Episode 9 — Managing Your Listings. We'll walk through the admin CRM, show you how to edit business details, manage visibility, and set up your imported businesses for success.

---

## CHEAT SHEET (text overlay or PDF)

```
IMPORT TOOL:
├── Access: Admin sidebar → Control Center → Import Businesses
├── Two modes:
│   ├── Area Search (bulk): center + category + rating + radius + max results
│   └── Find Specific Business (single): type name → select from dropdown
├── Preview Results (does NOT import yet)
│   ├── Filter by name/address
│   ├── Sort by rating / reviews / distance
│   ├── Select via checkboxes (or Select All)
│   └── Check Maps links for verification
├── Import Selected
│   ├── Progress modal with live status
│   ├── Downloads available (CSV / JSON)
│   └── Skipped businesses shown with reasons
└── After Import
    ├── Businesses appear in "Unclaimed Listings"
    ├── Visible in Discover (consumer app)
    ├── NOT in AI chat until paid/trial
    └── Owner can claim via /claim flow

WHAT GETS CREATED PER IMPORT:
├── business_name, address, postcode, town
├── latitude, longitude
├── rating, review_count (from Google)
├── phone, website_url
├── business_hours (text + structured)
├── system_category, display_category
├── status: "unclaimed"
├── visibility: "discover_only"
└── auto_imported: true

TIPS:
- Start with strongest category first
- Work neighbourhood by neighbourhood
- Be selective — quality > quantity
- Use "Skip Duplicates" for overlapping searches
- Watch API costs ($200/month free tier)
- Min rating: 4.4★, min reviews: 10 (enforced)
- Max radius controlled by HQ

DEFAULT SETTINGS:
- Minimum rating slider: 4.4 – 5.0
- Max results: 10 – 500
- Category: one per search
```
