# QWIKKER - COMPLETE SYSTEM OVERVIEW

## 🏗️ TECH STACK

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI + Radix UI
- **State Management**: React hooks, localStorage for user preferences
- **Package Manager**: pnpm (exclusively)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API**: Next.js API routes + Server Actions
- **File Storage**: Cloudinary
- **Email**: Resend

### External Integrations
- **CRM**: GoHighLevel (GHL) - Contact management and workflows
- **Mobile Wallets**: WalletPush - iOS/Android wallet pass creation and updates
- **Notifications**: Slack (admin notifications)
- **Maps/Location**: Google Autocomplete (planned)

### Deployment
- **Platform**: Vercel
- **Database**: Supabase Cloud
- **Domain Structure**: Franchise-specific subdomains (e.g., bournemouth.qwikker.com, calgary.qwikker.com)

## 🏢 BUSINESS MODEL

### Franchise System
- **Multi-City Franchises**: Each city operates as independent franchise
- **Domain-Based Detection**: Automatic franchise detection via subdomain/hostname
- **Isolated Data**: Each franchise has separate businesses, users, and configurations
- **Scalable Architecture**: Single codebase supports unlimited franchises

### Subscription Tiers
- **Starter**: £29/month - 1 offer, basic features
- **Featured**: £49/month - 3 offers, priority placement
- **Spotlight**: £99/month - Unlimited offers, premium features

### Revenue Streams
1. **Business Subscriptions**: Monthly recurring revenue from local businesses
2. **Franchise Fees**: Revenue sharing with franchise operators
3. **Transaction Fees**: Potential future revenue from offer redemptions

## 👥 USER TYPES & FLOWS

### 1. App Users (Consumers)
**Onboarding Flow**:
1. Business shares QR code or link
2. User scans → redirected to signup
3. GHL webhook creates contact
4. WalletPush creates mobile wallet pass
5. User gets pass installed with business info

**User Journey**:
- Browse local offers via mobile wallet or web app
- Claim offers → stored in "My Claimed"
- Add to wallet → offer details pushed to mobile pass (12-hour expiry)
- Visit business → show pass for redemption
- Earn loyalty points and badges

### 2. Business Owners
**Onboarding Flow**:
1. Complete signup form (personal + business info)
2. Upload logo, menu, offer image
3. Admin review and approval
4. Business goes live in local directory
5. Auto-sync to GHL for CRM management

**Business Dashboard Features**:
- **Profile Management**: Edit business info, hours, images
- **Offer Creation**: Create offers based on subscription tier
- **File Management**: Upload/update logos, menus, images
- **Analytics**: View offer performance, user engagement
- **Settings**: Manage subscription, billing, notifications

### 3. Admin Users
**Admin Dashboard Features**:
- **Pending Reviews**: Approve/reject new business applications
- **Pending Updates**: Approve changes to existing businesses
- **Live Listings**: Manage active businesses with CRM cards
- **Analytics**: City-wide performance metrics
- **QR Management**: Generate and assign QR codes to businesses

## 🗄️ DATABASE ARCHITECTURE

### Core Tables

#### `business_profiles`
- **Purpose**: Main business information
- **Key Fields**: business_name, business_type, business_address, city, subscription_plan, status
- **Status Flow**: pending_review → approved → live
- **Franchise Isolation**: `city` field (e.g., 'bournemouth', 'calgary')

#### `business_offers` (NEW - Being Implemented)
- **Purpose**: Multiple offers per business
- **Key Fields**: business_id, offer_name, offer_type, offer_value, status, display_order
- **Tier Limits**: Enforced via database triggers
- **Status Flow**: pending → approved → live

#### `app_users`
- **Purpose**: Consumer user accounts
- **Key Fields**: wallet_pass_id, name, email, city, ghl_contact_id, pass_type_identifier
- **Integration**: Links to GHL contacts and WalletPush passes

#### `business_changes`
- **Purpose**: Track pending changes for admin approval
- **Key Fields**: business_id, change_type, change_data, status
- **Change Types**: offer, secret_menu, logo, menu_url, business_images

#### `franchise_crm_configs`
- **Purpose**: City-specific API keys and configurations
- **Key Fields**: city, ghl_webhook_url, walletpush_api_key, walletpush_template_id

#### `admin_users`
- **Purpose**: Admin authentication and permissions
- **Key Fields**: username, email, city_permissions, role

### Supporting Tables
- `user_offer_claims`: Track offer claims and redemptions
- `qr_codes`: Dynamic QR code system with real-time tracking
- `business_analytics`: Performance metrics and insights

## 🔄 KEY INTEGRATIONS

