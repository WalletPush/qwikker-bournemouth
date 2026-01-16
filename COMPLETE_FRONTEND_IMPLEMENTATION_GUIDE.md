# QWIKKER Verification System - Complete Frontend Implementation Guide

## 🎯 CONFIRMED: All Backend is SOLID

Your assessment is correct:
- ✅ 4.4★ enforced ONLY for Google verified
- ✅ Manual allowed but requires explicit admin override
- ✅ Action items + submit gating tied to verification
- ✅ Tenant safety emphasized
- ✅ **Google signups STILL require admin approval** (correct pipeline)

**Pipeline Confirmed**:
1. Signup (Google verified OR Manual)
2. Complete profile fields (action items)
3. Submit for review
4. Admin approves (Google: verified + 4.4★ OR Manual: override checkbox)
5. Goes live

---

## 📋 REMAINING IMPLEMENTATION (3 Components)

### 1. ONBOARDING FORM - Add Verification Choice

**File**: `components/simplified-onboarding-form.tsx`

**Strategy**: Add Step 0 (Verification Choice) before existing 5 steps

**Implementation**:

```tsx
// ADD TO IMPORTS (top of file)
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, CheckCircle } from 'lucide-react'

// ADD NEW STATE (after line 101, inside component)
const [verificationMode, setVerificationMode] = useState<'google' | 'manual'>('google')
const [googleData, setGoogleData] = useState<any>(null)
const [showVerificationChoice, setShowVerificationChoice] = useState(true)

// ADD VERIFICATION CHOICE STEP (insert before existing steps array around line 43)
const verificationStep = {
  id: 0,
  title: 'How would you like to verify your business?',
  subtitle: 'Choose your verification method',
  icon: (
    <svg className="w-16 h-16 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

// MODIFY STEPS ARRAY (line 43)
const allSteps = [verificationStep, ...steps]  // Prepend verification step

// ADD GOOGLE PLACES HANDLER
const handleGooglePlaceSelect = async (placeId: string) => {
  try {
    const response = await fetch('/api/google/places-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId })
    })
    
    const { data, success } = await response.json()
    
    if (!success || !data) {
      alert('Failed to fetch place details. Please try again.')
      return
    }
    
    setGoogleData(data)
    
    // Pre-fill form fields
    form.setValue('businessName', data.name || '')
    form.setValue('businessAddress', data.formattedAddress || '')
    form.setValue('town', data.normalizedTown || '')
    form.setValue('postcode', data.postcode || '')
    
    // Auto-advance to next step
    setShowVerificationChoice(false)
    setCurrentStep(1)
    
  } catch (error) {
    console.error('Error fetching place details:', error)
    alert('Error fetching business details. Please try again.')
  }
}

// MODIFY ONSUBMIT (around line 150)
// After line 176, before createUserAndProfile call, add:

const verification = verificationMode === 'google' && googleData ? {
  method: 'google' as const,
  placeId: googleData.placeId,
  googleData: {
    name: googleData.name,
    formattedAddress: googleData.formattedAddress,
    latitude: googleData.latitude,
    longitude: googleData.longitude,
    website: googleData.website,
    types: googleData.types,
    rating: googleData.rating,
    userRatingsTotal: googleData.userRatingsTotal,
    googlePrimaryType: googleData.googlePrimaryType,
    normalizedTown: googleData.normalizedTown,
    postcode: googleData.postcode
  }
} : {
  method: 'manual' as const
}

// THEN UPDATE createUserAndProfile call (line 181):
const result = await createUserAndProfile(fullFormData, files, referralCode, urlLocation || undefined, verification)

// ADD VERIFICATION CHOICE UI (in the render, around line 250)
// ADD THIS BEFORE THE EXISTING FORM STEPS:

{showVerificationChoice && currentStep === 0 && (
  <div className="space-y-8">
    <div className="text-center mb-8">
      <div className="flex justify-center mb-4">
        {verificationStep.icon}
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">{verificationStep.title}</h2>
      <p className="text-slate-400">{verificationStep.subtitle}</p>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      {/* Google Verification Card */}
      <Card 
        onClick={() => setVerificationMode('google')}
        className={`cursor-pointer transition-all ${
          verificationMode === 'google' 
            ? 'border-2 border-green-500 bg-green-950/20' 
            : 'border-slate-700 hover:border-slate-600'
        }`}
      >
        <CardContent className="p-8 text-center">
          <CheckCircle className={`w-16 h-16 mx-auto mb-4 ${
            verificationMode === 'google' ? 'text-green-500' : 'text-slate-500'
          }`} />
          <h3 className="text-xl font-bold text-white mb-3">
            ✓ Verify on Google
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Recommended - Fast approval process
          </p>
          <ul className="text-xs text-slate-500 space-y-2 text-left">
            <li>• Auto-fills business details</li>
            <li>• Shows real ratings & reviews</li>
            <li>• Faster admin approval</li>
            <li>• Best for established businesses</li>
          </ul>
        </CardContent>
      </Card>

      {/* Manual Listing Card */}
      <Card 
        onClick={() => setVerificationMode('manual')}
        className={`cursor-pointer transition-all ${
          verificationMode === 'manual' 
            ? 'border-2 border-amber-500 bg-amber-950/20' 
            : 'border-slate-700 hover:border-slate-600'
        }`}
      >
        <CardContent className="p-8 text-center">
          <AlertTriangle className={`w-16 h-16 mx-auto mb-4 ${
            verificationMode === 'manual' ? 'text-amber-500' : 'text-slate-500'
          }`} />
          <h3 className="text-xl font-bold text-white mb-3">
            📝 Manual Listing
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Not on Google Maps yet
          </p>
          <ul className="text-xs text-slate-500 space-y-2 text-left">
            <li>• Enter details manually</li>
            <li>• Requires admin manual override</li>
            <li>• Good for new businesses</li>
            <li>• May take longer to approve</li>
          </ul>
        </CardContent>
      </Card>
    </div>

    {/* Google Places Autocomplete (if Google mode) */}
    {verificationMode === 'google' && (
      <div className="space-y-4">
        <Alert className="bg-blue-950 border-blue-700">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Search for Your Business on Google</AlertTitle>
          <AlertDescription>
            Start typing your business name. We'll auto-fill your details from Google.
          </AlertDescription>
        </Alert>
        
        {/* TODO: Add Google Places Autocomplete component here */}
        {/* For now, show a placeholder input */}
        <div>
          <Label htmlFor="google-search" className="text-white">Search Google Places</Label>
          <Input
            id="google-search"
            placeholder="Type your business name..."
            className="bg-slate-800 border-slate-700 text-white"
            onChange={(e) => {
              // TODO: Implement Google Places Autocomplete
              // For now, show instructions
            }}
          />
          <p className="text-xs text-slate-500 mt-2">
            📌 Google Places Autocomplete integration coming soon. For now, choose Manual Listing below.
          </p>
        </div>
      </div>
    )}

    {/* Manual Warning */}
    {verificationMode === 'manual' && (
      <Alert className="bg-amber-950 border-amber-700">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Manual Listing Notice</AlertTitle>
        <AlertDescription>
          Manual listings require admin manual override to go live. This may take longer than Google-verified listings.
          {' '}
          <strong>Consider using NFC Review Cards to boost your Google rating to 4.4★+</strong>
        </AlertDescription>
      </Alert>
    )}

    {/* Continue Button */}
    <div className="flex justify-end gap-4">
      <Button
        onClick={() => {
          if (verificationMode === 'google' && !googleData) {
            alert('Please search and select your business from Google Places, or choose Manual Listing.')
            return
          }
          setShowVerificationChoice(false)
          setCurrentStep(1)
        }}
        size="lg"
        className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-white"
      >
        Continue
      </Button>
    </div>
  </div>
)}

{/* EXISTING FORM STEPS */}
{!showVerificationChoice && (
  // ... existing step rendering code ...
)}
```

