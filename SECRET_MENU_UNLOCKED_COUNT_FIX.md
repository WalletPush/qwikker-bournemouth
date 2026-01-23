# Secret Menu "My Unlocked" Count Fix

## 🐛 THE PROBLEM

**User Issue:** "My Unlocked" was showing 9 items, but only 3 items exist on the dashboards.

### Root Cause

The "My Unlocked" count was reading directly from `localStorage`, which contained **stale item IDs** for secret menu items that had been deleted by businesses.

**localStorage format:**
```json
["businessId-itemName", "businessId-itemName", ...]
```

When businesses delete secret menu items:
1. ✅ Items are removed from `additional_notes` JSON (dashboards stop showing them)
2. ✅ KB entries are archived (AI stops mentioning them)
3. ❌ localStorage is NOT updated (user's browser still has the old IDs)

**Result:** "My Unlocked" count included deleted items, showing 9 instead of 3.

---

## ✅ THE FIX

### 1. Validate localStorage Against Real Items

**File:** `/components/user/user-secret-menu-page.tsx`

**Change:**
```typescript
// ❌ BEFORE: Count all localStorage items (including stale ones)
const filters = [
  { id: 'unlocked', label: 'My Unlocked', count: Array.from(unlockedItems).length },
]

// ✅ AFTER: Only count items that actually exist
const validUnlockedItems = Array.from(unlockedItems).filter(itemKey => {
  return allSecretMenus.some(menu => 
    menu.items.some(item => {
      const currentItemKey = `${menu.businessId}-${item.name}`
      return currentItemKey === itemKey
    })
  )
})

const filters = [
  { id: 'unlocked', label: 'My Unlocked', count: validUnlockedItems.length },
]
```

### 2. Automatic localStorage Cleanup

Added a `useEffect` hook that runs when secret menus load:

```typescript
useEffect(() => {
  if (typeof window !== 'undefined' && realSecretMenus.length > 0 && unlockedItems.size > 0) {
    const userId = walletPassId || 'anonymous-user'
    
    // Filter out stale item IDs
    const validItemKeys = Array.from(unlockedItems).filter(itemKey => {
      return allSecretMenus.some(menu => 
        menu.items.some(item => {
          const currentItemKey = `${menu.businessId}-${item.name}`
          return currentItemKey === itemKey
        })
      )
    })
    
    // If we removed any stale entries, update localStorage
    if (validItemKeys.length !== unlockedItems.size) {
      localStorage.setItem(`qwikker-unlocked-secrets-${userId}`, JSON.stringify(validItemKeys))
      setUnlockedItems(new Set(validItemKeys))
      console.log(`🧹 Cleaned up ${unlockedItems.size - validItemKeys.length} stale localStorage entries`)
    }
  }
}, [walletPassId, realSecretMenus, unlockedItems, allSecretMenus])
```

**What this does:**
- Compares localStorage IDs against actual secret menu items
- Removes IDs for items that no longer exist
- Updates localStorage with the cleaned list
- Logs how many stale entries were removed

---

## 🎯 WHAT THIS FIXES

### Before:
- "My Unlocked" showed **9 items**
- 6 of those items had been deleted by businesses
- User sees inflated count

### After:
- "My Unlocked" shows **3 items** (the real count)
- Stale localStorage entries are automatically removed
- Count is always accurate

---

## 🧪 HOW TO TEST

### Test 1: Check the Count

1. Visit `/user/secret-menu`
2. Look at the "My Unlocked" count
3. **Expected:** Count matches the number of items you can actually see in the "My Unlocked" tab

### Test 2: Delete an Item

1. As a business owner, delete a secret menu item
2. As a user who had unlocked that item, refresh the secret menu page
3. **Expected:** "My Unlocked" count decreases by 1
4. **Expected:** Console log shows: `🧹 Cleaned up 1 stale localStorage entries`

### Test 3: Check Console

1. Open browser DevTools → Console
2. Visit `/user/secret-menu`
3. If stale entries are cleaned up, you'll see: `🧹 Cleaned up X stale localStorage entries`

### Test 4: Manual localStorage Inspection

**Before cleanup:**
```javascript
const userId = 'your-wallet-pass-id'
const unlockedItems = JSON.parse(localStorage.getItem(`qwikker-unlocked-secrets-${userId}`))
console.log('Unlocked items:', unlockedItems)
// Shows: ["uuid-DeletedItem", "uuid-AnotherDeletedItem", "uuid-ExistingItem"]
```

**After cleanup:**
```javascript
const unlockedItems = JSON.parse(localStorage.getItem(`qwikker-unlocked-secrets-${userId}`))
console.log('Unlocked items:', unlockedItems)
// Shows: ["uuid-ExistingItem"] (stale items removed)
```

---

## 🔍 UNDERSTANDING THE THREE DATA STORES

This fix addresses the **localStorage → Dashboard mismatch**. For full context on the three separate data stores (JSON, KB, localStorage), see:

👉 `SECRET_MENU_DATA_SOURCES_EXPLAINED.md`

### Quick Summary:

| Data Store | Purpose | Affects "My Unlocked"? |
|------------|---------|------------------------|
| `additional_notes` JSON | Source of truth for dashboards | ✅ YES (indirectly - items must exist) |
| `knowledge_base` table | AI chat semantic search | ❌ NO |
| **localStorage** | User unlock tracking | ✅ **YES (direct)** |

**This fix ensures localStorage only contains IDs for items that actually exist in the JSON.**

---

## 🚨 IMPORTANT NOTES

### Why Not Just Delete localStorage?

We **don't** want to delete all localStorage data because:
- User's unlock history is valuable (gamification)
- They may have unlocked items that still exist
- We only want to remove stale entries

### Why Not Store Unlocks in the Database?

The current implementation uses localStorage for simplicity and performance:
- No database writes on unlock
- No user authentication required
- Instant unlock tracking

If you later want server-side unlock tracking, you can add a `user_unlocked_items` table.

### Edge Case: Mock Items

The code also includes mock secret menu items (for demo purposes). The validation logic works with both real and mock items, so "My Unlocked" will correctly count mock items as well.

---

## ✅ VERIFICATION CHECKLIST

- [x] Added validation filter for `validUnlockedItems`
- [x] Updated filter count to use `validUnlockedItems.length`
- [x] Added automatic localStorage cleanup `useEffect`
- [x] No linter errors
- [ ] Test: "My Unlocked" count matches visible items
- [ ] Test: Count decreases when item is deleted
- [ ] Test: Console shows cleanup log message

---

## 🔗 RELATED FIXES

- **Secret Menu Eligibility Fix:** `SECRET_MENU_ELIGIBILITY_FIX.md`
  - Ensures expired trial businesses don't appear in the list
- **Secret Menu Data Sources:** `SECRET_MENU_DATA_SOURCES_EXPLAINED.md`
  - Explains JSON vs KB vs localStorage architecture

---

## 📊 SUMMARY

**Problem:** localStorage contained stale IDs → inflated "My Unlocked" count

**Solution:** 
1. Validate localStorage IDs against real items before counting
2. Automatically clean up stale IDs on page load

**Result:** "My Unlocked" always shows the correct count ✅