### GoHighLevel (GHL) Integration
**Purpose**: CRM and workflow automation

**Business Flow**:
1. Business signs up → Creates GHL contact
2. Profile updates → Syncs to GHL custom fields
3. Status changes → Triggers GHL workflows
4. File uploads → Updates GHL contact data

**User Flow**:
1. User signs up → Creates GHL contact with wallet pass ID
2. Offer claims → Triggers GHL workflows
3. Pass updates → Updates GHL custom fields

**Key GHL Fields**:
- `Current Offer`: Current offer on user's wallet pass
- `Last Message`: Push notification message
- Business custom fields for all profile data

### WalletPush Integration
**Purpose**: Mobile wallet pass management

**Pass Creation**:
1. User signs up via GHL webhook
2. WalletPush creates pass with business branding
3. Pass includes: business logo, name, offer, expiry time

**Pass Updates**:
1. User claims offer → Updates `Current Offer` field
2. Direct API call to WalletPush (PUT method)
3. Push notification sent to user's device
4. 12-hour expiry automatically calculated

**API Endpoints**:
- Pass Creation: `https://app.walletpush.io/api/hl-endpoint/{template_id}`
- Pass Updates: `https://app2.walletpush.io/api/v1/passes/{pass_type_id}/{serial_number}/values/{field}`

## 🌐 FRANCHISE SYSTEM

### Geographic Detection
**Method**: Domain-based franchise detection
- `bournemouth.qwikker.com` → 'bournemouth' franchise
- `calgary.qwikker.com` → 'calgary' franchise
- Vercel deployments use URL patterns for testing

### Data Isolation
**Filtering**: All queries filtered by `city` field
- Businesses: `.eq('city', franchiseCity)`
- Users: Inherit city from signup location
- Offers: Filtered via business city
- Analytics: City-scoped dashboards

### Configuration Management
**Per-Franchise Settings**:
- GHL webhook URLs (different per city)
- WalletPush API keys and templates
- Slack notification channels
- Admin permissions and access

## 📱 MOBILE WALLET SYSTEM

### Pass Structure
**Template Fields**:
- `Business_Name`: Business name
- `Current_Offer`: Active offer details
- `Last_Message`: Push notifications
- `Expiry_Time`: Offer expiration

### Pass Lifecycle
1. **Creation**: User signs up → Pass created with business branding
2. **Updates**: User claims offer → Pass updated with offer details
3. **Expiry**: 12-hour countdown from offer claim
4. **Renewal**: User can claim new offers to refresh pass

### Technical Implementation
- **Pass Type ID**: `pass.com.qwikker` (Apple format)
- **Serial Numbers**: UUID format for unique identification
- **Authorization**: App key in Authorization header
- **Timezone**: Europe/London for UK time display

## 🎯 OFFER MANAGEMENT SYSTEM

### Current System (Single Offer)
- Each business has ONE offer in `business_profiles`
- Fields: offer_name, offer_type, offer_value, offer_terms, offer_image
- Admin approval overwrites existing offer

### New System (Multiple Offers) - IN DEVELOPMENT
- Separate `business_offers` table
- Multiple offers per business based on subscription tier
- Proper offer creation vs editing logic
- Tier-based limits enforced at database level

### Offer Flow
1. **Creation**: Business creates offer via dashboard
2. **Submission**: Offer stored in `business_changes` table
3. **Review**: Admin approves/rejects via admin dashboard
4. **Activation**: Approved offers go live in user-facing gallery
5. **Claims**: Users claim offers → stored in `user_offer_claims`
6. **Redemption**: Users show pass at business location

## 🔐 SECURITY & PERMISSIONS

### Row Level Security (RLS)
- **Enabled**: All user-facing tables have RLS policies
- **Business Data**: Users can only access their own business data
- **User Data**: Users can only access their own claims/activity
- **Admin Bypass**: Admin operations use service role client

### Authentication
- **Business Users**: Supabase Auth with email/password
- **App Users**: Wallet pass ID-based sessions (no passwords)
- **Admin Users**: Separate admin authentication system

### Data Protection
- **Franchise Isolation**: City-based filtering prevents cross-contamination
- **API Security**: All admin operations require valid admin session
- **Input Validation**: Zod schemas for all form inputs

## 📊 ANALYTICS & TRACKING

### Business Analytics
- **Offer Performance**: Claims, redemptions, conversion rates
- **User Engagement**: Pass installations, deletions, activity
- **QR Code Tracking**: Scan counts, conversion rates
- **Revenue Metrics**: Subscription tracking, churn analysis

