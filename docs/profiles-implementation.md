# Profiles Table Implementation

## Overview
Successfully implemented a comprehensive profiles table with extended user data, automatic profile creation, and secure Row Level Security policies.

## What Was Created

### 1. TypeScript Types (`/types/`)
- **`types/profiles.ts`** - Complete type definitions for profiles with enums for dropdown values
- **`types/database.ts`** - Supabase-specific database types for type-safe queries
- **`types/index.ts`** - Centralized type exports

### 2. Database Migration (`supabase/migrations/20250915180000_create_profiles_table.sql`)

#### Table Structure: `public.profiles`
- **Primary Key**: `id` (UUID)
- **User Reference**: `user_id` (references `auth.users.id`)

#### Personal Information
- `first_name`, `last_name`, `email`, `phone`

#### Marketing & Goals
- `referral_source` (dropdown with predefined options)
- `goals` (dropdown with predefined options)  
- `notes` (free text)

#### Business Information
- `business_name`, `business_type` (dropdown), `business_category`
- `business_address`, `business_town` (dropdown), `business_postcode`

#### Online Presence
- `website_url`, `instagram_handle`, `facebook_url`, `logo` (file URL)

#### Offer Data
- `offer_name`, `offer_type` (dropdown), `offer_value`
- `offer_claim_amount` (dropdown), `offer_start_date`, `offer_end_date`
- `offer_terms`, `offer_image` (file URL)

#### Plan & Billing
- `plan` (starter/spotlight/pro) - defaults to 'starter'
- `trial_expiry` - defaults to 120 days from signup
- `is_founder` - boolean for early adopter discount

#### Metadata
- `created_at`, `updated_at` (auto-managed)

### 3. Database Functions & Triggers

#### Auto Profile Creation
- **`handle_new_user()`** - Automatically creates profile when user signs up
- **`on_auth_user_created`** - Trigger that fires after user creation in `auth.users`
- Copies email from `auth.users` and sets default plan to 'starter'
- Sets `is_founder` to true for signups before 2025-12-31 (configurable)

#### Auto Timestamp Updates
- **`handle_updated_at()`** - Updates `updated_at` column on modifications
- **`update_profiles_updated_at`** - Trigger for automatic timestamp management

### 4. Row Level Security (RLS)

#### Security Policies
- **SELECT**: Users can only view their own profile
- **INSERT**: Users can only create their own profile  
- **UPDATE**: Users can only update their own profile
- **DELETE**: Users can only delete their own profile

All policies use `auth.uid() = user_id` to ensure data isolation.

### 5. Database Optimizations
- Indexes on frequently queried columns (`user_id`, `business_town`, `business_type`, `plan`, `trial_expiry`, `created_at`)
- Check constraints on dropdown fields to ensure data integrity
- Comprehensive table and column comments for documentation

## Dropdown Options Available

### Referral Sources
- Google Search, Social Media, Word of Mouth, Advertising, Partner Referral, Other

### User Goals  
- Increase Customers, Improve Marketing, Boost Sales, Build Brand Awareness, Customer Retention, Expand Business, Other

### Business Types
- Bar, Café, Restaurant, Salon, Spa, Gym, Retail Shop, Hotel, Service Business, Other

### Business Towns
- Bournemouth, Poole, Christchurch, Wimborne, Ferndown, Ringwood, New Milton, Other

### Offer Types
- Discount, 2-for-1, Freebie, Buy X Get Y, Percentage Off, Fixed Amount Off, Other

### Offer Claim Amounts
- First 10, First 25, First 50, First 100, Unlimited, Custom

### Subscription Plans
- Starter, Spotlight, Pro

## Security Features

✅ **Row Level Security Enabled** - Only users can access their own data  
✅ **Automatic Profile Creation** - Profiles created on signup via trigger  
✅ **Data Validation** - Check constraints on dropdown fields  
✅ **Secure Functions** - All functions use `SECURITY INVOKER` and empty `search_path`  
✅ **Proper Indexing** - Optimized for common query patterns  

## Next Steps

### 1. Update Supabase Client Types
Add the new types to your Supabase client configuration:

```typescript
import { Database } from '@/types/database';

// In your supabase client files
const supabase = createClient<Database>(url, key);
```

### 2. Create Profile Management Components
- Profile creation/editing forms using the dropdown constants
- Profile viewing components
- File upload handling for logo and offer images

### 3. Server Actions for Profile Management
Create server actions for:
- Getting user profile: `getProfile()`
- Updating profile: `updateProfile()`
- Uploading files: `uploadProfileImage()`, `uploadOfferImage()`

### 4. Form Validation
Use Zod schemas based on the TypeScript types for form validation.

### 5. File Storage Setup
Configure Supabase Storage buckets for:
- Business logos (`logos` bucket)
- Offer images (`offer-images` bucket)

## Testing the Implementation

1. **Test Auto Profile Creation**: Sign up a new user and verify profile is created
2. **Test RLS Policies**: Ensure users can only access their own data
3. **Test Data Validation**: Try inserting invalid dropdown values (should fail)
4. **Test Timestamps**: Verify `created_at` and `updated_at` work correctly

## Migration Applied Successfully ✅

The migration has been successfully applied to your remote Supabase database. The profiles table is now ready for use with all triggers, RLS policies, and indexes in place.
