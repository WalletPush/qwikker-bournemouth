# Episode 6: First Login + Setup Wizard + Launch

> **Format:** Screen recording with voiceover
> **Runtime:** ~8 minutes
> **Prerequisites:** All credentials from Episodes 1-5 ready to paste
> **Output:** Your city is LIVE

---

## [TITLE CARD — 0:00-0:05]

*Show: Episode title card slide — "Episode 6: Launch Your City" (dark background, green accent, Qwikker branding)*

---

## ["IN THIS EPISODE" SLIDE — 0:05-0:15]

*Show: agenda slide with bullet points:*

> In this episode:
> - Log in to your admin dashboard for the first time
> - Complete the 5-step setup wizard
> - Paste in ALL your credentials from Episodes 1-5
> - Launch your franchise

*Voiceover:*

> This is the big one. Everything we've set up in Episodes 1 to 5 comes together right now. We'll log in, complete the setup wizard, and by the end of this episode — your city will be live. Let's go.

---

## ["WHAT YOU'LL NEED" SLIDE — 0:15-0:25]

*Show: branded slide with:*

> **What You'll Need:**
> - Your admin login credentials (from your activation email)
> - WalletPush API Key + Template ID (Episode 1)
> - Google Places API Key (Episode 2)
> - Resend API Key (Episode 3)
> - OpenAI API Key (Episode 4)
> - Slack Webhook URL (Episode 5)

*Voiceover:*

> Make sure you have all your saved credentials from the previous episodes open and ready to paste. That's everything — let's log in.

---

## [SECTION 1: YOUR ACTIVATION EMAIL — 0:25-1:30]

*Show: the activation email from Qwikker HQ open in an email client*

> The journey starts here — your activation email from Qwikker HQ. This is the email you received when your franchise was approved. Let's look at what's inside.
>
> At the top, you'll see a link to the **Qwikker Admin Training** — that's the series you've been following. You should have already completed Episodes 1 to 5 before watching this one.
>
> Below that, there's a **Brand Kit download link** — a zip file with your Qwikker logos, icon, and brand colours. You'll have used these during Episode 1 when you designed your WalletPush pass.
>
> Then you'll see your **login credentials**:
> - **Your subdomain** — e.g. `brighton.qwikker.com`. This is your city's home.
> - **Your admin login URL** — `[city].qwikker.com/admin`
> - **Your temporary email and password** — use these to log in for the first time
>
> And finally, a confirmation that **your DNS is fully configured** — HQ has set up your subdomain and it's ready to go. No action needed from you.
>
> Keep this email open — we'll need the login details right now.

---

## [SECTION 2: LOG IN FOR THE FIRST TIME — 1:30-2:00]

*Show: browser navigating to [city].qwikker.com/admin*

> Open your browser and go to your **admin login URL** — the one from the email. For example, `brighton.qwikker.com/admin`.
>
> Enter the **email** and **temporary password** from your activation email. Click **Sign In**.

*Show: the admin dashboard with the setup wizard visible*

> You're in. The first thing you'll see is the setup wizard — a 5-step process that configures your entire city. Let's work through it step by step.

---

## [SECTION 3: STEP 1 — ADMIN ACCOUNT — 2:00-2:45]

*Show: Step 1 of the setup wizard*

> Step 1 is your **Admin Account** — your personal details as the franchise owner.
>
> Enter your **full name** and confirm your **email address**. This is the email you'll use to log in and receive system notifications.
>
> Below that you'll see the option to **change your password**. I'd recommend changing the temporary one from your activation email to something strong and unique. The password meter will guide you — aim for "Strong" or above.
>
> Once you're done, click **Continue**.

---

## [SECTION 4: STEP 2 — FRANCHISE DETAILS — 2:45-3:30]

*Show: Step 2 of the setup wizard*

> Step 2 is your **Franchise Details** — the basic info about your city.
>
> **Display Name** — this is how your franchise appears in the system, like "Brighton Qwikker" or "Qwikker Brighton". It's auto-generated but you can edit it.
>
> **Timezone** — select your city's timezone. This affects when notifications fire, when quiet hours apply, and how timestamps display.
>
> **Phone** — your contact number as franchise owner.
>
> **Subdomain** — this should already be set (e.g. `brighton`). Don't change it unless HQ tells you to.
>
> Click **Continue**.

---

## [SECTION 5: STEP 3 — YOUR API SERVICES — 3:30-5:15]

*Show: Step 3 of the setup wizard — the API Services section*

> Step 3 is **Your API Services** — this is where all the keys from Episodes 2, 3, and 4 go. You'll see a clear note that these are services **you** pay for directly.

*Show: pasting the Resend key*

> **Email Service (Resend)**
>
> Paste your **Resend API key** — the one that starts with `re_` from Episode 3. The from email and from name are auto-configured, you don't need to touch those.

*Show: pasting the OpenAI key*

> **AI Service (OpenAI)**
>
> Paste your **OpenAI API key** — starts with `sk-` from Episode 4. This powers your AI chat companion.

