# Weekly Vibe Digest Email - Implementation Spec

**Status**: TODO (Planned for future implementation)  
**Priority**: Medium (Post-MVP)  
**Owner**: TBD

---

## 📧 Overview

Send a **weekly recap email** to users every Sunday evening to:
1. Remind them to leave vibes for places they visited/engaged with
2. Show new offers/menus in their city
3. Display their impact stats (social proof)
4. Drive re-engagement with the platform

---

## 🎯 Key Decisions

### ✅ DO:
- Send **one email per week** (Sundays, 6pm local time)
- Batch multiple businesses in a single email
- Include social proof ("Your vibes helped X people")
- Require explicit opt-in
- Check if vibe already exists before including business

### ❌ DON'T:
- Send per-business reminder emails (too spammy)
- Send immediately after engagement (they haven't visited yet)
- Send if no recent activity (past 7 days)
- Send if user already left vibes for all businesses

---

## 📋 Email Template Structure

### Subject Line Options:
1. "Your week in [City] 🌟"
2. "How were your visits this week? 💚"
3. "Leave your vibes for this week's visits"

### Email Sections:

#### 1. Hero
```
Hi [FirstName],

You visited some great places in [City] this week! 
Quick: How were they?
```

#### 2. Business List (Max 5)
For each business without a vibe:
```
┌─────────────────────────────────┐
│ [Business Image Thumbnail]      │
│                                  │
│ 🍔 David's Diner                 │
│ ⭐⭐⭐⭐⭐ 4.8 (120 reviews)        │
│                                  │
│ [💚 Leave Vibe] [View Profile]  │
└─────────────────────────────────┘

Visited: 3 days ago
```

#### 3. New This Week (Optional)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 New in [City] this week:
- 5 new offers added
- 2 new secret menus unlocked

[Browse Offers]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 4. Impact Stats (Social Proof)
```
💚 Your Impact:
Your vibes helped 47 people discover 
great places this week!

Keep it up! You're in the top 10% of contributors.
```

#### 5. Footer
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Manage email preferences | Unsubscribe
Qwikker © 2026 | [City]
```

---

## 🗄️ Database Queries

### 1. Get Users to Email
```sql
-- Get users who should receive the digest
SELECT DISTINCT
  u.id,
  u.first_name,
  u.email,
  u.wallet_pass_id,
  bp.city
FROM app_users u
JOIN user_engagements e ON e.wallet_pass_id = u.wallet_pass_id
JOIN business_profiles bp ON bp.id = e.business_id
WHERE 
  u.email_opt_in = true
  AND u.email IS NOT NULL
  AND e.created_at >= NOW() - INTERVAL '7 days'
  AND e.engagement_type IN ('directions', 'call', 'offer_claim')
  -- Don't send if they've already received digest this week
  AND NOT EXISTS (
    SELECT 1 FROM email_logs 
    WHERE user_id = u.id 
    AND email_type = 'weekly_vibe_digest'
    AND sent_at >= date_trunc('week', NOW())
  )
```

### 2. Get Businesses for User (Without Vibes)
```sql
-- Get recent engagements without vibes
SELECT DISTINCT
  b.id,
  b.business_name,
  b.images[1] as image_url,
  b.rating,
  b.review_count,
  e.engagement_type,
  e.created_at as visited_at
FROM user_engagements e
JOIN business_profiles b ON b.id = e.business_id
LEFT JOIN qwikker_vibes v ON 
  v.business_id = b.id 
  AND v.vibe_user_key = $1  -- wallet_pass_id
WHERE 
  e.wallet_pass_id = $1
  AND e.created_at >= NOW() - INTERVAL '7 days'
  AND v.id IS NULL  -- No vibe left yet
  AND e.engagement_type IN ('directions', 'call', 'offer_claim')
ORDER BY e.created_at DESC
LIMIT 5
```

### 3. Get User Impact Stats
```sql
-- Calculate user's impact (how many people saw their vibes)
SELECT 
  COUNT(DISTINCT b.id) as businesses_vibed,
  COALESCE(SUM(b.views_last_week), 0) as people_helped
FROM qwikker_vibes v
JOIN business_profiles b ON b.id = v.business_id
WHERE 
  v.vibe_user_key = $1
  AND v.created_at >= NOW() - INTERVAL '7 days'
```

### 4. Get New Offers/Menus This Week
```sql
-- Get new content in user's city
SELECT 
  COUNT(*) FILTER (WHERE type = 'offer') as new_offers,
  COUNT(*) FILTER (WHERE type = 'secret_menu') as new_menus
FROM (
  SELECT 'offer' as type, created_at 
  FROM business_offers 
  WHERE city = $1 AND created_at >= NOW() - INTERVAL '7 days'
  UNION ALL
  SELECT 'secret_menu' as type, created_at 
  FROM business_secret_menus 
  WHERE city = $1 AND created_at >= NOW() - INTERVAL '7 days'
) content
```

---

## 🔧 Implementation Requirements

### Database Schema Changes:

#### 1. Add Email Opt-In to `app_users`
```sql
ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_preferences JSONB DEFAULT '{
  "weekly_digest": true,
  "new_offers": false,
  "business_replies": true,
  "monthly_updates": false
}'::jsonb;
```

#### 2. Create `user_engagements` Table (If Not Exists)
```sql
CREATE TABLE IF NOT EXISTS user_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id),
  wallet_pass_id TEXT,
  business_id UUID REFERENCES business_profiles(id),
  engagement_type TEXT CHECK (engagement_type IN (
    'directions', 'call', 'offer_claim', 'save', 'view'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_engagements_wallet 
  ON user_engagements(wallet_pass_id, created_at DESC);
CREATE INDEX idx_user_engagements_business 
  ON user_engagements(business_id, created_at DESC);
```

#### 3. Create `email_logs` Table
```sql
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id),
  email_type TEXT NOT NULL,
  email_subject TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX idx_email_logs_user_type 
  ON email_logs(user_id, email_type, sent_at DESC);
```

---

## 🚀 Cron Job Setup

### Supabase Edge Function (Recommended)
```typescript
// supabase/functions/weekly-vibe-digest/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // 1. Get users to email
  const { data: users } = await supabase.rpc('get_weekly_digest_recipients')
  
  // 2. For each user, generate email
  for (const user of users) {
    const emailData = await generateDigestEmail(user)
    await sendEmail(user.email, emailData)
    await logEmail(user.id, 'weekly_vibe_digest')
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### Cron Schedule
```sql
-- Run every Sunday at 6pm UTC (adjust for local timezone)
SELECT cron.schedule(
  'weekly-vibe-digest',
  '0 18 * * 0',  -- Sundays at 6pm
  $$
    SELECT net.http_post(
      url := 'https://[project-ref].supabase.co/functions/v1/weekly-vibe-digest',
      headers := '{"Authorization": "Bearer [anon-key]"}'::jsonb
    )
  $$
);
```

---

## 📊 Email Service Integration

### Option 1: Resend (Current)
- Already integrated
- Simple API
- Good deliverability

### Option 2: SendGrid / Mailgun
- More features (templates, analytics)
- Higher volume support
- A/B testing built-in

### Recommendation: 
Stick with **Resend** for MVP, migrate to SendGrid if volume grows.

---

## 🎨 Email Design

### Style Guide:
- Dark mode by default (matches app)
- Qwikker green (#00d083) for CTAs
- Mobile-first responsive design
- Max width: 600px
- Font: System fonts (Arial, Helvetica)

### CTA Buttons:
```html
<a href="[VIBE_LINK]" style="
  background: #00d083;
  color: #000;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  display: inline-block;
">
  💚 Leave Vibe
</a>
```

---

## 🧪 Testing Checklist

- [ ] Sends only to opted-in users
- [ ] Respects user timezone
- [ ] Doesn't send duplicate emails
- [ ] Shows only businesses without vibes
- [ ] Opens correct vibe form when clicked
- [ ] Unsubscribe link works
- [ ] Mobile responsive
- [ ] Dark mode rendering
- [ ] Analytics tracking (opens, clicks)

---

## 📈 Success Metrics

### Track:
1. **Email Performance**
   - Open rate (target: >25%)
   - Click rate (target: >10%)
   - Unsubscribe rate (keep <2%)

2. **Vibe Conversion**
   - % of users who leave vibes after email
   - Time to vibe submission
   - Number of vibes per user per week

3. **Re-engagement**
   - % of users who return to app after email
   - Session duration post-email
   - New offers/menus discovered

---

## 🔄 Iteration Plan

### v1 (MVP):
- Simple text email
- Max 5 businesses
- Basic impact stats
- Send Sundays 6pm

### v2:
- Rich HTML template
- Personalized recommendations
- A/B test subject lines
- Smart send time per user

### v3:
- Gamification (streaks, badges)
- Business replies to vibes
- Exclusive offers for top contributors
- Push notification alternative

---

## 🔗 Related Files

- Email templates: `lib/email/templates/weekly-vibe-digest.tsx`
- Cron function: `supabase/functions/weekly-vibe-digest/index.ts`
- Email preferences: `app/user/settings/email-preferences/page.tsx`
- Database migration: `supabase/migrations/YYYYMMDD_weekly_digest_system.sql`

---

## 💡 Future Enhancements

1. **Smart Timing**: Send at user's optimal engagement time
2. **Personalization**: Use AI to customize content per user
3. **Dynamic Content**: Weather-based recommendations
4. **Social Features**: "Your friends also vibed these places"
5. **Incentives**: Exclusive offers for vibe contributors

---

**Last Updated**: 2026-01-28  
**Next Review**: When ready to implement post-MVP
