import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-3xl">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last Updated: March 2025</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-8">
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-3">We collect information that you voluntarily provide, information collected automatically, and information received from third parties.</p>

            <h3 className="font-display text-lg font-medium mb-2">1.1 Information You Provide Directly</h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Photos and digital assets uploaded to create customized products</li>
              <li>Contact information (name, email address, shipping address)</li>
              <li>Order information and payment details (processed securely by third-party payment processors; we do NOT store full credit card numbers)</li>
              <li>Communications sent to our support team</li>
              <li>Any additional information you voluntarily provide during checkout or customer service interactions</li>
            </ul>

            <h3 className="font-display text-lg font-medium mt-4 mb-2">1.2 Information Automatically Collected</h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>IP address</li>
              <li>Browser type and device identifiers</li>
              <li>Pages visited</li>
              <li>Time spent on pages</li>
              <li>Referring links</li>
              <li>Cookies and tracking technology data</li>
              <li>Approximate geolocation (country/state level)</li>
            </ul>

            <h3 className="font-display text-lg font-medium mt-4 mb-2">1.3 Information from Third Parties</h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Payment processors</li>
              <li>Shipping carriers</li>
              <li>Analytics and advertising partners</li>
              <li>Fraud prevention and security services</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Order processing and fulfillment, including custom product creation.</li>
              <li>Customer support, including responding to inquiries.</li>
              <li>Payment processing through secure third-party vendors.</li>
              <li>To improve our website, products, and services.</li>
              <li>Marketing and advertising, where permitted by law.</li>
              <li>Fraud avoidance and security monitoring.</li>
              <li>Legal compliance and enforcement of our Terms of Service.</li>
              <li>Internal business operations, such as analytics and service improvement.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">3. Legal Basis for Processing (GDPR)</h2>
            <p className="text-muted-foreground mb-2">For users in the EU/UK, we process your data under the following lawful bases:</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>Contract performance</strong> (e.g., fulfilling your order).</li>
              <li><strong>Consent</strong> (e.g., marketing emails, cookie usage, uploading photos).</li>
              <li><strong>Legitimate interests</strong> (e.g., security, fraud prevention, service improvement).</li>
              <li><strong>Legal obligations</strong> (e.g., tax and accounting requirements).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">4. How We Share Your Information</h2>
            <p className="text-muted-foreground mb-3">We do not sell your personal data. We may share your information with:</p>

            <h3 className="font-display text-lg font-medium mb-2">4.1 Service Providers</h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Payment processors</li>
              <li>Printing and fulfillment partners</li>
              <li>Shipping carriers</li>
              <li>Website hosting providers</li>
              <li>Analytics and marketing tools</li>
              <li>Security and fraud prevention services</li>
            </ul>

            <h3 className="font-display text-lg font-medium mt-4 mb-2">4.2 Legal Requirements</h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Comply with a legal obligation</li>
              <li>Respond to lawful requests from government authorities</li>
              <li>Protect our rights, customers, or the public</li>
            </ul>

            <h3 className="font-display text-lg font-medium mt-4 mb-2">4.3 Business Transfers</h3>
            <p className="text-muted-foreground">If we undergo a merger, acquisition, or asset sale, your information may be transferred as part of the transaction.</p>
            <p className="text-muted-foreground mt-2">We do not share customer photos with any third party other than our production partners who require them solely for creating your order.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">5. Photo & Data Retention</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>Original photos are never stored.</strong> Your uploaded photos are processed in real-time to create your custom line-art and are immediately discarded after conversion. We do not retain your original images at any point.</li>
              <li>The converted line-art files and any associated digital PDF are stored securely in your account for as long as you choose to keep them.</li>
              <li>You may delete your converted artwork, digital PDF, and order data from your account at any time. Please note that deleting this data from your account does not cancel your order — it simply removes the data from our site. Any orders already in production or shipped will still be fulfilled.</li>
              <li>Once deleted, your data cannot be recovered. Please ensure you have downloaded any files you wish to keep before deleting.</li>
              <li>Other customer data (e.g., order history, emails, billing addresses) may be retained as legally required for tax, accounting, and fraud prevention.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">6. Cookies & Tracking Technologies</h2>
            <p className="text-muted-foreground mb-2">We use cookies and similar tools to:</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Enable essential site functionality</li>
              <li>Analyze website performance</li>
              <li>Personalize your experience</li>
              <li>Deliver relevant advertising (where legally allowed)</li>
            </ul>
            <p className="text-muted-foreground mt-2">You may control cookie settings in your browser or through our cookie banner (if applicable). EU/UK users receive opt-in controls in accordance with GDPR.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">7. Data Protection & Security</h2>
            <p className="text-muted-foreground">We use industry-standard security measures to protect your data, including encryption, access controls, secure servers, and monitoring systems.</p>
            <p className="text-muted-foreground mt-2">However, no online service can guarantee absolute security. You acknowledge that you use piccoload.com at your own risk.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">8. Your Privacy Rights</h2>

            <h3 className="font-display text-lg font-medium mb-2">8.1 California Residents (CCPA/CPRA)</h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Know what personal information we collect</li>
              <li>Request access to your data</li>
              <li>Request deletion of your data</li>
              <li>Correct inaccurate information</li>
              <li>Opt out of sharing for advertising (we do not sell data)</li>
              <li>Not be discriminated against for exercising your rights</li>
            </ul>
            <p className="text-muted-foreground mt-2">To exercise rights: 📧 <a href="mailto:hello@piccoload.com" className="text-primary hover:underline">hello@piccoload.com</a></p>

            <h3 className="font-display text-lg font-medium mt-4 mb-2">8.2 EU/UK Residents (GDPR)</h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Access your data</li>
              <li>Request correction</li>
              <li>Request deletion ("right to be forgotten")</li>
              <li>Restrict processing</li>
              <li>Object to processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-muted-foreground mt-2">Requests may be submitted to: 📧 <a href="mailto:hello@piccoload.com" className="text-primary hover:underline">hello@piccoload.com</a></p>
            <p className="text-muted-foreground mt-1">We may require identity verification.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">9. Children's Privacy</h2>
            <p className="text-muted-foreground">piccoload.com does not knowingly collect personal information from children under 13 (or the applicable age threshold under GDPR). Parents who believe a child has submitted information may contact us for immediate deletion.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">10. International Transfers</h2>
            <p className="text-muted-foreground">Your data may be stored or processed in the United States or other jurisdictions where our service providers operate. Where required, we use appropriate safeguards such as Standard Contractual Clauses (SCCs) to comply with GDPR.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">11. Third-Party Links</h2>
            <p className="text-muted-foreground">Our site may contain third-party links. We are not responsible for the privacy practices or content of those websites.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">12. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground">We may update this Policy from time to time. The "Last Updated" date will reflect the latest revision. Continued use of our services constitutes acceptance of the updated Policy.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">13. Contact Information</h2>
            <p className="text-muted-foreground">If you have questions about this Privacy Policy, your data, or your rights, contact us at:</p>
            <p className="text-muted-foreground mt-2">📧 <a href="mailto:hello@piccoload.com" className="text-primary hover:underline">hello@piccoload.com</a><br />Subject Line: Privacy Request</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
