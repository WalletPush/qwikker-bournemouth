# Franchise CRM Integration Implementation Plan

## 🎯 RECOMMENDED APPROACH: Franchise Owner Onboarding System

### PHASE 1: LAUNCH READY (Immediate Implementation)
**You manage CRM setup during franchise onboarding**

#### How It Works:
1. **Franchise Owner Signs Up** → Provides their GHL account details
2. **You Configure Their CRM** → Add their webhooks to the system  
3. **Deploy Their Subdomain** → calgary.qwikker.com automatically uses their CRM
4. **They Start Operations** → Everything routes to THEIR systems

#### Implementation Steps:

##### Step 1: Franchise Onboarding Form
Create a simple form where new franchise owners provide:
- Business Name & Location
- Desired Subdomain (calgary.qwikker.com)
- GoHighLevel Account Details:
  - Main Webhook URL (for signups)
  - Update Webhook URL (optional)
- Slack Workspace Details (optional)
- Contact Information

##### Step 2: CRM Configuration Database
Store franchise CRM settings in Supabase:

```sql
CREATE TABLE franchise_crm_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  subdomain VARCHAR(50) UNIQUE NOT NULL,
  
  -- GHL Integration
  ghl_webhook_url TEXT NOT NULL,
  ghl_update_webhook_url TEXT,
  
  -- Slack Integration  
  slack_webhook_url TEXT,
  slack_channel VARCHAR(100),
  
  -- Franchise Owner Details
  owner_name VARCHAR(100) NOT NULL,
  owner_email VARCHAR(100) NOT NULL,
  owner_phone VARCHAR(20),
  
  -- System Settings
  timezone VARCHAR(50) DEFAULT 'UTC',
  status VARCHAR(20) DEFAULT 'active',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

##### Step 3: Dynamic CRM Loading
Update the system to load CRM configs from database instead of hardcoded:

```typescript
// Instead of hardcoded configs, load from database
export async function getFranchiseCRMConfig(city: string): Promise<FranchiseCRMConfig> {
  const { data } = await supabase
    .from('franchise_crm_configs')
    .select('*')
    .eq('city', city)
    .single()
    
  if (!data) {
    // Fallback to Bournemouth (your default)
    return getDefaultBournemouthConfig()
  }
  
  return {
    city: data.city,
    displayName: data.display_name,
    ghl_webhook_url: data.ghl_webhook_url,
    ghl_update_webhook_url: data.ghl_update_webhook_url,
    slack_webhook_url: data.slack_webhook_url,
    franchise_owner: {
      name: data.owner_name,
      email: data.owner_email,
      phone: data.owner_phone
    },
    timezone: data.timezone
  }
}
```

---

### PHASE 2: SELF-SERVICE (Scale Ready)
**Franchise owners can manage their own settings**

#### Franchise Admin Portal
Each franchise owner gets access to configure:
- Update their GHL webhooks
- Change Slack notifications  
- Modify contact information
- View integration status
- Test webhook connections

---

## 🚀 IMPLEMENTATION TIMELINE

### WEEK 1: Database Setup
- [ ] Create `franchise_crm_configs` table
- [ ] Migrate Bournemouth config to database
- [ ] Update CRM loading functions

### WEEK 2: Franchise Onboarding
- [ ] Build franchise application form
- [ ] Create admin interface to approve/configure franchises
- [ ] Test with a mock Calgary franchise

### WEEK 3: Self-Service Portal  
- [ ] Build franchise owner admin panel
- [ ] Add webhook testing tools
- [ ] Create documentation for franchise owners

### WEEK 4: Launch Ready
- [ ] Full testing with multiple mock franchises
- [ ] Documentation and training materials
- [ ] Go-to-market ready

---

## 🔧 TECHNICAL BENEFITS

### Scalability
✅ **Unlimited Franchises** - No code changes needed
✅ **Instant Deployment** - New subdomain = instant franchise
✅ **Isolated Data** - Each franchise only sees their data

### Maintainability  
✅ **Single Codebase** - One system, many franchises
✅ **Centralized Updates** - Push updates to all franchises
✅ **Easy Debugging** - Consistent system across all locations

### Business Benefits
✅ **Fast Franchise Setup** - New franchise operational in hours
✅ **No Technical Barriers** - Franchise owners don't need dev skills
✅ **Professional Integration** - Each franchise feels independent
✅ **Revenue Scaling** - Easy to onboard many franchises quickly

---

## 💰 FRANCHISE ONBOARDING PROCESS

### 1. Franchise Application
**Franchise Owner Fills Out:**
- Location/City Selection
- Business Information  
- Technical Requirements
- GHL Account Setup Status

### 2. Technical Setup (You Handle)
**Your Process:**
- Create subdomain DNS (calgary.qwikker.com)
- Add CRM configuration to database
- Test webhook connections
- Deploy franchise instance

### 3. Franchise Owner Training
**What They Get:**
- Admin dashboard access
- Business onboarding training
- CRM integration documentation
- Support contact information

### 4. Go Live
**Franchise Launches:**
- Businesses can sign up via calgary.qwikker.com
- All data routes to Calgary owner's GHL
- Calgary owner manages their local businesses
- You maintain the technical infrastructure

---

## 🎯 RECOMMENDED IMMEDIATE ACTION

**Build the franchise onboarding system FIRST:**

1. **Create the database table** (5 minutes)
2. **Move Bournemouth config to database** (10 minutes)  
3. **Update CRM loading to use database** (30 minutes)
4. **Build simple franchise setup form** (2 hours)
5. **Test with mock Calgary franchise** (1 hour)

**This gives you a franchise-ready system in ONE DAY!**

---

## 🚨 CRITICAL SUCCESS FACTORS

### For Franchise Owners:
- **Zero Technical Skill Required** - You handle all setup
- **Immediate ROI** - Start earning from day 1
- **Professional System** - Looks like their own platform
- **Full Control** - Manage their local businesses

### For You:
- **Scalable Revenue** - More franchises = more recurring revenue
- **Minimal Support** - System handles everything automatically  
- **Brand Consistency** - All franchises use same high-quality system
- **Technical Control** - You control updates and improvements

**THIS APPROACH LETS YOU SCALE TO 100+ FRANCHISES WITHOUT CHANGING A SINGLE LINE OF CODE!** 🚀
