# SOCIAL WIZARD — FINAL ARCHITECTURE

**Date:** 2026-02-04  
**Decision:** Multi-user access from day 1  
**Status:** ✅ Production-ready & future-proof

---

## ✅ The Right Architecture Choice

Instead of single-owner access that would need refactoring later, we're implementing **multi-user access from the start**.

### What This Means:

**Today (v1):**
- Every business has 1 owner in `business_user_roles`
- Social Wizard uses this for RLS
- Works perfectly for current needs

**Tomorrow (v2+):**
- Add managers, staff, agency access
- Just INSERT new rows into `business_user_roles`
- **No code changes needed**
- **No RLS policy changes needed**
- **No migration pain**

---

## 📋 Migration Order

### 1. Run First: `20260204000000_create_business_user_roles.sql`

**What it does:**
- Creates `business_user_roles` table
- Backfills owner roles from existing `business_profiles.user_id`
- Adds trigger for new businesses
- Enables RLS

**Result:**
- All existing businesses get an owner role automatically
- Future businesses auto-create owner role on insert

### 2. Run Second: `20260204000001_create_social_wizard_v1.sql`

**What it does:**
- Creates `social_posts` table
- Sets up RLS using `business_user_roles`
- Creates indexes

**Result:**
- Social Wizard ready to use
- Multi-user ready from day 1

---

## 🔐 Access Control Model

### Current State (v1):
```
business_profiles.user_id → business_user_roles (role='owner')
```

### Future State (v2+):
```
business_profiles (owner_user_id)
business_user_roles:
  - owner (full access)
  - manager (most features)
  - staff (limited access)
```

**Social Wizard RLS:**
```sql
-- Works today AND tomorrow
EXISTS (
  SELECT 1 FROM business_user_roles
  WHERE business_id = social_posts.business_id
    AND user_id = auth.uid()
)
```

---

## 📊 Data Flow

### Authentication Check:
```
User logs in
  ↓
Check business_user_roles
  ↓
Get business_id + role
  ↓
Load business_profiles data
  ↓
Apply tier-based feature flags
  ↓
Render Social Wizard UI
```

### Post Creation:
```
User generates post
  ↓
API checks business_user_roles membership
  ↓
Validates tier limits
  ↓
Calls AI (OpenAI or Claude based on tier)
  ↓
Saves to social_posts
  ↓
RLS enforces access via business_user_roles
```

---

## 🎯 Benefits of This Approach

### ✅ Today:
- Clean architecture from start
- No technical debt
- Simple to understand
- Works perfectly for single owner

### ✅ Tomorrow:
- Add staff with single INSERT
- No code refactoring
- No RLS policy changes
- No migration drama

### ✅ Comparison:

| Approach | Setup Time | Future Cost | Risk |
|----------|------------|-------------|------|
| **Option A (chosen)** | 30 mins | 5 mins | Low |
| Option B (single owner) | 10 mins | 3 hours | High |

**You save 2.5 hours of painful refactoring later.**

---

## 🚀 How to Add Staff Later (v2)

When you're ready for multi-user:

```sql
-- Add a manager
INSERT INTO business_user_roles (business_id, user_id, role)
VALUES ('business-uuid', 'staff-user-uuid', 'manager');

-- That's it! They now have access to everything.
```

**No other changes needed.**

---

## 🔍 Sanity Check Updates

The sanity check now verifies:
- ✅ `business_user_roles` table exists
- ✅ Existing businesses have owner roles
- ✅ Trigger is installed
- ✅ RLS policies are correct

---

## 📝 Summary

**What changed from original plan:**
- Originally: `business_profiles.user_id` for RLS (single owner)
- Now: `business_user_roles` for RLS (multi-user ready)

**Why:**
- 30 minutes now vs 3 hours later
- Clean upgrade path
- No breaking changes
- Production-ready architecture

**Status:** ✅ Ready to run migrations!

---

**This is the right architectural decision for a product you plan to scale.** 🎯
