# QWIKKER COMPLETE SYSTEM CONTEXT FOR CHATGPT

## PROJECT OVERVIEW
Qwikker is a franchise-scalable loyalty platform that creates personalized wallet passes for users. Each franchise (e.g., bournemouth, calgary) operates independently with their own businesses, users, and configurations.

## CURRENT TECH STACK
- **Frontend**: Next.js 15 with App Router, React, TypeScript
- **Backend**: Next.js API routes, Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Wallet Integration**: WalletPush API for iOS/Android passes
- **CRM Integration**: GoHighLevel (GHL) workflows
- **Deployment**: Vercel (qwikkerdashboard-theta.vercel.app)

## CURRENT ARCHITECTURE

### Database Schema (Key Tables)
```sql
-- User Management
app_users (wallet_pass_id, name, email, city, ghl_contact_id)
user_shortlinks (shortlink_code, wallet_pass_id, destination_url)

-- Business Management  
business_profiles (id, business_name, city, status, offer_name, etc.)
business_offers (id, business_id, offer_name, offer_type, status)
business_changes (pending admin approvals)

-- System Configuration
franchise_crm_configs (city, ghl_webhook_url, walletpush_api_key)
profiles (user_id, plan, subscription_plan) -- for business owners
```

### Key Features Implemented
1. **Multiple Offers System**: Businesses can have multiple offers based on tier
2. **Franchise Scaling**: Each city has independent data and configs
3. **Bulletproof Shortlinks**: Replaces vippassbot.com with our own system
4. **Admin Dashboard**: Comprehensive business management and analytics
5. **User Dashboard**: Personalized experience with offers, chat, discovery
6. **Wallet Pass Integration**: Dynamic pass creation and updates

## CURRENT WORKFLOW

### User Signup Flow
1. User visits `bournemouth.qwikker.com/join`
2. Fills form → WalletPush creates pass
3. GHL webhook triggers → Creates user in Supabase
4. User gets personalized shortlinks in pass
5. Redirects to dashboard after 7-second delay

### Business Onboarding Flow
1. Business signs up → Creates profile in `business_profiles`
2. Admin reviews → Approves/rejects in `business_changes`
3. Business gets dashboard access → Can create offers
4. Offers go through admin approval process

### Offer System
- **Starter**: 3 offers max
- **Featured**: 5 offers max  
- **Spotlight**: 25 offers max
- All stored in `business_offers` table
- Legacy single offers still in `business_profiles`

## CURRENT ISSUES BEING DEBUGGED

### Primary Issue: Wallet Pass Installation
**Problem**: Users (especially international/iOS) don't get chance to install pass before redirect
**Current Flow**: Form submit → Pass created → Immediate redirect (too fast)
**Desired Flow**: Form submit → Pass created → User sees "Add to Wallet" → User installs → THEN redirect

### Technical Details
- Using GHL automation with 7-second delay
- JavaScript code handles pass creation and redirect
- Need to detect actual pass installation, not just time-based redirect

## KEY FILES TO UNDERSTAND

### Wallet Pass Creation
- `updated-wallet-pass-creation.js` - Current form submission logic
- `app/api/walletpass/create-main-pass/route.ts` - Pass creation API
- `app/api/ghl-webhook/user-creation/route.ts` - User creation after pass

### User Experience
- `app/user/dashboard/page.tsx` - Main user dashboard
- `components/user/user-offers-page.tsx` - Offers display and claiming
- `app/user/business/[slug]/page.tsx` - Individual business pages

### Admin System
- `app/admin/page.tsx` - Main admin dashboard
- `components/admin/admin-dashboard.tsx` - Admin interface
- `app/api/admin/approve-change/route.ts` - Business/offer approvals

### Business Dashboard
- `app/dashboard/offers/page.tsx` - Business offer management
- `components/dashboard/offers-page.tsx` - Multiple offers interface

### Database Actions
- `lib/actions/offer-claim-actions.ts` - Offer claiming logic
- `lib/actions/business-actions.ts` - Business management
- `lib/actions/admin-crm-actions.ts` - Admin operations

### Shortlink System
- `app/api/shortlinks/create/route.ts` - Shortlink generation
- `app/api/shortlinks/redirect/[code]/route.ts` - Shortlink redirects
- `supabase/migrations/20250929210000_create_bulletproof_shortlink_system.sql`

## CURRENT DEPLOYMENT STATUS
- **Branch**: qwikker-simplified
- **Latest Commit**: "Multiple offers system complete" (bfb024ec)
- **Status**: All major features deployed and working
- **Only Issue**: Wallet pass installation timing for international users

## IMMEDIATE QUESTION FOR CHATGPT
How to modify the wallet pass creation flow so users get proper time to install the pass before being redirected to dashboard, especially for iOS users and international users who may have slower connections or additional security restrictions?

Current code forces redirect after 7 seconds regardless of installation status. Need to detect actual pass installation or provide better UX for the installation process.
