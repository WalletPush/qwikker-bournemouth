# PRD: Deep Linking and Intent Routing for Qwikker Admin Dashboard

## Objective
Implement dynamic QR codes that direct users to specific business listings, offers, or secret menus on Qwikker based on the QR code scanned. This will be managed from the admin dashboard after a business is approved.

---

## Admin Dashboard Integration

### New Admin Section
- Add a new tab or section called **"QR Code Linking"**.
- This section allows admins to assign and configure QR codes for each business after they sign up.

### Business Approval Workflow
1. Business signs up and enters **Pending Approval**.
2. Admin reviews and approves the business profile.
3. During approval, the admin assigns QR codes to the business profile via the **QR Code Linking** section.

### Dynamic QR Code Assignment
- QR codes are **generic until assigned**.  
- Once approved, admins link each business to the appropriate QR codes (e.g., **Explore**, **Offers**, **Secret Menu**).
- Linking writes the business’s unique ID into the QR’s deep link.

### Post-Approval Logic
- When a user scans a QR code:
  - If they are a Qwikker user → Direct to the relevant in-app/business dashboard page.  
  - If they are not a Qwikker user → Redirect to the onboarding/join flow, then automatically forward them to the business page (deferred deep link).

---

## Workflow Summary
1. **Business signs up** → goes to Pending Approval.  
2. **Admin approves** → uses QR Code Linking to assign business to dynamic QR codes.  
3. **System updates QR codes** → deep link routes to Explore / Offers / Secret Menu for that business.  
4. **User scans QR code** →  
   - Existing user = straight to content.  
   - New user = onboarding first, then routed to content (deferred deep link).  

---

## Risks & Considerations
- **Duplication risk**: Admin must ensure each QR code is linked to only one business at a time.  
- **Deferred deep link reliability**: Must be tested thoroughly across iOS/Android.  
- **Content changes**: If a business updates offers/menus, QR codes stay valid but always show the latest version.  
- **Scalability**: System should support thousands of QR-business mappings without performance drop.  