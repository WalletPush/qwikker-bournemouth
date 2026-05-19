# Episode 1: Setting Up Your City's Wallet Pass

> **Format:** Screen recording with voiceover
> **Runtime:** ~7 minutes
> **Prerequisites:** Franchise operator has their own WalletPush account credentials
> **Assets needed:** Qwikker Brand Kit (logo, icon — provided by HQ)

---

## [TITLE CARD — 0:00-0:05]

*Show: Episode title card slide — "Episode 1: City Activation + WalletPush Pass Setup" (dark background, green accent, Qwikker branding)*

---

## ["IN THIS EPISODE" SLIDE — 0:05-0:15]

*Show: agenda slide (same visual style as title card) with bullet points:*

> In this episode:
> - Log in to your WalletPush account
> - Create your city pass template (8 placeholder fields)
> - Apply your city branding
> - Copy your API key and Template ID

*Voiceover — read quickly, just a preview:*

> In this episode, we'll log in to WalletPush, create your city pass template with all eight required fields, apply your city branding, and grab the credentials you'll need later. Let's jump in.

---

## [CONTEXT — 0:15-0:35]

*Show: a wallet pass on a phone lock screen (screenshot)*

> This is the foundation of Qwikker. Every consumer in your city adds a wallet pass to their Apple or Google Wallet. No app download, no account creation — just a pass that gives them instant access to offers, AI recommendations, loyalty cards, and push notifications from local businesses.
>
> We're going to build that pass right now.

---

## [SECTION 1: WHAT YOU'LL NEED — 0:35-1:15]

*Show: checklist on screen*

> Before we start, make sure you have four things ready.
>
> **One** — access to your WalletPush account. This is your own white-label account provided during franchise setup. You should have a login URL, email, and password.
>
> **Two** — the Qwikker Brand Kit. HQ will have sent this to you. It contains the official Qwikker logo and icon files. These are the same across every Qwikker city — do not create your own versions. Using the exact same assets is what makes the pass instantly recognisable whether someone is in Bali, London, or Bournemouth.
>
> **Three** — a strip image for your city. This is the wide banner image that runs across the top of the pass. It should be 1125 by 432 pixels — roughly a 2.6 to 1 ratio. Use something that represents your city — a skyline, a beach, a landmark. This is the one piece of branding that's unique to you.
>
> **Four** — a background colour as a hex code. Pick something that complements your strip image and feels right for your city. Keep it dark — light backgrounds make text hard to read on the pass.

---

## [SECTION 2: LOG IN TO WALLETPUSH — 1:15-1:35]

*Show: browser navigating to the franchise's WalletPush dashboard*

> Open your browser and go to your WalletPush dashboard URL. Log in with your credentials.
>
> Once you're in, look for the Templates section. This is where we'll build your city's pass from scratch.

---

## [SECTION 3: CREATE YOUR TEMPLATE — 1:35-2:45]

*Show: clicking "Create New Template" in WalletPush*

> Click **Create New Template**. When it asks for the pass type, choose **Generic**. Not Event, not Coupon, not Store Card — Generic. This gives us the layout flexibility we need for the Qwikker city pass.
>
> Give it a name you'll recognise in your dashboard. I'd suggest something clear like "Qwikker Bali City Pass" or "Qwikker London Main Pass". This name is just for your reference — consumers won't see it.

*Show: design/branding section*

> Now let's set up the look and feel.
>
> Upload the **logo** from the Brand Kit. This appears in the top-left corner on Apple Wallet. Use the exact file HQ provided — don't resize it, don't add your city name to it.
>
> Upload the **icon** from the Brand Kit. This is what shows on the lock screen when a push notification arrives. Again, use the exact file provided.
>
> Upload your **strip image** — this is the hero banner across the top. This is where your city's personality comes through. Make sure it's 1125 by 432 pixels for the best quality.
>
> Set your **background colour** using your hex code.
>
> For the **pass display name**, enter "Qwikker" followed by your city name. So "Qwikker Bali" or "Qwikker London". Keep it short — this is what shows in the user's wallet list.
>
> For the **description**, use something like "Your Bali companion" or "Your London city guide". One short line.

---

## [SECTION 4: ADD THE PLACEHOLDERS — 2:45-5:15]

*Show: navigating to Placeholders tab*

> Now the most important part. Click on the **Placeholders** tab. These are the dynamic fields that our system writes data into — the consumer's name, the latest offer, the chat links, everything.
>
> We need exactly eight placeholders. The names must be **letter-perfect** — exact spelling, exact capitalisation. If even one character is wrong, the pass will either fail to create or that field will be blank.
>
> I'll go through each one. Set them all to **Text** type.

*Show: adding each placeholder, pausing to show the name clearly*

> **One — `First_Name`**
>
> Capital F, underscore, capital N. This is the consumer's first name. It shows in the "This pass belongs to" section on the back.

> **Two — `Last_Name`**
>
> Capital L, underscore, capital N. Their surname.

