# 🧹 SAFE CLEANUP STRATEGY

## **The Problem:**
- Old migrations mixed with new ones
- Unclear which tables/columns are actually in use
- Risk of breaking production by removing "dead" code that's actually vital
- Hard to understand the true system state

---

## **The Solution: Truth-First Approach**

### **Phase 1: Establish Source of Truth (TODAY)**

1. **Run `scripts/production-snapshot.sql` in Supabase SQL editor**
   - This tells us EXACTLY what exists in production
   - No guessing, no assumptions

2. **Save the output to a file: `PRODUCTION_SNAPSHOT_[DATE].md`**
   - This becomes our "source of truth"
   - Every decision references this

3. **Create a "Working Schema" document**
   - Only includes tables/columns that ACTUALLY exist
   - Ignore all old migrations and documentation

---

### **Phase 2: Identify What's Actually Used (NEXT SESSION)**

Using the snapshot, we can safely:

1. **Compare code to production:**
   - If code references `business_locations` but snapshot shows it doesn't exist → dead code
   - If code references `business_profiles.city` and snapshot shows it exists → keep it

2. **Mark files as:**
   - ✅ **ACTIVE** - references real production tables/columns
   - 🗑️ **DEAD** - references non-existent tables
   - ❓ **UNCLEAR** - need to investigate

3. **Never delete anything yet** - just mark it

---

### **Phase 3: Safe Removal (LATER)**

Only after we're confident:

1. Move dead files to `_archive/` folder (don't delete)
2. Add comments: `// ARCHIVED [DATE] - table doesn't exist in prod`
3. Keep for 30 days, then delete

---

## **Immediate Action Plan:**

### **What You Should Do RIGHT NOW:**

1. Open Supabase SQL Editor
2. Paste `scripts/production-snapshot.sql`
3. Run it
4. Copy the results
5. Paste them in a reply to me

### **What I'll Do:**

1. Create a clean `PRODUCTION_SCHEMA.md` (only real tables)
2. Identify which files are safe to ignore
3. Create a "trusted" list of functions/tables
4. Update my understanding of your system

---

## **Why This Works:**

✅ **Zero risk** - we're only *observing*, not changing anything  
✅ **Creates clarity** - we'll know exactly what's real  
✅ **Guides all future work** - every decision references production truth  
✅ **Documents the system** - helps me (and future developers) understand it  

---

## **Example: How This Helps**

**Before (confusing):**
```
Me: "Let me check business_category column..."
*reads old migration*
*column was renamed 3 migrations later*
*gives you wrong advice*
```

**After (clear):**
```
Me: "Let me check PRODUCTION_SCHEMA.md..."
*sees system_category and display_category actually exist*
*sees business_category is a temporary trigger sync*
*gives you correct advice*
```

---

## **The Bottom Line:**

Don't clean up yet. Let's build a **map of reality** first.

Once we know what's real, cleanup becomes safe and obvious.

**Ready to run the snapshot?** 🎯

