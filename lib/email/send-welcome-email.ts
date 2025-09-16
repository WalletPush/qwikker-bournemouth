import { resend, EMAIL_CONFIG } from './resend-client';
import { generateSimpleWelcomeEmailHTML, generateSimpleWelcomeEmailText } from './simple-welcome-email';
import type { Profile } from '@/types/profiles';

interface SendWelcomeEmailParams {
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  profile: Profile;
}

export async function sendWelcomeEmail({
  firstName,
  lastName,
  email,
  businessName,
  profile
}: SendWelcomeEmailParams) {
  try {
    console.log('📧 Attempting to send welcome email to:', email);
    
    const html = generateSimpleWelcomeEmailHTML({
      firstName,
      lastName,
      email,
      businessName,
      profile
    });
    
    const text = generateSimpleWelcomeEmailText({
      firstName,
      lastName,
      email,
      businessName,
      profile
    });

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [email],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Welcome to QWIKKER, ${firstName}! Your ${businessName} dashboard is ready`,
      html: html,
      text: text,
      tags: [
        { name: 'category', value: 'welcome' },
        { name: 'user_type', value: 'new_business' },
        { name: 'plan', value: 'free_trial' }
      ]
    });

    console.log('📧 Full Resend result:', JSON.stringify(result, null, 2));
    console.log('✅ Welcome email sent successfully:', result.data?.id);
    return { success: true, messageId: result.data?.id };

  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    
    // Don't throw - we want signup to continue even if email fails
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown email error' 
    };
  }
}
