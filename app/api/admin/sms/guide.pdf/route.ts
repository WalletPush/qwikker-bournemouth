import { NextRequest, NextResponse } from 'next/server'
import { getCityFromRequest } from '@/lib/utils/city-detection'

/**
 * GET /api/admin/sms/guide.pdf
 * 
 * Returns an HTML page that can be printed to PDF.
 * Contains step-by-step Twilio setup instructions.
 * 
 * Note: The .pdf extension is misleading - this actually serves HTML.
 * Browsers will prompt "Print to PDF" when users click the link.
 * For true PDF generation, integrate pdf-lib or similar.
 */
export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Derive city from hostname
    const city = await getCityFromRequest(request.headers)
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Twilio SMS Setup Guide - ${city.charAt(0).toUpperCase() + city.slice(1)} QWIKKER</title>
  <style>
    @media print {
      body { margin: 0; padding: 20mm; }
      .no-print { display: none; }
      a { text-decoration: none; color: #0066cc; }
      a:after { content: " (" attr(href) ")"; font-size: 0.8em; color: #666; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }
    h1 { color: #0066cc; margin-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; border-bottom: 2px solid #0066cc; padding-bottom: 5px; }
    h3 { color: #555; margin-top: 20px; }
    .info-box {
      background: #f0f7ff;
      border-left: 4px solid #0066cc;
      padding: 15px;
      margin: 20px 0;
    }
    .warning-box {
      background: #fff3cd;
      border-left: 4px solid #ff9800;
      padding: 15px;
      margin: 20px 0;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    .step {
      margin: 20px 0;
      padding: 15px;
      background: #fafafa;
      border-radius: 5px;
    }
    .step-number {
      display: inline-block;
      width: 30px;
      height: 30px;
      background: #0066cc;
      color: white;
      text-align: center;
      line-height: 30px;
      border-radius: 50%;
      font-weight: bold;
      margin-right: 10px;
    }
    ul { margin: 10px 0; padding-left: 30px; }
    li { margin: 8px 0; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      text-align: center;
      color: #666;
      font-size: 0.9em;
    }
    .btn-print {
      background: #0066cc;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      border-radius: 5px;
      cursor: pointer;
      margin: 20px 0;
    }
    .btn-print:hover {
      background: #0052a3;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">📥 Save as PDF / Print</button>
  </div>

  <h1>Twilio SMS Setup Guide</h1>
  <p><strong>Franchise:</strong> ${city.charAt(0).toUpperCase() + city.slice(1)} QWIKKER</p>
  <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

  <div class="info-box">
    <strong>📱 What You'll Enable:</strong>
    <p>Transactional SMS notifications for business claim requests:</p>
    <ul>
      <li>Claim Submitted confirmation</li>
      <li>Claim Approved notification with login link</li>
    </ul>
  </div>

  <div class="warning-box">
    <strong>⚠️ Important:</strong> SMS regulations vary by country. Some regions (US, UK, Canada, Australia, etc.) require regulatory approval before sending. This can take 1–3 business days or longer. You can test everything with <strong>Simulated Mode</strong> while approval is pending.
  </div>

  <h2>Step 1: Create a Twilio Account</h2>
  <div class="step">
    <p><span class="step-number">1</span> Go to <a href="https://www.twilio.com/try-twilio" target="_blank">https://www.twilio.com/try-twilio</a></p>
    <p><span class="step-number">2</span> Sign up for a free account (trial accounts can send to verified numbers only)</p>
    <p><span class="step-number">3</span> Complete email and phone verification</p>
  </div>

  <h2>Step 2: Get Your Account Credentials</h2>
  <div class="step">
    <p><span class="step-number">1</span> Log in to <a href="https://console.twilio.com/" target="_blank">Twilio Console</a></p>
    <p><span class="step-number">2</span> On the dashboard, find your <strong>Account SID</strong> and <strong>Auth Token</strong></p>
    <p><span class="step-number">3</span> Copy these values — you'll paste them into QWIKKER setup</p>
  </div>

  <h2>Step 3: Set Up Messaging Service (Recommended)</h2>
  <div class="info-box">
    <strong>Why Messaging Service?</strong> It handles compliance, auto-routing, and supports multiple senders. This is the recommended approach for production use.
  </div>

  <div class="step">
    <p><span class="step-number">1</span> In Twilio Console, go to <strong>Messaging → Services</strong></p>
    <p><span class="step-number">2</span> Click <strong>Create Messaging Service</strong></p>
    <p><span class="step-number">3</span> Give it a friendly name (e.g., "${city.charAt(0).toUpperCase() + city.slice(1)} QWIKKER Notifications")</p>
    <p><span class="step-number">4</span> Select use case: <strong>Notify my users</strong></p>
    <p><span class="step-number">5</span> Complete setup wizard and copy the <strong>Messaging Service SID</strong> (starts with MG)</p>
  </div>

  <h2>Step 4: Add a Phone Number or Sender ID</h2>
  <div class="step">
    <p><strong>Option A: Buy a Phone Number</strong></p>
    <ul>
      <li>Go to <strong>Phone Numbers → Buy a number</strong></li>
      <li>Select your country</li>
      <li>Filter by "SMS" capability</li>
      <li>Purchase a number (trial accounts get one free number)</li>
      <li>Assign it to your Messaging Service</li>
    </ul>

    <p><strong>Option B: Use Sender ID (where supported)</strong></p>
    <ul>
      <li>Some countries (UK, parts of Europe) support alphanumeric Sender IDs (e.g., "QWIKKER")</li>
      <li>Add a Sender ID to your Messaging Service</li>
      <li>Note: Sender IDs may require registration in some countries</li>
    </ul>
  </div>

  <h2>Step 5: Regulatory Compliance (If Required)</h2>
  <div class="warning-box">
    <strong>US/Canada:</strong> You'll need to register a <strong>Business Profile</strong> and <strong>Messaging Campaign</strong> (A2P 10DLC). Approval can take 1-5 business days.
    <br><br>
    <strong>UK/Europe:</strong> Most countries require Sender ID registration. Check Twilio docs for your country.
    <br><br>
    <strong>Australia:</strong> Requires Sender ID registration with carriers.
  </div>

  <div class="step">
    <p><span class="step-number">1</span> In Twilio Console, go to <strong>Regulatory Compliance</strong></p>
    <p><span class="step-number">2</span> Follow prompts to create a <strong>Business Profile</strong></p>
    <p><span class="step-number">3</span> If sending in US/Canada: Create an <strong>A2P Campaign</strong></p>
    <p><span class="step-number">4</span> Wait for approval (you'll receive an email)</p>
    <p><span class="step-number">5</span> While waiting, use <strong>Simulated Test Mode</strong> in QWIKKER</p>
  </div>

  <h2>Step 6: Configure QWIKKER</h2>
  <div class="step">
    <p><span class="step-number">1</span> Go to your QWIKKER Admin Dashboard → <strong>Franchise Setup</strong> → <strong>Platform Integrations</strong></p>
    <p><span class="step-number">2</span> Enable <strong>SMS Notifications</strong></p>
    <p><span class="step-number">3</span> Enter your Twilio credentials:</p>
    <ul>
      <li><code>Account SID</code> (starts with AC)</li>
      <li><code>Auth Token</code> (32-character hex string)</li>
      <li><code>Messaging Service SID</code> (starts with MG) <strong>or</strong> <code>From Number</code> (E.164 format, e.g., +447700900123)</li>
    </ul>
    <p><span class="step-number">4</span> Select your country (optional, for guidance)</p>
    <p><span class="step-number">5</span> Save your changes</p>
  </div>

  <h2>Step 7: Test Your Setup</h2>
  <div class="step">
    <p><strong>Simulated Test (Always Available)</strong></p>
    <p><span class="step-number">1</span> Click <strong>Simulated Test</strong> button in QWIKKER</p>
    <p><span class="step-number">2</span> Review the message preview</p>
    <p><span class="step-number">3</span> This confirms your message templates are working (no real SMS sent)</p>

    <p style="margin-top: 20px;"><strong>Real SMS Test (Once Approved)</strong></p>
    <p><span class="step-number">1</span> Click <strong>Send Real Test SMS</strong> button</p>
    <p><span class="step-number">2</span> Enter a phone number in E.164 format (e.g., +447700900123)</p>
    <p><span class="step-number">3</span> If successful: SMS is VERIFIED and your claim form will show the SMS opt-in checkbox ✅</p>
    <p><span class="step-number">4</span> If failed: Check error message and troubleshoot (see below)</p>
  </div>

  <h2>Troubleshooting</h2>

  <h3>❌ Error: "Account SID or Auth Token is invalid"</h3>
  <ul>
    <li>Double-check credentials from Twilio Console</li>
    <li>Make sure Account SID starts with "AC" and is 34 characters</li>
    <li>Make sure Auth Token is exactly 32 characters</li>
  </ul>

  <h3>❌ Error: "Phone number not valid"</h3>
  <ul>
    <li>Use E.164 format: + followed by country code and number (no spaces or dashes)</li>
    <li>Example: +447700900123 (UK), +12025551234 (US)</li>
  </ul>

  <h3>❌ Error: "Messaging Service not found"</h3>
  <ul>
    <li>Verify Messaging Service SID starts with "MG" and is 34 characters</li>
    <li>Check that the Messaging Service exists in your Twilio account</li>
    <li>Ensure at least one sender (phone number or Sender ID) is assigned to the service</li>
  </ul>

  <h3>❌ Error: "Permission denied" or "Compliance required"</h3>
  <ul>
    <li>Your region requires regulatory approval (A2P 10DLC, Sender ID registration, etc.)</li>
    <li>Complete the compliance steps in Twilio Console</li>
    <li>Wait for approval (check email for updates)</li>
    <li>Use Simulated Test Mode in the meantime</li>
  </ul>

  <h3>❌ Trial Account Limitations</h3>
  <ul>
    <li>Trial accounts can only send to phone numbers you've verified in Twilio</li>
    <li>Upgrade to a paid account to send to any number</li>
    <li>Go to Twilio Console → <strong>Upgrade Your Account</strong></li>
  </ul>

  <h2>Test Modes Explained</h2>

  <div class="info-box">
    <p><strong>🧪 Simulated Test:</strong></p>
    <ul>
      <li>Runs instantly</li>
      <li>Does NOT send real SMS</li>
      <li>Shows message preview</li>
      <li>Logs activity to database</li>
      <li>Use this to verify templates and flow logic</li>
    </ul>

    <p><strong>📱 Real SMS Test:</strong></p>
    <ul>
      <li>Sends actual SMS via Twilio</li>
      <li>May fail if compliance approval is pending</li>
      <li>On success: marks SMS as VERIFIED</li>
      <li>Once verified: claim form shows SMS opt-in checkbox</li>
    </ul>
  </div>

  <h2>Links & Resources</h2>
  <ul>
    <li><a href="https://console.twilio.com/" target="_blank">Twilio Console</a></li>
    <li><a href="https://www.twilio.com/docs/messaging/services" target="_blank">Messaging Services Docs</a></li>
    <li><a href="https://www.twilio.com/docs/messaging/guides/how-to-use-your-free-trial-account" target="_blank">Trial Account Guide</a></li>
    <li><a href="https://www.twilio.com/docs/messaging/compliance" target="_blank">Compliance & Regulations</a></li>
    <li><a href="https://www.twilio.com/docs/glossary/what-e164" target="_blank">E.164 Phone Number Format</a></li>
  </ul>

  <div class="footer">
    <p><strong>QWIKKER ${city.charAt(0).toUpperCase() + city.slice(1)}</strong> | SMS Setup Guide</p>
    <p>Generated: ${new Date().toLocaleString('en-GB')}</p>
    <p>For support, contact your QWIKKER administrator</p>
  </div>

  <div class="no-print">
    <button class="btn-print" onclick="window.print()">📥 Save as PDF / Print</button>
  </div>
</body>
</html>
    `.trim()
    
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="twilio-setup-guide-${city}.html"`
      }
    })
    
  } catch (error: any) {
    console.error('❌ PDF guide error:', error)
    return NextResponse.json(
      { error: 'Failed to generate setup guide' },
      { status: 500 }
    )
  }
}

