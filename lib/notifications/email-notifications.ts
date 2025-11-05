import { sendEmail, sendEmailWithRetry } from '../email/email-service'
import { 
  createBusinessApprovalEmail,
  createOfferApprovalEmail, 
  createMenuApprovalEmail,
  createBusinessRejectionEmail,
  BusinessApprovalEmailData,
  OfferApprovalEmailData,
  MenuApprovalEmailData,
  BusinessRejectionEmailData
} from '../email/templates/business-notifications'

/**
 * Send business approval notification email
 */
export async function sendBusinessApprovalNotification(data: BusinessApprovalEmailData): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    console.log(`📧 Sending business approval email to ${data.firstName} for ${data.businessName}`)
    
    const template = createBusinessApprovalEmail(data)
    
    const result = await sendEmailWithRetry({
      to: data.firstName ? `${data.firstName} <${data.businessName}>` : data.businessName,
      template,
      tags: [
        { name: 'category', value: 'business_approval' },
        { name: 'city', value: data.city },
        { name: 'business_type', value: 'approval' }
      ]
    })
    
    if (result.success) {
      console.log(`✅ Business approval email sent successfully: ${result.messageId}`)
    } else {
      console.error(`❌ Failed to send business approval email: ${result.error}`)
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Error sending business approval email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Send offer approval notification email
 */
export async function sendOfferApprovalNotification(data: OfferApprovalEmailData): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    console.log(`📧 Sending offer approval email for "${data.offerName}" to ${data.firstName}`)
    
    const template = createOfferApprovalEmail(data)
    
    const result = await sendEmailWithRetry({
      to: data.firstName ? `${data.firstName} <${data.businessName}>` : data.businessName,
      template,
      tags: [
        { name: 'category', value: 'offer_approval' },
        { name: 'city', value: data.city },
        { name: 'business_type', value: 'offer' }
      ]
    })
    
    if (result.success) {
      console.log(`✅ Offer approval email sent successfully: ${result.messageId}`)
    } else {
      console.error(`❌ Failed to send offer approval email: ${result.error}`)
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Error sending offer approval email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Send menu approval notification email
 */
export async function sendMenuApprovalNotification(data: MenuApprovalEmailData): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    console.log(`📧 Sending menu approval email for "${data.menuName}" to ${data.firstName}`)
    
    const template = createMenuApprovalEmail(data)
    
    const result = await sendEmailWithRetry({
      to: data.firstName ? `${data.firstName} <${data.businessName}>` : data.businessName,
      template,
      tags: [
        { name: 'category', value: 'menu_approval' },
        { name: 'city', value: data.city },
        { name: 'menu_type', value: data.menuType }
      ]
    })
    
    if (result.success) {
      console.log(`✅ Menu approval email sent successfully: ${result.messageId}`)
    } else {
      console.error(`❌ Failed to send menu approval email: ${result.error}`)
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Error sending menu approval email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Send business rejection notification email
 */
export async function sendBusinessRejectionNotification(data: BusinessRejectionEmailData): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    console.log(`📧 Sending business rejection email to ${data.firstName} for ${data.businessName}`)
    
    const template = createBusinessRejectionEmail(data)
    
    const result = await sendEmailWithRetry({
      to: data.firstName ? `${data.firstName} <${data.businessName}>` : data.businessName,
      template,
      tags: [
        { name: 'category', value: 'business_rejection' },
        { name: 'city', value: data.city },
        { name: 'business_type', value: 'rejection' }
      ]
    })
    
    if (result.success) {
      console.log(`✅ Business rejection email sent successfully: ${result.messageId}`)
    } else {
      console.error(`❌ Failed to send business rejection email: ${result.error}`)
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Error sending business rejection email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Send system notification emails (for admins)
 */
export async function sendSystemNotificationEmail(
  to: string | string[],
  subject: string,
  message: string,
  severity: 'critical' | 'high' | 'medium' | 'low' = 'medium'
): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    console.log(`📧 Sending system notification email: ${subject}`)
    
    const severityColors = {
      critical: '#dc2626',
      high: '#ea580c', 
      medium: '#ca8a04',
      low: '#16a34a'
    }
    
    const severityEmojis = {
      critical: '🚨',
      high: '⚠️',
      medium: 'ℹ️',
      low: '✅'
    }
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>System Notification - QWIKKER</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: ${severityColors[severity]}; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
    .message { background: #f8fafc; border-left: 4px solid ${severityColors[severity]}; padding: 20px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 20px;">${severityEmojis[severity]} System Notification</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">${severity} Priority</p>
    </div>
    
    <div class="content">
      <h2 style="color: ${severityColors[severity]}; margin-top: 0;">${subject}</h2>
      
      <div class="message">
        <p style="margin: 0; white-space: pre-line;">${message}</p>
      </div>
      
      <p style="color: #64748b; font-size: 14px;">
        <strong>Time:</strong> ${new Date().toISOString()}<br>
        <strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}
      </p>
    </div>
    
    <div class="footer">
      <p>QWIKKER System Notifications</p>
    </div>
  </div>
</body>
</html>
    `.trim()
    
    const text = `
QWIKKER System Notification - ${severity.toUpperCase()} Priority

${subject}

${message}

Time: ${new Date().toISOString()}
Environment: ${process.env.NODE_ENV || 'development'}
    `.trim()
    
    const result = await sendEmailWithRetry({
      to,
      template: { subject: `[QWIKKER] ${subject}`, html, text },
      tags: [
        { name: 'category', value: 'system_notification' },
        { name: 'severity', value: severity },
        { name: 'type', value: 'admin' }
      ]
    })
    
    if (result.success) {
      console.log(`✅ System notification email sent successfully: ${result.messageId}`)
    } else {
      console.error(`❌ Failed to send system notification email: ${result.error}`)
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Error sending system notification email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
