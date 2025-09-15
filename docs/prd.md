**QWIKKER SaaS Dashboard Platform PRD (Product Requirements Document)**

**Last Updated:** 2025-09-15

---

## 📄 Product Name
**QWIKKER** — Local Business Growth Dashboard for Loyalty, Secret Menus, Offers & Customer Engagement

## 🎯 Product Vision
To become the go-to engagement and growth platform for brick-and-mortar businesses looking to:
- Increase footfall through AI-driven local exposure
- Reward loyal customers with gamified loyalty systems
- Secretly delight superfans with exclusive hidden menu items
- Push limited-time offers & messages via notifications
- View performance metrics, referrals, and revenue in one place

This is not just a SaaS tool. QWIKKER is a local marketing revolution.

## 🏠 Target User
- Independent cafes, restaurants, salons, gyms, and retail stores
- Business owners/operators with limited marketing budgets
- Local businesses with a 4.4+ Google rating
- Primarily UK-based at launch, with expansion to Bali, NYC, and Dubai

## 🤝 Key Goals
- Onboard 500 businesses by Q4 2025
- Monetize via self-serve dashboard + Stripe subscription
- Maintain 90%+ dashboard retention past trial
- Automate as much onboarding as possible via GHL

---

## ⚙️ Core Features (Dashboard Modules)

1. **Dashboard Overview**
   - 120-day free trial countdown (Featured plan only)
   - Current plan display
   - Business profile widget
   - Referral stats
   - Locked previews for premium features (blurred with CTA)
   - Blur overlays for:
     - Push Notifications Card (locked)
     - Analytics Card (locked)
     - Loyalty Card Preview (locked)

2. **Personal Info**
   - Update user contact and avatar

3. **Business Info**
   - Logo, address, Google Maps URL, category
   - Used for in-app placement and search

4. **Offers**
   - Create and manage time-sensitive offers
   - Offers are **exclusive to QWIKKER users** (not public web)
   - Add offer images and dates
   - Only visible via QWIKKER wallet/chat/pass

5. **Loyalty Cards** *(Locked unless Spotlight)*
   - Custom stamp count (e.g., 10 coffees = 1 free)
   - Trigger push notifications when milestones hit
   - Preview card in dashboard (blurred + locked overlay)

6. **Secret Menu**
   - Add exclusive hidden items
   - Visibility controls (Loyalty Only, VIP, Timed, Event-based)
   - **Secret menus are QWIKKER user-exclusive** (not public)

7. **Referrals**
   - Refer other qualifying businesses
   - Track rewards and progress
   - Earn bonuses per referral tier (starts at £10 per referral)

8. **Analytics** *(Locked unless Spotlight)*
   - Views, AI engagements, loyalty signups, revenue
   - Blurred preview card until upgraded

9. **Push Notifications** *(Locked unless Spotlight)*
   - Businesses can:
     - Send push to **all QWIKKER users**
     - Send **targeted push** (e.g. loyalty signups, offer claimers)
     - Trigger push automatically from loyalty milestones
   - Example notifications preview (blurred)

10. **Files**
   - Upload PDFs, menus, licenses, and media

11. **Settings**
   - Manage subscription, billing, account download, cancellation
   - Stripe portal integration for plan upgrades

12. **Support**
   - Live chat simulation
   - Report an issue form

---

## 💳 Pricing Tiers

**Featured Trial Plan**
- 120-day free trial with full access to Featured Plan features
- No credit card required on entry
- Must upgrade via Stripe through dashboard

**Starter**
- £19.99/month or £199/year
- Access to: Offers, Business Info, Referrals, Files

**Featured**
- £59.99/month or £599/year
- Access to: All Starter features + Secret Menu + Priority Search Placement

**Spotlight**
- £89.99/month or £899/year
- Access to everything (Analytics, Push, Loyalty, etc.)
- **Founding Member Deal:** 20% off Spotlight annual plan for life if upgraded before trial ends *(yearly only)*

---

## 🧭 User Flow Overview

### 1. **Entry via GHL Funnel**
- Business completes GHL form (logo, name, location, category)
- Final step button redirects to custom dashboard (React frontend)

### 2. **Authentication**
- User signs in or is auto-logged in via Supabase Auth
- Supabase row created with trial plan + plan expiry date

### 3. **Dashboard Access**
- Trial users are placed on **Featured plan** for 120 days
- Locked modules (Spotlight-only) show blurred previews with upgrade CTA
- Current plan + trial days remaining shown at top of dashboard

### 4. **Upgrade Flow**
- User clicks “Upgrade” from any locked feature or settings
- Redirected to Stripe Checkout (monthly/yearly options)
- Stripe webhook updates Supabase row with:
  - Plan tier
  - Billing cycle
  - Trial expired = false
  - Access unlocked based on tier

### 5. **Billing Portal**
- Accessible from Settings
- User can cancel, change plans, view invoices
- Stripe customer portal embedded or linked

---

## 💻 Tech Stack
- **Frontend:** React + TailwindCSS
- **Auth + Backend:** Supabase
- **Database:** Supabase Postgres
- **Hosting:** Vercel
- **Billing:** Stripe
- **GHL:** Lead funnel and form automation only

---

## 🔐 Access Control
- Supabase handles row-level security per user
- Auth required to view dashboard
- Plan status checked on login + stored in client state
- Locked features blurred and disabled for lower tiers
- Upgrade button visible on locked modules

---

## 🚀 PWA + Scalability
- Fully PWA-ready React build
- Mobile-first responsive design
- Future potential: convert into downloadable PWA (iOS/Android)

---

## 🧪 Future Features (Roadmap)
- AI-assisted secret menu suggestions
- Loyalty automation templates
- AI-triggered push ideas
- User-generated content and reviews
- Branch manager roles

---

## 🖼️ UI Description (Screenshot)
The attached image is the visual layout of the main dashboard screen. It includes:
- Side navigation with active module highlights
- Blurred preview cards for Spotlight-only features (Analytics, Push Notifications, Loyalty)
- Current plan badge and trial status prominently at the top
- Dark theme with green neon accents
- Smooth hover effects, gradients, and rounded cards

This is the user's central dashboard after logging in from the GHL funnel.

---
