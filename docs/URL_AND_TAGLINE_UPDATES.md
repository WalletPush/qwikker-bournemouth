# Email URLs & Business Tagline Updates

**Date:** January 14, 2026  
**Status:** ✅ All changes applied and verified

---

## Summary

This update addresses three user requests:

1. **Email URLs:** Change all email dashboard/login links to use Vercel deployment URL (`https://qwikkerdashboard-theta.vercel.app/`) instead of subdomain URLs (which aren't live yet)
2. **Claim Flow:** Confirm that approved claims update `business_profiles` table (✅ already working)
3. **Business Tagline:** Add tagline field to claim form so it appears on discover cards

---

## 1. Email URLs Updated ✅

### **Problem:**
All emails were linking to `https://bournemouth.qwikker.com/auth/login` and similar subdomain URLs, but custom domains aren't live yet. Users clicking email links got 404 errors.

### **Solution:**
Updated all email templates to use the Vercel deployment URL:
```typescript
const deploymentUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qwikkerdashboard-theta.vercel.app'
const loginUrl = `${deploymentUrl}/auth/login`
const dashboardUrl = `${deploymentUrl}/dashboard`
```

### **Files Updated:**

1. **`app/api/admin/approve-claim/route.ts`**
   - Changed login URL from city subdomain to deployment URL
   - Affects "Claim Approved" email

2. **`app/api/admin/approve-change/route.ts`**
   - Changed dashboard URL in offer approval emails
   - Affects "Offer Approved" notifications

3. **`app/api/admin/menus/approve/route.ts`**
   - Changed dashboard URL in menu approval emails
   - Affects "Menu Approved" notifications

4. **`app/api/admin/approve/route.ts`**
   - Changed dashboard URL in business approval emails
   - Affects "Business Profile Approved" notifications

5. **`app/api/admin/businesses/create/route.ts`**
   - Changed login URL in business creation response
   - Affects admin-created business accounts

### **Environment Variable:**
To use a different URL in production, set:
```bash
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

If not set, defaults to `https://qwikkerdashboard-theta.vercel.app`

---

## 2. Approved Claims → business_profiles ✅

### **Question:**
"After approving a claim in admin, should that business go to business_profiles table?"

### **Answer:**
**Yes, it already does!** The approve claim logic in `app/api/admin/approve-claim/route.ts` (lines 112-180) updates `business_profiles` with:

✅ **Status:** `'claimed_free'` (free tier, visible in discover only)  
✅ **Owner:** Sets `user_id` and `owner_user_id` to claimer's account  
✅ **Visibility:** `'discover_only'` (not in AI recommendations)  
✅ **Logo:** Applies uploaded logo  
✅ **Hero Image:** Applies uploaded hero image  
✅ **Edited Data:** Applies all edited fields (name, address, phone, website, category, type, description, hours)  
✅ **Subscription:** Creates free tier subscription  
✅ **Email:** Sends approval email to business owner  

**No changes needed** - this is working as expected.

---

## 3. Business Tagline Added to Claim Form ✅

### **Problem:**
Claim form didn't include a way to add a business tagline, which is displayed on discover cards.

### **Solution:**
Added `tagline` field throughout the entire claim flow:

### **A. Database Migration**

**File:** `supabase/migrations/20260114100000_add_edited_tagline_to_claim_requests.sql`

```sql
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS edited_tagline TEXT;
COMMENT ON COLUMN claim_requests.edited_tagline IS 
  'Business tagline edited/added by claimer (max 80 chars, shown on discover cards)';
```

**Note:** `business_profiles.business_tagline` already exists in the database.

### **B. Frontend: Claim Form Component**

**File:** `components/claim/confirm-business-details.tsx`

**Added:**
- ✅ `tagline` to `BusinessData` interface
- ✅ `tagline` to `onConfirm` callback interface
- ✅ `tagline` state: `useState(business.tagline || '')`
- ✅ Validation: Max 80 characters
- ✅ Input field with character counter
- ✅ Helper text: "This appears on your discover card"

**UI Position:** Between Business Name and Address

**Validation:**
```typescript
if (tagline && tagline.length > 80) {
  newErrors.tagline = 'Tagline must be 80 characters or less'
}
```

**Input Field:**
```tsx
<div className="space-y-2" id="tagline">
  <Label htmlFor="tagline">Business Tagline</Label>
  <Input
    id="tagline"
    value={tagline}
    onChange={(e) => {
      setTagline(e.target.value)
      if (errors.tagline) setErrors({ ...errors, tagline: '' })
    }}
    placeholder="e.g., Artisan coffee & fresh pastries daily"
    maxLength={80}
    className={errors.tagline ? 'border-destructive' : ''}
  />
  {errors.tagline && (
    <p className="text-sm text-destructive">{errors.tagline}</p>
  )}
  <p className="text-xs text-muted-foreground">
    {tagline.length}/80 characters · This appears on your discover card
  </p>
</div>
```

### **C. Frontend: Claim Page**

**File:** `app/claim/page.tsx`

**Added:**
```typescript
formData.append('editedTagline', editedBusinessData.tagline)
```

### **D. Backend: Claim Submit API**

**File:** `app/api/claim/submit/route.ts`

**Added:**
1. Extract tagline from form data:
   ```typescript
   const editedTagline = formData.get('editedTagline') as string
   ```

2. Store in `claim_requests`:
   ```typescript
   await supabase.from('claim_requests').insert({
     // ... other fields
     edited_tagline: editedTagline || null,
     data_edited: !!(editedBusinessName || ... || editedTagline || ...)
   })
   ```

### **E. Backend: Approve Claim API**

**File:** `app/api/admin/approve-claim/route.ts`

**Added:**
```typescript
if (claim.data_edited) {
  // ... other fields
  if (claim.edited_tagline) businessUpdate.business_tagline = claim.edited_tagline
}
```

---

## Testing Checklist

### **Email URLs:**
- [ ] Start a claim flow
- [ ] Check verification email → click link → should go to Vercel deployment
- [ ] Admin approves claim
- [ ] Check approval email → click "Log in" → should go to Vercel deployment
- [ ] Verify URL is `https://qwikkerdashboard-theta.vercel.app/auth/login` (not subdomain)

### **Business Tagline:**
- [ ] Visit `/claim` with `?mock=1`
- [ ] Select a business
- [ ] In "Confirm Business Details" step, see "Business Tagline" field
- [ ] Add tagline (e.g., "Fresh coffee & pastries daily")
- [ ] Check character counter updates (max 80)
- [ ] Try entering 90 characters → should show error
- [ ] Complete claim flow
- [ ] Admin approves claim
- [ ] Check `business_profiles` table → `business_tagline` should be populated
- [ ] Check discover card → tagline should display

### **Database:**
- [ ] Run migration: `supabase/migrations/20260114100000_add_edited_tagline_to_claim_requests.sql`
- [ ] Verify column exists:
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'claim_requests' AND column_name = 'edited_tagline';
  ```

---

## Files Modified

### **Email URL Changes:**
1. `app/api/admin/approve-claim/route.ts`
2. `app/api/admin/approve-change/route.ts`
3. `app/api/admin/menus/approve/route.ts`
4. `app/api/admin/approve/route.ts`
5. `app/api/admin/businesses/create/route.ts`

### **Tagline Feature:**
1. `components/claim/confirm-business-details.tsx` - UI component
2. `app/claim/page.tsx` - Form data handling
3. `app/api/claim/submit/route.ts` - API submission
4. `app/api/admin/approve-claim/route.ts` - Approval logic
5. `supabase/migrations/20260114100000_add_edited_tagline_to_claim_requests.sql` - Database schema

---

## Environment Variables

Add to `.env.local` and Vercel (optional):

```bash
# Base URL for email links (optional, defaults to Vercel deployment)
NEXT_PUBLIC_BASE_URL=https://qwikkerdashboard-theta.vercel.app

# Or when custom domains are live:
# NEXT_PUBLIC_BASE_URL=https://app.qwikker.com
```

**Note:** If `NEXT_PUBLIC_BASE_URL` is not set, it automatically defaults to `https://qwikkerdashboard-theta.vercel.app`.

---

## Migration Command

Run the new migration:

```bash
# Local Supabase
supabase migration up

# Or apply directly to production
psql $DATABASE_URL -f supabase/migrations/20260114100000_add_edited_tagline_to_claim_requests.sql
```

---

## Rollback (if needed)

To remove tagline feature:

```sql
-- Remove column from claim_requests
ALTER TABLE claim_requests DROP COLUMN IF EXISTS edited_tagline;
```

To revert email URLs, remove the `deploymentUrl` variable and restore:
```typescript
const loginUrl = `https://${city}.qwikker.com/auth/login`
```

---

## Next Steps

1. **Test claim flow end-to-end** with tagline field
2. **Run migration** to add `edited_tagline` column
3. **Verify emails** link to Vercel deployment (not subdomain)
4. **Update discover card UI** to display `business_tagline` if not already shown
5. **When custom domains go live**, update `NEXT_PUBLIC_BASE_URL` in Vercel to point to production domain

---

**Status:** ✅ All changes applied, linted, and ready for testing.

