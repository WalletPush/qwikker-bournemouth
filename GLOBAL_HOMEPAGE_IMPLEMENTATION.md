# ✅ Global Marketing Homepage - Implementation Complete

## 🎯 Objective Completed

New premium, dark-mode marketing homepage for `qwikker.com` (apex domain) that:
- Explains what QWIKKER is
- Shows how it works
- Highlights core features (AI Companion, Atlas, Offers, Secret Menu)
- Dynamically loads Live Cities from database
- Routes to tenant subdomains
- Uses restrained, premium design (Apple/Stripe/Linear aesthetic)

---

## 📁 Files Created/Modified

### ✅ Created
1. **`app/page.tsx`** - New global homepage (server component)
   - Fetches live cities from `franchise_public_info` view
   - Passes data to client component
   - Zero city detection logic
   - No secrets access

2. **`components/marketing/global-homepage.tsx`** - Client component
   - Premium dark UI (#0B0B0C background)
   - Framer Motion animations (subtle, restrained)
   - Dynamic Live Cities grid
   - QWIKKER green used sparingly as accent
   - Responsive navbar + footer

3. **`app/for-business/page.tsx`** - Moved business content
   - Exact copy of old `/` page
   - Zero behavioral changes
   - Preserves all links, CTAs, and logic

4. **`app/about/page.tsx`** - Stub about page
   - Minimal, premium design
   - Matches global homepage styling
   - Can be expanded later

5. **`supabase/migrations/20260125000003_create_franchise_public_info_view.sql`**
   - Safe public view for franchise data
   - Exposes only: city, display_name, subdomain, status, country_name, timezone, currency_symbol
   - No secrets, no API keys
   - Grants SELECT to `anon` and `authenticated` roles

---

## 🔒 Security Verification

### ✅ What's Safe
- New homepage queries `franchise_public_info` view (not `franchise_crm_configs`)
- Server component fetches cities (no client-side queries)
- No secrets exposed
- No API keys in client code
- View only includes non-sensitive columns

### ❌ What's NOT Exposed
- `ghl_webhook_url`
- `walletpush_api_key`
- `slack_webhook_url`
- Any other API keys or secrets

---

## 🎨 Design System Applied

### Colors
- Background: `#0B0B0C` (near-black)
- Panels: `#121214`
- Borders: `white/[0.06]` (very subtle)
- Text:
  - Primary: `white/[0.92]`
  - Secondary: `white/[0.68]`
  - Muted: `white/[0.45]`
- Accent: `#00d083` (QWIKKER green)
  - Used ONLY for:
    - CTA button background
    - Live city indicator dot
    - Link hover states
    - Small underlines

### Typography
- Font: Inter (system font stack fallback)
- Headings: Tight tracking, confident weight
- Body: Relaxed leading, generous spacing
- No marketing hyperbole

### Layout
- Max width: 1200px
- Generous vertical spacing (py-20)
- Left-aligned hero (not centered)
- Grid layouts for features/cities

### Animation
- Framer Motion with restraint
- Fade + 16px vertical rise on scroll
- Staggered children (0.1s delay)
- Hover: slight elevation (-2px translate)
- No bouncing, no springy motion

---

## 📊 Page Structure

### Navbar (Sticky)
- Logo (left)
- Links (right):
  - Live cities (scroll anchor)
  - For business (`/for-business`)
  - About (`/about`)
  - Primary CTA: "Choose a city" (scroll anchor)

### Hero
- Headline: "Your city, curated — not searched."
- Subheadline: Explains QWIKKER without hype
- Primary CTA: "Choose your city"
- Secondary link: "QWIKKER for Business →"
- Microcopy: "Free. Works on iPhone and Android. No app required."

### What is QWIKKER
- Single paragraph clarity block
- No fluff, just function

### How It Works
- 3-step grid
- Step numbers in QWIKKER green
- Clear, simple copy

### The Companion
- Explains dish-level specificity
- Shows example chat UI (3 messages)
- Emphasizes refinement without restart

### Atlas Mode
- Short, cinematic description
- "Chat decides. Atlas shows. You explore."
- Microcopy: "Optional, cinematic, and seamless"

### Offers + Secret Menu
- 2-column card grid
- Understated descriptions
- Microcopy: "No spam. No coupon landfill. Only real value."

### Live Cities (Dynamic)
- **Dynamic data from `franchise_public_info`**
- Only shows cities where `status = 'active'`
- Each city card links to `https://{subdomain}.qwikker.com`
- Green dot indicator
- Hover: slight elevation + border brighten
- Graceful empty state: "No cities live yet"

### About
- Short description
- Link to `/about` page

### Footer
- Links to: Live cities, For business, About, Privacy, Contact
- Copyright: "© QWIKKER — Built for cities."

---

## 🧪 Testing Checklist

### ✅ Routes to Verify

1. **`/` (New Global Homepage)**
   - [ ] Renders without errors
   - [ ] Fetches live cities from database
   - [ ] Displays city cards dynamically
   - [ ] City cards link to correct subdomains
   - [ ] "Choose a city" scrolls to #live-cities
   - [ ] Navbar links work
   - [ ] Footer links work
   - [ ] Animations are subtle and smooth

2. **`/for-business` (Moved Business Page)**
   - [ ] Renders exactly like old `/`
   - [ ] All CTAs work (/onboarding, /auth/login)
   - [ ] Logo displays correctly
   - [ ] Founding member section intact
   - [ ] Zero behavioral changes

3. **`/about` (New Stub Page)**
   - [ ] Renders without errors
   - [ ] Navbar links work
   - [ ] Footer links work
   - [ ] Links back to #live-cities work

### ✅ Existing Routes (Must NOT Break)

- [ ] `/user/*` - User app routes
- [ ] `/admin/*` - Admin dashboard routes
- [ ] `/hqadmin/*` - HQ admin routes
- [ ] `/join` - Pass installer (tenant)
- [ ] `/api/**` - All API routes
- [ ] `/auth/**` - Auth routes
- [ ] `/dashboard` - Business dashboard
- [ ] Tenant subdomains (`{city}.qwikker.com`)

### ✅ Database Migration

1. **Run Migration:**
   ```bash
   supabase/migrations/20260125000003_create_franchise_public_info_view.sql
   ```

2. **Verify View:**
   ```sql
   SELECT * FROM franchise_public_info WHERE status = 'active';
   ```

3. **Confirm Columns:**
   - city
   - display_name
   - subdomain
   - status
   - country_name
   - timezone
   - currency_symbol

4. **Confirm No Secrets:**
   - NO `ghl_webhook_url`
   - NO `walletpush_api_key`
   - NO `slack_webhook_url`

---

## 🚀 Deployment Steps

1. **Run Database Migration**
   - Execute `20260125000003_create_franchise_public_info_view.sql` in Supabase SQL editor

2. **Test Locally**
   - Visit `http://localhost:3000` - should show new homepage
   - Visit `http://localhost:3000/for-business` - should show old business page
   - Visit `http://localhost:3000/about` - should show about page

3. **Verify No Errors**
   - Check terminal for any console errors
   - Verify Live Cities section populates (if Bournemouth is active)

4. **Deploy to Production**
   - Commit changes
   - Push to main branch
   - Vercel will auto-deploy

5. **Production Verification**
   - Visit `qwikker.com` - new homepage
   - Visit `qwikker.com/for-business` - business page
   - Visit `bournemouth.qwikker.com` - tenant app (unchanged)
   - Verify city cards link to correct subdomains

---

## 🔄 Rollback Plan (If Needed)

If anything breaks, rollback is simple:

1. **Restore old homepage:**
   ```bash
   git revert HEAD
   ```

2. **Or manually:**
   - Copy contents of `app/for-business/page.tsx` back to `app/page.tsx`
   - Delete `components/marketing/global-homepage.tsx`
   - Delete `app/about/page.tsx`

---

## 📝 Copy Rules (Lock These In)

### ✅ Always Use
- "Your city, curated — not searched."
- "Get your {City} pass" (not "VIP pass")
- "Free. Works on iPhone and Android. No app required."
- "Built city-by-city."

### ❌ Never Use
- "Revolutionary"
- "Game-changing"
- "Next-gen"
- "AI-powered" (just explain what it does)
- "VIP", "Premium", "Exclusive" at acquisition

---

## 🎯 Success Criteria

### ✅ Completed
- [x] New global homepage at `/`
- [x] Business content moved to `/for-business`
- [x] Live Cities section is dynamic
- [x] Safe database view created
- [x] No secrets exposed
- [x] Premium design applied
- [x] QWIKKER green used sparingly
- [x] Framer Motion animations restrained
- [x] About page created
- [x] No existing routes overwritten

### ⏳ Requires User Testing
- [ ] `/for-business` works exactly like old `/`
- [ ] No existing routes broken
- [ ] Migration runs successfully
- [ ] Live Cities populate correctly
- [ ] City links route to correct subdomains

---

## 💡 Key Decisions Made

1. **Used `franchise_public_info` view instead of direct table access**
   - Safer, no secret exposure
   - Can be granted to `anon` role
   - Decouples frontend from table structure

2. **Server component for data fetching**
   - Zero client-side queries
   - Better SEO
   - Faster page load

3. **Framer Motion with restraint**
   - Only fade + rise animations
   - No springy motion
   - Stagger delay: 0.1s max

4. **QWIKKER green as accent only**
   - CTA button background
   - Live indicator dot
   - Link hover states
   - Never on large surfaces

5. **Copy tone: confident, not loud**
   - No marketing hyperbole
   - Explains function, not features
   - "City-by-city" positioning

---

## 🚨 Critical Reminders

- **DO NOT** query `franchise_crm_configs` from client code
- **DO NOT** use QWIKKER green for large surfaces
- **DO NOT** add gradients or bright colors
- **DO NOT** use marketing adjectives like "revolutionary"
- **DO NOT** change tenant routing logic
- **DO NOT** modify `/user`, `/admin`, `/hqadmin`, `/api/**`

---

## 📞 Next Steps

1. **User must run migration** in Supabase
2. **User must test** `/for-business` works like old `/`
3. **User must verify** no existing routes broken
4. **User must deploy** to production and test on real domain

Once verified, this homepage is **production-ready**. ✅
