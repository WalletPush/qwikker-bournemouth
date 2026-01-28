# Trust Signals Implementation Status

**Last Updated:** 2026-01-28  
**Branch:** `ai-eligible-toggle`  
**Status:** ⚠️ **VIBES MVP IS PRE-LAUNCH CRITICAL** (not post-launch)  

---

## ✅ **COMPLETED (This Session)**

### **1. Three-Tier Chat System**
- ✅ Database schema ready (`three-tier-chat-system.sql`)
- ✅ Views created:
  - `business_profiles_chat_eligible` (Tier 1: Paid/Trial)
  - `business_profiles_lite_eligible` (Tier 2: Claimed-Free with featured items)
  - `business_profiles_ai_fallback_pool` (Tier 3: Unclaimed, admin-approved)
- ✅ `admin_chat_fallback_approved` column added
- ✅ `menu_preview` max 5 items constraint (claimed-free only)
- ✅ `claim_welcome_modal_shown` column added
- ✅ Indexes optimized for city-based queries

**Files:**
- `/three-tier-chat-system.sql` (ready for Darryl to run)
- `/.cursor/plans/three_tier_chat_system.plan.md` (implementation guide)

---

### **2. Google Reviews Strategy**
- ✅ **Final Model:** Show verbatim snippets ONLY for unclaimed businesses
- ✅ Claimed businesses (free & paid) = NO review text
- ✅ Updated `lib/ai/hybrid-chat.ts`:
  - `googleReviewSnippets` only extracted for `status = 'unclaimed'`
  - Max 3 verbatim snippets per response
  - Proper logging: "UNCLAIMED business: {name}"
- ✅ Updated `components/user/user-chat-page.tsx`:
  - Distinct "From Google Reviews (Verbatim)" block
  - "Powered by Google" attribution
  - Link to Google Maps for full reviews
- ✅ Updated `app/api/ai/chat/route.ts`:
  - Pass through `googleReviewSnippets` field

**Files:**
- `/lib/ai/hybrid-chat.ts`
- `/components/user/user-chat-page.tsx`
- `/app/api/ai/chat/route.ts`
- `/THREE_TIER_CHAT_BEHAVIOR.md` (comprehensive documentation)

---

### **3. Strategic Documentation**
- ✅ `/TRUST_SIGNALS_ARCHITECTURE.md` (this is the master reference)
- ✅ `/QWIKKER_VIBES_ROADMAP.md` (Phase 1-4 implementation plan)
- ✅ `/THREE_TIER_CHAT_BEHAVIOR.md` (chat response examples, Google attribution rules)
- ✅ `/PHASE_0_INVESTIGATION_NOTES.md` (read-only investigation findings)

---

### **4. Security Hardening**
- ✅ Franchise isolation in middleware (`lib/supabase/middleware.ts`)
- ✅ Logout button server-side fix (`app/api/auth/logout/route.ts`, `components/logout-button.tsx`)
- ✅ API protection helper (`lib/auth/api-protection.ts`)
- ✅ Documentation:
  - `/SECURITY_FIXES_PHASE_9_COMPLETE.md`
  - `/SECURITY_HARDENING_COMPLETE.md`
  - `/SECURITY_HARDENING_CHANGELOG.md`
  - `/API_PROTECTION_USAGE_GUIDE.md`

---

## ⏳ **PENDING (Needs Action)**

### **1. SQL Migration (Darryl to run manually)**

**File:** `/three-tier-chat-system.sql`

**What it does:**
1. Adds `claim_welcome_modal_shown` BOOLEAN column
2. Adds `admin_chat_fallback_approved` BOOLEAN column
3. Creates `menu_preview` max 5 items constraint (claimed-free only)
4. Creates `business_profiles_lite_eligible` view
5. Creates `business_profiles_ai_fallback_pool` view
6. Creates performance indexes
7. Includes verification queries

**How to run:**
```bash
# Copy SQL to Supabase SQL Editor
# Run all sections (A → E)
# Check verification queries at the end
```

