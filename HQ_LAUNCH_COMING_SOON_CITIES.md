# ✅ HQ Admin: Launch Coming Soon Cities

## Problem Solved

**Before:** 15 "coming soon" cities existed in the database, but their franchise owners had NO way to access the admin dashboard because:
- ❌ No auth user created
- ❌ No password generated
- ❌ No invitation email sent

**After:** HQ Admin can now click "🚀 Launch" next to any `coming_soon` city to set up the franchise owner's access.

---

## How It Works

### 1. HQ Admin View (`/hqadmin/franchises`)

The franchises list now shows:
- **Active cities** → Green badge, "View" button only
- **Pending setup cities** → Amber badge, "View" button only
- **Coming soon cities** → Orange badge, **"🚀 Launch"** button + "View" button

### 2. Launch Flow

```
1. HQ Admin clicks "🚀 Launch" next to Calgary
2. Redirects to /hqadmin/franchises/create?city=calgary&subdomain=calgary&launch=true
3. Form is pre-filled with city name and subdomain (locked/disabled)
4. HQ Admin enters:
   - Owner first name
   - Owner last name
   - Owner email
   - Owner phone
5. Clicks "🚀 Launch City"
6. Backend:
   - Updates franchise_crm_configs (coming_soon → pending_setup)
   - Creates Supabase Auth user
   - Generates secure password
   - Sends invitation email
   - Creates city_admins row
7. Franchise owner receives email with login credentials
8. They log in and complete setup wizard
```

---

## UI Changes

### `/hqadmin/franchises` (Franchise List)

**New features:**
- `coming_soon` status badge (orange)
- "🚀 Launch" button for `coming_soon` cities only
- Button disabled while loading ("Loading...")

### `/hqadmin/franchises/create` (Create/Launch Form)

**New features:**
- Detects `?launch=true` query param
- Shows "🚀 Launch City" title (instead of "Create Franchise")
- Pre-fills city name and subdomain from URL params
- Locks city name and subdomain fields (disabled, can't edit)
- Submit button shows "🚀 Launch City" (instead of "Create Franchise")
- Loading state shows "Launching..." (instead of "Creating...")

---

## Backend Flow (Already Implemented)

The POST route (`/api/hq/franchises`) already handles launching `coming_soon` cities:

1. **Detects existing city** with `status='coming_soon'`
2. **Updates** (not inserts) the franchise_crm_configs row
3. **Replaces placeholder data** with real owner info:
   - `owner_name`: 'QWIKKER HQ' → 'John Smith'
   - `owner_email`: 'hello@qwikker.com' → 'john@example.com'
   - `status`: 'coming_soon' → 'pending_setup'
4. **Creates auth user** with secure password
5. **Sends invitation email**
6. **Audit log** records action as `franchise_launched`

---

## Example: Launching Calgary

### Current State (Database)
```sql
SELECT city, status, owner_name, owner_email
FROM franchise_crm_configs
WHERE city = 'calgary';

-- Result:
-- city    | status       | owner_name   | owner_email
-- calgary | coming_soon  | QWIKKER HQ   | hello@qwikker.com
```

### After Launch
```sql
SELECT city, status, owner_name, owner_email
FROM franchise_crm_configs
WHERE city = 'calgary';

-- Result:
-- city    | status         | owner_name  | owner_email
-- calgary | pending_setup  | John Smith  | john@example.com
```

### Auth User Created
```
Email: john@example.com
Password: (auto-generated secure password)
Username: calgary
Role: city_admin
```

### Invitation Email Sent
```
To: john@example.com
Subject: 🎉 Welcome to Qwikker - Your Calgary Franchise is Ready!

Body:
- Welcome message
- Login URL: https://calgary.qwikker.com/admin/login
- Username: calgary
- Password: [secure password]
- Next steps: Complete setup wizard
```

---

## Files Modified

1. **`app/hqadmin/franchises/page.tsx`**
   - Added `launchingCity` state
   - Added `handleLaunchCity()` function
   - Added "🚀 Launch" button for `coming_soon` cities
   - Added `coming_soon` status badge styling

2. **`app/hqadmin/franchises/create/page.tsx`**
   - Added `useSearchParams` hook
   - Added `isLaunching` detection
   - Added `useEffect` to pre-fill form
   - Updated page title (Launch vs Create)
   - Disabled city name and subdomain fields when launching
   - Updated button text (Launch vs Create)

---

## Testing Checklist

✅ **View coming_soon cities in HQ Admin**
- Should show orange "coming soon" badge
- Should show "🚀 Launch" button

✅ **Click "🚀 Launch" on Calgary**
- Should redirect to `/hqadmin/franchises/create?city=calgary&subdomain=calgary&launch=true`
- Form should pre-fill with city=Calgary, subdomain=calgary
- Fields should be disabled (can't edit)

✅ **Fill out owner details**
- First name: John
- Last name: Smith
- Email: john@example.com
- Phone: +1234567890

✅ **Submit form**
- Should show "Launching..." button text
- Should create auth user
- Should send invitation email
- Should update database status to `pending_setup`

✅ **Check email**
- Franchise owner should receive invitation email
- Email should contain login URL, username, password

✅ **Franchise owner logs in**
- Should access Calgary admin dashboard
- Should be prompted to complete setup wizard

---

## What Happens Next?

1. **Franchise owner logs in** with credentials from email
2. **Completes setup wizard:**
   - Enter API keys (OpenAI, Resend, etc.)
   - Configure Atlas (if enabled)
   - Set up GHL webhook
3. **Status changes:** `pending_setup` → `active`
4. **Calgary goes live!**

---

## Related Documentation

- **Launch Flow Implementation:** `HQ_LAUNCH_CITY_FLOW_COMPLETE.md`
- **Coming Soon Migration:** `supabase/migrations/20260125000004_add_coming_soon_cities.sql`
- **API Route:** `app/api/hq/franchises/route.ts`

---

**Status:** ✅ **Ready to Use**

HQ Admin can now launch coming_soon cities and onboard franchise owners!
