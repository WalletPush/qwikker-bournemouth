# Progress Tracker

> Quick reference for new chats. Full plan is in `.cursor/plans/platform_audit_roadmap_7ed16549.plan.md`
>
> Start any new chat with: "Read PROGRESS.md and the plan file, then continue with the next pending item."

## Current Status

- **Tier 0:** 11/15 complete. Remaining: 0.11 (mobile), 0.12 (Stripe), 0.13 (HQ Slack), 0.14 (marketing pages)
- **Tier 1:** 6/7 complete. Remaining: 1.6 (vibes bugs)
- **Tier 2:** 2.1-2.4 complete. 2.5 partially done. 2.16 complete. 2.6-2.11, 2.15, 2.17, 2.18 pending.
- **Tier 3:** Not started
- **Tier 4:** Backlog

## Next up (in order per execution rule)

1. Finish Tier 0 remaining (0.11, 0.12, 0.13, 0.14)
2. Finish Tier 1 (1.6 vibes bugs)
3. Finish Tier 2 (2.5 remaining, then 2.6-2.11, 2.15, 2.17, 2.18)

## Change Impact Map

| Change | Files | Risk | What could break |
|--------|-------|------|-----------------|
| 0.19 GHL Retirement | `lib/integrations.ts`, `lib/integrations-secure.ts`, `lib/actions/business-actions.ts`, `lib/actions/seamless-updates.ts`, `lib/actions/file-actions.ts`, `app/api/admin/approve/route.ts`, `app/api/admin/approve-change/route.ts`, `app/api/franchise/crm-sync/route.ts`, `components/simplified-onboarding-form.tsx`, `components/founding-member-form.tsx`, + 7 deleted GHL routes/files | Low | All GHL functions are no-ops. All callers were fire-and-forget or try/catch. Webhook routes return 200 to prevent retry loops. If GHL was secretly still in use somewhere, that call now silently does nothing. |
| 0.21 HQ Impersonate | `app/api/hq/impersonate/route.ts` (new), `app/api/hq/stop-impersonate/route.ts` (new), `components/admin/impersonation-banner.tsx` (new), `app/admin/page.tsx`, `app/hqadmin/franchises/[id]/page.tsx` | Low | New feature only — no existing flows modified. Cookie-based with 2h expiry. If cookie parsing fails, admin page falls back to normal session. Localhost redirect goes to `/admin` not subdomain. |
| 2.16 Business Welcome Email | `lib/email/templates/business-notifications.ts`, `lib/notifications/email-notifications.ts`, `lib/actions/signup-actions.ts`, `lib/actions/business-actions.ts` | Low | Welcome email fires on signup; submitted email fires on review submit. Both non-blocking (`.catch`). If Resend is down emails silently fail — no user-facing impact. |
| 2.16 Support Email Franchise-Aware | `lib/email/send-franchise-email.ts`, `lib/actions/signup-actions.ts`, `lib/actions/business-actions.ts`, `app/api/admin/approve/route.ts`, `app/api/admin/approve-change/route.ts`, `app/api/admin/approve-claim/route.ts`, `lib/actions/event-actions.ts`, `app/api/admin/test-emails/route.ts` | Low | All email body "Questions?" links + reply-to now resolve from `franchise_crm_configs.resend_from_email` per city. Falls back to `hello@qwikker.com` if no config. Non-breaking — only changes displayed email address in templates. |

## Task Descriptions

### 2.18 Auto-Generate Franchise Email Addresses (pending)
Remove the free-text "From Email" input from the franchise admin setup form. Auto-derive all email addresses from the subdomain:
- **From:** `no-reply@{city}.qwikker.com` (auto-generated, read-only)
- **Reply-to header:** `hello@{city}.qwikker.com` (auto-generated)
- **Email body contact:** `hello@{city}.qwikker.com` (auto-generated)
- **Forwarding:** `hello@{city}.qwikker.com` forwards to `owner_email` via Resend/Cloudflare (one-time DNS per city, done centrally by HQ)
- Owner email never exposed to end users. Zero input required from franchise admin beyond Resend API key.

## Key Rules

- Complete each tier fully before starting the next
- DB changes: provide SQL for manual execution + sanity checks
- No emojis in UI. No AI slop. Premium tone.
- Multi-tenant: everything city/franchise-aware
- Identity: wallet_pass_id, no login/logout
