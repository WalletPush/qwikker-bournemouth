# 🚨 PRIORITY FIX LIST: Critical business_category Reads

## Current Status (from tracking script):

```
Property reads (.business_category):     90
Token references (total):                140
Supabase SELECT queries:                 3
Type definitions:                        51
```

**✅ Fixed:** 8 critical validation checks  
**⚠️ Remaining:** 6 critical files (AI/embeddings/analytics)  

---

## Sprint 1: Fix Critical AI/Embeddings (HIGH PRIORITY) 🔴

These files index business data into the knowledge base for AI chat.  
If they use `business_category`, new businesses won't be discoverable by AI.

### **Files to Fix:**

1. **`lib/ai/embeddings.ts`** (3 references)
   - Line 80: `Category: ${business.business_category}`
   - Line 156: `business_category: business.business_category`
   - Line 170: `business.business_category?.toLowerCase()`
   - **Fix:** Use `business.display_category` for user-facing, `business.system_category` for tags

2. **`lib/ai/hybrid-chat.ts`** (1 reference)
   - Line 43: `business_category?: string` (type definition)
   - **Fix:** Add `system_category` and `display_category` to interface

3. **`lib/ai/chat.ts`** (3 references)
   - Line 342: `business_category?: string` (type definition)
   - Line 976: `business_category,` (SELECT query)
   - Line 1497: `business.business_category ? \`Category: ${business.business_category}\` : ''`
   - **Fix:** Update type, SELECT query, and display to use new fields

4. **`lib/actions/knowledge-base-actions.ts`** (3 references)
   - Line 61: `business_category: business.business_category`
   - Line 76: `business.business_category?.toLowerCase()`
   - Line 122: `sections.push(\`Category: ${business.business_category}\`)`
   - **Fix:** Use `display_category` for display, `system_category` for tags

---

## Sprint 2: Fix Analytics (HIGH PRIORITY) 🔴

Analytics queries need stable category filtering.

### **Files to Fix:**

5. **`app/api/analytics/comprehensive/route.ts`** (2 references)
   - Line 212: `business_profiles!inner(business_category)`
   - Line 218: `const category = visit.business_profiles?.business_category`
   - **Fix:** Query `system_category` for stable filtering

---

## Sprint 3: Fix File Actions (MEDIUM PRIORITY) 🟡

### **Files to Fix:**

6. **`lib/actions/file-actions.ts`** (1 reference)
   - Line 237: `businessCategory: profileData.business_category || ''`
   - **Fix:** Use `profileData.display_category || profileData.system_category || ''`

---

## Sprint 4: Update API Routes (MEDIUM PRIORITY) 🟡

Most API routes SELECT `business_category` for display purposes.  
These are **safe** (trigger fills legacy field), but should be updated for consistency.

### **Strategy:**

For each route that does:
```typescript
.select('business_name, business_category, ...')
```

Update to:
```typescript
.select('business_name, system_category, display_category, business_category, ...')
```

Then in the response mapping, prefer:
```typescript
category: business.display_category ?? business.business_category
```

### **Files (by priority):**

**User-facing (highest priority):**
- `app/user/discover/page.tsx` (3 refs) - Discovery page
- `app/user/business/[slug]/page.tsx` (3 refs) - Business detail page
- `app/user/offers/page.tsx` (1 ref) - Offers page

**Admin (medium priority):**
- `app/admin/page.tsx` (1 ref) - Admin dashboard
- `app/api/admin/claims/route.ts` (2 refs) - Claims management
- `app/api/claim/search/route.ts` (3 refs) - Claim search

**Background/Internal (lower priority):**
- All other API routes (~20+ files)

---

## Sprint 5: Update Components (LOW PRIORITY) 🟢

Most component references are:
1. **Type definitions** (`business_category: string`) - Safe, backward compat
2. **Display with fallbacks** - Already handled by business card fallback chain
3. **Admin tools** - Can use legacy field until trigger removed

**Strategy:** Update gradually as you touch each file.

---

## Exit Condition Checklist:

Before removing trigger, ensure:

- [x] Critical validation checks fixed (DONE - 8 files)
- [ ] AI/embeddings using new fields (6 files)
- [ ] Analytics using `system_category` (1 file)
- [ ] User-facing routes returning new fields (3 files)
- [ ] Property reads (`.business_category`) near zero
- [ ] Run pre-flight checks (all pass)
- [ ] Remove trigger
- [ ] Deploy Phase 2

---

## Quick Wins (Do First):

These are simple find-replace fixes:

```typescript
// OLD:
business_category: business.business_category

// NEW:
system_category: business.system_category,
display_category: business.display_category
```

```typescript
// OLD:
Category: ${business.business_category}

// NEW:
Category: ${business.display_category || business.system_category}
```

```typescript
// OLD:
business.business_category?.toLowerCase()

// NEW:
business.system_category // Already lowercase enum
```

---

## Tracking Progress:

Run this regularly:
```bash
./scripts/track-legacy-reads.sh
```

**Goal:**
- Property reads: 0
- Token references: <20 (only type defs and safe fallbacks)
- Critical files: All ✅

Then remove trigger and deploy Phase 2! 🚀

