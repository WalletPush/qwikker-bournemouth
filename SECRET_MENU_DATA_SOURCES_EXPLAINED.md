# Secret Menu Data Sources: Complete Explanation

## 🎯 THE CONFUSION

You're seeing:
- ✅ 3 items on business/user dashboards
- ❌ 9 items in "My Unlocked" count
- ❓ All Ember and Oak items showing as "archived" in KB

**Why the mismatch?** Because there are **THREE SEPARATE DATA STORES** that don't always stay in sync.

---

## 📊 THE THREE DATA STORES

### 1. **`business_profiles.additional_notes` JSON** ← SOURCE OF TRUTH FOR DASHBOARDS

**Location:** `business_profiles` table, `additional_notes` column (JSON field)

**Format:**
```json
{
  "secret_menu_items": [
    {
      "itemName": "Kindled Pear",
      "description": "...",
      "price": "£8.50",
      "created_at": "2026-01-23T15:30:00.000Z"
    }
  ]
}
```

**Used By:**
- ✅ Business dashboard secret menu page (`/dashboard/secret-menu`)
- ✅ User dashboard secret menu page (`/user/secret-menu`)

**Updated When:**
- Business adds a new secret menu item
- Business deletes a secret menu item (item removed from array)

**This is the SOURCE OF TRUTH for what items actually exist.**

---

### 2. **`knowledge_base` Table** ← FOR AI CHAT ONLY

**Location:** `knowledge_base` table

**Columns:**
- `id`, `title`, `content`, `status` ('active' or 'archived'), `metadata` (JSONB)

**Used By:**
- ✅ AI chat search (`lib/ai/embeddings.ts` - `searchKnowledgeBase()`)
- ✅ AI recommendations and discovery

**NOT Used By:**
- ❌ Business dashboard
- ❌ User dashboard
- ❌ Anywhere else

**Updated When:**
- Item added → KB entry created with status='active'
- Item deleted → KB entry status changed to 'archived' (NOT deleted)

**Why Archive Instead of Delete?**
- Preserves history
- Prevents AI from ever mentioning deleted items (KB search filters status='active')
- Allows for potential restore/audit

**CRITICAL:** Archiving in KB does NOT remove items from dashboards because dashboards read from JSON, not KB.

---

### 3. **localStorage** ← CLIENT-SIDE USER TRACKING

