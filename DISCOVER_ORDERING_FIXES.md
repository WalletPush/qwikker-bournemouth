# Discover Ordering - Sanity Check Fixes Applied

**Date:** January 11, 2026  
**Status:** All gotchas addressed

---

## ✅ **What Was Fixed**

### **1. Rating-First Ordering (Confirmed Good)**

**Current implementation:**
```typescript
.order('rating', { ascending: false, nullsFirst: false })
.order('review_count', { ascending: false, nullsFirst: false })
.order('created_at', { ascending: false })
```

**Status:** ✅ Perfect - No changes needed

**What this does:**
- NULL ratings appear LAST (correct)
- Highest quality businesses show first
- Most reviewed businesses prioritized within same rating
- Recency as tiebreaker

---

### **2. Phase 3 Migration Location (CRITICAL FIX)**

**Problem identified:**
```
❌ File was in: supabase/migrations/FUTURE_add_discover_ordering_controls.sql
Risk: Supabase CLI might auto-run it if it detects it as a migration
```

**Fixed:**
```
✅ Moved to: docs/sql/add_discover_ordering_controls.sql
Safety: Not in migrations/ folder, won't auto-run
Ready: Can manually run when needed
```

---

### **3. display_order Default Value (CRITICAL FIX)**

**Problem identified:**
```
❌ BAD: display_order INTEGER DEFAULT 0
Result: Every business gets 0, so "ORDER BY display_order ASC" treats all as manually ordered
Effect: Manual pinning becomes useless
```

**Fixed:**
```sql
✅ GOOD: display_order INTEGER DEFAULT NULL

ORDER BY display_order ASC NULLS LAST

Result:
- NULL businesses (99%) use algorithmic ordering
- Only manually pinned businesses (1%) have a value
- Manual pinning actually works
```

**Example behavior:**
```
Business A: display_order = 1  → Shows position 1
Business B: display_order = 2  → Shows position 2
Business C: display_order = NULL  → Uses rating ordering
Business D: display_order = NULL  → Uses rating ordering
```

---

### **4. Performance Indexes (Documented for Future)**

**Current state (< 100 businesses):**
```
✅ No indexes needed
✅ Query is instant
```

**Future state (100+ businesses):**
```
⚠️ Add composite index when volume increases
📊 Monitor with EXPLAIN ANALYZE
🚨 If "Seq Scan" appears → add index
```

**Index to add later:**
```sql
CREATE INDEX idx_business_profiles_discover_order 
ON business_profiles(
  city, 
  status, 
  rating DESC, 
  review_count DESC, 
  created_at DESC
)
WHERE status IN ('approved', 'unclaimed', 'claimed_free');
```

---

### **5. Filter Cards Strategy (Confirmed Good)**

**Current implementation:**
```
Qwikker Picks → Spotlight only
Featured → Spotlight + Featured
Recommended → Starter only
All Places → Blended (rating-first)
```

**Status:** ✅ Perfect - No changes needed

**Why this works:**
- Users feel in control (explicit filter selection)
- Businesses see clear value ladder
- Default "All Places" is fair/quality-focused
- Paid tiers get guaranteed filter visibility

---

## 📋 **Files Changed/Created**

1. ✅ `app/user/discover/page.tsx` - Rating-first ordering (already done)
2. ✅ `docs/sql/add_discover_ordering_controls.sql` - Moved from migrations/, fixed NULL defaults
3. ✅ `DISCOVER_ORDERING_STRATEGY.md` - Updated with gotchas section + performance notes
4. ✅ `DISCOVER_ORDERING_FIXES.md` - This file (summary of fixes)
5. ❌ `supabase/migrations/FUTURE_add_discover_ordering_controls.sql` - DELETED (moved to docs/sql/)

---

## 🚨 **Critical Gotchas Addressed**

| Gotcha | Status | Impact if Not Fixed |
|--------|--------|---------------------|
| NULL vs 0 for display_order | ✅ Fixed | Manual pinning broken |
| Migration auto-run risk | ✅ Fixed | Phase 3 runs prematurely |
| NULL ratings first | ✅ Already correct | Low-quality shows first |
| Performance indexes | 📝 Documented | Slow queries at scale |
| Filter strategy | ✅ Already correct | Pay-to-win feel |

---

## 🎯 **What to Do Next**

### **Immediate (Nothing Required)**
```
✅ Phase 1 is complete and production-ready
✅ No code changes needed
✅ Deploy when ready
```

### **When You Have 100+ Businesses**
```
1. Monitor query performance
2. Run EXPLAIN ANALYZE on discover query
3. If slow, add composite index
4. Consider Phase 2 tier-based blending
```

### **When You Need Manual Control**
```
1. Run docs/sql/add_discover_ordering_controls.sql
2. Add is_featured and display_order columns
3. Update discover query to use new columns
4. Build admin UI for pinning businesses
```

---

## 💡 **Key Insights**

### **NULL Defaults Are Critical**
```
General rule: For "opt-in" features, always default to NULL

Examples:
✅ display_order NULL = not manually ordered
✅ discount_percentage NULL = no discount
✅ featured_until NULL = not featured

❌ display_order 0 = everyone is "manually ordered"
❌ discount_percentage 0 = everyone has a discount (of 0%)
```

### **Migration Placement Matters**
```
supabase/migrations/ = Auto-run by CLI
docs/sql/ = Safe storage for future migrations
_drafts/ = Also safe
```

### **Performance Scales with Volume**
```
< 100 businesses = No indexes needed
100-500 businesses = Add composite indexes
1000+ businesses = Consider materialized views
```

---

## ✅ **Validation Checklist**

Before deploying:

- [x] Rating-first ordering implemented
- [x] NULL ratings appear last (nullsFirst: false)
- [x] Phase 3 migration moved to safe location
- [x] display_order defaults to NULL (not 0)
- [x] Performance notes documented
- [x] Filter cards strategy confirmed good
- [x] No linter errors
- [x] Documentation updated

---

**Status:** All sanity checks addressed. Production-ready. 🎉

