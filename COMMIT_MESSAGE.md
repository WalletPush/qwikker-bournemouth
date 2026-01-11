# Suggested Commit Message

```
feat(import-tool): add cuisine tags and clear cost breakdown to preview UI

WHAT:
- Add cuisine tag display (Italian, Thai, Vegan, etc.) to preview results
- Replace confusing cost estimates with clear two-stage breakdown
- Update API to return Google types for cuisine extraction
- Change warning banner from scary yellow to informational blue

WHY:
- Admins need to verify cuisine coverage at a glance
- Previous cost display caused "did I just spend £30?!" panic
- Two-stage costs (preview vs import) need clear separation
- Builds trust and confidence in the import tool

HOW:
Backend:
- Added `googleTypes` array to preview API response
- Updated cost structure: `costs.preview` and `costs.import`
- Accurate per-business import cost calculation (£0.017)

Frontend:
- Created `getCuisineTags()` helper to extract cuisine from Google types
- Added cost breakdown card showing preview (spent) vs import (per-business)
- Updated business cards with category + cuisine badges
- Updated warning banner with clear two-stage cost explanation

IMPACT:
- Admins can instantly verify cuisine diversity (Restaurant • Italian • Pizza)
- Clear cost transparency prevents panic and confusion
- Professional UI builds trust in the tool
- Production-ready for first import tests

FILES:
- app/api/admin/import-businesses/preview/route.ts (API response)
- app/admin/import/import-client.tsx (UI updates)
- FRONTEND_IMPROVEMENTS_COMPLETE.md (documentation)
- IMPORT_TOOL_COST_BREAKDOWN.md (cost analysis)
```

---

## Alternative (Shorter) Commit Message

```
feat(import-tool): add cuisine tags and accurate cost display

- Show cuisine tags (Italian, Thai, Vegan) in preview results
- Add clear cost breakdown (preview vs import, per-business)
- Update API to return Google types for cuisine extraction
- Change warning from yellow to blue with clearer copy

Admins can now verify cuisine coverage and understand costs at a glance.
Prevents "did I just spend £30?!" panic. Production-ready.
```

---

## Git Commands

```bash
# Stage changes
git add app/api/admin/import-businesses/preview/route.ts
git add app/admin/import/import-client.tsx
git add FRONTEND_IMPROVEMENTS_COMPLETE.md
git add IMPORT_TOOL_COST_BREAKDOWN.md
git add PREVIEW_UI_IMPROVEMENTS.md
git add IMPORT_TOOL_TODO.md

# Commit
git commit -m "feat(import-tool): add cuisine tags and accurate cost display

- Show cuisine tags (Italian, Thai, Vegan) in preview results  
- Add clear cost breakdown (preview vs import, per-business)
- Update API to return Google types for cuisine extraction
- Change warning from yellow to blue with clearer copy

Admins can now verify cuisine coverage and understand costs at a glance.
Prevents confusion and panic. Production-ready for first import tests."

# Push (when ready)
git push origin main
```

---

**Note:** Do NOT push until you've tested the preview with a real Google API key to ensure the cuisine tags display correctly!

