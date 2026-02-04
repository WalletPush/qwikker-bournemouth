# SOCIAL WIZARD — Fabric.js Dynamic Import Fix

**Date:** 2026-02-04  
**Issue:** `undefined is not an object (evaluating 'new fabric.Canvas')`  
**Status:** ✅ Fixed

---

## 🐛 The Problem

Fabric.js was being dynamically imported to avoid SSR issues, but the import syntax was incorrect:

```typescript
// ❌ BROKEN
const { fabric } = await import('fabric')
```

This assumed `fabric` was a named export, but the module structure is different. The result was `fabric` being `undefined`, causing the error.

---

## ✅ The Solution

### 1. **Corrected Dynamic Import**
```typescript
// ✅ FIXED
const fabricModule = await import('fabric')
const fabric = fabricModule.fabric || fabricModule.default || fabricModule
```

This handles multiple module export patterns.

### 2. **Stored Fabric Library**
```typescript
const [fabricLib, setFabricLib] = useState<any>(null)
setFabricLib(fabric) // Store for helper functions
```

### 3. **Refactored Helper Functions**

**Before (async imports in every function):**
```typescript
async function addWatermark(canvas: any) {
  const { fabric } = await import('fabric') // ❌ Multiple imports
  // ...
}
```

**After (pass fabric as parameter):**
```typescript
function addWatermarkWithFabric(fabric: any, canvas: any) {
  // Use fabric directly
  const watermark = new fabric.Text('QWIKKER', { ... })
}
```

---

## 📋 Changes Made

### Updated Functions:
1. ✅ `loadBackgroundWithFabric(fabric, canvas, url)` - was `loadBackground(canvas, url)`
2. ✅ `addWatermarkWithFabric(fabric, canvas)` - was `async addWatermark(canvas)`
3. ✅ `addTextOverlayWithFabric(fabric, canvas, text, template)` - was `async addTextOverlay(...)`

### Updated Function Calls:
1. ✅ `handleBgChange()` - now passes `fabricLib`
2. ✅ `handleTemplateChange()` - now passes `fabricLib`
3. ✅ Initial setup in `useEffect()` - uses renamed functions

---

## 🎯 Why This Works

### ✅ Single Import
- Fabric.js loads once in `useEffect`
- Stored in state (`fabricLib`)
- Reused by all helper functions

### ✅ No Async Chains
- Helper functions are synchronous
- No repeated dynamic imports
- Faster execution

### ✅ Proper Null Checks
```typescript
if (!mounted || !fabric) return
```

Ensures fabric is actually loaded before using it.

---

## 🧪 Testing

**Refresh `/business/social-wizard` and check:**
- ✅ Canvas renders (600x600 dark background)
- ✅ Placeholder background loads
- ✅ QWIKKER watermark appears bottom-left
- ✅ Default text overlay shows
- ✅ No console errors

---

## 📝 Notes

- Fabric.js module structure varies by version
- The fallback chain `fabricModule.fabric || fabricModule.default || fabricModule` handles different export patterns
- Storing the library in state prevents re-importing

---

**Status:** Canvas should now load correctly! 🎉
