# Environment Variables

## Required Global Variables

Add these to your `.env.local` (development) and Vercel environment variables (production):

### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Cloudinary (GLOBAL)
**IMPORTANT:** Cloudinary is shared across ALL franchises. Multi-tenancy is enforced at the API/database layer, not at Cloudinary level.

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_UNSIGNED_PRESET=your_unsigned_preset_name
```

**Setup instructions:**
1. Create a Cloudinary account (free tier is fine to start)
2. Go to Settings → Upload → Add upload preset
3. Set to "Unsigned" for development
4. Configure allowed formats: `jpg, png, webp` only
5. Set max file size limits
6. Add folder restrictions if needed

**Security notes:**
- Unsigned presets are convenient but should be locked down in Cloudinary dashboard
- Consider moving to signed uploads for production
- Use server-side validation for all uploads (already implemented)

### App Configuration
```bash
NEXT_PUBLIC_BASE_URL=https://qwikker.com
NODE_ENV=development
```

---

## Per-Franchise Configuration

The following are configured PER FRANCHISE via the admin setup wizard and stored in the `franchise_crm_configs` table:

- **Google Places API Key** - for importing businesses
- **Twilio Account SID, Auth Token, Messaging Service SID** - for SMS notifications
- **Resend API Key, From Email, From Name** - for transactional emails

These are NOT environment variables. Franchise admins configure them through the UI.

---

## Local Development

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Never commit `.env.local` to git (already in `.gitignore`).

---

## Vercel Deployment

Add all environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add each variable for all environments (Production, Preview, Development)
3. Redeploy if needed

---

## Security Checklist

- ✅ Supabase service role key is NEVER exposed to client
- ✅ Cloudinary config is server-side only (used in API routes)
- ✅ Per-franchise secrets (Twilio, Resend, Google) are in database, not env vars
- ✅ All sensitive env vars are in `.gitignore`
- ✅ Vercel env vars are encrypted at rest

