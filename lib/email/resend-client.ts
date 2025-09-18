import { Resend } from 'resend';

// Allow build to succeed without API key, but log warning
if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY not found - email functionality will be disabled');
}

export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Default email configuration
export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'QWIKKER <onboarding@resend.dev>',
  replyTo: process.env.EMAIL_REPLY_TO || 'onboarding@resend.dev',
} as const;
