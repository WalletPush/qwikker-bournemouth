# Episode 5: Slack Workspace + Notifications

> **Format:** Screen recording with voiceover
> **Runtime:** ~6 minutes
> **Prerequisites:** An email address
> **Output:** One Slack webhook URL saved for Episode 6

---

## [TITLE CARD — 0:00-0:05]

*Show: Episode title card slide — "Episode 5: Slack Notifications" (dark background, green accent, Qwikker branding)*

---

## ["IN THIS EPISODE" SLIDE — 0:05-0:15]

*Show: agenda slide with bullet points:*

> In this episode:
> - Create a Slack workspace for your city
> - Create a notifications channel
> - Set up an Incoming Webhook
> - Copy your webhook URL for Episode 6

*Voiceover:*

> In this episode, we'll set up Slack so you get real-time notifications on your phone and desktop whenever something happens in your city. New business signup? You'll know instantly. Let's set it up.

---

## ["WHAT YOU'LL NEED" SLIDE — 0:15-0:20]

*Show: branded slide with:*

> **What You'll Need:**
> - An email address
> - Slack downloaded on your phone (recommended for mobile push notifications)

*Voiceover:*

> Just your email — and I'd recommend downloading Slack on your phone too, so you get push notifications on the go.

---

## [CONTEXT — 0:20-0:45]

*Show: example of a Slack notification from Qwikker (formatted message with business name, type, city)*

> Slack is how Qwikker keeps you in the loop in real time. Whenever something happens in your city, you'll get a formatted notification straight to Slack:
>
> - A new business signs up through your onboarding page
> - A business submits their profile for review
> - A business claims an imported listing
> - A consumer reports an issue
> - A business submits an offer or secret menu item for approval
>
> You'll get these as push notifications on your phone if you have Slack installed — so you can approve or action things while you're on the go.
>
> All we need from Slack is one thing: a **webhook URL**. That's a special link that Qwikker sends notifications to. Let's create it.

---

## [SECTION 1: CREATE A SLACK WORKSPACE — 0:45-1:45]

*Show: browser navigating to slack.com*

> Go to **slack.com** and click **Get started free** (or **Create a new workspace** if you already have Slack).
>
> Enter your email address. Slack will send you a confirmation code — enter it.

*Show: the workspace creation flow*

> Now name your workspace. I'd suggest something like **"Qwikker Brighton"** or **"[City] Admin"** — this is just for you and anyone else managing your city.
>
> Slack will ask you to name your first channel and invite team members. You can skip inviting others for now — just click through the setup.
>
> Once you're in, you'll see the default workspace with a `#general` channel. We'll create a dedicated notifications channel next.

---

## [SECTION 2: CREATE A NOTIFICATIONS CHANNEL — 1:45-2:15]

*Show: clicking the + next to Channels in the sidebar*

> In the left sidebar, click the **+** next to "Channels" and select **Create a channel**.
>
> Name it **`notifications`** or **`qwikker-alerts`** — whatever makes sense to you. Set it to **Public** (within your workspace).
>
> Click **Create**. This is where all your automated Qwikker notifications will land.

---

## [SECTION 3: CREATE A SLACK APP — 2:15-3:30]

*Show: opening a new tab, navigating to api.slack.com/apps*

> Now we need to create a webhook. Open a new tab and go to **api.slack.com/apps**.
>
> Click **Create New App**. Choose **"From scratch"**.

*Show: the app creation form*

> Give your app a name — **"Qwikker Notifications"** works well.
>
> Select the workspace you just created from the dropdown. Click **Create App**.

*Show: the app settings page*

> You'll land on the app's settings page. In the left sidebar (or the main page), find and click **Incoming Webhooks**.

---

## [SECTION 4: ENABLE INCOMING WEBHOOKS — 3:30-4:30]

*Show: the Incoming Webhooks page*

> At the top, toggle **Activate Incoming Webhooks** to **ON**.
>
> Now scroll down and click **Add New Webhook to Workspace**.

*Show: the channel selection screen*

> Slack will ask which channel to post to. Select your **`notifications`** channel (the one we just created). Click **Allow**.

*Show: the webhook URL appearing in the list*

> You'll be taken back to the Incoming Webhooks page and you'll see your new webhook URL listed. It looks something like:
>
> `https://hooks.slack.com/services/TXXXXXXXXX/BXXXXXXXXX/your-webhook-token-here`
>
> **Copy this URL.** This is the one thing Qwikker needs from Slack. Save it with your other credentials — you'll paste it into the admin setup wizard in Episode 6.

---

## [SECTION 5: TEST IT (OPTIONAL) — 4:30-5:00]

*Show: the "Sample curl request" that Slack provides on the webhook page*

> Slack gives you a sample curl command right on this page to test the webhook. If you want to verify it works, you can copy that command, open your terminal, paste it, and hit enter. You should see a test message appear in your notifications channel.
>
> If you're not comfortable with the terminal, don't worry — you'll see it working for real once your city is live and the first business signs up. You'll get a beautifully formatted notification right here in this channel.

---

## [SECTION 6: DOWNLOAD SLACK ON YOUR PHONE — 5:00-5:15]

*Show: App Store / Google Play with Slack app*

> Last thing — download **Slack** on your phone if you haven't already. Sign in to your workspace. Make sure notifications are enabled.
>
> This way you get push notifications on your lock screen whenever a business signs up, submits something for review, or needs your attention. You can action things from anywhere.

---

## [RECAP CARD — 5:15-5:30]

*Show: branded recap slide (same style as title card) with:*

> **What You Should Have Now:**
> - Slack workspace created for your city
> - A `#notifications` channel ready
> - Incoming Webhook URL copied and saved
> - Slack on your phone with notifications on
>
> **Next Up: Episode 6 — First Login + Setup Wizard + Launch**

*Voiceover:*

> That's Episode 5 done. You've got your webhook URL saved and ready for Episode 6. That's actually the last credential you need — in the next episode, we'll log into your admin dashboard for the first time, paste in ALL the keys we've collected, connect Stripe, and launch your city. It's the big one. See you there.

---

## Quick Reference — Slack Setup Cheat Sheet

### What Qwikker Sends to Slack

| Notification | When it fires |
|-------------|---------------|
| New business signup | Business completes onboarding form |
| Profile submitted for review | Business fills in their full profile |
| Claim request | Business claims an imported listing |
| Offer submitted | Business creates a new offer |
| Secret menu submitted | Business adds a secret menu item |
| Consumer support request | Consumer reports an issue |

### Webhook URL Format

```
https://hooks.slack.com/services/TXXXXXXXXX/BXXXXXXXXX/your-webhook-token-here
```

### Where It Goes

The webhook URL gets pasted into the Qwikker admin setup wizard in **Episode 6**, Step 2: "Notifications" → Slack Webhook URL field.

### Setup Summary

1. Create workspace → slack.com
2. Create `#notifications` channel
3. Create app → api.slack.com/apps → From scratch
4. Enable Incoming Webhooks → toggle ON
5. Add New Webhook to Workspace → select your channel
6. Copy the URL

### Mobile Notifications

- Download Slack on iOS/Android
- Sign in to your workspace
- Enable push notifications in Slack settings
- You'll get lock screen alerts for every Qwikker event
