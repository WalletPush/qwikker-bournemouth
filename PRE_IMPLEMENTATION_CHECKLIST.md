# Pre-Implementation Safety Checklist

**Date:** January 6, 2026  
**Task:** Free Tier + Claim System Implementation  
**Risk Level:** LOW (everything is reversible)

---

## ✅ Safety Checks

### 1. Git Status
- [x] Current branch: `free-tier-build` ✅
- [x] Main branch commit: `4d81b861` (stable) ✅
- [ ] Create safety tag: `git tag stable-pre-free-tier`

### 2. Database Backup (DO THIS FIRST!)

**Go to Supabase Dashboard:**
1. Open https://supabase.com/dashboard
2. Select your project: Qwikker Bournemouth
3. Go to: Settings → Database → Backups
4. Click: "Create backup"
5. Name it: `pre-free-tier-2026-01-06`
6. Wait for completion
7. [ ] Backup created ✅

**Why:** If anything breaks, you can restore to this exact point.

---

## 🎯 What We're Going To Do

### Phase 1: Database Changes (Week 1)

**What:** Add new columns to existing tables

**Changes:**
- Add `owner_user_id`, `claim_status`, `visibility` to `business_profiles`
- Add API key columns to `franchise_crm_configs`
- Create new `claim_requests` table
- Create system user

**Risk:** 🟢 LOW
- Existing data untouched
- Old code still works
- Can ignore new columns

**Rollback:** Switch to `main` branch (`git checkout main`)

---

### Phase 2: Code Changes (Week 2)

**What:** Build claim flow and import tool

**Changes:**
- New pages: `/claim/[slug]`
- New API routes: `/api/admin/import-businesses`
- Admin UI updates
- AI visibility filter

**Risk:** 🟡 MEDIUM
- New features might have bugs
- Old features should still work

**Rollback:** Switch to `main` branch

---

### Phase 3: Integration (Week 3)

**What:** Connect everything together

**Changes:**
- Dashboard updates
- Feature locks (offers/events)
- UI badges

**Risk:** 🟡 MEDIUM
- Testing needed

**Rollback:** Switch to `main` branch

---

## 🚨 Emergency Procedures

### If Something Breaks:

**Step 1: STOP**
```bash
# Don't make more changes
# Take a breath
```

**Step 2: Switch to Main**
```bash
git checkout main
npm run dev
```

**Step 3: Test Main Branch**
- Does dashboard load? ✅
- Can you see businesses? ✅
- Does AI chat work? ✅

**If main works:** Problem is in new code, we can fix it

**If main doesn't work:** Restore from Supabase backup

---

## 📞 Quick Reference

**Safe State:**
- Branch: `main`
- Commit: `4d81b861`
- Tag: `stable-pre-free-tier` (will create)

**Rollback Commands:**
```bash
# Revert code
git checkout main

# Revert database (if needed)
# Go to Supabase Dashboard → Backups → Restore
```

**Files:**
- Full rollback plan: `ROLLBACK_PLAN.md`
- This checklist: `PRE_IMPLEMENTATION_CHECKLIST.md`
- Implementation review: `FREE_TIER_IMPLEMENTATION_REVIEW.md`

---

## ✅ Final Confirmation

**Before we start, confirm:**

- [ ] I've created a Supabase backup
- [ ] I understand I can switch back to main anytime
- [ ] I understand new database columns won't break old code
- [ ] I've read the rollback plan
- [ ] I'm ready to start

**Once you confirm, we'll begin Phase 1!** 🚀

---

## 🎓 Remember:

1. **Main branch is SAFE** - we're not touching it
2. **Database changes are ADDITIVE** - not deleting anything
3. **Old code ignores new columns** - won't break
4. **Supabase backup is our safety net** - can restore anytime
5. **We're testing on dev first** - not going straight to production

**You're protected! Everything is reversible!** 🛡️