**Notes**:
- Google Places Autocomplete requires the `@react-google-maps/api` package OR custom implementation
- For MVP, you can deploy with Manual only and add Google autocomplete later
- The handler is ready, just need to connect the autocomplete component

---

### 2. ADMIN CRM - Verification Badges & Manual Override

**File**: `components/admin/business-crm-card.tsx`

**Find the business card header** (likely around line 200-300) and add badges:

```tsx
// ADD TO IMPORTS
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Info, CheckCircle, AlertTriangle } from 'lucide-react'

// ADD STATE (near top of component)
const [manualOverrideChecked, setManualOverrideChecked] = useState(false)

// ADD BADGES IN HEADER (after business name, before actions)
<div className="flex gap-2 mt-2">
  {business.verification_method === 'google' && business.google_place_id && (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
      <CheckCircle className="w-3 h-3" />
      Google Verified {business.rating}★
    </span>
  )}
  
  {business.verification_method === 'manual' && !business.manual_override && (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-600 text-white">
      <AlertTriangle className="w-3 h-3" />
      Needs Manual Override
    </span>
  )}
  
  {business.verification_method === 'manual' && business.manual_override && (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
      <CheckCircle className="w-3 h-3" />
      Manual Override Approved
    </span>
  )}
</div>

// ADD GOOGLE MAPS LINK (in business info section)
{business.google_place_id && (
  <div className="flex items-center gap-2 text-sm">
    <span className="text-slate-400">Google:</span>
    <a 
      href={`https://www.google.com/maps/search/?api=1&query_place_id=${business.google_place_id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:underline flex items-center gap-1"
    >
      View on Google Maps
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  </div>
)}

