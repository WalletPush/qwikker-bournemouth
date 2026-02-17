# Qwikker Contact Centre -- System Documentation

## Overview

The Contact Centre is a system-wide in-app messaging and task management platform that connects **Businesses**, **City Admins**, and **HQ Admins**. It replaces email-based support with structured, trackable communication threads.

---

## Architecture

### Data Model

Four core tables power the system:

- **`contact_threads`** -- A conversation between parties. Has a type, category, priority, status, and optional metadata (for escalations, linked threads, diagnostics).
- **`contact_messages`** -- Individual messages within a thread. Supports types: `message`, `task`, `internal_note`, `status_change`.
- **`contact_thread_participants`** -- Links users to threads with their role (`business`, `admin`, `hq_admin`).
- **`contact_read_receipts`** -- Tracks the last-read timestamp per user per thread, enabling unread counts.

### Thread Types

| Type | Flow | Description |
|------|------|-------------|
| `business_admin` | Business <-> City Admin | Bug reports, support, tasks, general messaging |
| `admin_hq` | City Admin <-> HQ | Escalations, admin reports, cross-city issues |

### Thread Statuses

`open` -> `pending` -> `resolved` / `closed`

### Categories

`bug`, `feature_request`, `billing`, `listing`, `menu`, `photos`, `offers`, `events`, `app_issue`, `support`, `platform_issue`, `task`, `other`

### Priorities

`low`, `normal`, `high`, `urgent`

Severity-to-priority mapping for bugs: `critical` -> `urgent`, `high` -> `high`, `medium` -> `normal`, `low` -> `low`

---

## Communication Flows

### 1. Business -> Admin (Bug Report / Support)

**Business Dashboard** -> Sidebar -> **Contact Centre** -> "New Thread"

The business selects a category (e.g., Bug Report), fills in details (severity, steps to reproduce, expected/actual behavior), and optionally attaches screenshots. The thread is created and the city admin is notified via Slack.

**Bug reports include:**
- Severity level (critical/high/medium/low)
- Steps to reproduce
- Expected vs actual behavior
- Attachment URLs
- Optional diagnostics (if enabled): user agent, build ID, activity trail

### 2. Admin -> Business (Message)

**Admin Dashboard** -> CRM Card -> **Message** button (header bar)

Admins can initiate a conversation with any claimed business directly from the CRM card. This creates a new `business_admin` thread visible in the business's Contact Centre.

Also available via the quick-action cyan chat icon on the collapsed CRM card.

### 3. Admin -> Business (Task / Action Item)

**Admin Dashboard** -> CRM Card -> **Tasks tab** -> "+ New Task"

Admins assign tasks to businesses with:
- Title and description
- Action type (Update Profile, Upload Menu, Upload Photos, Update Hours, Respond, Review Offer, Other)
- Priority (Low, Normal, High, Urgent)

Tasks create a new Contact Centre thread (category `task`) with a task message. They appear in:
- The business's **Contact Centre** as a thread with an "ADMIN TASK" badge
- The business's **Action Items** tab with a "Mark complete" button

When the business marks a task complete, the status updates to `done` and a Slack notification fires.

### 4. City Admin -> HQ (Escalation)

**Admin Dashboard** -> Contact Centre -> Thread -> "Escalate to HQ"

