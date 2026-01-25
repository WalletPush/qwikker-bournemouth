# Remaining Hardcode Fixes - Quick Reference

## Files Fixed ✅
1. ✅ components/user/user-dashboard-layout.tsx
2. ✅ components/user/user-dashboard-layout-mobile.tsx
3. ✅ components/user/user-discover-page.tsx

## Files Still Need Fixing 🔴

### Priority 1: AI Chat (CRITICAL - 10+ lines)
**File:** `components/user/user-chat-page.tsx`
**Lines:** 191-199, 562, 634

```typescript
// Add props
interface UserChatPageProps {
  currentCity?: string
  cityDisplayName?: string
}

// Line 191-199: Replace greetings array
const greetingMessages = userName ? [
  `Hey ${userName}! 👋 Looking for something tasty in ${cityDisplayName}? I've got the inside scoop...`,
  `${userName}! Ready to discover ${cityDisplayName}'s best spots?...`,
  `Alright ${userName}, what's the vibe? Looking for food, drinks, or just somewhere new to explore in ${cityDisplayName}?`,
] : [
  `Hey! 👋 Looking for something tasty in ${cityDisplayName}?...`,
  `Ready to discover ${cityDisplayName}'s best spots?...`,
  `Alright, what's the vibe? Looking for food, drinks, or just somewhere new to explore in ${cityDisplayName}?`,
]

// Line 562: Replace initial message
content: `Hi ${userName}! I'm here to help you discover the best of ${cityDisplayName}...`

// Line 634: Replace subtitle
<p className="text-slate-400 text-sm">Your local {cityDisplayName} guide</p>
```

### Priority 2: Secret Menu Page
**File:** `components/user/user-secret-menu-page.tsx`
**Lines:** 460, 649

```typescript
// Add props
interface UserSecretMenuPageProps {
  currentCity?: string
  cityDisplayName?: string
}

// Line 460:
Unlock {cityDisplayName}'s most guarded culinary secrets

// Line 649:
Every secret you unlock brings you closer to becoming a true {cityDisplayName} foodie insider.
```

### Priority 3: Dashboard Home
**File:** `components/user/user-dashboard-home.tsx`
**Line:** 172

```typescript
// Add props and replace
description: `Explore ${cityDisplayName}'s best restaurants, cafes, bars, and hidden gems — all carefully curated by locals`
```

### Priority 4: Settings Page
**File:** `components/user/user-settings-page.tsx`
**Lines:** 36, 42, 80, 291

```typescript
// Line 36:
const text = `Hey! I've been discovering amazing local businesses with Qwikker in ${cityDisplayName}. Check it out!`

// Line 42:
url: `https://${currentCity}.qwikker.com`

// Line 80:
Help your friends discover amazing local businesses in {cityDisplayName}!

// Line 291:
<p className="text-blue-400 text-lg font-semibold">{cityDisplayName}</p>
```

### Priority 5: How It Works
**File:** `components/user/user-how-it-works-page.tsx`
**Lines:** 35, 108, 120, 233, 278

Replace all "Bournemouth" with `{cityDisplayName}`

### Priority 6: Page Metadata
**Files:** 
- `app/user/dashboard/page.tsx` (lines 13, 108)
- `app/user/page.tsx` (line 6)
- `app/user/events/page.tsx` (lines 21-22)
- `app/user/saved/page.tsx` (line 43)

All need server-side city detection + pass to components.

## Pattern for Page Files

```typescript
import { headers } from 'next/headers'
import { getCityFromRequest, getCityDisplayName } from '@/lib/utils/city-detection'

export default async function Page() {
  const headersList = await headers()
  const currentCity = await getCityFromRequest(headersList)
  const cityDisplayName = getCityDisplayName(currentCity)
  
  return <Component 
    currentCity={currentCity}
    cityDisplayName={cityDisplayName}
  />
}
```

## Testing Checklist
- [ ] `bali.qwikker.com/user` shows "Bali" in header
- [ ] `bali.qwikker.com/user/chat` AI says "Bali"
- [ ] `bali.qwikker.com/user/discover` header says "Discover Bali"
- [ ] `bali.qwikker.com/user/settings` share link uses bali.qwikker.com
