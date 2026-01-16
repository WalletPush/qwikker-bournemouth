# Quick Reference: Remaining Work

## 🔴 CRITICAL (Must Do)

### 1. Onboarding Form - Add Google Verification Choice
**File**: `components/simplified-onboarding-form.tsx`

```tsx
// Add state at top
const [verificationMode, setVerificationMode] = useState<'google' | 'manual'>('google')
const [googleData, setGoogleData] = useState<any>(null)

// Add choice cards before form fields
<div className="grid grid-cols-2 gap-4 mb-8">
  <Card 
    onClick={() => setVerificationMode('google')} 
    className={`cursor-pointer ${verificationMode === 'google' ? 'border-green-500 border-2' : ''}`}
  >
    <CardContent className="p-6 text-center">
      <svg className="w-12 h-12 mx-auto mb-2 text-green-500">...</svg>
      <h3 className="font-bold">Verify on Google</h3>
      <p className="text-sm text-slate-400">Recommended - Fast approval</p>
    </CardContent>
  </Card>
  
  <Card 
    onClick={() => setVerificationMode('manual')} 
    className={`cursor-pointer ${verificationMode === 'manual' ? 'border-amber-500 border-2' : ''}`}
  >
    <CardContent className="p-6 text-center">
      <svg className="w-12 h-12 mx-auto mb-2 text-amber-500">...</svg>
      <h3 className="font-bold">Manual Listing</h3>
      <p className="text-sm text-slate-400">Not on Google - Admin override required</p>
    </CardContent>
  </Card>
</div>

// Add Google Autocomplete (if verificationMode === 'google')
{verificationMode === 'google' && (
  <GooglePlacesAutocomplete 
    onSelect={async (place) => {
      const res = await fetch('/api/google/places-details', {
        method: 'POST',
        body: JSON.stringify({ placeId: place.place_id })
      })
      const { data } = await res.json()
      setGoogleData(data)
      // Pre-fill form fields
      setValue('businessName', data.name)
      setValue('businessAddress', data.formattedAddress)
      // etc...
    }}
  />
)}

// On submit, pass verification data
const verification: VerificationData = {
  method: verificationMode,
  placeId: googleData?.placeId,
  googleData: googleData
}
await createUserAndProfile(formData, files, referralCode, urlLocation, verification)
```

---

### 2. Action Items Page - Switch to Manual Button
**File**: `components/dashboard/action-items-page.tsx`

```tsx
// Add handler (already has imports + state)
const handleSwitchToManual = async () => {
  if (!profile?.user_id || isSwitchingToManual) return
  setIsSwitchingToManual(true)
  
  try {
    const result = await switchToManualListing(profile.user_id)
    if (result.success) {
      alert(result.message)
      window.location.reload()
    } else {
      alert(result.error || 'Failed to switch')
    }
  } catch (error) {
    alert('Error switching to manual listing')
  } finally {
    setIsSwitchingToManual(false)
  }
}

// In todo item render (find where requiredTodos.map() is)
{item.isVerification && (
  <Button 
    onClick={handleSwitchToManual}
    disabled={isSwitchingToManual}
    variant="outline"
    size="sm"
    className="ml-4 mt-2"
  >
    {isSwitchingToManual ? 'Switching...' : 'Switch to Manual Listing'}
  </Button>
)}
```

---

### 3. Admin CRM - Verification Badges & Manual Override
**File**: `components/admin/business-crm-card.tsx`

```tsx
// Add state at top
const [manualOverrideChecked, setManualOverrideChecked] = useState(false)

// Add badges in header/card
{business.verification_method === 'google' && business.google_place_id && (
  <Badge className="bg-green-600 text-white">
    ✓ Google Verified {business.rating}★
  </Badge>
)}

{business.verification_method === 'manual' && !business.manual_override && (
  <Badge className="bg-amber-600 text-white">
    ⚠️ Needs Manual Override
  </Badge>
)}

// Show Google link
{business.google_place_id && (
  <a 
    href={`https://www.google.com/maps/search/?api=1&query_place_id=${business.google_place_id}`}
    target="_blank"
    className="text-blue-400 hover:underline text-sm"
  >
    View on Google Maps →
  </a>
)}

