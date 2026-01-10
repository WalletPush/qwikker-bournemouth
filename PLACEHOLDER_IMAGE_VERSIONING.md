# Placeholder Image Versioning Guide

## Why Versioning?

When you update a placeholder image, **browsers and CDNs will cache the old version** by filename. This causes confusion: "Why is my new image not showing?"

**Solution:** Version filenames when you update images.

---

## Filename Convention

```
/public/placeholders/[category]/[name].v[version].webp
```

### Examples:

**Initial version:**
```
/public/placeholders/restaurant/abstract-01.v1.webp
/public/placeholders/restaurant/abstract-02.v1.webp
```

**Updated later:**
```
/public/placeholders/restaurant/abstract-01.v2.webp  ← New file
/public/placeholders/restaurant/abstract-01.v1.webp  ← Keep old for rollback
```

---

## How to Update a Placeholder

### Step 1: Add new version
```bash
# Place new image with incremented version
cp new-image.webp /public/placeholders/restaurant/abstract-01.v2.webp
```

### Step 2: Update the constant
```typescript
// lib/constants/category-placeholders.ts
{
  id: 1,
  imagePath: '/placeholders/restaurant/abstract-01.v2.webp', // ← Updated
  gradient: 'from-orange-950 via-red-950 to-slate-950',
  color: 'text-orange-400'
}
```

### Step 3: Deploy
```bash
git add public/placeholders/restaurant/abstract-01.v2.webp
git add lib/constants/category-placeholders.ts
git commit -m "Update restaurant placeholder variant 1 to v2"
git push
```

### Step 4: Clean up old version (optional)
After the new version is stable (2-4 weeks recommended), you can optionally delete the old version. Note: Some CDN/browser caches may retain old versions longer than expected, so keep old versions until you're confident the new one is stable, or just keep them indefinitely (they're tiny - ~60KB each).
```bash
rm /public/placeholders/restaurant/abstract-01.v1.webp
```

---

## Rollback Plan

If a new image has issues, just revert the constant:
```typescript
imagePath: '/placeholders/restaurant/abstract-01.v1.webp', // ← Rollback
```

No need to redeploy the image - the old one is still there!

---

## CDN Cache Control

Static assets in `/public/` may be cached aggressively by browsers and CDNs. **This is why filename versioning is critical** - the browser/CDN will cache by filename, so changing the content without changing the filename means users see stale content.

**Versioning solves this:**
- Old filename: `abstract-01.v1.webp` → cached by browsers
- New filename: `abstract-01.v2.webp` → fetched fresh (different URL)

---

## Quick Reference

| Action | Command |
|--------|---------|
| Add new version | `cp new.webp /public/placeholders/cat/name.v2.webp` |
| Update constant | Edit `lib/constants/category-placeholders.ts` |
| Deploy | `git add . && git commit && git push` |
| Rollback | Change constant back to `.v1.webp` |
| Clean up old | Optional after 2-4 weeks (or keep indefinitely - they're tiny!) |

---

## Best Practices

✅ **DO:**
- Increment version on every image change
- Keep old versions until new version is proven stable (2-4 weeks minimum, or indefinitely)
- Document changes in commit messages
- Test on staging first

❌ **DON'T:**
- Overwrite existing files
- Skip version numbers
- Delete old versions too quickly (cache lifetimes vary)
- Forget to update the constant