// ADD MANUAL OVERRIDE CHECKBOX (in approval section, before approve button)
{business.verification_method === 'manual' && business.status === 'pending_review' && (
  <div className="border-2 border-amber-500 bg-amber-950/30 rounded-lg p-4 mb-4">
    <label className="flex items-start gap-3 cursor-pointer">
      <input 
        type="checkbox" 
        checked={manualOverrideChecked}
        onChange={(e) => setManualOverrideChecked(e.target.checked)}
        className="w-5 h-5 mt-0.5 text-amber-500 border-amber-600 rounded focus:ring-amber-500"
      />
      <div>
        <span className="text-amber-200 font-medium block">
          Approve as Manual Listing (Manual Override Required)
        </span>
        <p className="text-xs text-amber-300/80 mt-1">
          This business is not verified on Google and requires explicit manual override to go live.
        </p>
      </div>
    </label>
  </div>
)}

// UPDATE APPROVE API CALL (in handleApprove or similar function)
const response = await fetch('/api/admin/approve-business', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    businessId: business.id,
    action: 'approve',
    adminEmail: adminEmail,
    manualOverride: manualOverrideChecked  // ← ADD THIS
  })
})

// ADD NFC UPSELL (after approval section or in sidebar)
{(business.rating < 4.4 || business.verification_method === 'manual') && (
  <Alert className="bg-blue-950 border-blue-700">
    <Info className="h-4 w-4" />
    <AlertTitle>Boost Customer Reviews</AlertTitle>
    <AlertDescription>
      {business.rating < 4.4 
        ? `Current rating: ${business.rating}★. Need 4.4★+ for auto-approval.`
        : 'Manual listings benefit from customer reviews.'
      }
      {' '}QWIKKER NFC Review Cards help businesses collect more positive Google reviews.
      <Button variant="link" className="p-0 h-auto text-blue-400 ml-1">
        Learn More →
      </Button>
    </AlertDescription>
  </Alert>
)}
```

**Find the approval handler** and ensure it shows error if blocked:

```tsx
const handleApprove = async (action: 'approve' | 'reject') => {
  if (action === 'approve') {
    // Check if manual override needed
    if (business.verification_method === 'manual' && !manualOverrideChecked) {
      alert('Manual listings require the manual override checkbox to be ticked.')
      return
    }
  }
  
  // ... existing API call logic with manualOverride param ...
  
  // Handle errors from API
  if (!response.ok) {
    const errorData = await response.json()
    alert(errorData.error || 'Failed to approve business')
    return
  }
}
```

---

### 3. MINOR CLEANUPS

#### A. Remove City Dropdowns

**Search for**:
```bash
grep -r "bournemouth.*poole.*christchurch" components/
grep -r "Select.*city" components/
```

**Replace with**: Read-only city display from server props

#### B. Website URL Standardization

**Search for**:
```bash
grep -r "business\.website[^_]" components/
grep -r "business_website" components/
```

**Replace with**: `business.website_url`

**In CRM card**, render clickable:
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

### Test 1: Manual Signup Flow
1. Go to onboarding
2. Choose "Manual Listing"
3. See amber warning
4. Fill form manually
5. Complete profile
6. Submit for review
7. Admin sees "Needs Manual Override" badge
8. Admin tries approve WITHOUT checkbox → BLOCKED
9. Admin ticks checkbox → APPROVED
10. Business goes live

### Test 2: Google Signup Flow (when autocomplete ready)
1. Go to onboarding
2. Choose "Verify on Google"
3. Search for business
4. Form pre-fills
5. Complete signup
6. Check DB: `verification_method='google'`, `google_place_id` set
7. Complete profile
8. Submit for review
9. Admin sees "Google Verified X.X★"
10. If < 4.4★ → BLOCKED with error
11. If >= 4.4★ → APPROVED
12. Business goes live

---

## 📊 TIME ESTIMATES

| Task | Time | Priority |
|------|------|----------|
| Onboarding form (manual mode) | 1h | HIGH |
| Admin CRM badges | 1h | HIGH |
| Admin CRM manual override | 1h | HIGH |
| NFC upsell copy | 30min | MEDIUM |
| Remove city dropdowns | 1h | MEDIUM |
| Website URL cleanup | 1h | MEDIUM |
| Google Places autocomplete | 2-3h | LOW (defer) |
| End-to-end testing | 2h | HIGH |
| **TOTAL (MVP)** | **7.5h** | - |
| **With Google autocomplete** | **10h** | - |

---

## 🚀 RECOMMENDED DEPLOYMENT STRATEGY

### Phase 1: Manual Mode Only (7.5 hours)
1. ✅ Implement manual verification choice
2. ✅ Implement admin CRM badges + override
3. ✅ Test manual signup → approval flow
4. ✅ Deploy to production
5. ✅ Start onboarding businesses manually

**Benefits**:
- Gets system live faster
- Tests all backend logic
- Validates manual override process
- Businesses can start signing up

### Phase 2: Add Google Autocomplete (2-3 hours)
1. Add Google Places Autocomplete component
2. Connect to existing handlers
3. Test Google signup → approval flow
4. Deploy update

**Benefits**:
- Backend already ready
- Just UI enhancement
- No risk to existing manual flow

---

## ✅ PRE-DEPLOYMENT CHECKLIST

- [ ] Run migration in Supabase
- [ ] Set `GOOGLE_PLACES_SERVER_KEY` in env
- [ ] Run backfill SQL scripts (website_url, auto_imported)
- [ ] Test manual signup flow end-to-end
- [ ] Test admin approval with manual override
- [ ] Test admin approval blocking (no checkbox)
- [ ] Verify no city dropdowns work
- [ ] Test tagline duplicate blocking
- [ ] Check all console logs for errors
- [ ] Verify NFC upsell shows for <4.4★

---

## 📞 SUPPORT

If issues:
1. Check migration ran: `SELECT verification_method FROM business_profiles LIMIT 1`
2. Check API key: Test `/api/google/places-details` endpoint
3. Check admin approval: Should block without override checkbox
4. Check logs: Browser console + server logs

---

**Status**: READY TO IMPLEMENT  
**Estimated Completion**: 7.5 hours (MVP) or 10 hours (with Google autocomplete)  
**Next Step**: Start with onboarding form manual mode
