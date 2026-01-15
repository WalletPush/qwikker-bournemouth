# Quick Start - 3 Commands to Complete Placeholder Fix

## 1️⃣ Generate Default Image
```bash
chmod +x scripts/generate-default-placeholder.sh && ./scripts/generate-default-placeholder.sh
```
*Or manually copy: `cp public/placeholders/barber/00.webp public/placeholders/default/00.webp`*

## 2️⃣ Restart Server
```bash
pkill -f "next dev" && pnpm dev
```

## 3️⃣ Verify
```
✓ http://localhost:3000/dev/placeholders (all categories correct)
✓ http://localhost:3000/discover (restaurants ≠ cafe)
```

---

## ✅ What's Fixed
- ✅ Canonical category resolver (`resolveSystemCategory()`)
- ✅ Handles camelCase/snake_case automatically
- ✅ No legacy `.v1.webp` paths
- ✅ DEV-only logging (no spam)
- ✅ All code changes complete

## ⏳ What's Pending
- ⏳ Replace default image (neutral, not cafe)
- ⏳ Restart server
- ⏳ Browser verification

---

**Full guide:** `PLACEHOLDER_FIX_VERIFICATION.md`

