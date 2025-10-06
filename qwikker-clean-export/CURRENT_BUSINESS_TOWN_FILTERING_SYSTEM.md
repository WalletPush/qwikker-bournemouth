# Current Business Town Filtering System Documentation

**Date:** September 29, 2025  
**Purpose:** Document the exact current implementation of business_town filtering before implementing franchise area system

## Overview
The current system uses a **mixed approach** for filtering businesses by location, with some files using single-city filtering and others using multi-city franchise areas.

## Domain Detection System

### Hostname → City Detection
- **`bournemouth.qwikker.com`** → `'bournemouth'`
- **`calgary.qwikker.com`** → `'calgary'`
- **`localhost:3000`** → `'bournemouth'` (default for development)

### Implementation Files:
- `lib/utils/city-detection.ts` - Main city detection logic
- `lib/utils/location-detection.ts` - Extended location detection with franchise areas

## Database Schema

### business_profiles Table
- **`business_town`** column with CHECK constraint:
  ```sql
  CHECK (business_town IN (
    'bournemouth', 'poole', 'christchurch', 'wimborne',
    'ferndown', 'ringwood', 'new_milton', 'other'
  ))
  ```
- **`city`** column (string) - Used for franchise identification

## Current Filtering Approaches

### ✅ FRANCHISE-AWARE FILTERING (Multi-City)
**Files using `.in('business_town', coveredCities)` approach:**

1. **`app/user/offers/page.tsx`** (Line 96):
   ```typescript
   .in('business_town', ['bournemouth', 'christchurch', 'poole'])
   ```

2. **`app/admin/page.tsx`** (Line 94):
   ```typescript
   .in('business_town', coveredCities) // Uses franchise-aware filtering
   ```

3. **`lib/actions/admin-analytics-actions.ts`** (Lines 59, 65, 71):
   ```typescript
   .in('business_town', coveredCities)
   ```

4. **`lib/actions/qr-management-actions.ts`** (Line 49):
   ```typescript
   .in('business_town', coveredCities)
   ```

5. **`lib/actions/debug-businesses.ts`** (Line 34):
   ```typescript
   .in('business_town', ['bournemouth', 'christchurch', 'poole'])
   ```

### ❌ SINGLE-CITY FILTERING (Needs Updating)
**Files using `.eq('business_town', city)` approach:**

1. **`app/api/admin/comprehensive-analytics/route.ts`** (Line 60):
   ```typescript
   .eq('business_profiles.business_town', city.toLowerCase())
   ```

2. **`lib/actions/admin-activity-actions.ts`** (Line 48):
   ```typescript
   .eq('business_town', city.toLowerCase())
   ```

3. **`lib/actions/debug-businesses.ts`** (Lines 43, 48, 53):
   ```typescript
   .eq('business_town', 'bournemouth')
   .eq('business_town', 'christchurch') 
   .eq('business_town', 'poole')
   ```

## Franchise Area Mapping (Current)

### Bournemouth Franchise
**Covered Cities:** `['bournemouth', 'christchurch', 'poole']`
- Used in: `app/admin/page.tsx`, `app/user/offers/page.tsx`
- Source: `lib/utils/franchise-geography.ts` → `getLegacyFranchiseAreas()`

### Other Franchises
- **Calgary:** Not yet implemented
- **London:** Not yet implemented  
- **Paris:** Not yet implemented

## User City Detection Flow

### For Logged-In Users:
1. Get user's `city` from database
2. Map city to franchise areas
3. Filter businesses using franchise areas

### For Anonymous Users:
1. Detect city from hostname/subdomain
2. Default to `'bournemouth'` if localhost
3. Use hardcoded franchise areas for filtering

## Current Issues

### 1. Inconsistent Filtering
- Some files use single-city (`.eq`)
- Some files use multi-city (`.in`)
- Results in different data being shown across different pages

### 2. Hardcoded Values
- Franchise areas hardcoded in multiple locations:
  ```typescript
  ['bournemouth', 'christchurch', 'poole'] // Repeated across files
  ```

### 3. Scalability Problems
- Adding new franchise requires updating multiple files
- No central mapping system
- Domain detection exists but not consistently used

## Files That Need Updating

### Critical Files (Single-City → Multi-City):
1. `app/api/admin/comprehensive-analytics/route.ts`
2. `lib/actions/admin-activity-actions.ts`
3. `app/user/discover/page.tsx` (if it exists)
4. `app/user/business/[slug]/page.tsx` (if it filters)

### Files That Are Already Correct:
1. `app/user/offers/page.tsx` ✅
2. `app/admin/page.tsx` ✅
3. `lib/actions/admin-analytics-actions.ts` ✅
4. `lib/actions/qr-management-actions.ts` ✅

## Example Current Behavior

### Bournemouth Domain (`bournemouth.qwikker.com`):
- **User set to "poole"** → Should see businesses from all Bournemouth franchise areas
- **Current Issue:** Some pages only show Poole businesses, others show all franchise businesses

### Calgary Domain (`calgary.qwikker.com`):
- **Not implemented yet** → Would default to Bournemouth
- **Needs:** Calgary franchise area mapping

## Next Steps Required
1. Create centralized franchise mapping utility
2. Update all single-city filters to use franchise areas
3. Test domain-based filtering for all franchise scenarios
4. Ensure consistent behavior across entire application

---

**NOTE:** This documentation captures the system state before implementing the unified franchise area approach. Keep this file for reference when reverting changes if needed.
