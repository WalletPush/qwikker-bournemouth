# SOCIAL WIZARD — Anthropic Fallback Fix

**Date:** 2026-02-04  
**Issue:** Invalid Anthropic API key causing 500 errors with no error message  
**Status:** ✅ Fixed with fallback

---

## 🐛 The Problem

**What happened:**
```
User: Spotlight tier business
System: "Let's use Claude Sonnet!"
Anthropic API: 401 {"type":"authentication_error","message":"invalid x-api-key"}
System: *crashes* → Returns 500 with empty {}
Frontend: "AI generation failed" (no details)
```

**Root cause:**
- Spotlight tier prefers Claude (Anthropic)
- Bournemouth had an invalid Anthropic API key in database
- No error handling = crash = no error message to frontend

---

## ✅ The Solution

### Added Try/Catch with Fallback

**Now:**
```typescript
try {
  // Try Claude first (Spotlight tier)
  const response = await anthropic.messages.create({...})
  aiResponse = response.content[0].text
} catch (anthropicError) {
  console.error(`❌ Anthropic API error for ${city}, falling back to OpenAI`)
  
  // Fallback to OpenAI if available
  if (!franchiseKeys.openai_api_key) {
    return { error: `Claude failed and no OpenAI fallback` }
  }
  // Continue to OpenAI below...
}

if (!aiResponse) {
  // Use OpenAI (primary or fallback)
  const openai = new OpenAI({ apiKey: franchiseKeys.openai_api_key })
  // ...
}
```

---

## 🎯 How It Works Now

### Scenario 1: Valid Anthropic Key (Spotlight)
```
✅ Try Claude → Success → Return captions
```

### Scenario 2: Invalid Anthropic Key + Valid OpenAI (Spotlight)
```
❌ Try Claude → Fails (401)
  ↓
⚠️  Log error: "Anthropic API error, falling back to OpenAI"
  ↓
✅ Try OpenAI → Success → Return captions
```

### Scenario 3: No Valid Keys (Any tier)
```
❌ Try Claude → Fails
❌ No OpenAI key → Return error: "No AI service configured"
```

---

## 🔧 To Fix Invalid Anthropic Key

### Option 1: Remove It (Use OpenAI Only)
```sql
UPDATE franchise_crm_configs
SET anthropic_api_key = NULL
WHERE city = 'bournemouth';
```

**Result:** Spotlight will use OpenAI instead of Claude

### Option 2: Fix It (Use Claude)
```sql
-- Get a valid Anthropic API key from https://console.anthropic.com/
UPDATE franchise_crm_configs
SET anthropic_api_key = 'sk-ant-YOUR_VALID_KEY_HERE'
WHERE city = 'bournemouth';
```

**Result:** Spotlight will use Claude

---

## 📊 Cost Comparison

| Model | Tier | Cost per Post | Quality |
|-------|------|---------------|---------|
| **gpt-4o** | Featured/Spotlight | ~$0.005 | ⭐⭐⭐⭐ |
| **claude-sonnet-4** | Spotlight only | ~$0.015 | ⭐⭐⭐⭐⭐ |

**Recommendation for Spotlight:**
- Claude Sonnet 4 is 3x more expensive but produces better content
- Worth it for premium businesses
- Falls back to OpenAI if Claude key is invalid

---

## ✅ Result

**Before:**
- ❌ 500 error with no message
- ❌ Frontend shows generic "AI generation failed"
- ❌ No fallback

**After:**
- ✅ Claude error caught gracefully
- ✅ Automatic fallback to OpenAI
- ✅ Helpful error messages
- ✅ Server logs show exactly what failed

---

## 🧪 Testing

**Restart dev server and test:**
```bash
pnpm dev
```

**Expected logs (with invalid Claude key):**
```
🎨 Generating posts for {Business} (spotlight tier, bournemouth)
🤖 Using claude-sonnet-4 for generation (franchise: bournemouth)
❌ Anthropic API error for bournemouth, falling back to OpenAI: 401 invalid x-api-key
✅ OpenAI fallback successful
✓ POST /api/social/ai/generate 200
```

**Frontend should:**
- ✅ Return 3 caption variants
- ✅ No error shown to user
- ✅ Silently falls back to OpenAI

---

**Status:** Fixed! Invalid Anthropic key now falls back to OpenAI gracefully. 🎉
