# 🚨 URGENT: Run This Migration Now

## **Error:** `column business_profiles.placeholder_variant does not exist`

## **Fix:** Run this SQL in Supabase SQL Editor

**File**: `supabase/migrations/20260110000000_add_placeholder_variant.sql`

```sql
-- Add placeholder system columns to business_profiles
-- Run this migration to support the placeholder image system

-- Add placeholder_variant column (0 = default neutral variant)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS placeholder_variant INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN business_profiles.placeholder_variant IS 'Placeholder image variant ID (0-10). Admins can select variants for unclaimed businesses. Must be <= unclaimedMaxVariantId for unclaimed status.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_placeholder_variant 
ON business_profiles(placeholder_variant);

-- Verify columns exist
DO $$ 
BEGIN
  RAISE NOTICE '✅ Verifying placeholder_variant column...';
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_profiles' 
    AND column_name = 'placeholder_variant'
  ) THEN
    RAISE NOTICE '   ✅ placeholder_variant column exists';
  ELSE
    RAISE EXCEPTION '   ❌ placeholder_variant column missing!';
  END IF;
  
  RAISE NOTICE '✅ Placeholder system migration complete!';
END $$;

-- Show sample of data
SELECT 
  business_name,
  status,
  system_category,
  placeholder_variant
FROM business_profiles
WHERE status IN ('unclaimed', 'claimed_free')
LIMIT 5;
```

---

## **Steps:**

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste the above SQL
4. Click "Run"
5. Should see: ✅ `placeholder_variant column exists`
6. Refresh your app

---

## **What This Adds:**

- ✅ `placeholder_variant` column (INTEGER, default 0)
- ✅ Index for performance
- ✅ Comment for documentation
- ✅ Verification query

---

**After running, your app will work!**

