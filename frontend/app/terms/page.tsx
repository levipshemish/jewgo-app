import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link 
            href="/specials"
            className="text-jewgo-400 hover:text-jewgo-300 transition-colors"
          >
            ← Back to JewGo
          </Link>
        </div>

        <div className="prose prose-invert max-w-none">
          <h1 className="text-3xl font-bold text-white mb-6">Terms of Service</h1>
          
          <div className="space-y-6 text-neutral-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using JewGo (&quot;the Service&quot;), you accept and agree to be bound by the 
                terms and provision of this agreement. If you do not agree to abide by the above, 
                please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
              <p>
                JewGo is a platform that helps users discover kosher restaurants and eateries in their area. 
                The Service provides information about kosher establishments, including certification details, 
                cuisine types, reviews, and location data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. User Accounts and Authentication</h2>
              <p>
                To access certain features of the Service, you may be required to create an account. 
                You can sign up using:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Email and password</li>
                <li>Google OAuth authentication</li>
                <li>Apple OAuth authentication</li>
                <li>Anonymous guest access (limited features)</li>
              </ul>
              <p className="mt-2">
                When using OAuth authentication (Google/Apple), you authorize us to access certain 
                information from your account as described in our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. User Responsibilities</h2>
              <p>You agree to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Provide accurate and complete information when creating an account</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the Service only for lawful purposes</li>
                <li>Not attempt to gain unauthorized access to the Service</li>
                <li>Not interfere with or disrupt the Service</li>
                <li>Respect the privacy and rights of other users</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Content and Reviews</h2>
              <p>
                Users may submit reviews, ratings, and other content to the Service. By submitting content, 
                you grant us a non-exclusive, royalty-free license to use, modify, and display such content 
                in connection with the Service.
              </p>
              <p className="mt-2">
                You are responsible for the accuracy and legality of any content you submit. We reserve 
                the right to remove content that violates these terms or is otherwise inappropriate.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Privacy and Data Protection</h2>
              <p>
                Your privacy is important to us. Our collection and use of personal information is 
                governed by our Privacy Policy, which is incorporated into these Terms of Service 
                by reference.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are owned by JewGo 
                and are protected by international copyright, trademark, patent, trade secret, and 
                other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Disclaimers</h2>
              <p>
                The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. 
                We do not guarantee:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>The accuracy or completeness of restaurant information</li>
                <li>The availability of the Service at all times</li>
                <li>That the Service will be error-free or uninterrupted</li>
                <li>The security of information transmitted through the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Limitation of Liability</h2>
              <p>
                In no event shall JewGo be liable for any indirect, incidental, special, consequential, 
                or punitive damages, including without limitation, loss of profits, data, use, goodwill, 
                or other intangible losses, resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Indemnification</h2>
              <p>
                You agree to defend, indemnify, and hold harmless JewGo from and against any claims, 
                damages, obligations, losses, liabilities, costs, or debt arising from your use of 
                the Service or violation of these Terms.
              </p>
            </section>

            <section id="payments">
              <h2 className="text-xl font-semibold text-white mb-3">11. Payment Terms</h2>
              <p>
                JewGo may offer premium features, marketplace transactions, or other paid services. 
                When you make a purchase through our Service:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>All payments are processed securely through our payment partners (Stripe)</li>
                <li>You authorize us to charge your chosen payment method for all fees and charges</li>
                <li>Prices are subject to change with reasonable notice</li>
                <li>Refunds are handled according to our refund policy</li>
                <li>You are responsible for any applicable taxes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">12. Termination</h2>
              <p>
                We may terminate or suspend your account and access to the Service immediately, 
                without prior notice, for any reason, including breach of these Terms. Upon termination, 
                your right to use the Service will cease immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">13. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the 
                jurisdiction in which JewGo operates, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">14. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of any 
                material changes by posting the new Terms on this page and updating the &quot;Last Updated&quot; date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">15. Contact Information</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="mt-2">
                <p>Email: legal@jewgo-app.com</p>
                <p>Address: [Your Business Address]</p>
              </div>
            </section>

            <div className="mt-8 pt-6 border-t border-neutral-700">
              <p className="text-sm text-neutral-400">
                <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
