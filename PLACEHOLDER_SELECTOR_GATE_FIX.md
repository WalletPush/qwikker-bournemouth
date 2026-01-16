# PlaceholderSelector Gate Fix ✅

## 🔴 **Issue Identified**

**Problem:** PlaceholderSelector was gated behind `isImportedUnclaimed`, which was too strict.

**Symptoms:**
- Unclaimed businesses without `auto_imported=true` couldn't access PlaceholderSelector
- Debug showed: `isImportedUnclaimed: false ❌` → `canShowSelector: false ❌`
- Error: "Business is not imported+unclaimed"

**Example:**
- Bar business: `status='unclaimed'`, `owner_user_id=null`, but no `auto_imported` flag
- PlaceholderSelector was hidden even though it's an unclaimed business that needs placeholder variants

---

## ✅ **The Fix**

### **Root Cause:**
PlaceholderSelector was incorrectly assuming ONLY imported businesses need placeholder variant selection.

**Reality:** ANY unclaimed business (imported OR manually created) might need:
- Placeholder image displayed
- Admin to choose which variant (0, 1, or 2) looks best

### **Solution:**
Changed gate from `isImportedUnclaimed` to `isUnclaimedStrict`

**BEFORE (TOO STRICT):**
```typescript
const canShowSelector = isImportedUnclaimed && hasCategory
// Required: status='unclaimed' AND !owner AND auto_imported=true
```

**AFTER (CORRECT):**
```typescript
const canShowSelector = isUnclaimedStrict && hasCategory
// Required: status='unclaimed' AND !owner (ANY unclaimed business)
```

---

## 📝 **Changes Made**

### **File:** `components/admin/comprehensive-business-crm-card.tsx`

#### **1. Gate Logic (Line 1241)**

**Changed:**
```typescript
// ✅ PlaceholderSelector: Show for ANY unclaimed business (imported or manual)
// This lets admins choose placeholder variants for all unclaimed listings
const hasCategory = !!resolvedCategory && resolvedCategory !== 'other'
const canShowSelector = isUnclaimedStrict && hasCategory
```

**Why:** PlaceholderSelector is a UI tool for admins to pick variants. It's useful for ANY unclaimed business, not just imported ones.

---

#### **2. Debug Block Updated (Lines 1268-1287)**

**Changed:**
- Shows `isUnclaimedStrict` instead of `isImportedUnclaimed`
- Updated error message: "Business is claimed or has an owner (Placeholder selector is for unclaimed businesses only)"

**Why:** Debug should reflect the actual gate being used

---

## 🎯 **Use Cases**

### **Now Works For:**

#### **1. Imported+Unclaimed (Google Places)**
```
status: 'unclaimed'
owner_user_id: null
auto_imported: true
system_category: 'restaurant'
→ isUnclaimedStrict: true ✅
→ PlaceholderSelector: SHOWS ✅
```

#### **2. Manually Created Unclaimed**
```
status: 'unclaimed'
owner_user_id: null
auto_imported: false (or missing)
system_category: 'bar'
→ isUnclaimedStrict: true ✅
→ PlaceholderSelector: SHOWS ✅
```

#### **3. Claimed Business**
```
status: 'approved'
owner_user_id: 'abc-123'
auto_imported: false
system_category: 'cafe'
→ isUnclaimedStrict: false ❌
→ PlaceholderSelector: HIDDEN ✅ (doesn't need placeholders)
```

---

## 🧪 **Testing**

### **Verify the Fix:**

1. **Restart server:**
```bash
pkill -f "next dev" && pnpm dev
```

2. **Open unclaimed business (any type):**
```
Admin → Unclaimed Listings → Any unclaimed business
```

3. **Check Debug Block (Files & Assets tab):**
```
isUnclaimedStrict: true ✅
hasCategory: true ✅
canShowSelector: true ✅ (Selector should show below)
```

4. **Verify Selector Shows:**
- Should see "Placeholder Image (Unclaimed Listings)" section
- Should see 3 variant options (0, 1, 2)
- Should be able to select and save

---

## 🔒 **Why This Is Safe**

### **PlaceholderSelector Purpose:**
- Let admins choose which placeholder variant looks best for unclaimed listings
- Preview and select from 3 pre-generated variants per category
- Apply selection so discover page shows best placeholder

### **Doesn't Affect Claimed Businesses:**
- `isUnclaimedStrict` requires BOTH:
  1. `status === 'unclaimed'`
  2. `!owner_user_id`
- Claimed businesses fail this check → no selector shows

### **Doesn't Break Other UI:**
- Tasks still use `isImportedUnclaimed` ✅ (only imported show "waiting" task)
- Activity feed still uses `isImportedUnclaimed` ✅ (only imported show import event)
- Tier overlay still uses `isImportedUnclaimed` ✅ (only imported get blocked)
- Health score still uses `isImportedUnclaimed` ✅ (only imported show N/A)

**Only PlaceholderSelector changed to use `isUnclaimedStrict` because it's useful for ALL unclaimed businesses!**

---

## 📊 **Before vs After**

| Business Type | auto_imported | BEFORE | AFTER |
|--------------|---------------|--------|-------|
| Imported+Unclaimed | true | ✅ Shows | ✅ Shows |
| Manual Unclaimed | false/null | ❌ Hidden | ✅ Shows |
| Claimed/Onboarded | any | ❌ Hidden | ❌ Hidden |

---

## ✅ **Result**

**PlaceholderSelector now works for:**
- ✅ Google Places imported businesses (auto_imported=true)
- ✅ Manually created unclaimed businesses (auto_imported=false/null)
- ✅ Any business with status='unclaimed' and no owner

**Still correctly hidden for:**
- ❌ Claimed businesses (have owner_user_id)
- ❌ Businesses with invalid/missing system_category

---

**Test with your bar business now - PlaceholderSelector should appear!** 🎉
