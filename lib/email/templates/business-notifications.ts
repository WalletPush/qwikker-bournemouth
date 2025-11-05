import { EmailTemplate } from '../email-service'

export interface BusinessApprovalEmailData {
  firstName: string
  businessName: string
  city: string
  dashboardUrl: string
  supportEmail: string
}

export interface OfferApprovalEmailData {
  firstName: string
  businessName: string
  offerName: string
  offerValue: string
  city: string
  dashboardUrl: string
}

export interface MenuApprovalEmailData {
  firstName: string
  businessName: string
  menuName: string
  menuType: string
  city: string
  dashboardUrl: string
}

export interface BusinessRejectionEmailData {
  firstName: string
  businessName: string
  rejectionReason?: string
  city: string
  supportEmail: string
}

/**
 * Business approval notification email
 */
export function createBusinessApprovalEmail(data: BusinessApprovalEmailData): EmailTemplate {
  const subject = `🎉 ${data.businessName} is now live on QWIKKER!`
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Business Approved - QWIKKER</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #00d083 0%, #00a86b 100%); color: white; padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; background: #00d083; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f1f5f9; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
    .success-icon { font-size: 48px; margin-bottom: 20px; }
    .highlight { background: #f0fdf4; border-left: 4px solid #00d083; padding: 20px; margin: 20px 0; border-radius: 0 6px 6px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">🎉</div>
      <h1 style="margin: 0; font-size: 28px;">Congratulations!</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your business is now live on QWIKKER</p>
    </div>
    
    <div class="content">
      <p>Hi ${data.firstName},</p>
      
      <p>Great news! <strong>${data.businessName}</strong> has been approved and is now live on the QWIKKER platform in ${data.city}.</p>
      
      <div class="highlight">
        <h3 style="margin-top: 0; color: #00d083;">What happens next?</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Your business is now discoverable by QWIKKER users</li>
          <li>Customers can find you through our AI chat assistant</li>
          <li>Your offers and information are live in our system</li>
          <li>You can start managing your profile and offers</li>
        </ul>
      </div>
      
      <p>Ready to make the most of your QWIKKER presence?</p>
      
      <a href="${data.dashboardUrl}" class="button">Access Your Dashboard</a>
      
      <p><strong>Next steps to maximize your success:</strong></p>
      <ul>
        <li>Upload high-quality photos of your business</li>
        <li>Create compelling offers to attract customers</li>
        <li>Keep your business hours and information up to date</li>
        <li>Upload your menu for better AI recommendations</li>
      </ul>
      
      <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>
      
      <p>Welcome to the QWIKKER family!</p>
      
      <p>Best regards,<br>
      The QWIKKER Team</p>
    </div>
    
    <div class="footer">
      <p>This email was sent to you because your business was approved on QWIKKER.</p>
      <p>QWIKKER - Connecting businesses with customers in ${data.city}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
  
  const text = `
Congratulations! ${data.businessName} is now live on QWIKKER

Hi ${data.firstName},

Great news! ${data.businessName} has been approved and is now live on the QWIKKER platform in ${data.city}.

What happens next?
- Your business is now discoverable by QWIKKER users
- Customers can find you through our AI chat assistant
- Your offers and information are live in our system
- You can start managing your profile and offers

Access your dashboard: ${data.dashboardUrl}

Next steps to maximize your success:
- Upload high-quality photos of your business
- Create compelling offers to attract customers
- Keep your business hours and information up to date
- Upload your menu for better AI recommendations

If you have any questions, contact us at ${data.supportEmail}.

Welcome to the QWIKKER family!

Best regards,
The QWIKKER Team
  `.trim()
  
  return { subject, html, text }
}

/**
 * Offer approval notification email
 */
export function createOfferApprovalEmail(data: OfferApprovalEmailData): EmailTemplate {
  const subject = `✅ Your offer "${data.offerName}" is now live!`
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offer Approved - QWIKKER</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #00d083 0%, #00a86b 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .button { display: inline-block; background: #00d083; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .offer-card { background: #f8fafc; border: 2px solid #00d083; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">✅ Offer Approved!</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.firstName},</p>
      
      <p>Your offer for <strong>${data.businessName}</strong> has been approved and is now live on QWIKKER!</p>
      
      <div class="offer-card">
        <h3 style="margin-top: 0; color: #00d083;">${data.offerName}</h3>
        <p style="font-size: 18px; font-weight: 600; color: #333;">${data.offerValue}</p>
        <p style="margin-bottom: 0; color: #64748b;">Now discoverable by customers in ${data.city}</p>
      </div>
      
      <p>Customers can now find and claim this offer through:</p>
      <ul>
        <li>QWIKKER AI chat assistant</li>
        <li>Business discovery features</li>
        <li>Direct business profile views</li>
      </ul>
      
      <a href="${data.dashboardUrl}" class="button">View in Dashboard</a>
      
      <p>Keep creating great offers to attract more customers!</p>
      
      <p>Best regards,<br>
      The QWIKKER Team</p>
    </div>
    
    <div class="footer">
      <p>QWIKKER - Connecting businesses with customers in ${data.city}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
  
  const text = `
Offer Approved! ${data.offerName} is now live

Hi ${data.firstName},

Your offer for ${data.businessName} has been approved and is now live on QWIKKER!

Offer: ${data.offerName}
Value: ${data.offerValue}
Location: ${data.city}

Customers can now find and claim this offer through:
- QWIKKER AI chat assistant
- Business discovery features  
- Direct business profile views

View in dashboard: ${data.dashboardUrl}

Keep creating great offers to attract more customers!

Best regards,
The QWIKKER Team
  `.trim()
  
  return { subject, html, text }
}

/**
 * Menu approval notification email
 */
export function createMenuApprovalEmail(data: MenuApprovalEmailData): EmailTemplate {
  const subject = `📋 Your ${data.menuType} menu has been approved!`
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Menu Approved - QWIKKER</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #00d083 0%, #00a86b 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .button { display: inline-block; background: #00d083; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .menu-card { background: #f8fafc; border: 2px solid #00d083; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">📋 Menu Approved!</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.firstName},</p>
      
      <p>Great news! Your menu for <strong>${data.businessName}</strong> has been approved and added to our AI knowledge base.</p>
      
      <div class="menu-card">
        <h3 style="margin-top: 0; color: #00d083;">${data.menuName}</h3>
        <p style="color: #64748b; text-transform: capitalize;">${data.menuType.replace('_', ' ')} Menu</p>
        <p style="margin-bottom: 0;">Now available for AI recommendations in ${data.city}</p>
      </div>
      
      <p><strong>What this means for your business:</strong></p>
      <ul>
        <li>Customers can ask our AI about your specific menu items</li>
        <li>More accurate recommendations based on your offerings</li>
        <li>Better discovery through food and drink searches</li>
        <li>Enhanced customer experience with detailed information</li>
      </ul>
      
      <a href="${data.dashboardUrl}" class="button">Manage Your Menus</a>
      
      <p>Consider uploading additional menus (drinks, specials, etc.) to maximize your visibility!</p>
      
      <p>Best regards,<br>
      The QWIKKER Team</p>
    </div>
    
    <div class="footer">
      <p>QWIKKER - Connecting businesses with customers in ${data.city}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
  
  const text = `
Menu Approved! ${data.menuName} is now live

Hi ${data.firstName},

Great news! Your menu for ${data.businessName} has been approved and added to our AI knowledge base.

Menu: ${data.menuName}
Type: ${data.menuType.replace('_', ' ')}
Location: ${data.city}

What this means for your business:
- Customers can ask our AI about your specific menu items
- More accurate recommendations based on your offerings  
- Better discovery through food and drink searches
- Enhanced customer experience with detailed information

Manage your menus: ${data.dashboardUrl}

Consider uploading additional menus to maximize your visibility!

Best regards,
The QWIKKER Team
  `.trim()
  
  return { subject, html, text }
}

/**
 * Business rejection notification email
 */
export function createBusinessRejectionEmail(data: BusinessRejectionEmailData): EmailTemplate {
  const subject = `Action needed: ${data.businessName} application requires updates`
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Update Required - QWIKKER</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #f59e0b; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .button { display: inline-block; background: #00d083; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .warning-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">⚠️ Application Update Required</h1>
    </div>
    
    <div class="content">
      <p>Hi ${data.firstName},</p>
      
      <p>Thank you for your interest in joining QWIKKER in ${data.city}. We've reviewed your application for <strong>${data.businessName}</strong> and need some additional information before we can approve your listing.</p>
      
      ${data.rejectionReason ? `
      <div class="warning-box">
        <h3 style="margin-top: 0; color: #92400e;">Required Updates:</h3>
        <p style="margin-bottom: 0;">${data.rejectionReason}</p>
      </div>
      ` : ''}
      
      <p><strong>What you need to do:</strong></p>
      <ul>
        <li>Review and update the information mentioned above</li>
        <li>Ensure all required fields are completed</li>
        <li>Upload high-quality business photos if needed</li>
        <li>Verify your business information is accurate</li>
      </ul>
      
      <p>Once you've made the necessary updates, our team will review your application again within 24-48 hours.</p>
      
      <a href="${data.dashboardUrl || '#'}" class="button">Update Your Application</a>
      
      <p>If you have any questions about the required updates, please don't hesitate to contact our support team at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>
      
      <p>We're here to help you succeed on QWIKKER!</p>
      
      <p>Best regards,<br>
      The QWIKKER Team</p>
    </div>
    
    <div class="footer">
      <p>QWIKKER - Connecting businesses with customers in ${data.city}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
  
  const text = `
Application Update Required - ${data.businessName}

Hi ${data.firstName},

Thank you for your interest in joining QWIKKER in ${data.city}. We've reviewed your application for ${data.businessName} and need some additional information before we can approve your listing.

${data.rejectionReason ? `Required Updates: ${data.rejectionReason}` : ''}

What you need to do:
- Review and update the information mentioned above
- Ensure all required fields are completed
- Upload high-quality business photos if needed
- Verify your business information is accurate

Once you've made the necessary updates, our team will review your application again within 24-48 hours.

If you have questions, contact us at ${data.supportEmail}.

We're here to help you succeed on QWIKKER!

Best regards,
The QWIKKER Team
  `.trim()
  
  return { subject, html, text }
}
