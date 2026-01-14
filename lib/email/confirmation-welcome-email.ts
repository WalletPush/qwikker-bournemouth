import { Profile } from '@/types/profiles'

interface ConfirmationWelcomeEmailData {
  firstName: string
  lastName: string
  email: string
  businessName: string
  profile: Profile
  confirmationUrl: string
  trialDays?: number // Franchise-specific trial length (default: 90)
}

// Combined confirmation + welcome email template
export function generateConfirmationWelcomeEmailHTML(data: ConfirmationWelcomeEmailData): string {
  const { firstName, businessName, profile, confirmationUrl } = data
  const trialDays = data.trialDays || 90 // Default to 90 days if not provided
  
  // Check what's missing from onboarding
  const hasSecretMenuItems = profile.additional_notes ? 
    (() => {
      try {
        const notesData = JSON.parse(profile.additional_notes)
        return notesData.secret_menu_items && notesData.secret_menu_items.length > 0
      } catch {
        return false
      }
    })() : false
  
  const checklistItems = [
    { item: 'Complete your business profile', done: !!(profile.business_name && profile.business_address) },
    { item: 'Upload your business logo', done: !!profile.logo },
    { item: 'Add your menu or service list', done: !!profile.menu_url },
    { item: 'Create your first exclusive offer', done: !!profile.offer_name },
    { item: 'Add a secret menu item', done: hasSecretMenuItems },
    { item: 'Complete your social media links', done: !!(profile.instagram_handle || profile.facebook_handle) },
  ]
  
  const completedCount = checklistItems.filter(item => item.done).length
  const progressPercentage = Math.round((completedCount / checklistItems.length) * 100)
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your Email & Welcome to QWIKKER!</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #0a0a0a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #ffffff;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            border-radius: 12px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            padding: 40px 30px;
            text-align: center;
            border-bottom: 2px solid #00d083;
        }
        .logo {
            margin-bottom: 10px;
        }
        .logo img {
            height: 48px;
            width: auto;
        }
        .header-text {
            color: #ffffff;
            font-size: 18px;
            margin: 0;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome-message {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #00d083;
        }
        .message {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
            color: #e0e0e0;
        }
        .confirmation-section {
            background: rgba(0, 208, 131, 0.1);
            border: 2px solid #00d083;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 30px;
            text-align: center;
        }
        .confirmation-title {
            font-size: 20px;
            font-weight: bold;
            color: #00d083;
            margin-bottom: 15px;
        }
        .confirmation-text {
            color: #e0e0e0;
            margin-bottom: 20px;
        }
        .confirm-button {
            display: inline-block;
            background: linear-gradient(135deg, #00d083 0%, #00b86f 100%);
            color: #000000;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 15px;
            transition: transform 0.2s ease;
        }
        .confirm-button:hover {
            transform: translateY(-2px);
        }
        .trial-info {
            background: rgba(0, 208, 131, 0.1);
            border: 1px solid #00d083;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
        }
        .trial-title {
            font-size: 20px;
            font-weight: bold;
            color: #00d083;
            margin-bottom: 10px;
        }
        .trial-description {
            color: #e0e0e0;
            margin-bottom: 15px;
        }
        .checklist {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 30px;
        }
        .checklist-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #ffffff;
        }
        .progress-bar {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            height: 8px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .progress-fill {
            background: linear-gradient(90deg, #00d083 0%, #00b86f 100%);
            height: 100%;
            border-radius: 10px;
            width: ${progressPercentage}%;
            transition: width 0.3s ease;
        }
        .progress-text {
            font-size: 14px;
            color: #00d083;
            margin-bottom: 20px;
        }
        .checklist-item {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            font-size: 16px;
        }
        .checkbox {
            width: 20px;
            height: 20px;
            border-radius: 4px;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }
        .checkbox.done {
            background: #00d083;
            color: #000000;
        }
        .checkbox.pending {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid #666666;
            color: #666666;
        }
        .item-text.done {
            color: #00d083;
        }
        .item-text.pending {
            color: #cccccc;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #00d083 0%, #00b86f 100%);
            color: #000000;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            margin: 10px 5px;
            text-align: center;
            transition: transform 0.2s ease;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .cta-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
        }
        .footer {
            background: #1a1a1a;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #333333;
        }
        .footer-text {
            font-size: 14px;
            color: #888888;
            margin-bottom: 15px;
        }
        .manual-confirmation {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 15px;
            margin-top: 15px;
        }
        .manual-confirmation-text {
            font-size: 14px;
            color: #cccccc;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/qwikker-logo-web.svg" alt="QWIKKER" />
            </div>
            <p class="header-text">Your Business Dashboard Awaits</p>
        </div>
        
        <div class="content">
            <h1 class="welcome-message">Welcome to QWIKKER, ${firstName}! 🎉</h1>
            
            <div class="confirmation-section">
                <div class="confirmation-title">📧 Please Confirm Your Email Address</div>
                <p class="confirmation-text">
                    To complete your signup and start your <strong>${trialDays}-day free trial</strong>, please confirm your email address by clicking the button below:
                </p>
                <a href="${confirmationUrl}" class="confirm-button">
                    Confirm Email & Start Trial →
                </a>
                <div class="manual-confirmation">
                    <p class="manual-confirmation-text">
                        Can't click the button? Copy and paste this link into your browser:<br>
                        <span style="color: #00d083; word-break: break-all;">${confirmationUrl}</span>
                    </p>
                </div>
            </div>
            
            <p class="message">
                Congratulations on joining QWIKKER! Your <strong>${businessName}</strong> is now part of our platform. Once you confirm your email, you'll have full access to your dashboard and all Featured plan benefits.
            </p>
            
            <div class="trial-info">
                <div class="trial-title">🚀 What's Included in Your Free Trial</div>
                <p class="trial-description">
                    You'll have <strong>${trialDays} days</strong> to explore all Featured plan benefits including unlimited offers, secret menu items, and full dashboard access.
                </p>
            </div>
            
            <div class="checklist">
                <h2 class="checklist-title">📋 Your Setup Progress</h2>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <p class="progress-text">${completedCount} of ${checklistItems.length} completed (${progressPercentage}%)</p>
                
                ${checklistItems.map(item => `
                <div class="checklist-item">
                    <div class="checkbox ${item.done ? 'done' : 'pending'}">
                        ${item.done ? '✓' : '○'}
                    </div>
                    <span class="item-text ${item.done ? 'done' : 'pending'}">${item.item}</span>
                </div>
                `).join('')}
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
                <p style="color: #e0e0e0; margin-bottom: 20px;">
                    <strong>After confirming your email, you can:</strong>
                </p>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard" class="cta-button cta-secondary">
                    Complete Your Setup
                </a>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/settings" class="cta-button cta-secondary">
                    View Pricing Plans
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                This email was sent to ${data.email} because you signed up for QWIKKER.
            </p>
            <p class="footer-text">
                Questions? Reply to this email or visit our support center after confirming your account.
            </p>
        </div>
    </div>
</body>
</html>
  `.trim()
}

// Plain text version
export function generateConfirmationWelcomeEmailText(data: ConfirmationWelcomeEmailData): string {
  const { firstName, businessName, confirmationUrl } = data
  const trialDays = data.trialDays || 90 // Default to 90 days if not provided
  
  return `
Welcome to QWIKKER, ${firstName}!

PLEASE CONFIRM YOUR EMAIL ADDRESS
To complete your signup and start your ${trialDays}-day free trial, please confirm your email address by visiting this link:
${confirmationUrl}

CONGRATULATIONS!
Your ${businessName} is now part of the QWIKKER platform. Once you confirm your email, you'll have full access to your dashboard and all Featured plan benefits.

WHAT'S INCLUDED IN YOUR FREE TRIAL
You'll have ${trialDays} days to explore all Featured plan benefits including unlimited offers, secret menu items, and full dashboard access.

AFTER CONFIRMING YOUR EMAIL:
• Complete your setup: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard
• View pricing plans: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/settings
• Get support: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/support

Questions? Reply to this email or visit our support center after confirming your account.

This email was sent to ${data.email} because you signed up for QWIKKER.

---
QWIKKER Team
  `.trim()
}