**Expected result:**
- ✅ No errors
- ✅ Verification queries show correct counts
- ✅ All views created

---

### **2. Chat Logic Updates (TypeScript)**

**Status:** ⚠️ NOT YET IMPLEMENTED

**What needs to change:**
- `lib/ai/hybrid-chat.ts`:
  - Query `business_profiles_lite_eligible` for Tier 2
  - Query `business_profiles_ai_fallback_pool` for Tier 3
  - Remove carousel generation for Tier 2 & 3
  - Return `paidCarousel`, `liteTextResponse`, `fallbackTextResponse`
  - Build separate AI response text for each tier

**Plan reference:**
- `/.cursor/plans/three_tier_chat_system.plan.md` (Phase 1)

---

### **3. Admin UI for Fallback Approval**

**Status:** ⚠️ NOT YET IMPLEMENTED

**What needs to be built:**
- Admin CRM page: Toggle for `admin_chat_fallback_approved`
- Only visible for `status = 'unclaimed'` businesses
- Description: "Include in AI chat when no paid results available"

**Plan reference:**
- `/.cursor/plans/three_tier_chat_system.plan.md` (Phase 2)

---

### **4. Testing Checklist**

After SQL migration + TypeScript updates:

#### **Test Tier 1 (Paid/Trial):**
- [ ] Ask chat: "Best pizza near me"
- [ ] Verify: Carousel cards shown
- [ ] Verify: AI uses menu data + offers + secret menu
- [ ] Verify: NO Google review snippets
- [ ] Verify: Vibes shown (when available)

#### **Test Tier 2 (Claimed-Free with featured items):**
- [ ] Ask chat: "Greek restaurants in Bournemouth"
- [ ] Verify: Text-only response (no carousel)
- [ ] Verify: AI mentions "confirmed featured items"
- [ ] Verify: NO Google review snippets
- [ ] Verify: Upsell message included

#### **Test Tier 3 (Unclaimed, fallback):**
- [ ] Ask chat: "Mediterranean food near me" (when NO paid results)
- [ ] Verify: Text-only response (no carousel)
- [ ] Verify: Google review snippets shown (max 3, verbatim)
- [ ] Verify: "From Google Reviews (Verbatim)" label
- [ ] Verify: "Powered by Google" attribution
- [ ] Verify: Link to Google Maps
- [ ] Verify: Disclaimer: "I don't have confirmed menu information..."

#### **Test Google Attribution:**
- [ ] Discover page: Attribution footer visible
- [ ] Business detail page: Attribution footer visible
- [ ] Chat (Tier 3 only): Attribution footer visible

---

## 🔴 **PRE-LAUNCH CRITICAL: Qwikker Vibes MVP**

**⚠️ STRATEGIC SHIFT:** Vibes is NOT a "phase 2 feature" - **it's core product positioning.**

**Timeline:** 2-3 days (BEFORE launch)

### **Why This Is Pre-Launch Critical:**

**Without Vibes:**
> "AI directory with Google ratings"

**With Vibes:**
> "AI that understands the type of experience places give"

**That's a category difference.**

---

### **Vibes MVP Checklist (2-3 Days):**

#### **Day 1: Database + Capture**
- [ ] Create `qwikker_vibes` table (simple: business_id, user_id, vibe_rating)
- [ ] Create `POST /api/vibes/submit` route
- [ ] Add vibe prompt UI (bottom sheet: 🔥/🙂/😕)
- [ ] Wire up triggers (directions, call, offer saved)
- [ ] Test submission flow

#### **Day 2: Display + Aggregation**
- [ ] Create `getBusinessVibes()` utility
- [ ] Add vibes display to business detail page
- [ ] Implement "0 vibes" invitation copy ("✨ Be the first")
- [ ] Implement "1-4 vibes" early feedback copy
- [ ] Implement "5+ vibes" percentage display
- [ ] Test all three states

