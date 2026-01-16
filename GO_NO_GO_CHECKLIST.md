# QWIKKER Verification System - Go/No-Go Checklist

## ✅ 1. Single Function Definition
**Check**: `createUserAndProfile` appears only once (no double function definition)

**Result**: ✅ PASS
- File: `lib/actions/signup-actions.ts` line 67
- Only ONE `export async function createUserAndProfile(...)` declaration
- Signature includes `verification?: VerificationData` parameter

---

## ✅ 2. No Hardcoded Town Mapping
**Check**: `mapBusinessTown` no longer returns 'other'

**Result**: ✅ PASS
- Replaced with `normalizeTownFn()` (line 188)
- Logic: `town.trim().toLowerCase().replace(/\s+/g, ' ')`
- Returns raw normalized string, NOT enum
- Usage (line 234): `business_town: isGoogleVerified ? (verification.googleData!.normalizedTown || normalizeTownFn(formData.town)) : normalizeTownFn(formData.town)`

---

## ✅ 3. Correct Supabase Query Order
**Check**: All `supabase.from().select()` chains are in correct order

**Result**: ✅ PASS
- File: `lib/actions/business-actions.ts` lines 686-690
- Order:
  1. `supabaseAdmin`
  2. `.from('business_profiles')`
  3. `.select('user_id, status, ..., verification_method, google_place_id')`
  4. `.eq('user_id', userId)`
  5. `.single()`
- Correct Supabase query chain structure

---

## ✅ 4. Verification Method Column Written
**Check**: `verification_method` column exists after migration and is written during signup

**Result**: ✅ PASS
- Migration: `supabase/migrations/20260115000000_business_verification_and_uniqueness.sql` line 9
- Column: `verification_method text NOT NULL DEFAULT 'google'`
- Signup: `lib/actions/signup-actions.ts` line 256
  - Sets: `verification_method: verificationMethod` (either 'google' or 'manual')

---

## ✅ 5. Google Signup Writes Complete Data
**Check**: Google signup writes `google_place_id` + `rating` + `review_count` + `verified_at`

**Result**: ✅ PASS
- File: `lib/actions/signup-actions.ts` lines 257-263
- Logic: `if (isGoogleVerified)` checks `verification?.method === 'google' && verification?.googleData`
- Writes:
  - `google_place_id: verification.placeId` (line 257)
  - `google_verified_at: new Date().toISOString()` (line 258)
  - `rating: verification.googleData!.rating` (line 259)
  - `review_count: verification.googleData!.userRatingsTotal` (line 260)
  - `google_types: verification.googleData!.types` (line 261)
  - `google_primary_type: verification.googleData!.googlePrimaryType` (line 262)

---

## ✅ 6. Manual Signup Writes Correct Fields
**Check**: Manual signup writes `verification_method='manual'` and `manual_override=false`

**Result**: ✅ PASS
- File: `lib/actions/signup-actions.ts` lines 256, 263
- When `verification.method === 'manual'` or no verification provided:
  - `verification_method: verificationMethod` → defaults to 'manual' if not Google
  - `google_place_id: null` (line 257)
  - `rating: 0` (line 259 - fallback when not Google verified)
  - `review_count: 0` (line 260 - fallback)
  - `manual_override: false` (line 263)

---

## ✅ 7. Submit-for-Review Verification Gate
**Check**: Submit-for-review blocks ONLY when `method=google` AND missing `place_id`

**Result**: ✅ PASS
- File: `lib/actions/business-actions.ts` lines 717-723
- Logic:
  ```typescript
  if (existingProfile?.verification_method === 'google' && !existingProfile?.google_place_id) {
    return { 
      success: false, 
      error: 'Verify your business on Google or switch to Manual Listing before submitting for review.' 
    }
  }
  ```
- ONLY blocks Google mode without place_id
- Manual mode allowed to submit

---

## ✅ 8. Admin Approve Enforcement
**Check**: Admin approve blocks correctly for both Google and Manual

### 8a. Google Listings ✅
**Result**: ✅ PASS
- File: `lib/utils/verification-utils.ts` lines 29-41
- Logic (Google):
  1. Missing `google_place_id` → BLOCKED
  2. `rating < 4.4` → BLOCKED with message:  
     `"QWIKKER requires 4.4+ Google rating. This business has X.X★. Reject or request improvements."`
  3. Both present AND rating >= 4.4 → APPROVED

### 8b. Manual Listings ✅
**Result**: ✅ PASS
- File: `lib/utils/verification-utils.ts` lines 44-52
- Logic (Manual):
  1. `manualOverrideRequested === false` → BLOCKED  
     Reason: `"Manual listings require explicit manual override checkbox"`
  2. `manualOverrideRequested === true` → APPROVED
  3. **Rating is IGNORED** (no rating check for manual)

### 8c. API Implementation ✅
**Result**: ✅ PASS
- File: `app/api/admin/approve-business/route.ts` lines 42-72
- Calls `canApprove(profile, manualOverride === true)`
- Blocks approval if `!approvalCheck.canApprove`
- Returns clear error message: `approvalCheck.reason`

---

## 🎯 FINAL VERDICT: ✅ GO

**All 8 checks PASSED**

### Summary
- ✅ No duplicate function definitions
- ✅ Multi-tenant safe (no hardcoded town enums)
- ✅ Correct Supabase query structure
- ✅ Verification fields written correctly
- ✅ Google data populated on Google signup
- ✅ Manual mode correctly configured
- ✅ Submit gating works (Google only)
- ✅ 4.4★ enforcement for Google, ignored for Manual

### Remaining Work (Frontend UI Only)
- Onboarding form: Add Google vs Manual choice
- Action Items: Add "Switch to Manual" button
- Admin CRM: Add verification badges + manual override checkbox

**Core backend system is SOLID and ready for testing.**

---

## 🧪 Next Steps

1. ✅ **Run migration** in Supabase
2. ✅ **Set `GOOGLE_PLACES_SERVER_KEY`** in env
3. ✅ **Run backfills** (website_url, auto_imported)
4. 🔨 **Implement frontend UI** (see REMAINING_WORK_QUICK_REF.md)
5. 🧪 **Test end-to-end** (Google & Manual paths)

---

**Date**: January 15, 2026  
**Status**: CORE BACKEND COMPLETE - APPROVED FOR IMPLEMENTATION ✅
