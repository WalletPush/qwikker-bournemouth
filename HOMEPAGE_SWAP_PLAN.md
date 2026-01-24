# Homepage Swap Plan - Ready for Tomorrow

## 🎯 Goal
Replace business dashboard landing (`/`) with new main Qwikker.com homepage

---

## 📋 Step-by-Step Checklist

### ✅ Step 1: Build New Homepage Tonight (DONE WHEN READY)
- [ ] Create `app/home/page.tsx` with new main Qwikker homepage
- [ ] Test at `http://localhost:3000/home`

### ✅ Step 2: Move Business Landing (Tomorrow)
```bash
# Create new directory for business landing
mkdir -p app/for-businesses

# Move current business landing
mv app/page.tsx app/for-businesses/page.tsx
```

### ✅ Step 3: Move New Homepage to Root (Tomorrow)
```bash
# Move new homepage to root
mv app/home/page.tsx app/page.tsx

# Clean up empty directory
rmdir app/home
```

### ✅ Step 4: Update Internal Links (Tomorrow)
Search and replace in these locations:

#### Files to Check:
- [ ] `app/onboarding/**/*` - Check for links to business landing
- [ ] `app/auth/login/page.tsx` - Check navigation links
- [ ] `lib/email/**/*` - Email templates referencing old landing
- [ ] Any "Back to Home" buttons in business onboarding flow
- [ ] Footer links (if any)

#### Search Pattern:
```bash
# Find all references to root "/" that should be "/for-businesses"
grep -r "href=\"/\"" app/ --include="*.tsx" --include="*.ts"
grep -r "redirect('/')" app/ --include="*.tsx" --include="*.ts"
```

---

## 🔍 Current State

### What's at `/` right now:
- **File:** `app/page.tsx`
- **Content:** Business Dashboard landing page
- **CTAs:** 
  - "Start Free Trial" → `/onboarding`
  - "Member Sign In" → `/auth/login`
- **Audience:** Business owners (founding members beta)

### What's at `/business` right now:
- **File:** `app/business/page.tsx`
- **Content:** Redirect to `/dashboard`
- **Status:** Can be deleted or repurposed

---

## 📌 Notes

- Current `/` is for business owners signing up for dashboard
- New `/` will be main public-facing Qwikker homepage
- Old business landing moves to `/for-businesses`
- Update all business onboarding flows to point to new location

---

## 🚀 When Ready to Deploy

1. Test locally first (all paths work)
2. Update any environment-specific URLs in `.env` files
3. Push to Vercel
4. Update DNS if needed (qwikker.com should already point to Vercel)
5. Test in production

---

**Good luck tomorrow! 🎉**
