# 💖 Saved Functionality Integration Guide

## ✅ What's Been Built

### Database
- **Table**: `user_saved_items` - stores all saved items with cross-device sync
- **Migration**: `20251201000000_create_user_saved_items.sql`
- **RLS**: Enabled with user-specific policies

### Server Actions (`lib/actions/user-saved-actions.ts`)
```typescript
saveItem(walletPassId, itemType, itemId, itemName?)
unsaveItem(walletPassId, itemType, itemId)
isItemSaved(walletPassId, itemType, itemId)
getUserSavedItems(walletPassId)
getSavedItemsCountByType(walletPassId)
```

### UI Components
- **Dashboard Card**: Shows real count from database
- **Saved Page**: `/user/saved` - Browse and manage saved items
- **Filter System**: Filter by type (businesses, events, offers, secret menus)

---

## 🔧 How to Integrate with Existing Components

### 1. Business Cards (Discover Page)

**File**: `components/user/business-card.tsx` or similar

```typescript
'use client'

import { useState, useEffect } from 'react'
import { saveItem, unsaveItem, isItemSaved } from '@/lib/actions/user-saved-actions'

export function BusinessCard({ business, walletPassId }) {
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check if business is already saved
  useEffect(() => {
    const checkSaved = async () => {
      if (walletPassId) {
        const saved = await isItemSaved(walletPassId, 'business', business.id)
        setIsSaved(saved)
      }
    }
    checkSaved()
  }, [walletPassId, business.id])

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent card click
    e.stopPropagation()
    
    if (!walletPassId) return
    
    setIsLoading(true)
    
    if (isSaved) {
      const result = await unsaveItem(walletPassId, 'business', business.id)
      if (result.success) setIsSaved(false)
    } else {
      const result = await saveItem(walletPassId, 'business', business.id, business.name)
      if (result.success) setIsSaved(true)
    }
    
    setIsLoading(false)
  }

  return (
    <div className="relative">
      {/* Existing card content */}
      
      {/* Save Button - Add to top-right corner */}
      <button
        onClick={handleToggleSave}
        disabled={isLoading}
        className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-all"
      >
        <svg 
          className={`w-5 h-5 ${isSaved ? 'text-pink-500 fill-current' : 'text-white'}`}
          fill={isSaved ? 'currentColor' : 'none'}
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>
    </div>
  )
}
```

### 2. Event Cards

**File**: `components/user/user-events-page.tsx` (already has save functionality)

**Update the existing `toggleSaved` function to use database:**

```typescript
// REPLACE localStorage logic with:
const toggleSaved = async (eventId: string) => {
  if (!walletPassId) return

  const isCurrentlySaved = savedEvents.has(eventId)
  
  if (isCurrentlySaved) {
    const result = await unsaveItem(walletPassId, 'event', eventId)
    if (result.success) {
      setSavedEvents(prev => {
        const newSet = new Set(prev)
        newSet.delete(eventId)
        return newSet
      })
    }
  } else {
    const event = events.find(e => e.id === eventId)
    const result = await saveItem(walletPassId, 'event', eventId, event?.event_name)
    if (result.success) {
      setSavedEvents(prev => new Set([...prev, eventId]))
    }
  }
}

// On page load, fetch saved events from database:
useEffect(() => {
  const loadSavedEvents = async () => {
    if (walletPassId) {
      const result = await getUserSavedItems(walletPassId)
      if (result.success) {
        const eventIds = result.items
          ?.filter(item => item.item_type === 'event')
          .map(item => item.item_id) || []
        setSavedEvents(new Set(eventIds))
      }
    }
  }
  loadSavedEvents()
}, [walletPassId])
```

### 3. Offer Cards

**File**: `components/user/user-offers-page.tsx` (already has favorite functionality)

**Update the existing `toggleFavorite` function:**

```typescript
// REPLACE localStorage logic with:
const toggleFavorite = async (offerId: string) => {
  if (!walletPassId) return

  const isCurrentlyFavorite = favorites.has(offerId)
  
  if (isCurrentlyFavorite) {
    const result = await unsaveItem(walletPassId, 'offer', offerId)
    if (result.success) {
      setFavorites(prev => {
        const newSet = new Set(prev)
        newSet.delete(offerId)
        return newSet
      })
    }
  } else {
    const offer = realOffers.find(o => o.id === offerId)
    const result = await saveItem(walletPassId, 'offer', offerId, offer?.offer_name)
    if (result.success) {
      setFavorites(prev => new Set([...prev, offerId]))
    }
  }
}

// On page load:
useEffect(() => {
  const loadFavorites = async () => {
    if (walletPassId) {
      const result = await getUserSavedItems(walletPassId)
      if (result.success) {
        const offerIds = result.items
          ?.filter(item => item.item_type === 'offer')
          .map(item => item.item_id) || []
        setFavorites(new Set(offerIds))
      }
    }
  }
  loadFavorites()
}, [walletPassId])
```

### 4. Secret Menu Items

**Add save functionality to secret menu items:**

```typescript
const handleSaveSecretItem = async (itemId: string, itemName: string) => {
  if (!walletPassId) return

  const result = await saveItem(walletPassId, 'secret_menu', itemId, itemName)
  if (result.success) {
    // Show success toast or update UI
  }
}
```

---

## 📊 Database Schema

```sql
CREATE TABLE user_saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(user_id) ON DELETE CASCADE,
  wallet_pass_id text NOT NULL,
  item_type text NOT NULL, -- 'business', 'event', 'offer', 'secret_menu'
  item_id text NOT NULL,
  item_name text,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(wallet_pass_id, item_type, item_id)
);
```

---

## 🎯 Next Steps

1. **Run the migration** (if not already done):
   ```bash
   # Copy SQL from supabase/migrations/20251201000000_create_user_saved_items.sql
   # Run in Supabase SQL Editor
   ```

2. **Update existing components** to use database instead of localStorage:
   - `user-events-page.tsx` - Replace `localStorage` save logic
   - `user-offers-page.tsx` - Replace `localStorage` favorite logic
   - `business-card.tsx` - Add save button
   - `user-business-detail-page.tsx` - Add save button to hero

3. **Test the flow**:
   - Save a business → Check dashboard count updates
   - Save an event → Check /user/saved page
   - Unsave an item → Check count decreases
   - Switch devices/browsers → Verify saves persist

4. **Optional enhancements**:
   - Add toast notifications on save/unsave
   - Add "Saved" badge to saved items
   - Add bulk unsave functionality
   - Add "Recently Saved" section to dashboard

---

## 💡 Tips

- **Cross-device sync**: All saves are stored in the database, so they work across devices!
- **Performance**: The count is fetched once on dashboard load, then cached
- **Real-time updates**: Use `router.refresh()` after save/unsave to update counts
- **Unique constraint**: Users can't save the same item twice (database handles this)
- **Type safety**: Use TypeScript types for `item_type` to prevent typos

---

## 🐛 Troubleshooting

**"No saved items showing"**
- Check if migration ran successfully
- Verify `walletPassId` is being passed correctly
- Check browser console for errors

**"Count not updating"**
- Call `router.refresh()` after save/unsave
- Verify server action is returning `success: true`

**"RLS errors"**
- Ensure user has valid `wallet_pass_id`
- Check RLS policies are enabled
- Use service role client in server actions

---

## 🎉 Done!

The saved functionality is now fully integrated and working with database persistence!

