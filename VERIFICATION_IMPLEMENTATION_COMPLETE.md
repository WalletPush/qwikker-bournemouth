# QWIKKER Verification System - Implementation Complete (Core)

## ✅ FULLY IMPLEMENTED (READY TO TEST)

### 1. Database Schema
- **Migration**: `supabase/migrations/20250115000000_business_verification_and_uniqueness.sql`
- Verification fields added (`verification_method`, `google_verified_at`, `manual_override`)
- Tagline uniqueness enforced with normalized index
- Google category fields (`google_primary_type`, `google_types`)
- Backfill scripts for existing data

### 2. Server APIs
- **Google Places Details**: `app/api/google/places-details/route.ts`
  - Secure server-side endpoint
  - Uses `GOOGLE_PLACES_SERVER_KEY` (not exposed to client)
  - Returns sanitized data with derived fields
  
- **Admin Approval**: `app/api/admin/approve-business/route.ts`
  - **ENFORCES 4.4★ RATING THRESHOLD**
  - Requires `manualOverride=true` for manual listings
  - Sets manual override fields on approval
  - Uses `canApprove()` utility for validation

### 3. Utility Functions
- **`lib/utils/verification-utils.ts`**:
  - `verificationSatisfied()` - checks profile verification status
  - `canApprove()` - enforces approval gates
  - `normalizeTagline()` - for duplicate prevention
  - `normalizeTown()` - removes hardcoded mappings

- **`lib/utils/google-category-label.ts`**:
  - `getCategoryLabel()` - maps Google types to readable labels
  - 60+ category mappings

### 4. Server Actions
- **`lib/actions/signup-actions.ts`**:
  - Accepts `VerificationData` parameter
  - Handles Google verified vs Manual mode
  - Populates Google data (place_id, rating, review_count, types)
  - Removes hardcoded town mappings
  - Tagline duplicate error handling
  - Sets verification fields correctly

- **`lib/actions/business-actions.ts`** (`submitBusinessForReview`):
  - Fetches `verification_method` and `google_place_id`
  - **BLOCKS submission if Google mode without place_id**
  - Adds admin note for manual listings
  - Error message guides user to verify or switch to manual

- **`lib/actions/verification-actions.ts`** (NEW):
  - `switchToManualListing()` - allows users to opt out of Google verification
  - Clears Google data, sets verification_method='manual'

### 5. Action Items System
- **`lib/utils/action-items-count.ts`**:
  - Includes verification requirement in count
  - Uses `verificationSatisfied()` for submission gating

- **`components/dashboard/action-items-page.tsx`**:
  - Added verification requirement for Google mode
  - Updated `isReadyToSubmit` to check `verificationSatisfied()`
  - Manual listing warning in submission description
  - Imports for `switchToManualListing` and `verificationSatisfied`

### 6. UI Updates
- **`components/user/business-card.tsx`**:
  - Uses `getCategoryLabel()` for category display
  - Shows Google primary type > display_category > system_category
  - No more hardcoded internal labels

---

## 🔧 CONFIGURATION REQUIRED

### Environment Variables
Add to `.env.local`:
```env
GOOGLE_PLACES_SERVER_KEY=your_google_api_key_with_places_api_enabled
```

### Database Migration
Run in Supabase SQL Editor:
```sql
-- Run the migration file
-- supabase/migrations/20250115000000_business_verification_and_uniqueness.sql
```

Then run backfills:
```sql
-- Backfill website_url
UPDATE public.business_profiles
SET website_url = website
WHERE (website_url IS NULL OR btrim(website_url) = '')
  AND website IS NOT NULL
  AND btrim(website) <> '';

-- Backfill auto_imported
UPDATE public.business_profiles
SET auto_imported = true
WHERE owner_user_id IS NULL
  AND status = 'unclaimed'
  AND (auto_imported IS NULL OR auto_imported = false)
  AND google_place_id IS NOT NULL;
```

---

## ⚠️ REMAINING WORK (UI Layer - Frontend Components)

