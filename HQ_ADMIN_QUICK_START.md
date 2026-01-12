# 🏢 HQ ADMIN - QUICK START GUIDE

**Build Time:** 2-3 hours for MVP  
**Value:** Unblocks Calgary + safe city management

---

## **🎯 WHAT WE'RE BUILDING (MVP ONLY)**

### **Minimal HQ Admin:**
1. ✅ Cities list page (`/hq/admin`)
2. ✅ City settings page (`/hq/admin/cities/[city]`)
3. ✅ Simple auth (your email only)
4. ✅ Add/edit API keys

### **NOT Building (Yet):**
- ⏸️ Dashboard with metrics
- ⏸️ Import analytics
- ⏸️ Audit logs
- ⏸️ Global templates

---

## **🚨 CRITICAL: FIX SECURITY FIRST**

### **Problem:**
The `/api/admin/franchise` endpoint has NO authentication.  
Anyone can call it and create/list/update franchises!

### **Solution:**
Add HQ admin authentication middleware.

---

## **STEP 1: TEST DOMAIN DETECTION LOCALLY**

### **✅ Good News: `*.localhost` Works!**

Most systems support `*.localhost` subdomains without `/etc/hosts` edits.

### **Test Commands:**

```bash
# 1. Start your dev server
pnpm dev

# 2. Test bournemouth subdomain
curl http://bournemouth.localhost:3000/api/internal/get-city

# Expected: {"success":true,"city":"bournemouth"}

# 3. Test calgary subdomain (will fail - not in DB yet)
curl http://calgary.localhost:3000/api/internal/get-city

# Expected: Error - Unknown franchise subdomain 'calgary'
```

### **Browser Test:**

1. Open: `http://bournemouth.localhost:3000/user/discover`
2. Should work (if Bournemouth is in `franchise_crm_configs`)
3. Open: `http://calgary.localhost:3000/user/discover`
4. Should error (Calgary not in DB yet)

---

## **STEP 2: ADD CALGARY TO DATABASE**

Run the SQL script we created:

```bash
# In Supabase SQL Editor:
# Run: scripts/add-calgary-city.sql

# Or manually:
INSERT INTO franchise_crm_configs (
  city, display_name, country_code, country_name,
  currency_code, currency_symbol, latitude, longitude,
  status, created_at, updated_at
) VALUES (
  'calgary', 'Calgary', 'CA', 'Canada',
  'CAD', '$', 51.0447, -114.0719,
  'active', NOW(), NOW()
);
```

### **Verify:**

```bash
curl http://calgary.localhost:3000/api/internal/get-city
# Expected: {"success":true,"city":"calgary"}
```

---

## **STEP 3: SECURE HQ ADMIN API**

### **Create HQ Admin Table:**

```sql
-- HQ Admins table
CREATE TABLE hq_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE hq_admins ENABLE ROW LEVEL SECURITY;

-- Only HQ admins can read HQ admins table
CREATE POLICY "HQ admins can read HQ admins"
ON hq_admins FOR SELECT
TO authenticated
USING (true); -- We'll check email server-side

-- Add yourself as HQ admin
INSERT INTO hq_admins (email, name)
VALUES ('admin@qwikker.com', 'Your Name'); -- Change to your actual email
```

### **Create Auth Helper:**

```typescript
// lib/auth/hq-admin.ts

import { createServiceRoleClient } from '@/lib/supabase/server'

export async function isHQAdmin(email: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data, error } = await supabase
      .from('hq_admins')
      .select('id, is_active')
      .eq('email', email.toLowerCase())
      .single()
    
    if (error || !data) return false
    
    return data.is_active === true
  } catch {
    return false
  }
}

export async function requireHQAdmin(email: string): Promise<void> {
  const isAdmin = await isHQAdmin(email)
  if (!isAdmin) {
    throw new Error('Access denied: HQ admin privileges required')
  }
}
```

### **Secure Franchise API:**

