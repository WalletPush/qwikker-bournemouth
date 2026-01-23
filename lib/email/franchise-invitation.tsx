/**
 * Franchise Invitation Email Template
 * Matches the onboarding email design with Qwikker branding
 */

export interface FranchiseInvitationEmailProps {
  franchiseName: string
  ownerName: string
  ownerEmail: string
  username: string // Always the city name
  temporaryPassword: string
  loginUrl: string
  subdomain: string
}

export function FranchiseInvitationEmail({
  franchiseName,
  ownerName,
  ownerEmail,
  username,
  temporaryPassword,
  loginUrl,
  subdomain
}: FranchiseInvitationEmailProps): string {
  // Use Cloudinary URL for logo (publicly accessible in emails)
  const logoUrl = process.env.CLOUDINARY_LOGO_URL || 
                  'https://res.cloudinary.com/demo/image/upload/v1/qwikker-logo.svg' // Placeholder
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Qwikker</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 40px 30px 40px; text-align: center;">
              <img src="${logoUrl}" alt="QWIKKER" style="width: 180px; height: auto; margin-bottom: 10px;" />
              <div style="color: #00D083; font-size: 14px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">Platform</div>
            </td>
          </tr>
          
          <!-- Welcome Message -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
                🎉 Welcome to Qwikker, ${ownerName}!
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a5568;">
                Your <strong>${franchiseName}</strong> franchise has been created and is ready to go! You now have access to the full Qwikker platform to manage your city's businesses, offers, events, and more.
              </p>
            </td>
          </tr>
          
          <!-- Credentials Box -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #00D083 0%, #00b86f 100%); border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 30px;">
                    <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #ffffff;">
                      🔐 Your Login Credentials
                    </h2>
                    
                    <div style="background: rgba(255, 255, 255, 0.15); border-radius: 6px; padding: 20px; margin-bottom: 15px;">
                      <div style="color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Username</div>
                      <div style="color: #ffffff; font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 1px;">${username}</div>
                    </div>
                    
                    <div style="background: rgba(255, 255, 255, 0.15); border-radius: 6px; padding: 20px;">
                      <div style="color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Temporary Password</div>
                      <div style="color: #ffffff; font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 1px; word-break: break-all;">${temporaryPassword}</div>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.1); border-radius: 6px; border-left: 4px solid #ffffff;">
                      <p style="margin: 0; color: #ffffff; font-size: 14px; line-height: 1.5;">
                        ⚠️ <strong>Important:</strong> You'll be required to change this password on your first login for security.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Quick Start -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 700; color: #1a1a1a;">
                🚀 Quick Start Guide
              </h3>
              <ol style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 15px; line-height: 1.8;">
                <li>Click the button below to access your admin dashboard</li>
                <li>Login with the credentials above</li>
                <li>Set your new secure password</li>
                <li>Complete your franchise setup wizard</li>
                <li>Start onboarding businesses in ${franchiseName}!</li>
              </ol>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #00D083 0%, #00b86f 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 12px rgba(0, 208, 131, 0.3);">
                Access Your Dashboard →
              </a>
              <p style="margin: 15px 0 0 0; font-size: 13px; color: #718096;">
                Or copy this URL: <span style="color: #00D083;">${loginUrl}</span>
              </p>
            </td>
          </tr>
          
          <!-- Your Dashboard URL -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <div style="background: #f7fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #2d3748;">📍 Your Dashboard URL</h4>
                <p style="margin: 0; font-size: 14px; color: #4a5568; line-height: 1.6;">
                  Bookmark this link for quick access:<br>
                  <strong style="color: #00D083;">${subdomain}.qwikker.com/admin</strong>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Support -->
          <tr>
            <td style="padding: 0 40px 40px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 20px 0 0 0; font-size: 14px; color: #718096; line-height: 1.6;">
                <strong style="color: #2d3748;">Need help getting started?</strong><br>
                Our HQ team is here to support you. Reply to this email or contact us at 
                <a href="mailto:support@qwikker.com" style="color: #00D083; text-decoration: none;">support@qwikker.com</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f7fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #718096;">
                Welcome to the Qwikker family! 🚀
              </p>
              <p style="margin: 0; font-size: 12px; color: #a0aec0;">
                © ${new Date().getFullYear()} Qwikker. All rights reserved.<br>
                <a href="https://qwikker.com" style="color: #00D083; text-decoration: none;">qwikker.com</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Plain text version (fallback for email clients that don't support HTML)
 */
export function FranchiseInvitationEmailText({
  franchiseName,
  ownerName,
  username,
  temporaryPassword,
  loginUrl,
  subdomain
}: FranchiseInvitationEmailProps): string {
  return `
WELCOME TO QWIKKER!

Hi ${ownerName},

Your ${franchiseName} franchise has been created and is ready to go!

YOUR LOGIN CREDENTIALS
Username: ${username}
Temporary Password: ${temporaryPassword}

IMPORTANT: You'll be required to change this password on your first login for security.

QUICK START
1. Go to ${loginUrl}
2. Login with the credentials above
3. Set your new secure password
4. Complete your franchise setup wizard
5. Start onboarding businesses!

YOUR DASHBOARD URL
${subdomain}.qwikker.com/admin

Need help? Reply to this email or contact support@qwikker.com

Welcome to the Qwikker family!

© ${new Date().getFullYear()} Qwikker
qwikker.com
  `.trim()
}