### User Analytics
- **Activity Tracking**: Pass usage, offer claims, business visits
- **Loyalty System**: Points, badges, tier progression
- **Behavioral Data**: Preferences, favorite businesses, usage patterns

### Admin Analytics
- **City Performance**: Business count, user growth, revenue
- **Approval Metrics**: Review times, approval rates
- **System Health**: Error rates, integration status

## 🚀 DEPLOYMENT & INFRASTRUCTURE

### Development Workflow
1. **Local Development**: Next.js dev server + Supabase local
2. **Version Control**: Git with feature branches
3. **Testing**: Manual testing + database migrations
4. **Deployment**: Vercel auto-deploy from main branch

### Environment Management
- **Local**: `.env.local` with development keys
- **Production**: Vercel environment variables
- **Database**: Supabase project with migrations
- **Secrets**: Stored in Vercel/Supabase dashboards

### Monitoring
- **Error Tracking**: Console logging + Vercel analytics
- **Performance**: Core Web Vitals monitoring
- **Uptime**: Vercel deployment status
- **Database**: Supabase dashboard monitoring

## 🔧 CURRENT DEVELOPMENT STATUS

### ✅ COMPLETED FEATURES
- **Multi-franchise architecture** with domain-based detection
- **Business onboarding** with admin approval workflow
- **Mobile wallet integration** with WalletPush
- **Offer claiming system** with 12-hour expiry
- **Admin dashboard** with CRM cards and analytics
- **GHL integration** for contact management
- **Dynamic QR code system** with real-time tracking
- **User dashboard** with offers gallery and claimed offers
- **Franchise-specific configurations** and API management

### 🚧 IN PROGRESS
- **Multiple offers system** (migration created, not applied)
- **Offer limit enforcement** based on subscription tiers
- **Admin approval logic fixes** (prevent offer overwrites)

### 📋 PLANNED FEATURES
- **AI chat integration** for natural language offer queries
- **Advanced analytics dashboard** with revenue tracking
- **Mobile app** (React Native or PWA)
- **Payment processing** for subscription management
- **Advanced loyalty system** with gamification
- **Business messaging system** for customer communication

## 🐛 KNOWN ISSUES

### Critical Issues
1. **Offer Overwrite Bug**: Admin approval replaces existing offers instead of creating new ones
2. **Hydration Mismatches**: Date formatting inconsistencies between server/client
3. **Session Persistence**: Wallet pass ID not consistently passed through navigation

### Minor Issues
- **Mobile Navigation**: Hamburger menu issues on settings page
- **Image Loading**: Occasional flickering on offer images
- **Filter Scrolling**: Filter cards don't always scroll to results

## 🎯 SUCCESS METRICS

### Business Metrics
- **Business Acquisition**: New signups per month per franchise
- **Retention Rate**: Monthly subscription renewals
- **Upgrade Rate**: Starter → Featured → Spotlight conversions
- **Approval Time**: Average time from signup to live listing

### User Metrics
- **Pass Installations**: Successful wallet pass installs
- **Offer Claims**: Monthly offer claim volume
- **User Retention**: Active users per month
- **Redemption Rate**: Claimed offers actually redeemed

### Technical Metrics
- **System Uptime**: 99.9% availability target
- **Response Times**: <2s page load times
- **Error Rates**: <1% error rate across all operations
- **Database Performance**: Query optimization and indexing

## 🔮 FUTURE ROADMAP

### Phase 1: Core Stability (Current)
- Fix multiple offers system
- Resolve critical bugs
- Optimize performance

### Phase 2: Feature Expansion
- AI chat integration
- Advanced analytics
- Payment processing
- Mobile app development

### Phase 3: Scale & Growth
- Multi-language support
- International expansion
- Enterprise features
- Advanced integrations

### Phase 4: Innovation
- AR/VR experiences
- Blockchain loyalty tokens
- Advanced AI personalization
- IoT integrations

## 📞 SUPPORT & MAINTENANCE

### Development Team Structure
- **Lead Developer**: Full-stack development and architecture
- **Admin Support**: Business onboarding and customer success
- **Franchise Operators**: Local market management and growth

### Maintenance Schedule
- **Daily**: Monitor system health and error logs
- **Weekly**: Review pending approvals and user feedback
- **Monthly**: Performance optimization and feature updates
- **Quarterly**: Major feature releases and system upgrades

### Backup & Recovery
- **Database**: Automatic Supabase backups
- **Code**: Git version control with multiple branches
- **Configurations**: Documented in environment files
- **Recovery Time**: <1 hour for critical issues

---

*This document represents the complete current state of the Qwikker platform as of September 29, 2025. For the most up-to-date information, refer to the codebase and recent commit history.*