### 1. Onboarding Form - Google vs Manual Choice
**FILE**: `components/simplified-onboarding-form.tsx`

**NEEDS**:
```tsx
// Add at start of form:
<div className="grid grid-cols-2 gap-4">
  <Card onClick={() => setVerificationMode('google')} className={verificationMode === 'google' ? 'border-green-500' : ''}>
    <CardContent>
      <h3>✅ Verify on Google (Recommended)</h3>
      <p>Fast approval, shows rating & reviews</p>
    </CardContent>
  </Card>
  
  <Card onClick={() => setVerificationMode('manual')} className={verificationMode === 'manual' ? 'border-amber-500' : ''}>
    <CardContent>
      <h3>📝 My business isn't on Google</h3>
      <p>Requires admin manual override</p>
    </CardContent>
  </Card>
</div>

{verificationMode === 'google' && (
  <GooglePlacesAutocomplete 
    onPlaceSelect={async (place) => {
      const response = await fetch('/api/google/places-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: place.place_id })
      })
      const { data } = await response.json()
      // Pre-fill form fields from data
      setGoogleData(data)
    }}
  />
)}

{verificationMode === 'manual' && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Manual Listing</AlertTitle>
    <AlertDescription>
      Manual listings require admin override to go live. Consider NFC review cards to boost your rating.
    </AlertDescription>
  </Alert>
)}

// On submit:
const verification: VerificationData = {
  method: verificationMode,
  placeId: googleData?.placeId,
  googleData: googleData
}

await createUserAndProfile(formData, files, referralCode, urlLocation, verification)
```

### 2. Action Items Page - Switch to Manual Button
**FILE**: `components/dashboard/action-items-page.tsx`

**NEEDS** (add after verification item rendering):
```tsx
const handleSwitchToManual = async () => {
  if (!profile?.user_id) return
  setIsSwitchingToManual(true)
  
  const result = await switchToManualListing(profile.user_id)
  
  if (result.success) {
    alert(result.message)
    window.location.reload()
  } else {
    alert(result.error)
  }
  
  setIsSwitchingToManual(false)
}

// In the verification todo item render:
{item.isVerification && (
  <Button 
    onClick={handleSwitchToManual}
    disabled={isSwitchingToManual}
    variant="outline"
    size="sm"
    className="ml-4"
  >
    {isSwitchingToManual ? 'Switching...' : 'Switch to Manual Listing'}
  </Button>
)}
```

### 3. Admin CRM - Verification Badges & Manual Override
**FILE**: `components/admin/business-crm-card.tsx`

**NEEDS**:
```tsx
// Add to business card header:
{business.verification_method === 'google' && business.google_place_id && (
  <Badge className="bg-green-600">
    ✓ Google Verified {business.rating}★
  </Badge>
)}

{business.verification_method === 'manual' && !business.manual_override && (
  <Badge className="bg-amber-600">
    ⚠️ Needs Manual Override
  </Badge>
)}

{business.verification_method === 'manual' && business.manual_override && (
  <Badge className="bg-blue-600">
    📝 Manual Override Approved
  </Badge>
)}

// In approval modal:
{business.verification_method === 'manual' && (
  <label className="flex items-center gap-2">
    <input 
      type="checkbox" 
      checked={manualOverrideChecked}
      onChange={(e) => setManualOverrideChecked(e.target.checked)}
    />
    <span>Approve as Manual Listing (Manual Override)</span>
  </label>
)}

// Update approve API call:
const response = await fetch('/api/admin/approve-business', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    businessId: business.id,
    action: 'approve',
    adminEmail: adminEmail,
    manualOverride: manualOverrideChecked // CRITICAL
  })
})

// Show Google link:
{business.google_place_id && (
  <a 
    href={`https://www.google.com/maps/search/?api=1&query_place_id=${business.google_place_id}`}
    target="_blank"
    className="text-blue-400 hover:underline"
  >
    View on Google Maps →
  </a>
)}