#### **Day 3: AI Integration**
- [ ] Add vibes to business context in `lib/ai/hybrid-chat.ts`
- [ ] Update AI prompts to include vibe data (when >= 5)
- [ ] Test chat responses with/without vibes
- [ ] Verify no awkward "no data" language
- [ ] Test all three tiers (Paid/Lite/Fallback)

---

### **What We're NOT Building (Can Be Post-Launch):**
- ❌ Tag selection (phase 2)
- ❌ Advanced analytics (phase 2)
- ❌ Trend analysis (phase 2)
- ❌ Comparative insights (phase 2)

### **What We ARE Building (MVP):**
- ✅ 3-level vibe capture (🔥/🙂/😕)
- ✅ Basic storage (business_id, user_id, vibe_rating)
- ✅ Simple display (percentage + count)
- ✅ AI integration (mention in chat responses)

**Full implementation guide:** `/VIBES_MVP_PRE_LAUNCH.md`  
**Full roadmap (post-launch enhancements):** `/QWIKKER_VIBES_ROADMAP.md`

---

## 📋 **Files Modified This Session**

### **Chat System:**
- `lib/ai/hybrid-chat.ts`
- `components/user/user-chat-page.tsx`
- `app/api/ai/chat/route.ts`

### **Security:**
- `lib/supabase/middleware.ts`
- `lib/auth/api-protection.ts`
- `app/api/auth/logout/route.ts`
- `components/logout-button.tsx`

### **Documentation:**
- `TRUST_SIGNALS_ARCHITECTURE.md` (NEW)
- `TRUST_SIGNALS_IMPLEMENTATION_STATUS.md` (NEW - this file)
- `QWIKKER_VIBES_ROADMAP.md` (updated)
- `THREE_TIER_CHAT_BEHAVIOR.md` (updated)
- `PHASE_0_INVESTIGATION_NOTES.md` (updated)
- `SECURITY_FIXES_PHASE_9_COMPLETE.md` (NEW)
- `SECURITY_HARDENING_COMPLETE.md` (NEW)
- `SECURITY_HARDENING_CHANGELOG.md` (NEW)
- `API_PROTECTION_USAGE_GUIDE.md` (NEW)

### **SQL:**
- `three-tier-chat-system.sql` (ready to run)

---

## 🎯 **Immediate Next Steps (REVISED PRIORITY)**

### **🔴 PRIORITY 1: Vibes MVP (2-3 Days - PRE-LAUNCH)**

**This is now pre-launch critical, not post-launch.**

1. **Day 1:** Database + Capture
   - Create `qwikker_vibes` table
   - Build `POST /api/vibes/submit` route
   - Add vibe prompt UI (🔥/🙂/😕 bottom sheet)
   
2. **Day 2:** Display + Aggregation
   - Create `getBusinessVibes()` utility
   - Add vibes display to business pages
   - Implement "0 vibes" invitation UX
   
3. **Day 3:** AI Integration
   - Add vibes to chat context
   - Update AI prompts
   - Test all tiers

**See:** `/VIBES_MVP_PRE_LAUNCH.md` (complete implementation guide)

---

### **🟡 PRIORITY 2: Three-Tier Chat System (Parallel Track)**

1. **Review SQL script** (`three-tier-chat-system.sql`)
2. **Run SQL migration** in Supabase (Darryl)
3. **Verify DB changes** (check verification queries)
4. **Update TypeScript** (follow plan: Phase 1)
5. **Test all three tiers** (see testing checklist above)

---

### **🟢 PRIORITY 3: Deploy to Main**

After both tracks complete:
- Test on `ai-eligible-toggle` branch
- Merge to `main`
- Deploy

---

## 💡 **Key Reminders**

- **Google reviews:** Verbatim snippets ONLY for unclaimed (Tier 3)
- **Claimed businesses:** NO review text (free or paid)
- **Tier hierarchy:** Money buys visibility, vibes enhance quality within tier
- **Vibes are future:** Not launched yet, but architecture is ready

---

**Ready to test. Clean architecture. Strategic clarity. ✅**