> **Three — `Email`**
>
> Capital E, then lowercase. Their email address.

*Pause — show all three*

> Those three are the identity fields. Now for the content fields — these are the ones that change in real time.

> **Four — `Current_Offer`**
>
> Capital C, underscore, capital O. This is the **main text on the front of the pass** — the first thing users see. When you push an offer out to your city, this is what updates. On first install it shows a welcome message.

> **Five — `Last_Message`**
>
> Capital L, underscore, capital M. This appears on the back of the pass. It holds the most recent notification text or welcome message.

> **Six — `AI_Url`**
>
> Capital A, capital I, underscore, capital U, lowercase r, lowercase l. This becomes a link on the back of the pass that opens the AI concierge chat. Our system updates it with a personalised shortlink after the pass is created.

> **Seven — `Offers_Url`**
>
> Capital O, underscore, capital U, lowercase r, lowercase l. Another back-of-pass link — this one opens the offers page.

> **Eight — `MEMBER_ID`**
>
> All capitals. M-E-M-B-E-R, underscore, I-D. This is used for the barcode data on the pass, mainly relevant for Google Wallet. If your template doesn't use a barcode, you can skip this one — but it's good practice to include it.

*Show: all 8 listed in WalletPush*

> Let me read them back so you can check yours:
>
> `First_Name` ... `Last_Name` ... `Email` ... `Current_Offer` ... `Last_Message` ... `AI_Url` ... `Offers_Url` ... `MEMBER_ID`.
>
> Eight placeholders. All text type. Take a moment to double-check the spelling before moving on — this is the number one cause of setup issues.

---

## [SECTION 5: MAP THE LAYOUT — 5:15-6:00]

*Show: WalletPush pass layout/design editor*

> Now we tell WalletPush where each placeholder appears on the pass.
>
> For the **front of the pass** — map `Current_Offer` to the primary text or header field. This is the big text users see without flipping the pass over.
>
> For the **back of the pass** — add two link rows:
> - `AI_Url` with the label "AI Chat"
> - `Offers_Url` with the label "Offers"
>
> Then add `Last_Message` as an information row on the back.
>
> `First_Name`, `Last_Name`, and `Email` should automatically map to the "This pass belongs to" section — check that they're showing there.
>
> If your template has a barcode or QR code, map `MEMBER_ID` as the barcode value.
>
> Save everything.

---

## [SECTION 6: COPY YOUR CREDENTIALS — 6:00-6:45]

*Show: WalletPush template details and API keys page*

> Nearly there. We need two things from WalletPush to connect it to Qwikker later in Episode 6.
>
> **First — the Template ID.** You'll find this in the URL bar when viewing your template, or on the template details page. It's a long string — could be a UUID with dashes, or a number. Copy the whole thing.
>
> **Second — your API Key.** Go to your account settings, then API Keys. If you don't have one yet, create a new one. Copy the full key. Keep this safe — it's a secret. Don't share it in emails or chat.
>
> Save both of these somewhere safe — a password manager, a secure note, whatever works for you. You'll paste these into the Qwikker admin setup wizard in Episode 6. Don't worry about connecting them to Qwikker yet — we have four more services to set up first.

---

## [RECAP CARD — 6:45-6:55]

*Show: branded recap slide (same style as title card) with:*

> **What You Should Have Now:**
> - WalletPush city pass template — created with 8 placeholders
> - WalletPush API Key — saved securely
> - WalletPush Template ID — saved securely
>
> **We'll test the pass in Episode 7 once everything is wired up.**
>
> **Next Up: Episode 2 — Google Places API**

*Voiceover:*

> That's Episode 1 done. You've got your city pass template ready in WalletPush with all nine placeholders, and your API key and Template ID saved. We can't test the pass just yet — we need to enter these credentials into Qwikker first, which happens in Episode 6. Then we'll test everything end-to-end in Episode 7.
>
> Next up, we'll set up Google Places so the import tool and business onboarding work properly. See you there.

---

## Quick Reference — Placeholder Cheat Sheet

| # | Exact Name | Type | Where on pass |
|---|-----------|------|--------------|
| 1 | `First_Name` | Text | Back — "belongs to" |
| 2 | `Last_Name` | Text | Back — "belongs to" |
| 3 | `Email` | Text | Back — "belongs to" |
| 4 | `Current_Offer` | Text | **Front — main headline** |
| 5 | `Last_Message` | Text | Back — info area |
| 6 | `AI_Url` | Text | Back — link row |
| 7 | `Offers_Url` | Text | Back — link row |
| 8 | `MEMBER_ID` | Text | Barcode/QR data (optional) |

### Brand Assets (from HQ Brand Kit)
- **Logo**: Use as-is. Do not modify.
- **Icon**: Use as-is. Do not modify.
- **Strip image**: Your city. 1125 x 432 px.
- **Background colour**: Your choice (keep it dark or light).
- **Pass name**: "Qwikker {City}" Do not modify.
