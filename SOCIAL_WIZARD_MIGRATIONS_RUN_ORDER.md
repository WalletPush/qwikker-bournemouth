# SOCIAL WIZARD — MIGRATION RUN ORDER

**IMPORTANT:** Run these migrations in order!

---

## 🎯 Step 1: Create `business_user_roles` Table

**File:** `supabase/migrations/20260204000000_create_business_user_roles.sql`

**What it does:**
- Creates multi-user access table
- Backfills owner roles from existing businesses
- Adds auto-create trigger for new businesses
- Enables RLS

**Run in Supabase SQL Editor:**
1. Copy entire file
2. Paste in SQL Editor
3. Click "Run"

**Expected output:**
```
NOTICE: Backfilled X owner roles from business_profiles
NOTICE: business_user_roles table created successfully
NOTICE: Existing businesses backfilled with owner roles
NOTICE: Trigger installed for new businesses
```

**Verify it worked:**
```sql
-- Should show all your businesses with role='owner'
SELECT 
  bur.business_id,
  bp.business_name,
  bur.role,
  au.email
FROM business_user_roles bur
JOIN business_profiles bp ON bp.id = bur.business_id
JOIN auth.users au ON au.id = bur.user_id
ORDER BY bp.business_name;
```

---

## 🎯 Step 2: Create Social Wizard Tables

**File:** `supabase/migrations/20260204000001_create_social_wizard_v1.sql`

**What it does:**
- Verifies `business_user_roles` exists (will fail if step 1 not run)
- Creates `social_posts` table
- Sets up RLS using `business_user_roles`
- Creates indexes

**Run in Supabase SQL Editor:**
1. Copy entire file
2. Paste in SQL Editor
3. Click "Run"

**Expected output:**
```
NOTICE: Social Wizard v1 migration complete. social_posts table created with RLS using business_user_roles.
```

**Verify it worked:**
```sql
-- Should return 0 (table is empty but queryable)
SELECT COUNT(*) FROM social_posts;

-- Should show the RLS policy
SELECT policyname, tablename 
FROM pg_policies 
WHERE tablename = 'social_posts';
```

---

## ✅ After Both Migrations:

### Test Access:
Navigate to:
```
http://localhost:3000/business/social-wizard
```

**What you should see based on your tier:**
- **free/starter** → Locked upgrade screen
- **trial/featured** → Limited Social Wizard (basic generation)
- **spotlight** → Full Social Wizard (campaigns, secret menu)

---

## 🆘 Troubleshooting:

### If Migration 2 Fails with "business_user_roles does not exist":
→ You didn't run migration 1 first. Run it!

### If You See "No Business Found":
Check if you have a role:
```sql
SELECT * FROM business_user_roles 
WHERE user_id = auth.uid();
```

If empty, backfill didn't work. Manually insert:
```sql
INSERT INTO business_user_roles (business_id, user_id, role)
SELECT id, user_id, 'owner'
FROM business_profiles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

### If RLS Blocks Everything:
Double-check policies exist:
```sql
SELECT * FROM pg_policies WHERE tablename IN ('business_user_roles', 'social_posts');
```

---

## 🎉 Success Checklist:

- [ ] Migration 1 run successfully
- [ ] `business_user_roles` table exists
- [ ] Your business has an owner role in `business_user_roles`
- [ ] Migration 2 run successfully
- [ ] `social_posts` table exists
- [ ] RLS policies created
- [ ] You can navigate to `/business/social-wizard`
- [ ] UI loads (locked or unlocked based on tier)

---

**Ready to run? Start with migration 1!** 🚀
