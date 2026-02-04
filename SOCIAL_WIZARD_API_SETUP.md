# SOCIAL WIZARD — API Setup Required

**Status:** ⚠️ AI API keys not configured  
**Impact:** AI generation will fail until configured

---

## 🔑 Required API Keys

Social Wizard needs an AI API key to generate content:

### Option 1: OpenAI (Recommended for Featured tier)
1. Get API key from: https://platform.openai.com/api-keys
2. Add to `.env.local`:
```bash
OPENAI_API_KEY=sk-proj-...your-key-here...
```

### Option 2: Anthropic Claude (For Spotlight tier)
1. Get API key from: https://console.anthropic.com/
2. Add to `.env.local`:
```bash
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

### Both (Best for Production)
```bash
# Featured tier uses OpenAI
OPENAI_API_KEY=sk-proj-...

# Spotlight tier uses Claude (falls back to OpenAI if missing)
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 📋 Setup Steps

### 1. Add API key to `.env.local`
```bash
# Open .env.local
nano .env.local

# Add this line (use your actual key):
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Save and exit (Ctrl+X, then Y, then Enter)
```

### 2. Restart your dev server
```bash
# Stop the server (Ctrl+C)
# Start it again
pnpm dev
```

### 3. Test AI generation
- Navigate to `/business/social-wizard`
- Select goal + tone
- Click "Generate Post"
- Should return 3 caption variants ✅

---

## 💰 Cost Estimates

### OpenAI (gpt-4o)
- **Cost:** ~$0.005 per generation
- **Monthly (100 posts):** ~$0.50
- **Recommended for:** Featured tier

### Anthropic (Claude Sonnet 4)
- **Cost:** ~$0.015 per generation  
- **Monthly (100 posts):** ~$1.50
- **Recommended for:** Spotlight tier (premium quality)

---

## 🔒 Security

- ✅ API keys are server-side only
- ✅ Never exposed to browser
- ✅ Used only in API routes
- ✅ Add to `.gitignore` (already done via `.env.local`)

---

## 🧪 Quick Test

Run this to verify your key works:

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY_HERE" \
  | grep gpt-4o
```

Should return model info if key is valid.

---

## ❌ Troubleshooting

### Error: "AI service not configured"
→ API key not in `.env.local` or dev server not restarted

### Error: "Unauthorized" or "Invalid API key"
→ Check your API key is correct and active

### Error: "Insufficient quota"
→ Add credits to your OpenAI/Anthropic account

---

## 🎯 Next Steps

1. ✅ Add `OPENAI_API_KEY` to `.env.local`
2. ✅ Restart dev server
3. ✅ Test generation in Social Wizard
4. ✅ Monitor costs in OpenAI dashboard

---

**Once configured, AI generation will work!** 🚀