```typescript
// app/api/admin/franchise/route.ts

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireHQAdmin } from '@/lib/auth/hq-admin'

// GET /api/admin/franchise - List all franchises (HQ ONLY)
export async function GET(request: Request) {
  try {
    // 🔒 SECURITY: Check HQ admin
    const email = request.headers.get('x-admin-email') // You'll set this from auth
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    await requireHQAdmin(email)
    
    const supabaseAdmin = createAdminClient()
    
    const { data: franchises, error } = await supabaseAdmin
      .from('franchise_crm_configs')
      .select('*')
      .order('city', { ascending: true })
    
    if (error) {
      console.error('Failed to fetch franchises:', error)
      return NextResponse.json({ error: 'Failed to fetch franchises' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      franchises: franchises || []
    })
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Franchise API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/franchise - Add new franchise (HQ ONLY)
export async function POST(request: Request) {
  try {
    // 🔒 SECURITY: Check HQ admin
    const email = request.headers.get('x-admin-email')
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    await requireHQAdmin(email)
    
    const data = await request.json()
    
    const {
      city,
      display_name,
      country_code,
      country_name,
      currency_code,
      currency_symbol,
      latitude,
      longitude,
      google_places_api_key,
      resend_api_key,
      resend_from_email,
      resend_from_name,
      // ... other fields
    } = data
    
    // Validate required fields
    if (!city || !display_name || !country_code) {
      return NextResponse.json({ 
        error: 'Missing required fields: city, display_name, country_code' 
      }, { status: 400 })
    }
    
    const supabaseAdmin = createAdminClient()
    
    const { data: franchise, error } = await supabaseAdmin
      .from('franchise_crm_configs')
      .insert({
        city: city.toLowerCase().trim(),
        display_name,
        country_code,
        country_name,
        currency_code: currency_code || 'GBP',
        currency_symbol: currency_symbol || '£',
        latitude,
        longitude,
        google_places_api_key,
        resend_api_key,
        resend_from_email: resend_from_email || `${city}@qwikker.com`,
        resend_from_name: resend_from_name || 'QWIKKER',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
    
    if (error) {
      console.error('Failed to create franchise:', error)
      return NextResponse.json({ 
        error: `Failed to create franchise: ${error.message}` 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Franchise created successfully',
      franchise: franchise[0]
    })
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Franchise creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/franchise - Update franchise (HQ ONLY)
export async function PUT(request: Request) {
  try {
    // 🔒 SECURITY: Check HQ admin
    const email = request.headers.get('x-admin-email')
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    await requireHQAdmin(email)
    
    const data = await request.json()
    const { city, ...updates } = data
    
    if (!city) {
      return NextResponse.json({ error: 'City is required' }, { status: 400 })
    }
    
    const supabaseAdmin = createAdminClient()
    
    const { data: franchise, error } = await supabaseAdmin
      .from('franchise_crm_configs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('city', city)
      .select()
    
    if (error) {
      console.error('Failed to update franchise:', error)
      return NextResponse.json({ 
        error: `Failed to update franchise: ${error.message}` 
      }, { status: 500 })
    }
    
    if (!franchise || franchise.length === 0) {
      return NextResponse.json({ 
        error: 'Franchise not found' 
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Franchise updated successfully',
      franchise: franchise[0]
    })
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Franchise update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## **STEP 4: BUILD MINIMAL HQ ADMIN UI**

### **File Structure:**

```
app/
  hq/
    admin/
      page.tsx                 # Cities list
      cities/
        [city]/
          page.tsx             # City settings
      login/
        page.tsx               # HQ login
    layout.tsx                 # HQ layout (checks auth)
```

### **1. HQ Layout (with Auth):**

```typescript
// app/hq/layout.tsx

import { redirect } from 'next/navigation'
import { isHQAdmin } from '@/lib/auth/hq-admin'

export default async function HQLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TODO: Get actual logged-in admin email
  // For now, hardcode your email for testing
  const adminEmail = 'admin@qwikker.com' // Replace with actual auth
  
  const hasAccess = await isHQAdmin(adminEmail)
  
  if (!hasAccess) {
    redirect('/hq/login')
  }
  
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="border-b border-slate-700 bg-slate-800">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white">QWIKKER HQ</h1>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  )
}
```

### **2. Cities List:**

```typescript
// app/hq/admin/page.tsx

import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'

