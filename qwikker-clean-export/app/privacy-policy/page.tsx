import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="/Qwikker Logo web.svg" 
              alt="QWIKKER" 
              className="h-12"
            />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-400 text-lg">
            Last updated: {new Date().toLocaleDateString('en-GB', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Privacy Policy Content */}
        <Card className="bg-slate-800/90 border-slate-700 backdrop-blur-sm shadow-xl">
          <CardContent className="p-8 space-y-8 text-gray-300 leading-relaxed">
            
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
              <p className="mb-4">
                Welcome to Qwikker ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, mobile application, and related services (collectively, the "Service").
              </p>
              <p>
                This Privacy Policy applies to all information collected through our Service and any related services, sales, marketing, or events. By using our Service, you consent to the data practices described in this policy.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-[#00d083] mb-3">2.1 Personal Information You Provide</h3>
              <p className="mb-4">We collect personal information that you voluntarily provide when:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Registering for an account (name, email, phone number)</li>
                <li>Creating a business profile (business details, address, hours)</li>
                <li>Uploading content (logos, menus, photos, offers)</li>
                <li>Communicating with us (support requests, feedback)</li>
                <li>Participating in surveys or promotions</li>
              </ul>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">2.2 Information Automatically Collected</h3>
              <p className="mb-4">When you use our Service, we automatically collect:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data (pages visited, time spent, features used)</li>
                <li>Location data (with your permission, for local business discovery)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">2.3 Information from Third Parties</h3>
              <p className="mb-4">We may receive information from:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Social media platforms (when you connect your accounts)</li>
                <li>Business verification services</li>
                <li>Analytics providers</li>
                <li>Marketing partners (with your consent)</li>
              </ul>
            </section>

            {/* How We Use Information */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
              <p className="mb-4">We use your personal information for the following purposes:</p>
              
              <h3 className="text-xl font-medium text-[#00d083] mb-3">3.1 Service Provision</h3>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Create and manage your account</li>
                <li>Process business registrations and verifications</li>
                <li>Display business listings to users</li>
                <li>Facilitate offer redemptions and loyalty programs</li>
                <li>Provide customer support</li>
              </ul>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">3.2 Communication</h3>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Send account-related notifications</li>
                <li>Deliver marketing communications (with consent)</li>
                <li>Respond to inquiries and support requests</li>
                <li>Send important updates about our Service</li>
              </ul>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">3.3 Improvement and Analytics</h3>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Analyze usage patterns and improve our Service</li>
                <li>Conduct research and development</li>
                <li>Personalize user experience</li>
                <li>Detect and prevent fraud or abuse</li>
              </ul>
            </section>

            {/* Legal Basis for Processing */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Legal Basis for Processing (GDPR)</h2>
              <p className="mb-4">Under the General Data Protection Regulation (GDPR), we process your personal data based on:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li><strong>Contract:</strong> Processing necessary to perform our service agreement with you</li>
                <li><strong>Consent:</strong> Where you have given explicit consent (marketing, location data)</li>
                <li><strong>Legitimate Interest:</strong> For business operations, fraud prevention, and service improvement</li>
                <li><strong>Legal Obligation:</strong> To comply with applicable laws and regulations</li>
              </ul>
            </section>

            {/* Information Sharing */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. How We Share Your Information</h2>
              <p className="mb-4">We may share your information in the following circumstances:</p>
              
              <h3 className="text-xl font-medium text-[#00d083] mb-3">5.1 Public Business Information</h3>
              <p className="mb-4">
                Business profiles, including business name, address, hours, offers, and menu items, are displayed publicly to help users discover local businesses.
              </p>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">5.2 Service Providers</h3>
              <p className="mb-4">We share information with trusted third-party service providers who assist us in:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Cloud hosting and data storage</li>
                <li>Payment processing</li>
                <li>Email and communication services</li>
                <li>Analytics and performance monitoring</li>
                <li>Customer support tools</li>
              </ul>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">5.3 Legal Requirements</h3>
              <p className="mb-4">We may disclose information when required by law or to:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Comply with legal processes or government requests</li>
                <li>Protect our rights, property, or safety</li>
                <li>Investigate potential violations of our terms</li>
                <li>Prevent fraud or illegal activities</li>
              </ul>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Data Security</h2>
              <p className="mb-4">We implement appropriate technical and organizational measures to protect your personal information:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication systems</li>
                <li>Employee training on data protection</li>
                <li>Incident response procedures</li>
              </ul>
              <p>
                However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Data Retention</h2>
              <p className="mb-4">We retain your personal information for as long as necessary to:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Provide our services to you</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and enforce agreements</li>
                <li>Maintain business records for legitimate purposes</li>
              </ul>
              <p>
                When we no longer need your personal information, we will securely delete or anonymize it in accordance with our data retention policies.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Your Privacy Rights</h2>
              <p className="mb-4">Under applicable privacy laws, including GDPR, you have the following rights:</p>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-[#00d083] mb-2">Right to Access</h4>
                  <p className="text-sm">Request copies of your personal data</p>
                </div>
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-[#00d083] mb-2">Right to Rectification</h4>
                  <p className="text-sm">Correct inaccurate or incomplete data</p>
                </div>
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-[#00d083] mb-2">Right to Erasure</h4>
                  <p className="text-sm">Request deletion of your personal data</p>
                </div>
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-[#00d083] mb-2">Right to Portability</h4>
                  <p className="text-sm">Receive your data in a portable format</p>
                </div>
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-[#00d083] mb-2">Right to Restrict</h4>
                  <p className="text-sm">Limit how we process your data</p>
                </div>
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-[#00d083] mb-2">Right to Object</h4>
                  <p className="text-sm">Object to certain types of processing</p>
                </div>
              </div>

              <p className="mb-4">
                To exercise these rights, please contact us using the information provided below. We will respond to your request within 30 days.
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Cookies and Tracking</h2>
              <p className="mb-4">We use cookies and similar technologies to:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Remember your preferences and settings</li>
                <li>Analyze website traffic and usage patterns</li>
                <li>Provide personalized content and advertisements</li>
                <li>Ensure security and prevent fraud</li>
              </ul>
              <p>
                You can control cookie preferences through your browser settings. However, disabling certain cookies may affect the functionality of our Service.
              </p>
            </section>

            {/* International Transfers */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. International Data Transfers</h2>
              <p className="mb-4">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place, including:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Adequacy decisions by the European Commission</li>
                <li>Standard contractual clauses</li>
                <li>Binding corporate rules</li>
                <li>Certification schemes and codes of conduct</li>
              </ul>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Children's Privacy</h2>
              <p>
                Our Service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal information, please contact us immediately.
              </p>
            </section>

            {/* Changes to Policy */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">12. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of our Service after such changes constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">13. Contact Us</h2>
              <p className="mb-4">
                If you have any questions about this Privacy Policy or wish to exercise your privacy rights, please contact us:
              </p>
              <div className="bg-slate-700/30 p-6 rounded-lg">
                <div className="space-y-2">
                  <p><strong>Email:</strong> privacy@qwikker.com</p>
                  <p><strong>Address:</strong> Qwikker Ltd, [Business Address], United Kingdom</p>
                  <p><strong>Data Protection Officer:</strong> dpo@qwikker.com</p>
                </div>
              </div>
            </section>

          </CardContent>
        </Card>

        {/* Back to Dashboard */}
        <div className="text-center mt-8">
          <a 
            href="/dashboard/settings" 
            className="inline-flex items-center gap-2 text-[#00d083] hover:text-[#00b86f] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Settings
          </a>
        </div>
      </div>
    </div>
  )
}
