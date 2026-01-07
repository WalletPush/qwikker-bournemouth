import type { Profile } from '@/types/profiles';

interface WelcomeEmailData {
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  profile: Profile;
  trialDays?: number; // Franchise-specific trial length (default: 90)
}

export function generateSimpleWelcomeEmailHTML(data: WelcomeEmailData): string {
  const { firstName, businessName, profile } = data;
  const trialDays = data.trialDays || 90; // Default to 90 days if not provided
  
  // Calculate missing items for action list
  const missingItems = [];
  if (!profile.business_logo) missingItems.push("Business Logo");
  if (!profile.menu_image) missingItems.push("Menu/Services");
  if (!profile.instagram_handle) missingItems.push("Instagram Handle");
  if (!profile.facebook_handle) missingItems.push("Facebook Handle");
  
  const hasAllItems = missingItems.length === 0;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to QWIKKER</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    
    <!-- Email Container -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                
                <!-- Main Email Content -->
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #22c55e;">
                            
                            <!-- Logo -->
                            <div style="margin-bottom: 20px;">
                                <h1 style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0; letter-spacing: 2px;">QWIKKER</h1>
                            </div>
                            
                            <p style="color: #cccccc; font-size: 18px; margin: 0;">Your Business Dashboard Awaits</p>
                        </td>
                    </tr>
                    
                    <!-- Welcome Message -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #1a1a1a; font-size: 28px; margin: 0 0 20px 0;">Welcome to QWIKKER, ${firstName}!</h2>
                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                Great news! Your <strong>${businessName}</strong> dashboard is now ready and your <strong>${trialDays}-day free trial</strong> has begun.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Free Trial Info -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 8px; padding: 25px; text-align: center;">
                                <h3 style="color: #ffffff; font-size: 20px; margin: 0 0 10px 0;">🎉 FREE TRIAL ACTIVE</h3>
                                <p style="color: #ffffff; font-size: 16px; margin: 0; opacity: 0.9;">
                                    You have <strong>${trialDays} days</strong> to explore Featured plan benefits including up to 3 offers, secret menu items, file uploads, and dashboard access. Premium features like Analytics, Loyalty Cards, and Push Notifications require an upgrade.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Action Items -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <h3 style="color: #1a1a1a; font-size: 20px; margin: 0 0 20px 0;">📋 Complete Your Setup</h3>
                            
                            ${hasAllItems ? `
                                <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; text-align: center;">
                                    <p style="color: #15803d; font-size: 16px; margin: 0; font-weight: bold;">✅ All setup complete! Your business is ready to go.</p>
                                </div>
                            ` : `
                                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px;">
                                    <p style="color: #92400e; font-size: 16px; margin: 0 0 15px 0;">Complete these items to maximize your QWIKKER presence:</p>
                                    <ul style="color: #92400e; font-size: 14px; margin: 0; padding-left: 20px;">
                                        ${missingItems.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
                                    </ul>
                                </div>
                            `}
                        </td>
                    </tr>
                    
                    <!-- CTA Button -->
                    <tr>
                        <td style="padding: 0 30px 40px 30px; text-align: center;">
                            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard" 
                               style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(34, 197, 94, 0.3);">
                                Access Your Dashboard →
                            </a>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #1a1a1a; padding: 30px; text-align: center;">
                            <p style="color: #888888; font-size: 14px; margin: 0 0 15px 0;">
                                Need help? Contact us at <a href="mailto:bournemouth@qwikker.com" style="color: #22c55e; text-decoration: none;">bournemouth@qwikker.com</a>
                            </p>
                            <p style="color: #666666; font-size: 12px; margin: 0;">
                                © 2024 QWIKKER. All rights reserved.
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
    
</body>
</html>
  `.trim();
}

export function generateSimpleWelcomeEmailText(data: WelcomeEmailData): string {
  const { firstName, businessName, profile } = data;
  const trialDays = data.trialDays || 90; // Default to 90 days if not provided
  
  // Calculate missing items for action list
  const missingItems = [];
  if (!profile.business_logo) missingItems.push("- Business Logo");
  if (!profile.menu_image) missingItems.push("- Menu/Services");
  if (!profile.instagram_handle) missingItems.push("- Instagram Handle");
  if (!profile.facebook_handle) missingItems.push("- Facebook Handle");
  
  const hasAllItems = missingItems.length === 0;
  
  return `
WELCOME TO QWIKKER, ${firstName.toUpperCase()}!

Great news! Your ${businessName} dashboard is now ready and your ${trialDays}-day free trial has begun.

FREE TRIAL ACTIVE
You have ${trialDays} days to explore Featured plan benefits including up to 3 offers, secret menu items, file uploads, and dashboard access. Premium features like Analytics, Loyalty Cards, and Push Notifications require an upgrade.

COMPLETE YOUR SETUP
${hasAllItems 
  ? "✅ All setup complete! Your business is ready to go."
  : `Complete these items to maximize your QWIKKER presence:\n${missingItems.join('\n')}`
}

ACCESS YOUR DASHBOARD
Visit: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard

Need help? Contact us at bournemouth@qwikker.com

© 2024 QWIKKER. All rights reserved.
  `.trim();
}