export default async function HQAdminPage() {
  const supabase = createServiceRoleClient()
  
  const { data: cities } = await supabase
    .from('franchise_crm_configs')
    .select('*')
    .order('city')
  
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">Cities</h2>
        <Link 
          href="/hq/admin/cities/new"
          className="px-4 py-2 bg-[#00d083] text-white rounded-lg hover:bg-[#00b870]"
        >
          + Create City
        </Link>
      </div>
      
      <div className="grid gap-4">
        {cities?.map((city) => (
          <Link 
            key={city.id}
            href={`/hq/admin/cities/${city.city}`}
            className="block p-6 bg-slate-800 border border-slate-700 rounded-lg hover:border-[#00d083] transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white">{city.display_name}</h3>
                <p className="text-slate-400">{city.city}.qwikker.com</p>
                <p className="text-sm text-slate-500 mt-1">{city.country_name}</p>
              </div>
              
              <div className="text-right">
                <div className="flex gap-2">
                  {city.google_places_api_key ? (
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                      Google ✓
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                      Google ✗
                    </span>
                  )}
                  
                  {city.resend_api_key ? (
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                      Resend ✓
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                      Resend ✗
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

### **3. City Settings:**

```typescript
// app/hq/admin/cities/[city]/page.tsx

import { createServiceRoleClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CitySettingsForm } from '@/components/hq/city-settings-form'

export default async function CitySettingsPage({
  params,
}: {
  params: { city: string }
}) {
  const supabase = createServiceRoleClient()
  
  const { data: city } = await supabase
    .from('franchise_crm_configs')
    .select('*')
    .eq('city', params.city)
    .single()
  
  if (!city) {
    notFound()
  }
  
  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-8">
        {city.display_name} Settings
      </h2>
      
      <CitySettingsForm city={city} />
    </div>
  )
}
```

### **4. City Settings Form (Client Component):**

```typescript
// components/hq/city-settings-form.tsx

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface CitySettingsFormProps {
  city: any
}

export function CitySettingsForm({ city }: CitySettingsFormProps) {
  const [formData, setFormData] = useState({
    google_places_api_key: city.google_places_api_key || '',
    resend_api_key: city.resend_api_key || '',
    resend_from_email: city.resend_from_email || '',
    resend_from_name: city.resend_from_name || '',
  })
  
  const [isSaving, setIsSaving] = useState(false)
  
  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      const response = await fetch('/api/admin/franchise', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': 'admin@qwikker.com', // TODO: Get from auth
        },
        body: JSON.stringify({
          city: city.city,
          ...formData,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('Settings saved!')
      } else {
        alert('Failed to save: ' + result.error)
      }
    } catch (error) {
      alert('Error saving settings')
    } finally {
      setIsSaving(false)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Google Places API Key */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Google Places API</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={formData.google_places_api_key}
              onChange={(e) => setFormData({ ...formData, google_places_api_key: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="AIza..."
            />
          </div>
        </div>
      </div>
      
      {/* Resend API Key */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Resend Email</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={formData.resend_api_key}
              onChange={(e) => setFormData({ ...formData, resend_api_key: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="re_..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              From Email
            </label>
            <input
              type="email"
              value={formData.resend_from_email}
              onChange={(e) => setFormData({ ...formData, resend_from_email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="city@qwikker.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              From Name
            </label>
            <input
              type="text"
              value={formData.resend_from_name}
              onChange={(e) => setFormData({ ...formData, resend_from_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="QWIKKER"
            />
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#00d083] hover:bg-[#00b870]"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
```

---

## **STEP 5: TEST HQ ADMIN**

### **1. Add yourself as HQ admin:**

```sql
INSERT INTO hq_admins (email, name)
VALUES ('your-email@example.com', 'Your Name');
```

### **2. Access HQ:**

```bash
http://localhost:3000/hq/admin
```

### **3. Update Calgary keys:**

1. Click "Calgary"
2. Paste Google Places API key
3. Paste Resend API key
4. Click "Save"

### **4. Verify:**

```bash
# Check in Supabase:
SELECT city, 
       CASE WHEN google_places_api_key IS NOT NULL THEN 'SET' ELSE 'NULL' END as google_key,
       CASE WHEN resend_api_key IS NOT NULL THEN 'SET' ELSE 'NULL' END as resend_key
FROM franchise_crm_configs
WHERE city = 'calgary';
```

---

## **SUMMARY**

### **Build Time:**
- Security setup: 30 mins
- HQ layout + auth: 30 mins
- Cities list: 30 mins
- City settings: 60 mins

**Total: ~2.5 hours**

### **What You Get:**
- ✅ Safe way to add cities
- ✅ Easy way to manage API keys
- ✅ Calgary unblocked
- ✅ Foundation for future HQ features

### **Next Steps:**
1. Fix security (create `hq_admins` table)
2. Build HQ UI (cities list + settings)
3. Add Calgary keys via HQ
4. Test Calgary subdomain
5. Launch! 🚀

