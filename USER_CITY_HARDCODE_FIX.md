# User City Hardcode Fix - Complete Audit

## Problem
The entire `/user` section has **40+ hardcoded "Bournemouth" references** that break when accessed from other cities (e.g., `bali.qwikker.com/user`).

## Files Affected

### 🔴 CRITICAL (Shows wrong city name to users)
1. **components/user/user-dashboard-layout.tsx** (Line 218)
   - Shows "Bournemouth" in header
   - City avatar shows "B"
   
2. **components/user/user-dashboard-layout-mobile.tsx** (Line 199)
   - Mobile sidebar shows "Bournemouth"

3. **components/user/user-discover-page.tsx** (Line 205)
   - Header says "Discover Bournemouth"

4. **components/user/user-chat-page.tsx** (Lines 191-199, 562, 634)
   - AI greeting messages say "Bournemouth"
   - Subtitle says "Your local Bournemouth guide"

### 🟡 HIGH PRIORITY (Affects UX)
5. **components/user/user-secret-menu-page.tsx** (Lines 460, 649)
   - "Unlock Bournemouth's most guarded culinary secrets"
   - "true Bournemouth foodie insider"

6. **components/user/user-dashboard-home.tsx** (Line 172)
   - Card description mentions Bournemouth

7. **components/user/user-settings-page.tsx** (Lines 36, 42, 80, 291)
   - Share text mentions Bournemouth
   - URL hardcoded to bournemouth.qwikker.com
   - City display shows Bournemouth

8. **components/user/user-how-it-works-page.tsx** (Lines 35, 108, 120, 233, 278)
   - Multiple mentions of Bournemouth in explanatory text

### 🟢 MEDIUM PRIORITY (Metadata/SEO)
9. **app/user/dashboard/page.tsx** (Line 13, 108)
   - Metadata mentions Bournemouth
   - defaultCity hardcoded

10. **app/user/page.tsx** (Line 6)
    - Metadata mentions Bournemouth

11. **app/user/events/page.tsx** (Lines 21-22)
    - Falls back to Bournemouth

12. **app/user/saved/page.tsx** (Line 43)
    - Hardcoded city

## Solution Strategy

### Phase 1: Add City Detection to Pages ✅
All `/app/user/**/page.tsx` files should:
```typescript
import { headers } from 'next/headers'
import { getCityFromRequest, getCityDisplayName } from '@/lib/utils/city-detection'

export default async function Page() {
  const headersList = await headers()
  const currentCity = await getCityFromRequest(headersList)
  const cityDisplayName = getCityDisplayName(currentCity)
  
  // Pass to components as props
}
```

### Phase 2: Update Component Props
All client components need to accept city props:
```typescript
interface ComponentProps {
  currentCity: string
  cityDisplayName: string
}
```

### Phase 3: Replace Hardcoded Text
Replace all instances of:
- "Bournemouth" → `{cityDisplayName}`
- "bournemouth" → `{currentCity}`
- "bournemouth.qwikker.com" → `${currentCity}.qwikker.com`

## Implementation Order
1. ✅ UserDashboardLayout (header city display)
2. ✅ UserDashboardLayoutMobile (sidebar city display)
3. ✅ UserChatPage (AI greeting messages)
4. ✅ UserDiscoverPage (header)
5. ✅ UserSecretMenuPage (headers/text)
6. ✅ UserDashboardHome (card descriptions)
7. ✅ UserSettingsPage (share text, URLs, city display)
8. ✅ UserHowItWorksPage (explanatory text)
9. ✅ Page metadata (all `/app/user/**/page.tsx` files)

## Testing Checklist
- [ ] Visit `bali.qwikker.com/user` - should say "Bali" everywhere
- [ ] Check AI chat greetings mention correct city
- [ ] Check settings page share links use correct subdomain
- [ ] Check discover page header
- [ ] Check secret menu page copy
- [ ] Check metadata/SEO tags

## Estimated Time
- **40+ files to update**
- **~2 hours of careful refactoring**
- **Critical for multi-city launch**
