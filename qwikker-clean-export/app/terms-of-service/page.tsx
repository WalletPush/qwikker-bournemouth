import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="text-gray-400 text-lg">
            Last updated: {new Date().toLocaleDateString('en-GB', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Terms of Service Content */}
        <Card className="bg-slate-800/90 border-slate-700 backdrop-blur-sm shadow-xl">
          <CardContent className="p-8 space-y-8 text-gray-300 leading-relaxed">
            
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Agreement to Terms</h2>
              <p className="mb-4">
                Welcome to Qwikker ("Company," "we," "our," or "us"). These Terms of Service ("Terms") govern your use of our platform, mobile application, and related services (collectively, the "Service").
              </p>
              <p className="mb-4">
                By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, you may not access the Service.
              </p>
              <div className="bg-[#00d083]/10 border border-[#00d083]/30 rounded-lg p-4">
                <p className="text-[#00d083] font-medium">
                  <strong>Important:</strong> These Terms include important information about your rights, legal remedies, and limitations on our liability.
                </p>
              </div>
            </section>

            {/* Service Description */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
              <p className="mb-4">
                Qwikker is a local business discovery platform that connects consumers with local businesses through:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Business directory and profile listings</li>
                <li>Exclusive offers and promotions</li>
                <li>Secret menu items and special deals</li>
                <li>Loyalty programs and rewards</li>
                <li>Digital wallet passes for easy access</li>
                <li>Business management tools and analytics</li>
              </ul>
            </section>

            {/* User Accounts */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. User Accounts</h2>
              
              <h3 className="text-xl font-medium text-[#00d083] mb-3">3.1 Account Creation</h3>
              <p className="mb-4">To use certain features of our Service, you must create an account. You agree to:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">3.2 Account Types</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Consumer Accounts</h4>
                  <p className="text-sm">For individuals discovering local businesses and claiming offers</p>
                </div>
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Business Accounts</h4>
                  <p className="text-sm">For businesses creating profiles, managing offers, and accessing analytics</p>
                </div>
              </div>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">3.3 Account Termination</h3>
              <p>
                You may terminate your account at any time. We reserve the right to suspend or terminate accounts that violate these Terms or engage in harmful activities.
              </p>
            </section>

            {/* Business Listings */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Business Listings and Content</h2>
              
              <h3 className="text-xl font-medium text-[#00d083] mb-3">4.1 Business Profile Requirements</h3>
              <p className="mb-4">Business users must provide:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Accurate business information (name, address, hours, contact details)</li>
                <li>Current and truthful descriptions of products/services</li>
                <li>Valid business registration and licensing information</li>
                <li>Appropriate and professional imagery</li>
              </ul>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">4.2 Content Standards</h3>
              <p className="mb-4">All content submitted to our platform must:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Be accurate, current, and not misleading</li>
                <li>Comply with applicable laws and regulations</li>
                <li>Not infringe on intellectual property rights</li>
                <li>Be appropriate for all audiences</li>
                <li>Not contain spam, malware, or harmful content</li>
              </ul>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">4.3 Review and Approval Process</h3>
              <p>
                We reserve the right to review, approve, reject, or remove any business listing or content at our discretion. Approved businesses may have their listings displayed publicly on our platform.
              </p>
            </section>

            {/* Offers and Promotions */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Offers and Promotions</h2>
              
              <h3 className="text-xl font-medium text-[#00d083] mb-3">5.1 Business Responsibilities</h3>
              <p className="mb-4">Businesses creating offers must:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Honor all published offers and promotions</li>
                <li>Provide clear and accurate terms and conditions</li>
                <li>Specify valid dates, limitations, and restrictions</li>
                <li>Not discriminate against Qwikker users</li>
                <li>Maintain adequate inventory for promoted items</li>
              </ul>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">5.2 Consumer Rights</h3>
              <p className="mb-4">Consumers have the right to:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Redeem valid offers according to stated terms</li>
                <li>Receive the advertised products or services</li>
                <li>Report businesses that don't honor offers</li>
                <li>Request assistance with offer-related disputes</li>
              </ul>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">5.3 Dispute Resolution</h3>
              <p>
                If disputes arise between businesses and consumers regarding offers, we will make reasonable efforts to facilitate resolution, but we are not responsible for the actions of third-party businesses.
              </p>
            </section>

            {/* Subscription Plans */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Subscription Plans and Billing</h2>
              
              <h3 className="text-xl font-medium text-[#00d083] mb-3">6.1 Plan Types</h3>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Starter Plan</h4>
                  <p className="text-sm">Basic business listing with limited features</p>
                </div>
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Spotlight Plan</h4>
                  <p className="text-sm">Enhanced visibility and additional features</p>
                </div>
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Pro Plan</h4>
                  <p className="text-sm">Full access to all platform features</p>
                </div>
              </div>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">6.2 Billing and Payment</h3>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Subscription fees are billed in advance on a monthly or annual basis</li>
                <li>All fees are non-refundable unless otherwise stated</li>
                <li>We reserve the right to change pricing with 30 days' notice</li>
                <li>Failed payments may result in service suspension</li>
              </ul>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">6.3 Free Trial and Cancellation</h3>
              <p>
                New business accounts may receive a free trial period. You may cancel your subscription at any time, with cancellation taking effect at the end of the current billing period.
              </p>
            </section>

            {/* Prohibited Uses */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Prohibited Uses</h2>
              <p className="mb-4">You may not use our Service to:</p>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-semibold text-red-400 mb-2">Illegal Activities</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                    <li>Violate any applicable laws or regulations</li>
                    <li>Engage in fraudulent or deceptive practices</li>
                    <li>Infringe on intellectual property rights</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-400 mb-2">Harmful Content</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                    <li>Post offensive, discriminatory, or harmful content</li>
                    <li>Distribute malware or viruses</li>
                    <li>Spam or harass other users</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-400 mb-2">System Abuse</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                    <li>Attempt to hack or compromise our systems</li>
                    <li>Use automated tools to access our Service</li>
                    <li>Reverse engineer our software</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-400 mb-2">Commercial Misuse</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                    <li>Create fake business listings</li>
                    <li>Manipulate reviews or ratings</li>
                    <li>Compete directly with our Service</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Intellectual Property Rights</h2>
              
              <h3 className="text-xl font-medium text-[#00d083] mb-3">8.1 Our Rights</h3>
              <p className="mb-4">
                The Service and its original content, features, and functionality are owned by Qwikker and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">8.2 Your Content</h3>
              <p className="mb-4">
                You retain ownership of content you submit to our Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content in connection with our Service.
              </p>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">8.3 Trademark Policy</h3>
              <p>
                You may not use our trademarks, logos, or brand names without our prior written consent. We respect the intellectual property rights of others and expect users to do the same.
              </p>
            </section>

            {/* Privacy and Data */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Privacy and Data Protection</h2>
              <p className="mb-4">
                Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information. By using our Service, you consent to the collection and use of information in accordance with our Privacy Policy.
              </p>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-200">
                  <strong>GDPR Compliance:</strong> We are committed to complying with the General Data Protection Regulation (GDPR) and other applicable privacy laws. You have rights regarding your personal data, including the right to access, rectify, erase, and port your data.
                </p>
              </div>
            </section>

            {/* Disclaimers */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Disclaimers and Limitations</h2>
              
              <h3 className="text-xl font-medium text-[#00d083] mb-3">10.1 Service Availability</h3>
              <p className="mb-4">
                We strive to maintain high service availability but cannot guarantee uninterrupted access. The Service is provided "as is" and "as available" without warranties of any kind.
              </p>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">10.2 Third-Party Businesses</h3>
              <p className="mb-4">
                We are not responsible for the actions, products, services, or content of third-party businesses listed on our platform. Any transactions or interactions with businesses are solely between you and the business.
              </p>

              <h3 className="text-xl font-medium text-[#00d083] mb-3">10.3 Limitation of Liability</h3>
              <p>
                To the fullest extent permitted by law, Qwikker shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or use.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">11. Indemnification</h2>
              <p>
                You agree to defend, indemnify, and hold harmless Qwikker and its officers, directors, employees, and agents from any claims, damages, obligations, losses, liabilities, costs, or debt arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">12. Termination</h2>
              <p className="mb-4">
                We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
              <p>
                Upon termination, your right to use the Service will cease immediately. All provisions of these Terms that should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">13. Governing Law and Jurisdiction</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of England and Wales. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">14. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on our website and updating the "Last updated" date. Your continued use of the Service after such changes constitutes acceptance of the new Terms.
              </p>
            </section>

            {/* Contact Information */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">15. Contact Information</h2>
              <p className="mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-slate-700/30 p-6 rounded-lg">
                <div className="space-y-2">
                  <p><strong>Email:</strong> legal@qwikker.com</p>
                  <p><strong>Address:</strong> Qwikker Ltd, [Business Address], United Kingdom</p>
                  <p><strong>Support:</strong> support@qwikker.com</p>
                </div>
              </div>
            </section>

            {/* Acknowledgment */}
            <section className="border-t border-slate-600 pt-6">
              <div className="bg-[#00d083]/10 border border-[#00d083]/30 rounded-lg p-6 text-center">
                <h3 className="text-xl font-semibold text-[#00d083] mb-2">Acknowledgment</h3>
                <p className="text-gray-300">
                  By using our Service, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
                </p>
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
