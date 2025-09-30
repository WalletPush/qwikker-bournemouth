# MULTIPLE OFFERS SYSTEM - FIX PLAN

## 🚨 CRITICAL BUG IDENTIFIED
- **Problem**: David's Grill Shack had "2-for-1 Cocktail" offer
- **User Action**: Clicked "Create Another Offer" to add "30% Off Mighty Mixed Grill"  
- **Expected**: Business should have TWO offers
- **Actual**: System REPLACED cocktail offer with grill offer
- **Root Cause**: Admin approval overwrites existing offer instead of creating new one

## ✅ SOLUTION DESIGNED (NOT YET APPLIED)

### 1. Database Migration Created
**File**: `supabase/migrations/20250929200000_create_multiple_offers_system.sql`
- Creates `business_offers` table for multiple offers per business
- Adds tier-based offer limits (Starter: 1, Featured: 3, Spotlight: unlimited)
- Migrates existing offers from `business_profiles` to new table
- Creates backward compatibility view

### 2. Admin Approval Logic Fixed  
**File**: `app/api/admin/approve-change/route.ts`
- Now creates NEW entries in `business_offers` table
- Checks tier limits before approval
- Prevents overwriting existing offers
- Maintains backward compatibility with `business_profiles`

### 3. Admin UI Updated
**File**: `components/admin/admin-dashboard.tsx`
- Changed "Change Details" to "Offer Details" for offers
- Better messaging for new vs existing offers

## ❌ STILL NEEDS TO BE DONE

### 1. Apply Migration
```bash
# Run this to create the new database structure
supabase db push
```

### 2. Update Offers Gallery
**File**: `app/user/offers/page.tsx` (lines 74-155)
**Current**: Fetches from `business_profiles` (1 offer per business)
**Needed**: Fetch from `business_offers` table (multiple offers per business)

**New Query Needed**:
```sql
SELECT 
  bo.*,
  bp.business_name,
  bp.business_category, 
  bp.logo,
  bp.business_address,
  bp.business_town,
  bp.city
FROM business_offers bo
JOIN business_profiles bp ON bo.business_id = bp.id  
WHERE bp.city = 'bournemouth'
AND bo.status = 'approved'
AND bp.status = 'approved'
```

### 3. Update Business Dashboard
**File**: `components/dashboard/offers-page.tsx`
- Update offer creation to use new table
- Update offer editing to work with multiple offers
- Update offer limits display

### 4. Update Business Detail Pages
**Files**: 
- `app/user/business/[slug]/page.tsx`
- `components/user/user-business-detail-page.tsx`
- Need to fetch and display ALL offers for a business, not just one

### 5. Update Analytics
**Files**:
- `lib/actions/admin-analytics-actions.ts`
- Update offer counting to use new table
- Ensure franchise filtering still works

## 🎯 TESTING PLAN

1. **Apply migration** - Check database structure
2. **Test David's Grill Shack** - Should be able to add multiple offers
3. **Test tier limits** - Starter businesses limited to 1 offer
4. **Test offers gallery** - Should show all offers from all businesses
5. **Test franchise isolation** - Bournemouth users only see Bournemouth offers

## 📊 CURRENT STATUS

- ✅ Migration file created
- ✅ Admin approval logic fixed  
- ✅ Admin UI updated
- ❌ Migration not applied
- ❌ Offers gallery not updated
- ❌ Business dashboard not updated
- ❌ Not committed/deployed

## 🚀 NEXT STEPS (Morning)

1. Apply migration: `supabase db push`
2. Update offers gallery query
3. Test with David's Grill Shack
4. Commit and deploy changes
5. Verify no existing offers were lost

## 💡 FRANCHISE CONSIDERATIONS

- ✅ New table structure scales for multiple franchises
- ✅ AI chat queries will work correctly with franchise filtering
- ✅ Performance better with dedicated offers table
- ✅ Supports unlimited growth per franchise

## 🔄 ROLLBACK PLAN

If issues occur:
1. Revert `app/api/admin/approve-change/route.ts` changes
2. Use `business_profiles_with_offers` view for backward compatibility
3. Migration includes data preservation - existing offers won't be lost
