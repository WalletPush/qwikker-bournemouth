# USER STATE PERSISTENCE - CRITICAL FIX

## 🚨 PROBLEM IDENTIFIED
- User progress stored in localStorage (browser-specific)
- Switching devices/browsers = lose all progress
- Claimed offers, badges, favorites not synced across devices
- Users see same offers again after claiming them

## ❌ CURRENT FLAWED SYSTEM

### Database Storage (GOOD):
- ✅ `user_offer_claims` - Offer claims stored in DB
- ✅ `app_users` - User profiles stored in DB

### localStorage Storage (BAD):
- ❌ `qwikker-claimed-${userId}` - Claimed offers state
- ❌ `qwikker-favorites-${userId}` - Favorite offers
- ❌ `qwikker-wallet-${userId}` - Wallet offers
- ❌ Badge progress - Simple badge tracker
- ❌ Secret menu unlocks

## ✅ SOLUTION PLAN

### 1. Create User State Loading Function
**New Function**: `getUserState(walletPassId)`
- Load claimed offers from `user_offer_claims` table
- Load favorites from new `user_favorites` table
- Load wallet offers from new `user_wallet_offers` table
- Load badge progress from new `user_badges` table

### 2. Update Database Schema
**New Tables Needed**:
```sql
-- User favorites
CREATE TABLE user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_pass_id text NOT NULL,
  offer_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(wallet_pass_id, offer_id)
);

-- User wallet offers (12-hour expiry tracking)
CREATE TABLE user_wallet_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_pass_id text NOT NULL,
  offer_id text NOT NULL,
  added_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE(wallet_pass_id, offer_id)
);

-- User badge progress
CREATE TABLE user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_pass_id text NOT NULL,
  badge_type text NOT NULL,
  progress integer DEFAULT 0,
  earned boolean DEFAULT false,
  earned_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(wallet_pass_id, badge_type)
);
```

### 3. Update Components to Load from Database
**Files to Update**:
- `components/user/user-offers-page.tsx` - Load state from DB
- `components/user/user-dashboard-home.tsx` - Load stats from DB
- `components/user/user-business-detail-page.tsx` - Load state from DB

### 4. Create Server Actions for State Management
**New Actions**:
- `getUserFavorites(walletPassId)`
- `addToFavorites(walletPassId, offerId)`
- `removeFromFavorites(walletPassId, offerId)`
- `addToWallet(walletPassId, offerId, expiryHours = 12)`
- `removeFromWallet(walletPassId, offerId)`
- `updateBadgeProgress(walletPassId, badgeType, progress)`

### 5. Implement Hybrid Storage (Performance + Reliability)
**Strategy**:
1. **Load from database** on page load (source of truth)
2. **Update database** when user takes actions
3. **Use localStorage as cache** for instant UI updates
4. **Sync localStorage with database** on load

## 🎯 IMPLEMENTATION STEPS

### Phase 1: Database Schema
1. Create new tables for user state
2. Migrate existing localStorage data to database

### Phase 2: Server Actions
1. Create getUserState() function
2. Create state update functions
3. Test database operations

### Phase 3: Component Updates
1. Update offers page to load from database
2. Update dashboard to load from database
3. Update business detail page to load from database

### Phase 4: Hybrid Storage
1. Implement cache-first loading
2. Add database sync on actions
3. Add periodic sync for reliability

## 🔧 IMMEDIATE FIXES NEEDED

### Priority 1: Load Claimed Offers from Database
Update `user-offers-page.tsx` to load claimed offers from `user_offer_claims` table

### Priority 2: Create User State API
New endpoint: `GET /api/user/state?wallet_pass_id=xxx`
Returns: claimed offers, favorites, wallet offers, badge progress

### Priority 3: Update State Management
Replace localStorage-only with database-first approach

## 📱 EXPECTED BEHAVIOR AFTER FIX

### User Experience:
1. **Claim offer on phone** → Stored in database
2. **Switch to laptop** → Still shows as claimed
3. **Refresh browser** → Progress persists
4. **Clear cookies** → Still remembers everything
5. **Use different browser** → Same progress everywhere

### Technical Flow:
1. **Page Load** → Fetch user state from database
2. **User Action** → Update database + localStorage cache
3. **Navigation** → State persists across pages
4. **Device Switch** → State syncs from database

## 🚀 SUCCESS METRICS

- ✅ Users never see same offer twice after claiming
- ✅ Badge progress persists across devices
- ✅ Favorites sync everywhere
- ✅ Wallet offers respect 12-hour expiry globally
- ✅ No data loss on browser changes
