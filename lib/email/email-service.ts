import { resend, EMAIL_CONFIG } from './resend-client'

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface SendEmailOptions {
  to: string | string[]
  template: EmailTemplate
  tags?: Array<{ name: string; value: string }>
  replyTo?: string
}

/**
 * Core email sending service using Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    if (!resend) {
      console.warn('📧 Resend not configured - email sending disabled')
      return { success: false, error: 'Email service not configured' }
    }

    const { to, template, tags = [], replyTo } = options

    console.log(`📧 Sending email to: ${Array.isArray(to) ? to.join(', ') : to}`)
    console.log(`📧 Subject: ${template.subject}`)

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: Array.isArray(to) ? to : [to],
      replyTo: replyTo || EMAIL_CONFIG.replyTo,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [
        { name: 'service', value: 'qwikker' },
        { name: 'environment', value: process.env.NODE_ENV || 'development' },
        ...tags
      ]
    })

    if (result.error) {
      console.error('❌ Resend error:', result.error)
      return { success: false, error: result.error.message }
    }

    console.log('✅ Email sent successfully:', result.data?.id)
    return { success: true, messageId: result.data?.id }

  } catch (error) {
    console.error('❌ Email sending failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown email error' 
    }
  }
}

/**
 * Send email with retry logic for important notifications
 */
export async function sendEmailWithRetry(
  options: SendEmailOptions, 
  maxRetries: number = 3
): Promise<{
  success: boolean
  messageId?: string
  error?: string
  attempts: number
}> {
  let lastError: string = ''
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`📧 Email attempt ${attempt}/${maxRetries}`)
    
    const result = await sendEmail(options)
    
    if (result.success) {
      return { ...result, attempts: attempt }
    }
    
    lastError = result.error || 'Unknown error'
    
    if (attempt < maxRetries) {
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000
      console.log(`📧 Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return { 
    success: false, 
    error: lastError, 
    attempts: maxRetries 
  }
}

/**
 * Send bulk emails (with rate limiting)
 */
export async function sendBulkEmails(
  emails: SendEmailOptions[],
  batchSize: number = 10,
  delayBetweenBatches: number = 1000
): Promise<{
  success: boolean
  sent: number
  failed: number
  results: Array<{ success: boolean; messageId?: string; error?: string }>
}> {
  const results: Array<{ success: boolean; messageId?: string; error?: string }> = []
  let sent = 0
  let failed = 0

  console.log(`📧 Sending ${emails.length} emails in batches of ${batchSize}`)

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)
    
    console.log(`📧 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(emails.length / batchSize)}`)
    
    const batchPromises = batch.map(email => sendEmail(email))
    const batchResults = await Promise.all(batchPromises)
    
    batchResults.forEach(result => {
      results.push(result)
      if (result.success) {
        sent++
      } else {
        failed++
      }
    })
    
    // Delay between batches to respect rate limits
    if (i + batchSize < emails.length && delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
    }
  }

  console.log(`📧 Bulk email complete: ${sent} sent, ${failed} failed`)

  return {
    success: failed === 0,
    sent,
    failed,
    results
  }
}