City admins can escalate any business thread to HQ. The system:
- Checks for existing linked HQ threads (idempotent -- won't create duplicates)
- Creates an `admin_hq` thread with metadata linking back to the original thread
- Stamps the HQ thread ID back onto the original thread
- Sends a Slack notification to the HQ webhook

**Escalation types:**
- `business_bug` -- Escalated from a business bug report (includes linked thread context)
- `admin_report` -- Generic admin report to HQ (city-level issues, platform problems)

### 5. City Admin -> HQ (Direct Report)

**Admin Dashboard** -> Contact Centre -> "Report to HQ" form

For issues not tied to a specific business thread. Includes category, severity, description, steps, and attachments.

---

## API Endpoints

### Business APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/business/contact/threads` | GET | List business's threads |
| `/api/business/contact/threads` | POST | Create new thread (bug report, support, etc.) |
| `/api/business/contact/threads/[id]` | GET | Get thread detail + messages |
| `/api/business/contact/messages` | POST | Send message in thread |
| `/api/business/contact/tasks/complete` | POST | Mark a task as done |
| `/api/business/contact/read` | POST | Mark thread as read |

### Admin APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/contact/threads` | GET | List threads for admin's city (with server-side filters) |
| `/api/admin/contact/threads` | POST | Create new thread (admin-initiated message to business) |
| `/api/admin/contact/threads/[id]` | GET | Get thread detail + messages |
| `/api/admin/contact/threads/[id]` | PATCH | Update thread status/priority/assignment |
| `/api/admin/contact/messages` | POST | Send message or internal note |
| `/api/admin/contact/tasks/create` | POST | Create task for business |
| `/api/admin/contact/escalate` | POST | Escalate to HQ |
| `/api/admin/contact/read` | POST | Mark thread as read |
| `/api/admin/contact/counts` | GET | Unread + open task counts for sidebar badge |
| `/api/admin/contact/threads-status` | POST | Quick status update |

### HQ APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/hq/contact/threads` | GET | List `admin_hq` threads |
| `/api/hq/contact/threads/[id]` | GET | Get HQ thread detail + messages |
| `/api/hq/contact/threads/[id]` | PATCH | Update HQ thread status/priority |
| `/api/hq/contact/messages` | POST | Send message in HQ thread |
| `/api/hq/contact/counts` | GET | Unread count for HQ sidebar badge |

---

## UI Components

### Business Dashboard

- **`components/dashboard/contact-centre-client.tsx`** -- Full Contact Centre UI with thread list, thread detail, new thread form (including bug report mode with severity/steps/expected/actual), message input, and task completion.
- Sidebar shows "Contact Centre" with red badge for unread threads.

### Admin Dashboard

- **`components/admin/admin-contact-centre-client.tsx`** -- Admin Contact Centre with thread list (server-side filters: Unread, Bugs, Critical/High, category, search), thread detail with message/note input, escalation controls, and "Report to HQ" form.
- **`components/admin/comprehensive-business-crm-card.tsx`** -- CRM card integrations:
  - **Message button** in header (next to Call/Email/Sync) -- opens compose form
  - **Quick-action message icon** on collapsed card -- opens CRM + compose form
  - **Tasks tab** -- "+ New Task" form with action type/priority, existing task list, incomplete onboarding items
  - All messaging/task features gated behind `isClaimed` (no dashboard = no messaging)
- Sidebar shows "Contact Centre" with red badge for unread threads + open tasks.

### HQ Dashboard

- **`components/hqadmin/hq-contact-centre-client.tsx`** -- HQ Contact Centre with escalation type badges (`Escalated Bug`, `Admin Report`), linked thread info (origin city, business ID), priority badges, and `BugSummaryCard` integration.
- **`app/hqadmin/contact-centre/page.tsx`** -- HQ Contact Centre page.
- Sidebar shows "Contact Centre" nav link.

### Shared Components

- **`components/contact-centre/bug-summary-card.tsx`** -- Reusable card displaying bug report details (severity, steps, expected/actual, attachments, diagnostics, activity trail). Used in all three Contact Centre views.

---

## Slack Notifications

**`lib/utils/contact-slack.ts`**

Sends Slack notifications for key events:

| Event | Recipients | Content |
|-------|-----------|---------|
| New business message | City admin Slack channel | Business name, category, preview, deep link |
| Task completed | City admin Slack channel | Business name, task title, completion confirmation |
| Escalation to HQ | HQ Slack channel (+ city channel for critical) | Escalation type, severity, origin city, deep link |
| New city admin message to HQ | HQ Slack channel | Admin name, category, preview, deep link |

Bug-specific emoji mapping: critical -> skull, high -> fire, medium -> warning, low -> info

**Environment variables:**
- City-specific: `{CITY}_SLACK_WEBHOOK_URL` (e.g., `BOURNEMOUTH_SLACK_WEBHOOK_URL`)
- HQ: `HQ_SLACK_WEBHOOK_URL`

---

## Security

- **All API routes use `createServiceRoleClient()`** to bypass RLS, ensuring reliable data access regardless of user session state.
- **Authentication:** Business APIs validate via Supabase Auth (`auth.getUser()`). Admin APIs validate via `getAdminFromSession()` (cookie-based). HQ APIs validate via `getHQAdminFromSession()` (Supabase Auth + `hq_admins` table).
- **City scoping:** Admin threads are filtered by `admin.city`. Admins can only message businesses in their city.
- **Claimed-only gating:** Message and task buttons are hidden for unclaimed businesses (`!owner_user_id`).
- **Idempotent escalation:** Duplicate HQ threads are prevented by checking for existing threads with the same `linkedThreadId`.

---

## Diagnostics & Bug Reporting

When a business reports a bug, the system can capture:

- **Server-rebuilt diagnostics:** `receivedAt`, `city`, `threadType`, `role`, `businessId`, `userAgent`, `buildId` -- always built server-side for accuracy
- **Client diagnostics (opt-in):** Merged only if `diagnosticsEnabled` is true
- **Activity trail:** Last 25 UI events (page views, clicks, API errors, navigation) from a client-side ring buffer, stripped of sensitive data
- **Attachments:** Stored as `[{ type, url, name? }]` in message metadata

---

## Key Files

```
app/api/admin/contact/          -- Admin Contact Centre API routes
app/api/business/contact/       -- Business Contact Centre API routes
app/api/hq/contact/             -- HQ Contact Centre API routes
app/api/dashboard/ai-support/   -- AI help assistant (knows about Contact Centre)

components/admin/admin-contact-centre-client.tsx      -- Admin Contact Centre UI
components/admin/comprehensive-business-crm-card.tsx  -- CRM card (message + task)
components/dashboard/contact-centre-client.tsx        -- Business Contact Centre UI
components/dashboard/ai-support-chat.tsx              -- AI help widget
components/hqadmin/hq-contact-centre-client.tsx       -- HQ Contact Centre UI
components/contact-centre/bug-summary-card.tsx        -- Shared bug summary card
components/dashboard/action-items-page.tsx            -- Business action items (shows admin tasks)

lib/utils/contact-slack.ts      -- Slack notification utility
lib/utils/admin-session.ts      -- Admin session helper
lib/utils/hq-session.ts         -- HQ admin session helper
```

---

## Database Schema (Core Tables)

```sql
contact_threads (
  id uuid PK,
  thread_type text CHECK (business_admin, admin_hq),
  city text NOT NULL,
  business_id uuid REFERENCES business_profiles,
  created_by_user_id uuid,
  created_by_role text,
  subject text,
  category text CHECK (...),
  status text CHECK (open, pending, closed, resolved),
  priority text DEFAULT 'normal',
  assigned_to_admin_id uuid,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_from_role text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz,
  updated_at timestamptz
)

contact_messages (
  id uuid PK,
  thread_id uuid REFERENCES contact_threads ON DELETE CASCADE,
  sender_user_id uuid,
  sender_role text,
  message_type text CHECK (message, task, internal_note, status_change),
  body text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz
)

contact_thread_participants (
  id uuid PK,
  thread_id uuid REFERENCES contact_threads ON DELETE CASCADE,
  user_id uuid,
  role text,
  joined_at timestamptz
)

contact_read_receipts (
  thread_id uuid,
  user_id uuid,
  last_read_at timestamptz,
  updated_at timestamptz,
  PRIMARY KEY (thread_id, user_id)
)
```

---

## Metadata Conventions

### Thread Metadata (escalations)
```json
{
  "linkedThreadId": "uuid",
  "linkedCity": "bournemouth",
  "linkedBusinessId": "uuid",
  "escalationType": "business_bug | admin_report",
  "hqThreadId": "uuid"
}
```

### Task Message Metadata
```json
{
  "title": "Update your profile image",
  "actionType": "upload_photos",
  "priority": "normal",
  "status": "open | done",
  "deepLink": "/dashboard/profile#business-photo",
  "assignedAt": "ISO timestamp",
  "assignedBy": "admin-uuid",
  "assignedByName": "Admin Name"
}
```

### Bug Report Message Metadata (canonical keys)
```json
{
  "severity": "critical | high | medium | low",
  "stepsToReproduce": "1. Go to... 2. Click...",
  "expectedBehavior": "The page should load",
  "actualBehavior": "The page shows a blank screen",
  "attachments": [{ "type": "image", "url": "...", "name": "screenshot.png" }],
  "diagnostics": {
    "receivedAt": "ISO timestamp",
    "city": "bournemouth",
    "threadType": "business_admin",
    "role": "business",
    "businessId": "uuid",
    "userAgent": "Mozilla/5.0...",
    "buildId": "abc123"
  },
  "activityTrail": [{ "type": "page_view", "path": "/dashboard", "ts": 1234567890 }]
}
```

> **Important:** All writers and readers use `stepsToReproduce`, `expectedBehavior`, `actualBehavior` (not `steps`/`expected`/`actual`). These keys are canonical across all flows: business bug form, admin escalation, HQ view, and `BugSummaryCard`.

---

## Idempotent Escalation

### Application-level check
The escalation API checks for an existing `admin_hq` thread with the same `linkedThreadId` before creating a new one.

### Database-level protection (race condition guard)
Run this SQL to add a unique partial index that prevents duplicate escalations even under concurrent requests:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_hq_linked_thread
ON contact_threads ((metadata->>'linkedThreadId'))
WHERE thread_type = 'admin_hq' AND (metadata ? 'linkedThreadId');
```

This ensures only one HQ thread can exist per linked business thread.

---

## Metadata Separation Rules

- **Thread-level metadata** (`contact_threads.metadata`): Stores escalation linkage and thread state only
  - `linkedThreadId`, `linkedCity`, `linkedBusinessId`, `escalationType`, `hqThreadId`, `severity` (for filtering)
- **Message-level metadata** (`contact_messages.metadata`): Stores content and evidence
  - Bug details (`severity`, `stepsToReproduce`, `expectedBehavior`, `actualBehavior`, `attachments`, `diagnostics`, `activityTrail`)
  - Task details (`title`, `actionType`, `priority`, `status`, `deepLink`, `assignedAt`, `assignedBy`, `assignedByName`)

When escalating to HQ, bug metadata is copied to the HQ thread's first **message** metadata (evidence), while linkage goes to the HQ **thread** metadata (state).

---

## HQ Testing Checklist

1. **Admin escalates a business bug thread**
   - HQ list shows "Escalated Bug" badge
   - Thread detail shows linked info (linkedThreadId, city, business)
2. **Admin reports direct to HQ**
   - HQ list shows "Admin Report" badge
3. **HQ replies in the HQ thread**
   - Message persists after refresh
   - Unread counts update for the admin
4. **Admin re-opens the escalated business thread**
   - Still shows "Escalated to HQ" state (button disabled / link present)
5. **Slack notifications**
   - Escalation ping hits HQ webhook
   - Critical/high formatting (emoji + severity line) is correct
6. **Idempotent escalation**
   - Attempting to escalate the same thread twice returns the existing HQ thread (no duplicate)
