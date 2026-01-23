# Offer Expiry Notification System - Implementation Plan

## Overview

Notify businesses 7 days before their offers expire, giving them the option to extend or re-list.

---

## System Architecture

### Option 1: Supabase Edge Function + Cron (Recommended) ⭐

**Why:** Built-in, reliable, doesn't require external services.

```typescript
// supabase/functions/check-expiring-offers/index.ts
import { createClient } from '@supabase/supabase-js'
import { sendOfferExpiryEmail } from './email-templates'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Find offers expiring in exactly 7 days
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
  const sevenDaysDate = sevenDaysFromNow.toISOString().split('T')[0]

  const { data: expiringOffers } = await supabase
    .from('business_offers')
    .select(`
      id,
      offer_name,
      offer_value,
      offer_end_date,
      business_id,
      business_profiles!inner(
        business_name,
        email,
        owner_user_id
      )
    `)
    .eq('status', 'approved')
    .eq('offer_end_date', sevenDaysDate)
    .is('expiry_notification_sent', null) // Only send once

  for (const offer of expiringOffers || []) {
    await sendOfferExpiryEmail({
      businessName: offer.business_profiles.business_name,
      businessEmail: offer.business_profiles.email,
      offerName: offer.offer_name,
      offerValue: offer.offer_value,
      expiryDate: offer.offer_end_date,
      extendUrl: `https://yourdomain.com/dashboard/offers?extend=${offer.id}`
    })

    // Mark as sent
    await supabase
      .from('business_offers')
      .update({ expiry_notification_sent: true })
      .eq('id', offer.id)
  }

  return new Response(JSON.stringify({ sent: expiringOffers?.length }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Setup:**
1. Create edge function: `supabase functions new check-expiring-offers`
2. Deploy: `supabase functions deploy check-expiring-offers`
3. Set up cron: Run daily at 9am (in Supabase Dashboard → Edge Functions → Cron)
4. Add cron trigger: `0 9 * * *` (every day at 9am UTC)

---

### Option 2: Vercel Cron (If using Vercel)

```typescript
// app/api/cron/check-expiring-offers/route.ts
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Same logic as above...
  
  return Response.json({ sent: count })
}
```

**Setup:**
1. Add route: `app/api/cron/check-expiring-offers/route.ts`
2. Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/check-expiring-offers",
    "schedule": "0 9 * * *"
  }]
}
```
3. Set `CRON_SECRET` in Vercel env vars

---

## Database Schema Changes

### Required Migration

```sql
-- Add notification tracking column
ALTER TABLE business_offers
ADD COLUMN expiry_notification_sent BOOLEAN DEFAULT FALSE;

