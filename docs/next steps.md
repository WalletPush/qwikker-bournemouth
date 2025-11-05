Qwikker: Next Steps & PRD Fixes

⸻

🔔 Notifications
	•	Add notification on business dashboard when profile is ready for review (CTA button or modal).
	•	Add “Preview Listing” option before profile submission.
	•	Notify businesses via dashboard + email when their offer is approved and live.
	•	Create a “Notifications” tab/section in the business dashboard.

✉️ Emails & Slack
	•	Fix all outgoing emails (resend, formatting, reliability).
	•	Ensure all email/slack notifications are franchise-ready.
	•	Fix Slack notifications and channels for:
	•	Database backup
	•	Offer/secret menu submitted
	•	Business registered

📄 Business Dashboard Features
	•	Allow multiple menu uploads.
	•	Display uploaded menus in CRM cards + Supabase.
	•	Enable multiple image uploads and carousel display on user-facing business cards.
	•	Display full opening hours in the admin business approval card.
	•	Add “Add to Knowledge Base” button after menu approval (one-click upload to Supabase).
	•	Add a business rating verification step (4.4+ on Google) during onboarding.
	•	Enable admin rating verification method.

📊 Analytics (Critical)
	•	Fix broken analytics throughout.
	•	Ensure Spotlight tier unlocks advanced analytics:
	•	Business card views
	•	Offer views/clicks
	•	Offers claimed + by whom
	•	Wallet adds

❌ Deletion & Admin Tools
	•	Allow users/admin to delete offers (with confirmation input like “type DELETE”).
	•	Fix subscription pricing/tier info sync between admin dashboard and Supabase.
	•	Fix GHL sync issue.
	•	Fix CRM card sync status.
	•	Enable admin to create a business and auto-generate login credentials.

💳 Stripe + Franchise
	•	Fix and test Stripe Connect for franchise admins.
	•	Route franchise subscriptions to correct admin Stripe accounts.

🖼️ UI/UX Issues
	•	Fix button sizes, spacing, animations, and button states.
	•	Improve chat UX (quick responses, recommended prompts, layout).
	•	Fix chat shortlink issue (preserve user ID + display name).
	•	Fix auto-scroll when clicking top cards (Qwikker Picks, etc.).

📢 Push Notifications
	•	Allow Spotlight-tier businesses to send up to 3 push notifications/week.
	•	User targeting logic based on preferences (e.g., only cocktail deals).
	•	Admin to manage notification types and limits.

📱 QR Code System
	•	Deep linking, editing, and custom logo upload.
	•	Accurate tracking (scan data, source, usage).
	•	Add QR code scanner + micro POS for businesses.
	•	Auto-update Wallet pass to “redeemed” after scanning and pressing “claimed.”

🗓️ Events
	•	Create an Events tab on user dashboard.
	•	Businesses can submit events for approval.
	•	Events go to a dedicated Knowledge Base table.
	•	AI chat should access approved event data.
	•	Admin can add events for businesses directly.

🧠 Knowledge Base Fixes
	•	Fix custom upload buttons.
	•	Fix news article uploading/viewing.

🧾 Menus & Services
	•	Allow business to upload services/events directly from their dashboard.
	•	All uploads should reflect on CRM + Knowledge Base.

🏷️ Badges & Tags
	•	Fix badge logic (Qwikker Pick, Featured, Recommended).
	•	Free trial = Featured, but don’t show “Free Trial” to users.

💬 Chat + Booking
	•	Add real-time booking system or calendar agent in chat.
	•	Fix “Add to Wallet” logic (only show button when available).
	•	Add location-aware chat and “near me” functionality.

📲 Referrals, Rewards, Social
	•	Fix referral code system.
	•	Fix and test badge logic and rewards.
	•	Add Social Wizard for business social setup.
	•	Fix business dashboard getting started checklist logic.

🔄 Offer Logic
	•	Fix duplicate issue when editing offers (should update not duplicate).
	•	Fix image size logic for offers + Discover cards.
	•	Add success notification for auto-populate.

🌍 Integrations
	•	Explore integration of eSIM provider into user dashboard.
	•	Determine best method: API, iframe, or redirect.