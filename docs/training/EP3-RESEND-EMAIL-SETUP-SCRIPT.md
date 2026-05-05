# Episode 3: Resend Email + Domain Verification

> **Format:** Screen recording with voiceover
> **Runtime:** ~5 minutes
> **Prerequisites:** Resend account activation email from Qwikker HQ (or create your own)
> **Output:** Resend API key + DNS records sent to HQ for verification

---

## [TITLE CARD — 0:00-0:05]

*Show: Episode title card slide — "Episode 3: Email Setup with Resend" (dark background, green accent, Qwikker branding)*

---

## ["IN THIS EPISODE" SLIDE — 0:05-0:15]

*Show: agenda slide (same visual style) with bullet points:*

> In this episode:
> - Create your Resend account
> - Add your city domain
> - Copy the DNS records for Qwikker HQ
> - Generate your API key
> - Save your credentials for Episode 6

*Voiceover:*

> In this episode, we'll set up Resend — the email service that powers all transactional emails in Qwikker. That includes approval emails, rejection emails, welcome emails, and business notifications. Let's get it done.

---

## ["WHAT YOU'LL NEED" SLIDE — 0:15-0:20]

*Show: branded slide with:*

> **What You'll Need:**
> - An email address (to create your Resend account)
> - Your city subdomain (e.g. `brighton.qwikker.com`) — confirmed in your activation email

*Voiceover:*

> You just need an email to sign up and your city subdomain — that's the one from your activation email, like brighton.qwikker.com.

---

## [CONTEXT — 0:20-0:50]

*Show: example of a Qwikker email (approval or welcome email)*

> Resend is our transactional email service — it handles every automated email that Qwikker sends on behalf of your city.
>
> That includes: business approval and rejection emails, consumer welcome emails when someone adds their wallet pass, notifications when a business submits their profile for review, claim request confirmations, and more.
>
> The good news — **all email templates are already built for you**. They're fully branded, professionally designed, and dynamically adapt to your city name, your domain, and your branding. You don't need to write or design any emails. All you need to do is set up the domain and API key, and Qwikker handles the rest.
>
> Every email will come from **no-reply@[yourcity].qwikker.com**, and replies go to **hello@[yourcity].qwikker.com** which forwards straight to your inbox.
>
> Without this set up, none of those emails will send. So let's get it done.

---

## [SECTION 1: CREATE YOUR RESEND ACCOUNT — 0:40-1:30]

*Show: browser navigating to resend.com*

> Go to **resend.com** and click **Sign Up**. You can use your email or sign in with GitHub or Google — whichever you prefer.
>
> Once you're in, you'll land on the Resend dashboard. It's clean and simple — we only need two things from here: a verified domain and an API key.

---

## [SECTION 2: ADD YOUR CITY DOMAIN — 1:30-2:45]

*Show: navigating to Domains in the Resend sidebar*

> In the sidebar, click **Domains**. Then click **Add Domain**.
>
> Type in your city subdomain — for example, **brighton.qwikker.com**. This is the domain your emails will be sent from. Click **Add**, then select **Manual setup**.

*Show: the DNS Records page with all records listed*

> Resend will show you a set of DNS records. There are four records across three sections:
>
> **DKIM** — one TXT record. This proves emails are genuinely coming from your domain.
>
> **SPF** — one MX record and one TXT record (both under `send.[yourcity]`). These authorise Resend's servers to send email on your behalf.
>
> **DMARC** — one TXT record (optional but recommended). This improves deliverability so your emails don't land in spam.
>
> Leave **"Enable Receiving"** toggled **off** — Qwikker HQ handles reply forwarding separately via Cloudflare.

*Show: the full DNS records table*

> **Important — you cannot add these DNS records yourself.** The `qwikker.com` domain is managed by Qwikker HQ. So here's what you do:
>
> Screenshot this entire page, or copy each record individually. Then send it to your Qwikker HQ contact — they'll add these records to Cloudflare for you.
>
> Once HQ confirms the records are live (usually within a few hours), come back to this page — the status column should update to **Verified** with a green tick. If it doesn't update automatically, click the verify button.
>
> You can continue with the rest of this episode while you wait — the API key doesn't depend on verification being complete.

---

## [SECTION 3: GENERATE YOUR API KEY — 2:45-3:30]

*Show: navigating to API Keys in the Resend sidebar*

> Now let's get your API key. In the sidebar, click **API Keys**, then click **Create API Key**.
>
> Give it a name — something like "Qwikker Brighton" so you know what it's for.
>
> For **permission**, select **Sending access** — that's all Qwikker needs. It doesn't need full access to your Resend account.
>
>> For **domain**, leave it as **"All domains"** for now — your domain isn't verified yet so it won't appear in the dropdown. Once HQ confirms your DNS records are live and the domain shows as verified, come back here, click **edit** on this key, and change the domain to your city (e.g. `brighton.qwikker.com`). That locks it down so the key can only send from your verified domain.

