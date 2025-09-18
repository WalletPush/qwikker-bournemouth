import { Profile } from '@/types/profiles'

interface WelcomeEmailData {
  firstName: string
  lastName: string
  email: string
  businessName: string
  profile: Profile
}

// Email template for welcome email
export function generateWelcomeEmailHTML(data: WelcomeEmailData): string {
  const { firstName, businessName, profile } = data
  
  // Check what's missing from onboarding
  const missingItems = []
  if (!profile.logo) missingItems.push('Business Logo')
  if (!profile.menu_url) missingItems.push('Menu/Service List')
  if (!profile.offer_name) missingItems.push('First Exclusive Offer')
  
  // Check for secret menu items
  const hasSecretMenuItems = profile.additional_notes ? 
    (() => {
      try {
        const notesData = JSON.parse(profile.additional_notes)
        return notesData.secret_menu_items && notesData.secret_menu_items.length > 0
      } catch {
        return false
      }
    })() : false
  
  if (!hasSecretMenuItems) missingItems.push('Secret Menu Item')
  
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
    <title>Welcome to QWIKKER - Your Free Trial Starts Now!</title>
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
            text-align: center;
        }
        .logo img {
            height: 48px;
            width: auto;
            display: block;
            margin: 0 auto;
            max-width: 200px;
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
        .social-links {
            margin-top: 20px;
        }
        .support-info {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .support-title {
            font-size: 18px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 10px;
        }
        .support-text {
            color: #e0e0e0;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="https://res.cloudinary.com/qwikker/image/upload/v1/qwikker-logo.png" alt="QWIKKER" style="height: 48px; width: auto; display: block; margin: 0 auto; max-width: 200px;" />
            </div>
            <p class="header-text">Your Business Dashboard Awaits</p>
        </div>
        
        <div class="content">
            <h1 class="welcome-message">Welcome to QWIKKER, ${firstName}!</h1>
            
            <p class="message">
                Congratulations on joining QWIKKER! Your <strong>${businessName}</strong> is now part of our platform, and your <strong>120-day free trial</strong> has officially started.
            </p>
            
            <div class="message" style="display: flex; align-items: flex-start; gap: 12px; background: rgba(0, 208, 131, 0.1); border-left: 3px solid #00d083; padding: 16px; border-radius: 8px; margin-bottom: 30px;">
                <div style="width: 24px; height: 24px; background: #00d083; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 2px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                </div>
                <div>
                    <strong>Great news!</strong> You can start using your dashboard immediately - no email confirmation required. We've designed QWIKKER to get you up and running as quickly as possible.
                </div>
            </div>
            
            <div class="trial-info">
                <div class="trial-title" style="display: flex; align-items: center; gap: 8px; justify-content: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d083" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    Your Free Trial is Active
                </div>
                <p class="trial-description">
                    You have <strong>120 days</strong> to explore Featured plan benefits including up to 3 offers, secret menu items, file uploads, and dashboard access. Premium features like Analytics, Loyalty Cards, and Push Notifications require an upgrade.
                </p>
            </div>
            
            <div class="checklist">
                <h2 class="checklist-title" style="display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    Complete Your Setup
                </h2>
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
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard" class="cta-button">
                    Complete Your Setup →
                </a>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/settings" class="cta-button cta-secondary">
                    View Pricing Plans
                </a>
            </div>
            
            <div class="support-info">
                <h3 class="support-title" style="display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        <path d="M8 9h8"/>
                        <path d="M8 13h6"/>
                    </svg>
                    Need Help Getting Started?
                </h3>
                <p class="support-text">
                    Our team is here to help you make the most of your QWIKKER experience. Whether you need help uploading your menu, creating your first offer, or understanding the platform features, we've got you covered.
                </p>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/support" class="cta-button cta-secondary">
                    Contact Support
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                This email was sent to ${data.email} because you signed up for QWIKKER.
            </p>
            <p class="footer-text">
                Questions? Reply to this email or visit our support center.
            </p>
            <div class="social-links">
                <p class="footer-text">
                    Follow us: 
                    <a href="#" style="color: #00d083; text-decoration: none;">Instagram</a> • 
                    <a href="#" style="color: #00d083; text-decoration: none;">Facebook</a> • 
                    <a href="#" style="color: #00d083; text-decoration: none;">LinkedIn</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim()
}

// Plain text version for email clients that don't support HTML
export function generateWelcomeEmailText(data: WelcomeEmailData): string {
  const { firstName, businessName, profile } = data
  
  // Check what's missing from onboarding
  const missingItems = []
  if (!profile.logo) missingItems.push('Business Logo')
  if (!profile.menu_url) missingItems.push('Menu/Service List')
  if (!profile.offer_name) missingItems.push('First Exclusive Offer')
  
  const hasSecretMenuItems = profile.additional_notes ? 
    (() => {
      try {
        const notesData = JSON.parse(profile.additional_notes)
        return notesData.secret_menu_items && notesData.secret_menu_items.length > 0
      } catch {
        return false
      }
    })() : false
  
  if (!hasSecretMenuItems) missingItems.push('Secret Menu Item')
  
  const checklistItems = [
    { item: 'Complete your business profile', done: !!(profile.business_name && profile.business_address) },
    { item: 'Upload your business logo', done: !!profile.logo },
    { item: 'Add your menu or service list', done: !!profile.menu_url },
    { item: 'Create your first exclusive offer', done: !!profile.offer_name },
    { item: 'Add a secret menu item', done: hasSecretMenuItems },
    { item: 'Complete your social media links', done: !!(profile.instagram_handle || profile.facebook_handle) },
  ]
  
  const completedCount = checklistItems.filter(item => item.done).length
  
  return `
Welcome to QWIKKER, ${firstName}!

Congratulations on joining QWIKKER! Your ${businessName} is now part of our platform, and your 120-day free trial has officially started.

YOUR FREE TRIAL IS ACTIVE
You have 120 days to explore Featured plan benefits including up to 3 offers, secret menu items, file uploads, and dashboard access. Premium features like Analytics, Loyalty Cards, and Push Notifications require an upgrade.

COMPLETE YOUR SETUP (${completedCount} of ${checklistItems.length} completed)
${checklistItems.map(item => `${item.done ? '✓' : '○'} ${item.item}`).join('\n')}

NEXT STEPS:
• Complete your setup: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard
• View pricing plans: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/settings
• Get support: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/support

NEED HELP?
Our team is here to help you make the most of your QWIKKER experience. Whether you need help uploading your menu, creating your first offer, or understanding the platform features, we've got you covered.

Questions? Reply to this email or visit our support center.

This email was sent to ${data.email} because you signed up for QWIKKER.

---
QWIKKER Team
  `.trim()
}

// Function to send welcome email (will be implemented with email service)
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  try {
    // For now, we'll just log the email content
    // Later this can be replaced with Resend, SendGrid, or other email service
    
    console.log('📧 Welcome Email Generated for:', data.email)
    console.log('📧 Business:', data.businessName)
    console.log('📧 HTML Content Length:', generateWelcomeEmailHTML(data).length)
    
    // TODO: Implement actual email sending
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: 'QWIKKER <welcome@qwikker.com>',
    //   to: data.email,
    //   subject: `Welcome to QWIKKER, ${data.firstName}! Your free trial starts now 🚀`,
    //   html: generateWelcomeEmailHTML(data),
    //   text: generateWelcomeEmailText(data),
    // })
    
    return true
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    return false
  }
}