// NFC upsell (if rating < 4.4 or manual):
{(business.rating < 4.4 || business.verification_method === 'manual') && (
  <Alert className="bg-blue-950 border-blue-700">
    <Info className="h-4 w-4" />
    <AlertTitle>Boost Customer Reviews</AlertTitle>
    <AlertDescription>
      Not at 4.4★ yet? QWIKKER NFC Review Cards help you collect more positive reviews.
      <Button variant="link" className="p-0 h-auto text-blue-400">
        Request NFC Cards →
      </Button>
    </AlertDescription>
  </Alert>
)}
```

### 4. Remove City Dropdowns
**SEARCH & DESTROY**:
```bash
# Find all hardcoded city arrays
grep -r "bournemouth.*poole.*christchurch" --include="*.tsx" --include="*.ts"

# Find city dropdown components
grep -r "Select.*city" --include="*.tsx"

# Find client-side hostname city extraction
grep -r "hostname\.split\('\.\'\)\[0\]" --include="*.tsx" --include="*.ts"
```

Replace with:
- Server-derived city from props
- Read-only display: `<span className="text-slate-400">{locationInfo.city}</span>`

### 5. Website URL - Final Cleanup
**SEARCH**:
```bash
grep -r "business\.website[^_]" --include="*.tsx"
grep -r "business_website" --include="*.tsx"
```

Replace with: `business.website_url`

In CRM card rendering:
```tsx
{business.website_url && (
  <a 
    href={business.website_url.startsWith('http') ? business.website_url : `https://${business.website_url}`}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-400 hover:underline"
  >
    {business.website_url}
  </a>
)}
```

---

## 🧪 TESTING SEQUENCE

### Test 1: Google Verified Path
1. Go to onboarding
2. Choose "Verify on Google"
3. Search for a real business (e.g., "Starbucks Bournemouth")
4. Select from autocomplete
5. Verify form pre-fills with Google data
6. Complete signup
7. Check DB: `verification_method='google'`, `google_place_id` set, `rating` populated
8. Complete profile in dashboard
9. Submit for review
10. Admin approves (rating should be >= 4.4)
11. Business goes live

### Test 2: Manual Path
1. Go to onboarding
2. Choose "My business isn't on Google"
3. See warning about manual override
4. Complete signup manually
5. Check DB: `verification_method='manual'`, `google_place_id=NULL`
6. Complete profile
7. Submit for review
8. Admin sees "Needs Manual Override" badge
9. Admin tries to approve WITHOUT checkbox → BLOCKED
10. Admin ticks "Manual Override" checkbox → APPROVED
11. Business goes live

### Test 3: Below 4.4★ Block
1. Import a business with <4.4★ rating (or manually set one)
2. Business completes onboarding (Google verified)
3. Submit for review
4. Admin tries to approve → **BLOCKED** with error message
5. Admin sees NFC upsell suggestion

### Test 4: Tagline Duplicates
1. Create business with tagline "Best Coffee in Town"
2. Try to create another business with same tagline
3. Should be **REJECTED** with friendly error

---

## 📊 SUCCESS METRICS

After implementation, verify:
- [ ] Zero businesses can go live without verification (Google OR manual override)
- [ ] Zero businesses <4.4★ can be approved
- [ ] Zero duplicate taglines in database
- [ ] Zero fake reviews visible
- [ ] All Discover cards show real Google categories
- [ ] No city dropdowns functional
- [ ] All website URLs use `website_url` column

---

## 🚀 DEPLOYMENT CHECKLIST

1. Run migration in production Supabase
2. Set `GOOGLE_PLACES_SERVER_KEY` in Vercel/production env
3. Run backfill SQL scripts
4. Deploy code
5. Test onboarding flow end-to-end
6. Monitor admin approval process
7. Check for any 4.4★ bypasses in logs
8. Verify tagline uniqueness enforcement

---

## 📞 SUPPORT

If any issues:
1. Check migration ran successfully
2. Verify `GOOGLE_PLACES_SERVER_KEY` is set
3. Check browser console for API errors
4. Check server logs for approval blocks
5. Verify RLS policies allow admin writes

