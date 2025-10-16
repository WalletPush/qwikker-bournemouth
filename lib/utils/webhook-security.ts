import crypto from 'crypto'

/**
 * Validates webhook signature using HMAC-SHA256
 * @param payload - Raw request body as string
 * @param signature - Signature from webhook header (e.g., X-GHL-Signature)
 * @param secret - Webhook secret from environment variables
 * @returns boolean indicating if signature is valid
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) {
    console.error('🚨 Webhook validation failed: Missing payload, signature, or secret')
    return false
  }

  try {
    // Create HMAC hash of the payload
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')

    // Compare signatures (handle different formats)
    const receivedSignature = signature.startsWith('sha256=') 
      ? signature.slice(7) 
      : signature

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    )

    if (!isValid) {
      console.error('🚨 Webhook signature validation failed')
      console.error('Expected:', expectedSignature)
      console.error('Received:', receivedSignature)
    }

    return isValid
  } catch (error) {
    console.error('🚨 Webhook signature validation error:', error)
    return false
  }
}

/**
 * Validates Stripe webhook signature
 * @param payload - Raw request body as string
 * @param signature - Stripe-Signature header
 * @param secret - Stripe webhook endpoint secret
 * @returns boolean indicating if signature is valid
 */
export function validateStripeWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) {
    return false
  }

  try {
    // Parse Stripe signature header
    const elements = signature.split(',')
    const signatureElements: { [key: string]: string } = {}
    
    for (const element of elements) {
      const [key, value] = element.split('=')
      signatureElements[key] = value
    }

    const timestamp = signatureElements.t
    const v1Signature = signatureElements.v1

    if (!timestamp || !v1Signature) {
      return false
    }

    // Create expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`, 'utf8')
      .digest('hex')

    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(v1Signature, 'hex')
    )
  } catch (error) {
    console.error('🚨 Stripe webhook signature validation error:', error)
    return false
  }
}