-- Optional: Track notification history
CREATE TABLE offer_expiry_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES business_offers(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id),
  sent_at TIMESTAMP DEFAULT NOW(),
  email_sent_to TEXT,
  notification_type TEXT CHECK (notification_type IN ('7_day_warning', '1_day_warning', 'expired')),
  opened BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  extended BOOLEAN DEFAULT FALSE
);
```

---

## Email Template

```typescript
// lib/email/offer-expiry-templates.ts
export const offerExpiryEmail = ({
  businessName,
  offerName,
  offerValue,
  expiryDate,
  extendUrl
}: {
  businessName: string
  offerName: string
  offerValue: string
  expiryDate: string
  extendUrl: string
}) => ({
  subject: `⏰ Your offer "${offerName}" expires in 7 days`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Hi ${businessName}! 👋</h2>
      
      <p>Your offer is about to expire:</p>
      
      <div style="background: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0;">${offerName}</h3>
        <p style="margin: 0; font-size: 18px; color: #00d083;"><strong>${offerValue}</strong></p>
        <p style="margin: 10px 0 0 0; color: #666;">
          Expires: <strong>${new Date(expiryDate).toLocaleDateString('en-GB', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</strong>
        </p>
      </div>
      
      <p><strong>What would you like to do?</strong></p>
      
      <div style="margin: 30px 0;">
        <a href="${extendUrl}" style="
          background: #00d083;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          display: inline-block;
          font-weight: bold;
        ">Extend This Offer</a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        <strong>Don't want to extend?</strong><br>
        No problem! After it expires, you can still find it in your "Expired Offers" tab 
        and re-list it anytime with new dates.
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      
      <p style="color: #999; font-size: 12px;">
        You're receiving this because your offer is expiring soon. 
        Manage your offers at dashboard.qwikker.com
      </p>
    </div>
  `,
  text: `
    Hi ${businessName}!
    
    Your offer is about to expire in 7 days:
    
    ${offerName} - ${offerValue}
    Expires: ${expiryDate}
    
    Click here to extend it: ${extendUrl}
    
    Or, after it expires, you can re-list it anytime from your Expired Offers tab.
  `
})
```

---

## Email Service Integration

### Using Resend (Recommended) ⭐

```typescript
// lib/email/resend-client.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOfferExpiryEmail(params: EmailParams) {
  const template = offerExpiryEmail(params)
  
  return await resend.emails.send({
    from: 'QWIKKER <offers@qwikker.com>',
    to: params.businessEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    tags: {
      type: 'offer_expiry',
      business_id: params.businessId
    }
  })
}
```

**Setup:**
1. Sign up at resend.com (free tier: 3,000/month)
2. Add API key to env: `RESEND_API_KEY=re_...`
3. Verify domain: `offers@qwikker.com`
4. Install: `pnpm add resend`

**Cost:** FREE for <3,000 emails/month, then $20/month for 50k

---

### Alternative: SendGrid, Postmark, AWS SES

All work similarly, just swap the client.

---

## Extend Offer Flow

### 1. User Clicks "Extend" in Email

Links to: `/dashboard/offers?extend=<offer_id>`

### 2. Dashboard Pre-fills Form

```typescript
// app/dashboard/offers/page.tsx
const searchParams = useSearchParams()
const extendOfferId = searchParams.get('extend')

useEffect(() => {
  if (extendOfferId) {
    const offer = profile.business_offers?.find(o => o.id === extendOfferId)
    if (offer) {
      setFormData({
        ...offer,
        endDate: '' // Clear to let them pick new date
      })
      setEditingOfferId(offer.id)
      setShowCreateForm(true)
    }
  }
}, [extendOfferId])
```

### 3. User Updates End Date & Saves

Existing update logic handles it. Offer stays active!

---

## Additional Enhancements (Optional)

### 1. Multiple Warning Emails
- 7 days before (primary)
- 1 day before (final reminder)
- Day of expiry ("Your offer just expired - re-list it now!")

### 2. Dashboard Banner
When offer is <7 days from expiry, show banner on dashboard:

```tsx
{activeOffers.some(o => 
  o.offer_end_date && 
  daysBetween(new Date(), new Date(o.offer_end_date)) <= 7
) && (
  <Alert className="bg-orange-500/10 border-orange-500/30">
    <Clock className="h-4 w-4 text-orange-400" />
    <AlertTitle>Offers Expiring Soon</AlertTitle>
    <AlertDescription>
      You have offers expiring in the next 7 days. 
      <Link href="/dashboard/offers?tab=active" className="underline ml-1">
        Review them now
      </Link>
    </AlertDescription>
  </Alert>
)}
```

### 3. Analytics
Track in `offer_expiry_notifications` table:
- Email open rate
- Click rate
- Extension rate (how many actually extended)
- Use for product insights

### 4. Auto-Extend Option
Let businesses opt into "auto-renew" for seasonal offers:

```sql
ALTER TABLE business_offers
ADD COLUMN auto_renew BOOLEAN DEFAULT FALSE;
```

Then cron job extends automatically instead of emailing.

---

## Implementation Timeline

### Week 1: Core System
- [ ] Add `expiry_notification_sent` column
- [ ] Create edge function or cron route
- [ ] Implement email template
- [ ] Set up Resend account
- [ ] Deploy & test with fake data

### Week 2: Polish
- [ ] Add dashboard banner for expiring offers
- [ ] Track email opens/clicks (optional)
- [ ] Add "extend from email" flow
- [ ] Test with real business

### Week 3: Enhancements
- [ ] Add 1-day reminder
- [ ] Add "just expired" email
- [ ] Analytics dashboard
- [ ] Auto-renew option (if requested)

---

## Testing

### Manual Test
1. Create offer with `offer_end_date` = 7 days from today
2. Set `expiry_notification_sent = false`
3. Run edge function manually: `curl -X POST <function-url>`
4. Check email inbox
5. Verify `expiry_notification_sent = true`
6. Click "Extend" link
7. Verify dashboard pre-fills form

### Automated Test
```typescript
// tests/offer-expiry.test.ts
describe('Offer Expiry Notifications', () => {
  it('sends email 7 days before expiry', async () => {
    const offer = await createTestOffer({ daysUntilExpiry: 7 })
    await runExpiryCheck()
    expect(emailSent).toBe(true)
    expect(offer.expiry_notification_sent).toBe(true)
  })

  it('does not send twice', async () => {
    const offer = await createTestOffer({ 
      daysUntilExpiry: 7,
      expiry_notification_sent: true 
    })
    await runExpiryCheck()
    expect(emailSentCount).toBe(0)
  })
})
```

---

## Cost Estimate

- **Supabase Edge Functions:** FREE (included)
- **Resend (email):** FREE for <3,000/month
- **Total:** $0/month for typical usage

For 100 businesses with avg 2 offers each = 200 offers
If 50% expire per month = 100 emails/month
Well under free tier!

---

## Rollout Plan

1. **Soft Launch (Week 1-2)**
   - Enable for 5-10 test businesses
   - Monitor for issues
   - Collect feedback

2. **Beta (Week 3-4)**
   - Enable for 50% of businesses
   - A/B test email copy
   - Measure extension rate

3. **Full Launch (Week 5+)**
   - Enable for all businesses
   - Announce feature in newsletter
   - Add to onboarding docs

---

## Success Metrics

- **Email open rate:** Target >40%
- **Click rate:** Target >20%
- **Extension rate:** Target >30% (businesses actually extend)
- **Feedback:** <5% unsubscribe/complaints

---

## Future Enhancements

1. **SMS notifications** (for businesses who prefer texts)
2. **Slack/Discord integration** (for multi-person teams)
3. **Offer performance report** ("This offer got 47 claims - extend it?")
4. **Smart suggestions** ("Similar offers in your city are ending on [date]")

---

## Status

📋 **PLANNED** - Ready for implementation

### Next Steps:
1. User approval of approach
2. Set up Resend account
3. Create migration file
4. Implement edge function
5. Deploy & test
