import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is required for email functionality');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Default email configuration
export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'QWIKKER <onboarding@resend.dev>',
  replyTo: process.env.EMAIL_REPLY_TO || 'onboarding@resend.dev',
} as const;
