# 🚀 QWIKKER Environment Variables Setup

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# ===== SUPABASE CONFIGURATION =====
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ===== EMAIL CONFIGURATION (RESEND) =====
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=QWIKKER <bournemouth@qwikker.com>
EMAIL_REPLY_TO=bournemouth@qwikker.com

# ===== CLOUDINARY CONFIGURATION =====
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_upload_preset

# ===== WEBHOOK INTEGRATIONS =====
NEXT_PUBLIC_SLACK_WEBHOOK_URL=your_slack_webhook_url
NEXT_PUBLIC_GHL_WEBHOOK_URL=your_ghl_webhook_url
NEXT_PUBLIC_GHL_UPDATE_WEBHOOK_URL=your_ghl_update_webhook_url

# ===== APPLICATION CONFIGURATION =====
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 📧 Setting Up Resend (Email Service)

### Step 1: Create Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get API Key
1. Go to your Resend dashboard
2. Navigate to "API Keys" section
3. Click "Create API Key"
4. Copy the key and add it to your `.env.local`:
   ```bash
   RESEND_API_KEY=re_your_actual_api_key_here
   ```

### Step 3: Verify Domain (Optional for Testing)
- For production, you'll need to verify your domain
- For development, you can use the default `onboarding@resend.dev` domain

### Step 4: Configure Email Addresses
```bash
EMAIL_FROM=QWIKKER <bournemouth@qwikker.com>
EMAIL_REPLY_TO=bournemouth@qwikker.com
```

## 🧪 Testing Email Setup

1. Start your development server:
   ```bash
   pnpm dev
   ```

2. Visit the test email page:
   ```
   http://localhost:3000/test-email
   ```

3. Complete a signup to test the welcome email

## 🚨 Important Notes

- **Never commit `.env.local`** to version control
- **Use different API keys** for development and production
- **Resend free tier** includes 3,000 emails/month
- **Email delivery** may take a few seconds in development

## 📊 Email Analytics

Resend provides:
- ✅ Delivery confirmation
- 📊 Open/click tracking
- 🚫 Bounce/complaint handling
- 📈 Analytics dashboard

## 🔧 Troubleshooting

### Common Issues:
1. **"RESEND_API_KEY is required"**
   - Check your `.env.local` file exists
   - Verify the API key is correct

2. **Email not sending**
   - Check console logs for error messages
   - Verify Resend account is active

3. **Email in spam folder**
   - Domain verification helps with deliverability
   - Check email content for spam triggers

## 🔗 Useful Links

- [Resend Documentation](https://resend.com/docs)
- [Resend Dashboard](https://resend.com/dashboard)
- [Domain Verification Guide](https://resend.com/docs/dashboard/domains/introduction)
