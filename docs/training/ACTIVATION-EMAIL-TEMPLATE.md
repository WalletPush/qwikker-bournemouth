# Franchise Activation Email Template

> **Sent by:** Qwikker HQ (manually or via admin tool)
> **Sent when:** Franchise application approved, subdomain + DNS configured, city ready for setup
> **From:** hello@qwikker.com
> **Subject:** Welcome to Qwikker — Your City Is Ready

---

## Email Body

---

**Hi {ADMIN_FIRST_NAME},**

Congratulations — your Qwikker franchise has been approved and your city is ready to go live.

Your subdomain **{CITY}.qwikker.com** is fully configured and waiting for you.

---

### Before You Log In

Before accessing your admin dashboard, please complete **Episodes 1–6** of the Qwikker Admin Training. These short videos walk you through setting up the external services your city needs — you'll collect all the API keys and credentials required for your setup wizard.

**Start the training here:**
https://trainings.walletpush.io/communities/groups/qwikker/home

The episodes take around 45 minutes in total. By the end, you'll have everything you need to launch.

---

### Download Your Brand Kit

Your Qwikker brand kit contains logos, icons, and colour references you'll need during the training — specifically for your WalletPush pass design (Episode 1) and landing page customisation.

**Download your brand kit:**
{BRAND_KIT_LINK}

---

### Your Login Credentials

Once you've completed Episodes 1–6, use these to log in and launch your city (Episode 6 walks you through this step by step):

| | |
|---|---|
| **Admin URL** | {CITY}.qwikker.com/admin |
| **Email** | {ADMIN_EMAIL} |
| **Temporary Password** | {TEMP_PASSWORD} |

You'll be prompted to change your password on first login.

---

### What's Already Done (by HQ)

- Your subdomain `{CITY}.qwikker.com` is live
- DNS is fully configured (no action needed from you)
- Your city database is provisioned and ready
- Email domain DNS records will be added once you send them during Episode 3

---

### Need Help?

If you get stuck at any point during the training or setup, reach out:

- **Email:** support@qwikker.com
- **Slack:** You'll be invited to the Qwikker Franchise Owners channel after launch

---

Welcome aboard — we can't wait to see your city go live.

**The Qwikker Team**

---

## Placeholders Reference

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{ADMIN_FIRST_NAME}` | Franchise owner's first name | Jordan |
| `{CITY}` | City subdomain (lowercase) | brighton |
| `{ADMIN_EMAIL}` | Admin login email | jordan@brightonqwikker.co.uk |
| `{TEMP_PASSWORD}` | Auto-generated temporary password | Qw1kk3r-Br1ght0n-2026! |
| `{BRAND_KIT_LINK}` | Google Drive download link for brand zip | https://drive.google.com/file/d/xxx/view |

---

## Brand Kit Zip Contents

The zip file (`qwikker-brand-kit-{city}.zip`) should contain:

- `qwikker-logo-web.png` — Full logo, transparent background (for WalletPush, landing page)
- `qwikker-logo-web.svg` — Full logo, vector (for print/high-res)
- `qwikker-icon.png` — Q icon, square (for app icon, social profiles)
- `brand-colours.txt` — Primary colours (hex codes, RGB)
- Any city-specific assets if applicable

---

## Notes for HQ

- Send this email only after the subdomain DNS has propagated (usually 5–30 minutes after configuration)
- Generate a strong temporary password — the admin will change it during EP6 setup wizard
- The brand kit zip can be the same for all cities initially (universal Qwikker branding), or customised per city if they have local branding
- Follow up 48 hours after sending if the admin hasn't logged in yet
