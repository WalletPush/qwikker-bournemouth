# Placeholder Images - Final Inventory

## ✅ Complete Categories (with variants)

| Category    | Variants | Files                    |
|-------------|----------|--------------------------|
| restaurant  | 6        | 00.webp - 05.webp        |
| bar         | 6        | 00.webp - 05.webp        |
| tattoo      | 6        | 00.webp - 05.webp        |
| bakery      | 5        | 00.webp - 04.webp        |
| dessert     | 5        | 00.webp - 04.webp        |
| cafe        | 4        | 00.webp - 03.webp        |
| barber      | 4        | 00.webp - 03.webp        |
| wellness    | 4        | 00.webp - 03.webp        |
| pub         | 3        | 00.webp - 02.webp        |
| salon       | 3        | 00.webp - 02.webp        |
| default     | 1        | 00.webp                  |

**Total: 10 categories with custom images**

---

## ⚠️ Categories Missing Placeholders (using default)

These categories exist in the system but have no custom placeholders yet:

- `entertainment` (0 variants)
- `fast_food` (0 variants)
- `fitness` (0 variants)
- `hotel` (0 variants)
- `other` (0 variants)
- `professional` (0 variants)
- `retail` (0 variants)
- `sports` (0 variants)
- `takeaway` (0 variants)
- `venue` (0 variants)

**Businesses in these categories will use the generic `default/00.webp`**

---

## 📊 Summary

- ✅ **51 total placeholder images**
- ✅ **10 categories fully covered**
- ⚠️ **10 categories still need images**
- 🔧 **Placeholder selector updated** (supports up to 6 variants per category)
- 📤 **Cloudinary upload enabled** (for custom placeholders)

---

## 🎯 Priority: Add Missing Categories

Suggested order (based on common business types):

1. **takeaway** - Very common (Chinese, Indian, Pizza)
2. **fast_food** - Burgers, kebabs, fried chicken
3. **retail** - Shops, boutiques, stores
4. **fitness** - Gyms, yoga studios, personal trainers
5. **hotel** - Hotels, B&Bs, guesthouses
6. **venue** - Event spaces, wedding venues, halls
7. **sports** - Sports bars, activity centers
8. **entertainment** - Cinemas, arcades, bowling
9. **professional** - Accountants, solicitors, consultants
10. **other** - Catch-all for everything else

---

## 📝 How to Add More

1. Get images (PNG/JPG)
2. Put in `~/Desktop/[category-name]/` folder
3. Name them `00.png`, `01.png`, `02.png`, etc.
4. Run conversion script:
   ```bash
   ./scripts/import-desktop-placeholders.sh
   ```
5. Update `CATEGORY_VARIANTS` in `components/admin/placeholder-selector.tsx`

---

## 🔍 Quality Check

All images have been:
- ✅ Converted to WebP (quality 85%)
- ✅ Resized to max 1600x900 (maintaining aspect ratio)
- ✅ Compressed (average 40-120KB per image, down from 1.5-6MB)
- ✅ Organized by category folder
- ✅ Named with zero-padded numbers (00, 01, 02, etc.)

---

## 🚀 Testing

Go to: **Admin → Unclaimed Listings → Open any business card → Placeholder Selector**

You should now see:
- Correct number of variants for each category
- Preview thumbnail updates when you select different variants
- "Upload New Image" button for custom placeholders

---

## 📸 Desktop Cleanup

Once you've confirmed everything works, you can delete the source folders:

```bash
rm -rf ~/Desktop/{restaurant,cafe,bakery,bar,dessert,barber,wellness,pub,salon:spa,tattoo}
```

⚠️ **Warning:** This is permanent! Make sure you have backups if needed.
