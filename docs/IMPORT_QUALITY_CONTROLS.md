# Import Tool: Quality Controls Summary

## Overview

This document summarizes all quality controls implemented for the Google Places import tool to ensure only legitimate, well-categorized businesses with complete information are imported into QWIKKER.

---

## 1. Two-Stage Category Filtering ✅

**Purpose:** Prevent category pollution (e.g., nail salons appearing in tattoo searches)

**Implementation:**
- **Stage 1 (Google Search):** Broad search for maximum coverage
- **Stage 2 (QWIKKER Filter):** Strict validation before import

**Files:**
- `lib/import/category-filters.ts` - Filter rules
- `app/api/admin/import-businesses/preview/route.ts` - Preview validation
- `app/api/admin/import-businesses/import/route.ts` - Import enforcement

**Validation Logic:**
```typescript
const categoryValidation = validateCategoryMatch(
  {
    name: place.displayName.text,
    types: place.types,
    primary_type: place.types?.[0],
  },
  systemCategory
)

if (!categoryValidation.valid) {
  // Reject with reason
  rejectedBusinesses.push({
    name: place.displayName.text,
    reason: categoryValidation.reason
  })
}
```

**Categories with Filters:**
- ✅ Tattoo & Piercing (High Risk)
- ✅ Salon & Barbershop (Moderate Risk)
- ✅ Spa & Wellness (Very High Risk)
- ✅ Nail Salon (Specific)
- ✅ Restaurant (Low Risk)
- ✅ Cafe (Low Risk)
- ✅ Bar/Pub (Low Risk)
- ✅ Gym/Fitness (Moderate Risk)
- ✅ Entertainment (High Risk)

---

## 2. Deterministic Tagline Generation ✅

**Purpose:** Ensure every business has a tagline for Discover cards, even before claimed

**Implementation:**
- **Category-based templates** (5 variants per category)
- **Specialty keyword detection** (e.g., "Thai", "Sushi", "Barber")
- **Deterministic selection** (hash-based, stable per business)
- **Source tracking** (`'generated'` vs `'owner'`)

**File:** `lib/import/tagline-generator.ts`

**Usage:**
```typescript
import { generateTagline } from '@/lib/import/tagline-generator'

const tagline = generateTagline(
  place.id,                // businessId (for deterministic selection)
  place.displayName.text,  // businessName (for specialty detection)
  'restaurant',            // systemCategory
  'bournemouth'            // city (optional)
)

// Insert with source tracking
await supabase.from('business_profiles').insert({
  ...businessData,
  business_tagline: tagline,
  tagline_source: 'generated',  // Mark as auto-generated
})
```

**Example Outputs:**

| Category | Business Name | Generated Tagline |
|----------|---------------|-------------------|
| Restaurant | "The Thai Kitchen" | "Authentic Thai flavours, made fresh" (specialty detected) |
| Restaurant | "Burger House" | "Local favourites, made fresh" (template) |
| Cafe | "Artisan Bakery" | "Freshly baked, every day" (specialty detected) |
| Cafe | "Morning Coffee" | "Your daily coffee destination" (template) |
| Tattoo | "Ink & Iron Studio" | "Custom tattoos, professional piercing" (template) |
| Salon | "Classic Barbers" | "Classic cuts, modern style" (specialty detected) |

**When Owner Claims:**
```typescript
// Owner overwrites generated tagline
await supabase.from('business_profiles').update({
  business_tagline: ownerProvidedTagline,
  tagline_source: 'owner',  // Mark as owner-provided
})
```

---

## 3. Quality Metrics & Transparency ✅

**Purpose:** Track import quality over time, identify categories with high noise

**API Response Structure:**
```json
{
  "success": true,
  "results": [...],
  "totalRaw": 35,           // Raw results from Google
  "totalFound": 20,         // Valid after filtering
  "totalRejected": 15,      // Rejected by filters
  "rejected": [
    {
      "name": "Glamour Nails & Lashes",
      "reason": "Category mismatch: Blocked keyword"
    },
    {
      "name": "Beauty Haven",
      "reason": "Category mismatch: No category match"
    }
  ],
  "message": "Found 20 valid businesses from 35 raw results (15 rejected by quality filters)"
}
```

**Quality Dashboard Metrics:**
- **Noise Level:** `(totalRejected / totalRaw) * 100%`
- **Filter Effectiveness:** High rejection = filters working correctly
- **Category Health:** Track noise level per category over time

