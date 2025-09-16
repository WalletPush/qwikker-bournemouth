import { generateSimpleWelcomeEmailHTML } from '@/lib/email/simple-welcome-email'
import { sendWelcomeEmail } from '@/lib/email/send-welcome-email'
import { redirect } from 'next/navigation'

// Test data for preview
const testData = {
  firstName: 'John',
  lastName: 'Smith',
  email: 'john@example.com',
  businessName: 'The Coffee Corner',
  profile: {
    business_name: 'The Coffee Corner',
    business_address: '123 High Street, London',
    logo: null, // Missing - will show in checklist
    menu_url: null, // Missing - will show in checklist
    offer_name: 'Free Coffee with Pastry', // Present
    instagram_handle: '@coffeecorner', // Present
    facebook_handle: null, // Missing
    additional_notes: null, // No secret menu items
    created_at: new Date().toISOString(),
  }
}

async function handleTestEmail() {
  'use server'
  
  console.log('🧪 Sending test welcome email...')
  
  const result = await sendWelcomeEmail({
    firstName: testData.firstName,
    lastName: testData.lastName,
    email: 'qwikkerbournemouth@gmail.com', // Your Resend account email for testing
    businessName: testData.businessName,
    profile: testData.profile as any
  })
  
  console.log('📧 Test email result:', result)
  
  // Redirect with success/error message
  if (result.success) {
    redirect('/test-email?sent=success')
  } else {
    redirect('/test-email?sent=error&message=' + encodeURIComponent(result.error || 'Unknown error'))
  }
}

export default async function TestEmailPage({ searchParams }: { searchParams: Promise<{ sent?: string, message?: string }> }) {
  const emailHTML = generateSimpleWelcomeEmailHTML(testData)
  const params = await searchParams
  
  const showSuccess = params.sent === 'success'
  const showError = params.sent === 'error'
  const errorMessage = params.message
  
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold mb-4">Welcome Email Preview</h1>
            <p className="text-gray-600 mb-4">
                This is how the welcome email will look for new signups. 
                The email uses a simple, email-client-friendly design with table-based layout for maximum compatibility.
                <br />
                <strong>Updated:</strong> Simplified template for better email client support!
            </p>
            
            {/* Success/Error Messages */}
            {showSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                <strong>✅ Email Sent Successfully!</strong> Check your inbox at qwikkerbournemouth@gmail.com
              </div>
            )}
            
            {showError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <strong>❌ Email Failed:</strong> {errorMessage}
              </div>
            )}
            
            <form action={handleTestEmail}>
              <button 
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium mb-4 transition-colors"
              >
                🧪 Send Test Email
              </button>
              <p className="text-sm text-gray-500 mb-4">
                This will send a test email to qwikkerbournemouth@gmail.com (your Resend account email)
              </p>
            </form>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Test Data:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Business: {testData.businessName}</li>
              <li>• Name: {testData.firstName} {testData.lastName}</li>
              <li>• Missing: Logo, Menu, Secret Menu Items, Facebook</li>
              <li>• Present: Offer, Instagram</li>
            </ul>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-800 text-white p-4">
            <h2 className="text-lg font-semibold">Email Preview</h2>
          </div>
          <div 
            className="email-preview"
            dangerouslySetInnerHTML={{ __html: emailHTML }}
            style={{ 
              maxWidth: '600px', 
              margin: '0 auto',
              backgroundColor: '#f5f5f5',
              padding: '20px'
            }}
          />
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            This email will be automatically sent when users complete the onboarding form.
            <br />
            ✅ <strong>Resend integration active</strong> - emails will be delivered to real inboxes!
          </p>
        </div>
      </div>
    </div>
  )
}
