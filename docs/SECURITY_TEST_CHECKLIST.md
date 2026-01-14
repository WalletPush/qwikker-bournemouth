# Security Test Checklist

## Critical Security Fixes Implemented

✅ All fixes from the brutal security audit have been implemented. This document provides a systematic end-to-end test plan.

---

## Test Environment Setup

Before testing, ensure:
- [ ] Two franchises exist in database (e.g., `bournemouth` and `calgary`)
- [ ] At least one unclaimed business in each city
- [ ] Cloudinary env vars are set (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET`)
- [ ] Resend is configured for at least one franchise
- [ ] Database migration `20260114000000_add_claim_security_constraints.sql` is applied

---

## 1. City Isolation Tests

### Test 1.1: Cross-City Claim Prevention
**Goal:** Verify businesses can only be claimed from their own city subdomain

**Steps:**
1. Import a business into `bournemouth` (note the `business_id`)
2. Open `bournemouth.localhost:3000/claim`
3. Search for and find the business ✅
4. Open `calgary.localhost:3000/claim` in a different browser/incognito
5. Try to submit a claim using the Bournemouth `businessId` directly (via dev tools or API)

**Expected result:**
- ❌ Claim should fail with `403 City isolation error`
- ✅ No auth user should be created
- ✅ Business status should remain `unclaimed`

**SQL verification:**
```sql
-- Should return 0 claim_requests for this business from Calgary city
SELECT * FROM claim_requests WHERE business_id = 'bournemouth_business_id' AND city = 'calgary';
```

---

### Test 1.2: Cross-City Import Prevention
**Goal:** Verify admins can only import to their own city

**Steps:**
1. Log in as admin on `bournemouth.localhost:3000/admin`
2. Navigate to Import Businesses
3. Try to import (intercept request and change city in payload if possible)

**Expected result:**
- ❌ Import should use server-derived city (Bournemouth), ignoring any client-supplied city
- ✅ Businesses should only be inserted with `city = 'bournemouth'`

---

## 2. Race Condition Tests

### Test 2.1: Double Claim Prevention
**Goal:** Verify two users cannot claim the same business simultaneously

**Steps:**
1. Find an unclaimed business
2. Open two browser windows/incognito sessions
3. In both, start the claim flow for the SAME business
4. In both, complete email verification
5. In both, fill out the claim form
6. Submit BOTH forms as quickly as possible (ideally within 1 second)

**Expected result:**
- ✅ First submission succeeds (status 200, user created, claim_requests inserted)
- ❌ Second submission fails with `409 This business is no longer available for claiming`
- ✅ Only ONE auth user created
- ✅ Only ONE claim_requests record exists
- ✅ Business status is `pending_claim` (not duplicated or corrupted)

**SQL verification:**
```sql
-- Should return exactly 1 row
SELECT COUNT(*) FROM claim_requests WHERE business_id = 'test_business_id';

-- Should return exactly 1 row
SELECT COUNT(*) FROM auth.users WHERE email = 'test@example.com';

-- Should be 'pending_claim'
SELECT status FROM business_profiles WHERE id = 'test_business_id';
```

---

### Test 2.2: Database Constraint Protection
**Goal:** Verify partial unique indexes prevent duplicate active claims

**Steps:**
1. Manually try to insert a second pending claim for the same business:
```sql
INSERT INTO claim_requests (business_id, user_id, city, status)
VALUES ('existing_business_id', 'some_user_id', 'bournemouth', 'pending');
```

**Expected result:**
- ❌ Insert should fail with unique constraint violation
- Error message should reference `claim_requests_one_active_per_business`

---

## 3. Claim Flow Rollback Tests

### Test 3.1: Rollback on Cloudinary Failure
**Goal:** Verify proper cleanup if image upload fails

**Steps:**
1. Temporarily break Cloudinary (invalid preset or wrong cloud name in env)
2. Start claim flow and upload a logo
3. Submit the claim

**Expected result:**
- ❌ Claim submission fails with `500 Failed to upload logo`
- ✅ Auth user is deleted (check `auth.users`)
- ✅ Business status is reset to `unclaimed`
- ✅ No claim_requests record exists

---

### Test 3.2: Rollback on Database Error
**Goal:** Verify cleanup if claim_requests insert fails

**Steps:**
1. Temporarily break `claim_requests` table (e.g., drop a required column - DON'T do this in prod!)
2. Submit a valid claim

**Expected result:**
- ❌ Claim fails
- ✅ Auth user is deleted
- ✅ Business status is reset to `unclaimed`

---

## 4. File Upload Security Tests

### Test 4.1: Invalid File Type Rejection
**Goal:** Verify server-side MIME type validation

**Steps:**
1. Rename a `.txt` file to `.jpg`
2. Try to upload it as a logo during claim

**Expected result:**
- ❌ Upload should fail with `400 Logo must be an image file`

---

### Test 4.2: File Size Limit Enforcement
**Goal:** Verify server-side size limits

**Steps:**
1. Create a 6MB image file
2. Try to upload as logo (limit is 5MB)

**Expected result:**
- ❌ Upload should fail with `400 Logo must be less than 5MB`

---

### Test 4.3: Cloudinary Folder Isolation
**Goal:** Verify uploads use server-derived folder paths

**Steps:**
1. Submit a claim with logo upload
2. Check Cloudinary console

**Expected result:**
- ✅ Logo path should be: `qwikker/{city}/businesses/{businessId}/logo/...`
- ✅ Path should match the business's actual city (not client-supplied)

---

## 5. Email Security Tests

### Test 5.1: HTML Injection Prevention
**Goal:** Verify user input is properly escaped in emails

**Steps:**
1. Create a test business with name: `Test <script>alert('XSS')</script> Business`
2. Claim the business with firstName: `<b>Hacker</b>`
3. Admin approves the claim
4. Check the received emails (both claim submitted and approved)

**Expected result:**
- ✅ Emails should render as plain text: `Test &lt;script&gt;alert('XSS')&lt;/script&gt; Business`
- ✅ No HTML tags should execute
- ✅ Email body should be valid HTML (use an HTML validator)

---

### Test 5.2: Email Template Consistency
**Goal:** Verify all emails use the correct Qwikker logo and branding

**Steps:**
1. Submit a claim
2. Admin approves the claim
3. Check both emails

**Expected result:**
- ✅ Both emails show `qwikker-logo-web.svg` (not the old spaced filename)
- ✅ Logo renders correctly (not broken image)
- ✅ Colors use Qwikker green (`#00D083`) sparingly
- ✅ No purple/gradient styling remains

---

## 6. Admin Approve Tests

### Test 6.1: Idempotent Subscription Creation
**Goal:** Verify duplicate subscriptions are prevented

**Steps:**
1. Admin approves a claim (creates free tier subscription)
2. Admin manually runs the same approval again (or clicks approve twice quickly)

**Expected result:**
- ✅ Only ONE active subscription exists for the business
- ✅ No database error

**SQL verification:**
```sql
SELECT COUNT(*) 
FROM business_subscriptions 
WHERE business_id = 'test_business_id' 
  AND status = 'active';
-- Should return 1
```

---

### Test 6.2: Image Deduplication
**Goal:** Verify hero image is not duplicated in business_images array

**Steps:**
1. Claim a business and upload a hero image: `https://example.com/hero.jpg`
2. Admin approves (hero is added to `business_images` array)
3. Check database

**Expected result:**
- ✅ `business_images` contains hero URL exactly once
- ✅ No duplicate entries

**SQL verification:**
```sql
SELECT business_images 
FROM business_profiles 
WHERE id = 'test_business_id';
-- Array should have unique values only
```

---

## 7. Import Tool Tests

### Test 7.1: Admin Authentication Required
**Goal:** Verify imports require admin session

**Steps:**
1. Log out of admin
2. Try to POST to `/api/admin/import-businesses/preview`

**Expected result:**
- ❌ Should return `401 Admin authentication required`

---

### Test 7.2: City Derivation from Hostname
**Goal:** Verify imports use server-derived city, not client payload

**Steps:**
1. Log in as Bournemouth admin (`bournemouth.localhost:3000/admin`)
2. Trigger an import
3. Intercept the API request and add `"city": "calgary"` to the body

**Expected result:**
- ✅ Import should use `bournemouth` (from hostname)
- ✅ All businesses inserted with `city = 'bournemouth'`
- ✅ No Calgary businesses created

---

## 8. Regression Tests

### Test 8.1: Deny Then Re-Claim
**Goal:** Verify partial unique index allows re-claiming after denial

**Steps:**
1. Submit a claim for business A
2. Admin denies the claim
3. A different user submits a new claim for the same business A

**Expected result:**
- ✅ Second claim is allowed (no unique constraint violation)
- ✅ Both claim records exist in database (one denied, one pending)

---

### Test 8.2: Normal Claim Flow (Happy Path)
**Goal:** Verify nothing broke in the normal flow

**Steps:**
1. Find an unclaimed business
2. Submit a claim with valid data
3. Admin approves
4. Log in as the business owner

**Expected result:**
- ✅ User can log in
- ✅ Business dashboard loads
- ✅ Free tier subscription is active
- ✅ Business appears in Discover (not in AI yet)

---

## Test Execution Log

| Test ID | Date | Tester | Result | Notes |
|---------|------|--------|--------|-------|
| 1.1 | | | ⏳ Pending | |
| 1.2 | | | ⏳ Pending | |
| 2.1 | | | ⏳ Pending | |
| 2.2 | | | ⏳ Pending | |
| 3.1 | | | ⏳ Pending | |
| 3.2 | | | ⏳ Pending | |
| 4.1 | | | ⏳ Pending | |
| 4.2 | | | ⏳ Pending | |
| 4.3 | | | ⏳ Pending | |
| 5.1 | | | ⏳ Pending | |
| 5.2 | | | ⏳ Pending | |
| 6.1 | | | ⏳ Pending | |
| 6.2 | | | ⏳ Pending | |
| 7.1 | | | ⏳ Pending | |
| 7.2 | | | ⏳ Pending | |
| 8.1 | | | ⏳ Pending | |
| 8.2 | | | ⏳ Pending | |

---

## Manual SQL Cleanup (if needed)

If tests create orphaned data:

```sql
-- Remove test claim requests
DELETE FROM claim_requests WHERE business_email LIKE '%test%';

-- Reset test business to unclaimed
UPDATE business_profiles 
SET status = 'unclaimed', owner_user_id = NULL 
WHERE business_name LIKE '%Test%';

-- Remove test auth users (use Supabase dashboard)
```

---

## Automated Testing (Future)

Consider adding:
- Jest/Vitest unit tests for `escapeHtml()`
- Playwright E2E tests for race conditions
- API integration tests using Supertest
- Database transaction tests

---

## Sign-off

Once all tests pass:
- [ ] All security tests completed
- [ ] No critical issues found
- [ ] Ready for production deployment

**Tested by:** _________________  
**Date:** _________________  
**Approved by:** _________________  
**Date:** _________________