**Example:**
```
Tattoo/Piercing Import:
- Raw Results: 35
- Valid: 20 (57%)
- Rejected: 15 (43%)
- Noise Level: 43% (EXPECTED - Google returns many beauty salons)

Restaurant Import:
- Raw Results: 50
- Valid: 48 (96%)
- Rejected: 2 (4%)
- Noise Level: 4% (LOW - Google is accurate for restaurants)
```

---

## 4. Existing Quality Filters (Already Implemented)

### A. Rating Filter
- **Minimum Rating:** Configurable (typically 4.0★ or higher)
- **Purpose:** Avoid low-quality or controversial businesses

### B. Review Count Filter
- **Minimum Reviews:** 10+ reviews
- **Purpose:** Avoid fake, new, or unestablished businesses

### C. Business Status Filter
- **Allowed:** `OPERATIONAL`
- **Blocked:** `CLOSED_PERMANENTLY`, `CLOSED_TEMPORARILY`
- **Purpose:** Only import active, open businesses

### D. Lodging Filter
- **Blocked:** Any business with `lodging` type
- **Purpose:** Hotels contaminate restaurant searches

### E. Distance Filter
- **Radius Check:** Actual distance vs. search radius
- **Purpose:** Ensure businesses are actually within target area

### F. Duplicate Detection
- **Check:** `google_place_id` already in database
- **Purpose:** Prevent duplicate imports across sessions

---

## 5. Import Workflow (Complete Flow)

### Preview Stage

```
1. Admin enters search parameters:
   - City / Location
   - Category
   - Min Rating (e.g., 4.0★)
   - Radius (e.g., 5km)
   - Max Results (e.g., 50)

2. Google Places Nearby Search:
   → Returns raw results (e.g., 35 businesses)

3. Apply ALL Quality Filters:
   ✅ Rating >= min rating
   ✅ Review count >= 10
   ✅ Business status = OPERATIONAL
   ✅ Not lodging
   ✅ Within radius
   ✅ Category match (two-stage filter)
   → Valid results (e.g., 20 businesses)

4. Return Preview with Transparency:
   - Valid businesses (thumbnails, names, ratings)
   - Rejected businesses (names + reasons)
   - Quality metrics (raw vs. valid)
   - Cost breakdown

5. Admin Reviews:
   - Check rejected businesses
   - Adjust filters if needed
   - Approve import
```

### Import Stage

```
1. Admin clicks "Import Selected"

2. For each Place ID:
   a) Fetch Place Details from Google
      - Get phone, website, hours, photos
   
   b) Validate (same filters as preview):
      ✅ Business status = OPERATIONAL
      ✅ Category match (enforced again)
      ✅ Not duplicate
   
   c) Generate Tagline:
      - Detect specialty keywords
      - Select deterministic template
      - Mark as 'generated'
   
   d) Parse Opening Hours:
      - Convert Google format to structured JSON
      - Store both raw and structured
   
   e) Insert into Database:
      - Set auto_imported = true
      - Set owner_user_id = null
      - Set status = 'unclaimed'
      - Set visibility = 'discover_only'
      - Set tagline_source = 'generated'
   
   f) Stream Progress:
      - Current business
      - Imported / Skipped / Failed counts
      - Real-time status updates

3. Complete:
   - Final counts
   - Success message
   - Auto-import notification guard active (no emails sent)
```

---

## 6. Database Schema Requirements

### Required Columns (business_profiles)

```sql
-- Auto-import tracking
auto_imported BOOLEAN DEFAULT false,
google_place_id TEXT UNIQUE,

-- Ownership
owner_user_id UUID REFERENCES auth.users(id),
claimed_at TIMESTAMP,

-- Status
status TEXT CHECK (status IN ('unclaimed', 'pending_claim', 'claimed', 'approved', ...)),
visibility TEXT CHECK (visibility IN ('discover_only', 'ai_enabled')),

-- Tagline
business_tagline TEXT,
tagline_source TEXT CHECK (tagline_source IN ('generated', 'owner')),

-- Hours
business_hours TEXT,  -- Raw string from Google
business_hours_structured JSONB,  -- Parsed structured format
```

### Optional Migrations

If `tagline_source` column doesn't exist yet:

