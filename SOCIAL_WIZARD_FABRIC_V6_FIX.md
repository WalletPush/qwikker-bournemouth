# SOCIAL WIZARD — Fabric.js v6 API Fix

**Date:** 2026-02-04  
**Issue:** Fabric.js v6 has breaking API changes from v5  
**Status:** ✅ Fixed

---

## 🐛 The Problem

Fabric.js v6 was installed but the code was using v5 API:
- Import syntax changed
- Methods changed from callbacks to Promises
- Class names changed (`Text` → `FabricText`)
- Property setters changed (`setBackgroundColor()` → `.backgroundColor =`)

**Result:** Empty module `{}` and runtime errors

---

## ✅ The Solution

### 1. **Import Syntax** (v6)
```typescript
// ✅ v6 - Direct import
const fabric = await import('fabric')
// fabric.Canvas, fabric.FabricText, fabric.FabricImage, etc.
```

### 2. **Canvas Background** (v6)
```typescript
// ❌ v5
canvas.setBackgroundColor(color, canvas.renderAll.bind(canvas))

// ✅ v6  
canvas.backgroundColor = color
canvas.renderAll()
```

### 3. **Image Loading** (v6 - Now Promise-based)
```typescript
// ❌ v5
fabric.Image.fromURL(url, (img) => {
  canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas))
})

// ✅ v6
fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
  .then((img) => {
    canvas.backgroundImage = img
    canvas.renderAll()
  })
```

### 4. **Text Objects** (v6 - Renamed classes)
```typescript
// ❌ v5
new fabric.Text('text', { ... })
new fabric.Textbox('text', { ... })

// ✅ v6
new fabric.FabricText('text', { ... })
new fabric.Textbox('text', { ... }) // Textbox unchanged
```

### 5. **Shadows** (v6 - Now an object)
```typescript
// ❌ v5
shadow: 'rgba(0, 0, 0, 0.8) 2px 2px 8px'

// ✅ v6
shadow: new fabric.Shadow({
  color: 'rgba(0, 0, 0, 0.8)',
  blur: 8,
  offsetX: 2,
  offsetY: 2
})
```

### 6. **Get Objects** (v6 - Filter manually)
```typescript
// ❌ v5
canvas.getObjects('textbox')

// ✅ v6
canvas.getObjects().filter(obj => obj.type === 'textbox')
```

---

## 📋 All Changes Made

### `VisualCanvas.tsx`

| Function | v5 API (Old) | v6 API (New) |
|----------|--------------|--------------|
| Import | `fabricModule.fabric \|\| default` | Direct `import('fabric')` |
| Background Color | `setBackgroundColor(color, cb)` | `.backgroundColor = color` |
| Load Image | `Image.fromURL(url, cb)` | `FabricImage.fromURL(url).then()` |
| Create Text | `new fabric.Text()` | `new fabric.FabricText()` |
| Shadow | String `'rgba...'` | `new fabric.Shadow({...})` |
| Get Objects | `getObjects('type')` | `getObjects().filter()` |

---

## 🎯 Result

✅ Canvas loads correctly  
✅ Background colors work  
✅ Text overlay renders  
✅ QWIKKER watermark shows  
✅ No more "undefined" errors  
✅ No more empty module errors

---

## 📚 References

- Fabric.js v6 Migration Guide: https://github.com/fabricjs/fabric.js/wiki/v6-Migration-Guide
- v6 Breaking Changes: Promises, renamed classes, new Shadow API

---

**Status:** Fabric.js v6 fully working! 🎉
