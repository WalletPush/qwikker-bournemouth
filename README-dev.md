# QWIKKER Development Setup

Quick start guide for local development.

## Prerequisites

- Node.js 18+ and pnpm installed
- Supabase project created (get credentials from dashboard)

## Setup Steps

### 1. Clone and Install

```bash
cd qwikkerdashboard
pnpm install
```

### 2. Environment Variables

Create `.env.local` in the repo root:

```bash
# Copy from .env.example (or create manually)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
CLOUDINARY_LOGO_URL=https://res.cloudinary.com/...
```

Get your Supabase credentials from:
**Dashboard → Project Settings → API**

### 3. Start Dev Server

```bash
pnpm dev:3000
```

Server will run on `http://localhost:3000`

---

## Troubleshooting

### Port 3000 Already in Use

Kill the process using port 3000:

```bash
pnpm kill:3000
```

Or manually:

```bash
# Find process on port 3000
lsof -ti:3000

# Kill it
kill -9 <PID>
```

### Missing Environment Variables

If you see: `Missing NEXT_PUBLIC_SUPABASE_URL`

→ You forgot to create `.env.local` (see step 2 above)

### Placeholder Images Not Loading

Placeholders are in `/public/placeholders/<category>/`

Each category needs:
- `00.webp`
- `01.webp`
- `02.webp`

Fallback: `/public/placeholders/default/00.webp`

Visit `/dev/placeholders` to preview all categories.

---

## Useful Commands

```bash
# Start dev server on port 3000
pnpm dev:3000

# Kill process on port 3000
pnpm kill:3000

# Lint
pnpm lint

# Type check
pnpm typecheck

# Build for production
pnpm build
```

---

## Project Structure

```
app/                    # Next.js 13+ App Router
├── api/               # API routes
├── admin/             # Admin dashboard
├── user/              # User-facing pages
└── claim/             # Business claim flow

components/            # React components
├── ui/               # Shared UI components
├── admin/            # Admin-specific
└── user/             # User-facing

lib/                   # Utilities & helpers
├── supabase/         # Supabase clients
├── placeholders/     # Placeholder image system
└── utils/            # General utilities

public/               # Static assets
└── placeholders/     # Placeholder images by category
```

---

## Multi-City Setup

Qwikker uses subdomain-based multi-tenancy:

- `bournemouth.qwikker.com` → Bournemouth city
- `calgary.qwikker.com` → Calgary city
- etc.

**Local dev:** Uses `localhost:3000` (defaults to Bournemouth for testing)

**Production:** Each city gets its own subdomain with isolated data.