```sql
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS tagline_source TEXT CHECK (tagline_source IN ('generated', 'owner'));

-- Default existing taglines to 'owner' (assume manually entered)
UPDATE business_profiles
SET tagline_source = 'owner'
WHERE business_tagline IS NOT NULL AND tagline_source IS NULL;

-- Set generated taglines for auto-imported businesses
UPDATE business_profiles
SET tagline_source = 'generated'
WHERE auto_imported = true AND tagline_source IS NULL;
```

---

## 7. Monitoring & Adjustment

### Key Metrics to Track

1. **Rejection Rate by Category:**
   ```
   SELECT
     system_category,
     COUNT(*) as total_searches,
     AVG(total_rejected::float / NULLIF(total_raw, 0)) as avg_rejection_rate
   FROM import_logs
   GROUP BY system_category
   ORDER BY avg_rejection_rate DESC
   ```

2. **Most Common Rejection Reasons:**
   ```
   SELECT
     rejection_reason,
     COUNT(*) as occurrences
   FROM import_rejections
   GROUP BY rejection_reason
   ORDER BY occurrences DESC
   LIMIT 10
   ```

3. **Tagline Source Distribution:**
   ```
   SELECT
     tagline_source,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM business_profiles
   WHERE business_tagline IS NOT NULL
   GROUP BY tagline_source
   ```

### When to Adjust Filters

**High Rejection Rate (>70%):**
- Filters may be too strict
- Review rejected businesses
- Add keywords to allowlist
- Remove overly broad blocklist terms

**Low Rejection Rate (<10%):**
- Filters may be too loose
- Review imported businesses
- Add keywords to blocklist
- Tighten primary type allowlist

**Surprising Rejections:**
- Legitimate business rejected
- Add business name pattern to allowlist
- Refine blocklist to be more specific

---

## 8. Testing Checklist

### Before Production Import

- [ ] Test preview with known category (e.g., "Restaurant" in Bournemouth)
  - [ ] Verify raw results count
  - [ ] Verify valid results count
  - [ ] Check rejected businesses list
  - [ ] Confirm cost calculations

- [ ] Test preview with messy category (e.g., "Tattoo / Piercing")
  - [ ] Confirm nail salons are rejected
  - [ ] Confirm beauty salons are rejected
  - [ ] Confirm legitimate tattoo studios are accepted
  - [ ] Review rejection reasons

- [ ] Test tagline generation
  - [ ] Generate taglines for 10 test businesses
  - [ ] Verify specialty detection (e.g., "Thai Restaurant" gets specialty tagline)
  - [ ] Verify deterministic selection (same business ID → same tagline)
  - [ ] Verify variety across different businesses

- [ ] Test import execution
  - [ ] Import 1 business
  - [ ] Verify database fields (auto_imported, tagline_source, etc.)
  - [ ] Confirm no emails sent (notification guard active)
  - [ ] Verify tagline is present and appropriate

- [ ] Test claim flow
  - [ ] Claim an auto-imported business
  - [ ] Verify tagline can be edited
  - [ ] Verify tagline_source changes to 'owner'
  - [ ] Confirm emails sent after claim approval

---

## 9. Future Enhancements (Optional)

### A. Advanced Tagline Generation
- [ ] Use Google's `editorialSummary` field (if available)
- [ ] Parse top review snippet for unique selling points
- [ ] Machine learning model for tagline quality scoring

### B. Image Quality Scoring
- [ ] Detect stock photos vs. real business photos
- [ ] Flag businesses with no photos
- [ ] Suggest photo uploads during claim flow

### C. Auto-Category Refinement
- [ ] Track claim rate by category (quality indicator)
- [ ] Auto-adjust filters based on claim conversion
- [ ] A/B test different tagline templates

### D. Competitive Analysis
- [ ] Compare imported businesses to existing directory
- [ ] Identify missing businesses
- [ ] Suggest import parameters for maximum coverage

---

## Summary

✅ **Two-stage category filtering** prevents pollution  
✅ **Deterministic tagline generation** ensures completeness  
✅ **Quality metrics & transparency** enable monitoring  
✅ **Enforced in both preview and import** prevents bypass  
✅ **No extra API costs** (filtering is local)  
✅ **Owner can override** generated taglines when claiming  

**Status:** Production-ready  
**Last Updated:** 2026-01-14  
**Author:** QWIKKER HQ
