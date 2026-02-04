# SOCIAL WIZARD — Franchise API Keys Fix

**Date:** 2026-02-04  
**Issue:** Social Wizard was using global env vars instead of franchise-specific API keys  
**Status:** ✅ Fixed

---

## 🐛 The Problem

Social Wizard was hardcoded to use:
- `process.env.OPENAI_API_KEY` (global)
- `process.env.ANTHROPIC_API_KEY` (global)

**This is wrong for multi-tenant!** Each franchise should pay for their own AI usage via their own API keys in `franchise_crm_configs.openai_api_key`.

---

## ✅ The Solution

Updated both AI endpoints to use `getFranchiseApiKeys(city)` from `lib/utils/franchise-api-keys.ts`.

### Updated Files:

1. **`app/api/social/ai/generate/route.ts`**
   - Added `city` field to business query
   - Fetches `franchiseKeys = await getFranchiseApiKeys(city)`
   - Uses `franchiseKeys.openai_api_key` instead of `process.env.OPENAI_API_KEY`
   - Uses `franchiseKeys.anthropic_api_key` instead of `process.env.ANTHROPIC_API_KEY`
   - Better error: "AI service not configured for {city}"

2. **`app/api/social/ai/generate-campaign/route.ts`**
   - Same changes as above
   - Spotlight campaign packs use franchise-specific keys

---

## 🎯 How It Works Now

### 1. **Business generates post**
```
User clicks "Generate Post" 
  ↓
API gets business_id
  ↓
Queries business_profiles for city: "bournemouth"
  ↓
Calls getFranchiseApiKeys('bournemouth')
  ↓
Returns franchise_crm_configs.openai_api_key for Bournemouth
  ↓
Creates OpenAI client with Bournemouth's key
  ↓
Bournemouth pays for AI usage ✅
```

### 2. **Error Handling**
```typescript
if (!franchiseKeys.openai_api_key) {
  return NextResponse.json({ 
    error: `AI service not configured for ${city}. Please add OpenAI API key in Admin Setup.` 
  }, { status: 500 })
}
```

---

## 📋 Where to Configure

### For Bournemouth (or any franchise):

1. **Navigate to:** `/business/admin-setup`
2. **Section:** "AI Services"
3. **Field:** "OpenAI API Key"
4. **Enter:** `sk-proj-YOUR_KEY_HERE`
5. **Click:** "Save Configuration"

**Or via SQL:**
```sql
UPDATE franchise_crm_configs
SET openai_api_key = 'sk-proj-YOUR_KEY_HERE'
WHERE city = 'bournemouth';
```

---

## 🔒 Security

✅ Keys stored per-franchise in database  
✅ Server-side only (never sent to browser)  
✅ Each franchise pays for their own AI  
✅ No global fallback (except during migration)

---

## 💰 Cost Per Franchise

**OpenAI (Featured tier):**
- ~$0.005 per generation
- 100 posts/month = ~$0.50
- Franchise pays directly

**Anthropic (Spotlight tier):**
- ~$0.015 per generation  
- 100 posts/month = ~$1.50
- Franchise pays directly

---

## ⚠️ Migration Note

The `lib/utils/franchise-api-keys.ts` utility has NO FALLBACK to env vars for AI keys:

```typescript
openai_api_key: data.openai_api_key || null, // NO FALLBACK
anthropic_api_key: data.anthropic_api_key || null, // NO FALLBACK
```

This prevents one franchise from accidentally paying for everyone's AI usage.

---

## ✅ Result

- ✅ Bournemouth uses `franchise_crm_configs.openai_api_key` for Bournemouth
- ✅ Calgary uses `franchise_crm_configs.openai_api_key` for Calgary  
- ✅ Each franchise pays for their own AI
- ✅ Follows same pattern as AI chat (already fixed)
- ✅ No global API key abuse

---

**Status:** Social Wizard now correctly uses per-franchise API keys! 🎉

Each city must configure their own OpenAI key in Admin Setup.