*Show: clicking Add and the key appearing*

> Click **Add**. Your API key will appear — it starts with **`re_`**.
>
> **Copy this immediately.** Resend only shows it once. If you lose it, you'll need to create a new one.
>
> Save it alongside your WalletPush credentials and Google API key — password manager, secure note, wherever you've been keeping these.

---

## [SECTION 4: WHAT GOES INTO THE SETUP WIZARD — 3:30-4:00]

*Show: quick preview of the admin setup wizard email section (screenshot or mockup)*

> In Episode 6, when you complete the admin setup wizard, you'll paste this API key into the **Resend API Key** field. That's the only thing from Resend that Qwikker needs.
>
> Everything else is handled automatically by the platform:
> - **From Email** — auto-generated as `no-reply@[yourcity].qwikker.com`. You don't set this anywhere.
> - **From Name** — defaults to "QWIKKER", you can customise it in the wizard (e.g. "QWIKKER Brighton").
> - **Reply-to** — auto-generated as `hello@[yourcity].qwikker.com`. Forwarding is set up by HQ.
> - **Email templates** — all pre-built, branded, and dynamic to your city. You never touch these.
>
> So to be clear — you don't need to configure any sender settings, templates, or email addresses inside Resend itself. Resend is purely the delivery engine. Qwikker tells it what to send, who to send to, and what address to send from — all programmatically.
>
> The domain verification is the part that takes time, so make sure you've sent those DNS records to HQ as soon as possible.

---

## [SECTION 5: SEND DNS RECORDS TO HQ — 4:00-4:30]

*Show: composing an email/message to HQ with the DNS records*

> Before we wrap up — make sure you've sent the DNS records to Qwikker HQ. The easiest way is to:
>
> 1. Go back to **Domains** in Resend
> 2. Click on your domain to see the DNS records again
> 3. Screenshot the table or copy each record
> 4. Send to your HQ contact with a message like: "Here are my Resend DNS records for [city].qwikker.com — please add to Cloudflare."
>
> HQ will confirm once they're added, and you can click Verify in Resend to complete the setup.

---

## [RECAP CARD — 4:30-4:45]

*Show: branded recap slide (same style as title card) with:*

> **What You Should Have Now:**
> - Resend account created
> - City domain added (e.g. `brighton.qwikker.com`)
> - DNS records sent to Qwikker HQ for verification
> - API key copied and saved securely (starts with `re_`)
>
> **Action Required:** Wait for HQ to confirm DNS records are live, then verify in Resend.
>
> **Next Up: Episode 4 — OpenAI + Anthropic API Keys**

*Voiceover:*

> That's Episode 3 done. You've got your Resend API key saved for Episode 6, and your DNS records are on their way to HQ. Once they confirm, click Verify and you're all set for sending emails.
>
> Next up, we'll set up OpenAI and Anthropic — the AI engines that power Qwikker's chat companion and menu scanning. See you there.

---

## Quick Reference — Resend Setup Cheat Sheet

### What Qwikker Sends via Resend

| Email Type | Trigger | Recipient |
|------------|---------|-----------|
| Business approval | Admin approves application | Business owner |
| Business rejection | Admin rejects application | Business owner |
| Welcome email | Wallet pass created | Consumer |
| Profile submitted | Business submits for review | Franchise admin |
| Claim submitted | Business claims listing | Franchise admin |

### Credentials to Save

| Item | Format | Where it goes |
|------|--------|---------------|
| API Key | `re_...` | Admin setup wizard → Step 3 |
| From Email | Auto-generated: `no-reply@{city}.qwikker.com` | Auto-filled in wizard |
| From Name | Default: "QWIKKER" | Admin setup wizard → Step 3 |

### DNS Records Needed (added by HQ)

| Type | Name | Purpose |
|------|------|---------|
| TXT | `resend._domainkey.[city]` | DKIM — proves emails are from your domain |
| MX | `send.[city]` | SPF — routes bounce handling to Resend (Amazon SES) |
| TXT | `send.[city]` | SPF — authorises Resend to send on your behalf |
| TXT | `_dmarc` | DMARC (optional) — improves deliverability |

### After Domain is Verified

- Go to API Keys, click edit on your key, change Domain from "All domains" to your city domain
- Click Save — the key value stays the same, no need to update anything else
- This is optional but recommended for tighter security

### Email Forwarding (handled by HQ)

- HQ sets up Cloudflare Email Routing: `hello@[city].qwikker.com` → your real email
- Tell HQ your preferred forwarding email when you send the DNS records
- Leave "Enable Receiving" OFF in Resend

### Timeline

- Account + API key: **5 minutes** (immediate)
- Domain verification: **1-24 hours** (depends on HQ adding records + DNS propagation)
- Emails won't send until domain is verified
