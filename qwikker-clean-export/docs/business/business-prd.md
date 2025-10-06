# QWIKKER Platform – Free Trial Signup & Dashboard PRD

## Overview
QWIKKER is a business onboarding and dashboard system for local merchants. It allows new businesses to register for a **Free Trial**, upload key details, create their first exclusive offers, and immediately access a trial dashboard.  

The system should provide:  
1. A **multi-stage free trial signup flow** (Founding Member form).  
2. **Automatic free trial handling** with trial countdown.  
3. **Slack notifications** when a signup is completed.  
4. A **business dashboard** that reflects user inputs, skipped items, and upsells.  
5. **Blurred/locked features** that encourage upgrading.  

---

## 1. Free Trial Signup Flow (Founding Member Form)

### Structure
- The form is **multi-step**, with **visual progress tracking** (progress bar + step number).  
- Steps include:  
  1. **Personal Information** (first name, last name, email, confirm email, phone).  
  2. **Business Information** (name, type, category, address, town, postcode, website, social media, logo upload).  
  3. **Menu & Price List Upload** (PDF files only).  
  4. **Exclusive Offer Creation** (optional: offer name, type, value, terms, image).  
  5. **Additional Information** (referral source, goals, notes).  
  6. **Review Registration** (summary of all info with “Edit” buttons).  
  7. **Success Screen** (confirmation + next steps).  

### File Uploads
- **Business logo**: image upload.  
- **Menu/Price List**: PDF(s) only.  
- **Offer image**: optional image upload.  
- Validation: size limits (5MB for images, 10MB for PDFs).  

### Optional Steps Handling
- If the user **skips** uploading logo, menu, or creating an offer:  
  - They continue signup without being blocked.  
  - These skipped items are automatically shown as **pending tasks on the dashboard**.  

### Review Step
- Shows all collected data in clean summary boxes.  
- Includes “Edit” buttons to jump back to a step.  

### Free Trial & Founding Member Offer
- A popup appears after a few seconds on page load, offering the **Founding Member Spotlight Plan** (16 months for the price of 10 + lifetime discount).  
- If declined, user continues to **Free Trial signup**.  
- Final step button: **“Start Free Trial”**.  

### Integrations
- On successful submission:  
  - Form data (including file URLs) is sent to **GoHighLevel (LeadConnectorHQ)** webhook to create a new contact.  
  - A **Slack message** is sent to the QWIKKER team channel with details of the new signup (business name, contact info, plan chosen).  
  - User is redirected to the **success screen**.  

---

## 2. Dashboard

### Layout
- **Sidebar navigation** with sections:  
  - Dashboard (home)  
  - Personal Info  
  - Business Info  
  - Offers  
  - Loyalty (blurred/locked unless on Spotlight plan)  
  - Analytics (blurred/locked unless on Spotlight plan)  
  - Push Notifications (blurred/locked unless on Spotlight plan)  
  - Secret Menu  
  - Referrals  
  - Files  
  - Settings  
  - Support  

- **Main Dashboard Widgets**:  
  - **Free Trial Countdown** (number of days left, matching signup date).  
  - **Plan Information** (shows current plan, encourages upgrade).  
  - **To-Do Notifications** (logo upload, menu upload, create first offer, create secret menu item → appear if skipped during signup).  
  - **Referral Stats** (basic count of referred signups).  
  - **Analytics Placeholders** (traffic, customers, revenue, engagement — blurred unless Spotlight plan).  

### Feature Locking
- **Loyalty, Analytics, and Push Notifications** are always visible in the nav, but blurred/locked with an upgrade message for Starter and Free Trial plans.  

### File Management
- Businesses can:  
  - Upload/update their **logo**.  
  - Upload/update **menu PDFs**.  
  - Manage **offer images**.  

### Offers
- Businesses can:  
  - Create up to **3 offers simultaneously** during Free Trial.  
  - Delete existing offers.  
  - Upgrade to a paid plan for unlimited offers.  

### Secret Menu
- Businesses can:  
  - Create and manage secret menu items.  
  - Delete secret menu items.  

### Notifications
- Notifications section displays:  
  - Trial expiration reminder.  
  - Skipped tasks from signup (e.g., “You need to add your menu”).  
  - Any system updates or support messages.  

---

## 3. Slack Notifications
- On successful signup, a **Slack message** is sent automatically.  
- The message should include:  
  - Business name.  
  - Contact details (name, email, phone).  
  - Town/city and postcode.  
  - Whether a logo/menu/offer was uploaded.  
  - Referral source (if provided).  

---

## 4. Integrations
- **Cloudinary** is used for file hosting (logos, offers, menus).  
- **GoHighLevel (LeadConnectorHQ)** webhook is used for syncing new contacts.  
- **Slack** integration used for internal notifications.  
- **Supabase** may be used in the future for auth, database, or file storage, but current implementation relies on Cloudinary + GHL.  

---

## 5. Visual Style
- Dark theme background (`#0a0a0a`) with gradients and neon green (`#00d083`) accents.  
- Modern, premium branding with:  
  - Clean progress bars.  
  - Smooth animations between form steps.  
  - Blurred/locked areas for upsells.  
  - Notification cards styled with borders, icons, and gradients.  

---

## ✅ End Goal
- Businesses can register through the **Free Trial signup form**.  
- Trial users see a working dashboard immediately.  
- Skipped steps are tracked as **to-do notifications**.  
- Slack alerts notify the team of each signup.  
- Free trial users are **limited to 3 offers**, but can delete and replace them.  
- Loyalty, Analytics, and Push Notifications stay visible but blurred until they upgrade to Spotlight.  
- starter users are **limited to 1 offers**, but can delete and replace them.  
- Featured users are **limited to 3 offers**, but can delete and replace them.  
- spotlight users have **unlimited offers**, can delete and replace them.  