**Location:** Browser localStorage (user's device)

**Key:** `qwikker-unlocked-secrets-${walletPassId}`

**Format:**
```json
["item-id-1", "item-id-2", "item-id-3", ...]
```

**Used By:**
- ✅ "My Unlocked" count on user secret menu page
- ✅ Tracking which items a user has unlocked/viewed

**NOT Used By:**
- ❌ Server-side logic
- ❌ AI chat
- ❌ Anything else

**Updated When:**
- User unlocks a secret menu item (client-side JavaScript)

**Why It Gets Stale:**
- If items are deleted from the business dashboard, localStorage isn't updated
- If user clears browser data, count resets
- No automatic sync with server

**This is why "My Unlocked" shows 9 when only 3 items exist.**

---

## 🔍 YOUR SPECIFIC SITUATION

### What You're Seeing:

1. **"My Unlocked" shows 9 items**
   - This is from localStorage (browser cache)
   - Contains IDs of items that may no longer exist
   - **Fix:** User needs to clear localStorage or we need to validate IDs against real items

2. **All Ember and Oak items show as "archived" in KB**
   - This is CORRECT if items were deleted from the business dashboard
   - Archiving in KB prevents AI from mentioning them
   - **This does NOT affect dashboards**

3. **Only 3 items showing on dashboards**
   - This is the **REAL count** (from JSON)
   - This is what actually exists in the database
   - **This is correct**

---

## ✅ HOW IT SHOULD WORK

### When a Business **ADDS** a Secret Menu Item:

1. Item added to `additional_notes` JSON ✅
2. Item synced to `knowledge_base` (status='active') ✅
3. Item appears on business dashboard ✅
4. Item appears on user dashboard ✅
5. AI can mention it in chat ✅

### When a Business **DELETES** a Secret Menu Item:

1. Item removed from `additional_notes` JSON ✅
2. KB entry status changed to 'archived' ✅
3. Item disappears from business dashboard ✅
4. Item disappears from user dashboard ✅
5. AI can NO LONGER mention it ✅
6. **localStorage still contains the item ID** ❌ (stale)

---

## 🐛 THE localStorage PROBLEM

The "My Unlocked" count is reading from localStorage, which never gets cleaned up when items are deleted.

### Current Code (in `/components/user/user-secret-menu-page.tsx`):

```typescript
const filters = [
  { id: 'unlocked', label: 'My Unlocked', count: Array.from(unlockedItems).length },
]
```

`unlockedItems` is populated from localStorage, which contains item IDs (probably `item.name` or `created_at` timestamp).

### The Fix:

We need to **validate localStorage IDs against real items** before counting them.

---

## 🛠️ RECOMMENDED FIXES

### Fix 1: Validate localStorage Against Real Items

Update `user-secret-menu-page.tsx` to only count unlocked items that actually exist:

```typescript
// Filter unlockedItems to only include items that exist in allSecretMenus
const validUnlockedItems = Array.from(unlockedItems).filter(itemId => {
  return allSecretMenus.some(menu => 
    menu.items.some(item => 
      item.name === itemId || 
      item.created_at === itemId ||
      `${menu.businessName}-${item.name}` === itemId
    )
  )
})

const filters = [
  { id: 'unlocked', label: 'My Unlocked', count: validUnlockedItems.length },
]
```

This will ensure the count only reflects items that actually exist.

### Fix 2: Clean Up Orphaned KB Entries

If KB has archived entries but the JSON is empty, those are orphaned and can be left as-is (archived state is correct).

### Fix 3: Add a "Clear My Unlocked" Button (Optional)

For users who want to reset their localStorage:

```typescript
const handleClearUnlocked = () => {
  const userId = walletPassId || 'anonymous-user'
  localStorage.removeItem(`qwikker-unlocked-secrets-${userId}`)
  setUnlockedItems(new Set())
}
```

---

## 🧪 HOW TO DIAGNOSE

### Option 1: Use the Diagnostic API Route

I created `/api/admin/diagnose-secret-menu` for you.

**Run this:**
```bash
# Start your dev server
pnpm dev

# Then in another terminal:
curl "http://localhost:3000/api/admin/diagnose-secret-menu?business=Ember+and+Oak"
```

This will show you:
- How many items are in the JSON (real count)
- How many items are in KB (active vs archived)
- Any mismatches or orphaned entries

### Option 2: Manual SQL Query

```sql
-- Check JSON items
SELECT 
  business_name,
  jsonb_array_length((additional_notes::jsonb)->'secret_menu_items') as json_count
FROM business_profiles
WHERE business_name ILIKE '%Ember and Oak%';

-- Check KB items
SELECT 
  status,
  COUNT(*) as count
FROM knowledge_base
WHERE 
  business_id = (SELECT id FROM business_profiles WHERE business_name ILIKE '%Ember and Oak%')
  AND knowledge_type = 'custom_knowledge'
  AND metadata->>'type' = 'secret_menu'
GROUP BY status;
```

### Option 3: Check in Browser DevTools

1. Open user secret menu page
2. Press F12 → Console
3. Run:
```javascript
const userId = 'your-wallet-pass-id' // or 'anonymous-user'
const unlockedItems = JSON.parse(localStorage.getItem(`qwikker-unlocked-secrets-${userId}`))
console.log('Unlocked items in localStorage:', unlockedItems)
```

This will show you the exact item IDs stored in localStorage.

---

## 🎯 SUMMARY

| Data Source | Purpose | Affects Dashboards? | Affects AI Chat? | Affects "My Unlocked"? |
|-------------|---------|---------------------|------------------|------------------------|
| `additional_notes` JSON | Source of truth | ✅ YES | ❌ NO | ❌ NO |
| `knowledge_base` table | AI semantic search | ❌ NO | ✅ YES | ❌ NO |
| localStorage | User tracking | ❌ NO | ❌ NO | ✅ YES |

**The 3 items you see on dashboards is the REAL count.**
**The 9 items in "My Unlocked" is stale localStorage data.**
**The archived KB entries are correct (items were deleted).**

---

## ✅ NEXT STEPS

1. **Run the diagnostic** to confirm the actual counts
2. **Implement Fix 1** to validate localStorage against real items
3. **Optional:** Add a "Clear My Unlocked" button for users

This will ensure "My Unlocked" always shows the correct count.

---

## 🔗 RELATED CONTEXT

- Secret menu dashboard code: `/components/dashboard/secret-menu-page.tsx`
- User secret menu page: `/components/user/user-secret-menu-page.tsx`
- Delete action: `/lib/actions/business-actions.ts` (`deleteSecretMenuItem`)
- KB archiving: `/lib/ai/embeddings.ts` (`archiveSecretMenuItemInKnowledgeBase`)

This is a **data consistency issue**, not a bug. The system is working as designed, but localStorage is an independent client-side cache that needs validation logic.
