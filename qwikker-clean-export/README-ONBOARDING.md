# QWIKKER Onboarding Form - Setup & Testing

## 🎯 What's Been Implemented

### Complete Dynamic Onboarding Form (5-9 steps based on choices)
✅ **Step 1:** Personal Information (name, email, phone)  
✅ **Step 2:** Account Security (password creation with validation)  
✅ **Step 3:** Business Information (details, social media, logo upload)  
✅ **Step 4:** Menu Upload Choice (optional confirmation)  
✅ **Step 5:** Menu & Price List Upload (PDF only - if chosen)  
✅ **Step 6:** Offer Creation Choice (optional confirmation)  
✅ **Step 7:** Exclusive Offer Creation (if chosen)  
✅ **Step 8:** Additional Information (referral source, goals)  
✅ **Step 9:** Review & Submit  

### Features
- ✅ **Dual-save architecture** (Supabase + GoHighLevel + Slack)
- ✅ **File uploads to Cloudinary** with URLs stored in Supabase
- ✅ **Password creation** with security requirements
- ✅ **Form validation** with real-time feedback
- ✅ **Dynamic step flow** - skips optional steps based on user choice
- ✅ **Smart navigation** - adjusts progress bar and step counting
- ✅ **Responsive design** with dark theme
- ✅ **Error handling** and data mapping for database constraints

## 🚀 Testing the Form

### 1. Access the Form
Visit: `http://localhost:3001/onboarding`

### 2. Required Setup

**Cloudinary Setup:**
1. Go to your Cloudinary dashboard
2. Create an upload preset named `unsigned_qwikker`
3. Set it to "Unsigned" mode
4. Configure allowed formats: images (PNG, JPG, SVG) and raw files (PDF)

**Environment Variables:**
```env
# Add to .env.local
NEXT_PUBLIC_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

⚠️ **Important:** The `SUPABASE_SERVICE_ROLE_KEY` is required for profile creation during onboarding (bypasses RLS). Get this from your Supabase project settings → API.

### 3. Test Flow
1. **Personal Info** - Fill out name, email, phone
2. **Password** - Create secure password (8+ chars)
3. **Business Info** - Add business details, upload logo
4. **Menu Choice** - Choose whether to upload menu now or later
5. **Menu Upload** - (Only if chosen) Upload PDF menu files
6. **Offer Choice** - Choose whether to create offer now or later
7. **Create Offer** - (Only if chosen) Optional promotional offer
8. **Additional Info** - Referral source, goals
9. **Review** - Check all info and submit

**💡 Smart Flow:** The form adapts based on your choices! Skip menu upload or offer creation and the form automatically adjusts the step count and progress bar.

### 4. What Happens on Submit
1. **User account created** in Supabase Auth
2. **Files uploaded** to Cloudinary 
3. **Profile data saved** to Supabase profiles table
4. **External webhooks** sent to GHL and Slack (non-blocking)
5. **User redirected** to success page

## 🔧 Database Integration

### Data Mapping
The form automatically maps user inputs to database constraints:

**Business Types:**
- "Restaurant" → `restaurant`
- "Cafe/Coffee Shop" → `cafe` 
- "Bar/Pub" → `bar`
- etc.

**Referral Sources:**
- "Founding Member Invitation" → `partner_referral`
- "Google Search" → `google_search`
- "Social Media" → `social_media`
- etc.

### File Storage
- **Files stored in:** Cloudinary (optimized, CDN-delivered)
- **URLs stored in:** Supabase profiles table
- **Dashboard access:** Files viewable/editable through dashboard

## 🐛 Troubleshooting

### Common Issues

**"Database error: Cannot coerce the result to a single JSON object"**
- ✅ **Fixed** - Added proper upsert logic and data mapping

**Input fields not visible**
- ✅ **Fixed** - Updated color scheme for dark theme

**File uploads failing**
- Check Cloudinary upload preset is configured
- Ensure files meet size limits (5MB images, 10MB PDFs)

**Webhook failures**
- External services (GHL/Slack) are non-blocking
- Form will still complete successfully if they fail

## 📝 Next Steps

1. **Test the complete flow** end-to-end
2. **Configure Cloudinary** upload preset
3. **Add Slack webhook** for team notifications
4. **Implement dashboard** to view/edit uploaded files
5. **Add business management features** per PRD

## 🎨 Styling

The form uses a consistent dark theme with:
- **Background:** `slate-950`
- **Cards:** `slate-800/90` 
- **Inputs:** `slate-900` with white text
- **Accent:** `#00d083` (QWIKKER green)
- **Focus states:** Green borders and rings
- **Proper contrast** for accessibility

All styling is responsive and works on mobile/desktop.