// In approval modal/section
{business.verification_method === 'manual' && (
  <div className="border border-amber-500 bg-amber-950/30 p-4 rounded mb-4">
    <label className="flex items-center gap-2 cursor-pointer">
      <input 
        type="checkbox" 
        checked={manualOverrideChecked}
        onChange={(e) => setManualOverrideChecked(e.target.checked)}
        className="w-4 h-4"
      />
      <span className="text-amber-200 font-medium">
        Approve as Manual Listing (Manual Override Required)
      </span>
    </label>
    <p className="text-xs text-amber-300/80 mt-2 ml-6">
      This business is not verified on Google and requires explicit manual override.
    </p>
  </div>
)}

// Update approve API call
const response = await fetch('/api/admin/approve-business', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    businessId: business.id,
    action: 'approve',
    adminEmail: adminEmail,
    manualOverride: manualOverrideChecked  // CRITICAL
  })
})

// NFC upsell
{(business.rating < 4.4 || business.verification_method === 'manual') && (
  <Alert className="bg-blue-950 border-blue-700">
    <Info className="h-4 w-4" />
    <AlertTitle>Boost Customer Reviews</AlertTitle>
    <AlertDescription>
      Not at 4.4★ yet? QWIKKER NFC Review Cards help businesses collect more positive reviews.
    </AlertDescription>
  </Alert>
)}
```

---

## 🟡 MEDIUM (Should Do)

### 4. Remove City Dropdowns
**Search**:
```bash
grep -r "bournemouth.*poole.*christchurch" components/ lib/
grep -r "Select.*city" components/
grep -r "hostname\.split" components/ lib/
```

**Replace with**: Server-derived city (read-only display)

---

### 5. Website URL Cleanup
**Search**:
```bash
grep -r "business\.website[^_]" components/
grep -r "business_website" components/
```

**Replace with**: `business.website_url`

**In CRM**:
```tsx
{business.website_url && (
  <a 
    href={business.website_url.startsWith('http') ? business.website_url : `https://${business.website_url}`}
    target="_blank"
  >
    {business.website_url}
  </a>
)}
```

---

## 🟢 LOW (Nice to Have)

### 6. Remove Fake Reviews
**Search**:
```bash
grep -r "Julie's Sports Bar" components/
grep -r "mockReviews" components/
grep -r "Sarah M\." components/
```

Delete any remaining mock data.

---

## ⚙️ CONFIGURATION

### Environment Variable
Add to `.env.local`:
```env
GOOGLE_PLACES_SERVER_KEY=YOUR_API_KEY_HERE
```

### Run Migration
Supabase SQL Editor:
```sql
-- Copy/paste from:
-- supabase/migrations/20250115000000_business_verification_and_uniqueness.sql
```

### Backfill Data
```sql
-- Website URL
UPDATE business_profiles
SET website_url = website
WHERE website_url IS NULL AND website IS NOT NULL;

-- Auto-imported flag
UPDATE business_profiles
SET auto_imported = true
WHERE owner_user_id IS NULL
  AND status = 'unclaimed'
  AND google_place_id IS NOT NULL;
```

---

## ✅ TESTING CHECKLIST

- [ ] Google verified signup works end-to-end
- [ ] Manual listing signup works end-to-end
- [ ] Admin can't approve <4.4★ businesses
- [ ] Admin can't approve manual without checkbox
- [ ] Tagline duplicates blocked
- [ ] Discover shows Google categories
- [ ] No fake reviews visible
- [ ] Switch to manual works
- [ ] Website URLs clickable

---

**Estimated Time**: 8-10 hours total  
**Priority**: Start with #1 (Onboarding), then #2 & #3 (Admin)