*Show: skipping Anthropic*

> **Anthropic** — you can skip this for now. It's for the Social Wizard feature which isn't live yet. Leave it blank.

*Show: pasting the Google Places key*

> **Google Places**
>
> Paste your **Google API key** from Episode 2. This powers the autocomplete on business onboarding and the import tool.

*Show: clicking Continue/Save*

> Once all three keys are in, click **Continue**. You'll see green ticks next to each configured service.

---

## [SECTION 6: STEP 4 — PLATFORM INTEGRATIONS — 5:15-6:30]

*Show: Step 4 of the setup wizard — Integrations section*

> Step 4 is **Platform Integrations** — WalletPush and Slack. These connect Qwikker to the external services that make everything work.

### WalletPush

*Show: pasting WalletPush credentials*

> **WalletPush API Key** — paste the API key from Episode 1. It starts with something like `wp_live_`.
>
> **Template ID** — paste your template ID from Episode 1. This is the ID of the city pass template you created.
>
> **Dashboard URL** — paste your WalletPush dashboard link so you can access it quickly from the admin panel.

### Slack

*Show: pasting the Slack webhook URL*

> **Slack Webhook URL** — paste the webhook URL from Episode 5. It looks like `https://hooks.slack.com/services/...`
>
> That's all Slack needs — one URL.

*Show: clicking Continue*

> Once both are configured, click **Continue**.

---

## [SECTION 7: STEP 5 — LAUNCH — 6:30-7:15]

*Show: Step 5 — the Launch Franchise screen*

> Step 5 is the moment of truth — **Launch Franchise**.
>
> You'll see a summary of everything you've configured. Take a quick look to confirm:
> - Admin account: set
> - Franchise details: set
> - API services: Resend, OpenAI, Google Places configured
> - Integrations: WalletPush, Slack connected
>
> If everything looks good, click **Launch Franchise**.

*Show: clicking Launch and the success state*

> And that's it. Your city is **live**. The button will turn green and say "Franchise is Live!"
>
> Your subdomain is now active, your onboarding page is ready for businesses, your wallet pass is ready for consumers, and your AI companion has all the keys it needs.

---

## [SECTION 8: WHAT HAPPENS NEXT — 7:15-7:45]

*Show: quick tour of the admin dashboard tabs*

> Now that you're live, let's quickly orient you. Your admin dashboard has several tabs you'll explore in later episodes:
>
> - **Dashboard** — overview of your city's activity
> - **Businesses** — manage all business listings
> - **Import** — the bulk import tool (Episode 9)
> - **Knowledge** — AI knowledge base (Episode 11)
> - **Claims** — pending business claims (Episode 13)
> - **Settings** — the setup wizard you just completed (come back here anytime to update keys)
>
> In Episode 7, we'll connect Stripe for payments, configure your pricing plans, and customise your landing page. In Episode 8, we'll test everything end to end.

---

## [RECAP CARD — 7:45-8:00]

*Show: branded recap slide (same style as title card) with:*

> **What You Should Have Now:**
> - Admin dashboard accessible at [city].qwikker.com/admin
> - All API keys configured (Resend, OpenAI, Google Places)
> - All integrations connected (WalletPush, Slack)
> - Franchise status: LIVE
>
> **Next Up: Episode 7 — Stripe Connect, Pricing & Landing Page**

*Voiceover:*

> Your city is officially live. Everything from Episodes 1 to 5 is now plugged in and working. In the next episode, we'll connect Stripe for payments, set up your pricing plans, and customise your landing page so businesses can start signing up. See you there.

---

## Quick Reference — Setup Wizard Cheat Sheet

### The 5 Steps

| Step | Name | What You Configure |
|------|------|-------------------|
| 1 | Admin Account | Owner name, email, password |
| 2 | Franchise Details | Display name, timezone, phone, subdomain |
| 3 | Your API Services | Resend key, OpenAI key, Google Places key |
| 4 | Platform Integrations | WalletPush (key + template ID), Slack webhook |
| 5 | Launch Franchise | Review and go live |

### Credentials Needed (Episodes 1-5)

| Credential | From Episode | Format |
|-----------|-------------|--------|
| WalletPush API Key | Ep 1 | `wp_live_...` |
| WalletPush Template ID | Ep 1 | Numeric or alphanumeric |
| Google Places API Key | Ep 2 | `AIza...` |
| Resend API Key | Ep 3 | `re_...` |
| OpenAI API Key | Ep 4 | `sk-...` |
| Slack Webhook URL | Ep 5 | `https://hooks.slack.com/services/...` |

### After Launch

- You can return to Settings at any time to update keys or change configuration
- Stripe Connect is done in Episode 7 (Pricing & Billing tab)
- The dashboard is immediately accessible at `[city].qwikker.com/admin`
- Business onboarding is live at `[city].qwikker.com/onboarding`
- Consumer join page is live at `[city].qwikker.com/join`
