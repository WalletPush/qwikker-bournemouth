# Episode 4: OpenAI API Key + Credits

> **Format:** Screen recording with voiceover
> **Runtime:** ~4 minutes
> **Prerequisites:** A credit/debit card
> **Output:** One OpenAI API key saved for Episode 6

---

## [TITLE CARD — 0:00-0:05]

*Show: Episode title card slide — "Episode 4: OpenAI API Key" (dark background, green accent, Qwikker branding)*

---

## [CONTEXT — 0:20-0:45]

*Show: Qwikker AI chat in action (screenshot of a user chatting with the AI companion)*

> OpenAI powers your city's **AI chat companion** — the conversational assistant that helps consumers discover restaurants, find offers, get personalised recommendations, and explore your city. It's the main AI feature that your pass holders interact with.
>
> Each franchise pays for their own AI usage — there's no shared account. This keeps costs transparent and gives you full control. Typical cost is around **$5-15 per month** depending on how active your city is. That's pennies per conversation.
>
> Without this key, the AI companion won't work — consumers will see an error instead of getting recommendations. So let's get it set up.

---

## [SECTION 1: CREATE YOUR OPENAI ACCOUNT — 0:50-1:45]

*Show: browser navigating to platform.openai.com*

> Go to **platform.openai.com** — this is the API platform, not ChatGPT. They're separate products. Click **Sign up** and create an account with your email.
>
> Once you're in, you'll land on the API dashboard. The first thing we need to do is add credits.

*Show: navigating to Settings → Billing*

> In the sidebar or top menu, go to **Settings**, then **Billing**. Click **Add payment method** and enter your card details.
>
> Now click **Add credits**. I'd recommend starting with **$10-20** — that'll last most cities at least a month or two depending on usage.

*Show: the auto-recharge option*

> **Important** — enable **Auto recharge**. Set it to top up automatically when your balance gets low (e.g. recharge $10 when balance drops below $5). This prevents your AI companion from suddenly going silent because you ran out of credit. Consumers won't understand why the chat stopped working — they'll just think it's broken.
>
> Set a monthly spending limit if you want a safety net — **$50** is generous for a single city.

---

## [SECTION 2: GENERATE YOUR OPENAI API KEY — 1:45-2:30]

*Show: navigating to API Keys section*

> Now let's generate the key. Go to **API Keys** in the sidebar (or Dashboard → API keys).
>
> Click **Create new secret key**. Give it a name like "Qwikker Brighton" and click **Create**.

*Show: the key appearing in the popup*

> **Copy this immediately.** OpenAI only shows it once — if you lose it, you'll need to generate a new one.
>
> Save it alongside your other credentials — password manager, secure note, wherever you've been keeping your WalletPush, Google, and Resend keys.
>
> That's it for OpenAI. Your AI companion will use this key for every conversation.

---

## [SECTION 3: WHAT THIS KEY POWERS — 2:30-2:45]

*Show: quick montage of AI chat interactions — recommendations, offers, personalised suggestions*

> Every time a consumer asks your AI companion a question — "What's good for dinner tonight?", "Any vegan places nearby?", "Show me today's offers" — that uses this key.
>
> Typical cost is a fraction of a cent per message. Even a busy city with hundreds of daily conversations stays well under $15/month.
>
> This key goes into the admin setup wizard in Episode 6 — one field. Qwikker handles everything else automatically.

---

## [RECAP CARD]

*Show: branded recap slide (same style as title card) with:*

> **What You Should Have Now:**
> - OpenAI account created (platform.openai.com)
> - Credits loaded + auto-recharge enabled
> - API key copied and saved securely (starts with `sk-`)
>
> **Next Up: Episode 5 — Slack Workspace + Notifications**

*Voiceover:*

> That's it — shortest episode in the series. OpenAI key saved, auto-recharge on, you're done. Next up, Episode 5 — Slack notifications. See you there.

---

## Quick Reference — OpenAI Setup Cheat Sheet

### What It Powers

| Feature | Description |
|---------|------------|
| AI Chat Companion | Consumer-facing conversational AI — recommendations, offers, city discovery |

### Where to Get It

| Platform | URL | Key Location |
|----------|-----|-------------|
| OpenAI | platform.openai.com | Dashboard → API Keys |

### Important Settings

| Setting | Recommended |
|---------|-------------|
| Initial credits | $10-20 |
| Auto-recharge | Enable — recharge $10 when balance drops below $5 |
| Monthly limit | $50 (safety net) |

### Where the Key Goes

The OpenAI key gets pasted into the Qwikker admin setup wizard in **Episode 6**, Step 3: "Your API Services" → AI section.

### If Credits Run Out

- AI chat companion returns "AI service not configured" error to consumers
- Everything else keeps working — businesses, wallet passes, offers, loyalty, etc. are unaffected
- Top up credits and it resumes immediately

### Future: Anthropic (Social Wizard)

When the Social Wizard feature launches, you'll need an additional key from **console.anthropic.com**. We'll provide a separate guide at that time — for now, OpenAI is all you need.
