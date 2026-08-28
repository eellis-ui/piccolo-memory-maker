import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Link } from "react-router-dom";

const TermsOfService = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-3xl">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-10">
          Terms of Service
        </h1>

        {/* Overview */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">Overview</h2>
          <p className="text-muted-foreground mb-2">
            Welcome to Piccoload! The terms "we", "us" and "our" refer to Piccoload. Piccoload operates this store and website, including all related information, content, features, tools, products and services in order to provide you, the customer, with a curated shopping experience (the "Services"). Piccoload is powered by Shopify, which enables us to provide the Services to you.
          </p>
          <p className="text-muted-foreground mb-2">
            The below terms and conditions, together with any policies referenced herein (these "Terms of Service" or "Terms") describe your rights and responsibilities when you use the Services. Please read these Terms of Service carefully, as they include important information about your legal rights and cover areas such as warranty disclaimers and limitations of liability.
          </p>
          <p className="text-muted-foreground">
            By visiting, interacting with or using our Services, you agree to be bound by these Terms of Service and our{" "}
            <Link to="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>. If you do not agree to these Terms of Service or Privacy Policy, you should not use or access our Services.
          </p>
        </section>

        {/* Section 1 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">1. Access and Account</h2>
          <p className="text-muted-foreground mb-2">
            By agreeing to these Terms of Service, you represent that you are at least the age of majority in your state or province of residence, and you have given us your consent to allow any of your minor dependents to use the Services on devices you own, purchase or manage.
          </p>
          <p className="text-muted-foreground mb-2">
            To use the Services, including accessing or browsing our online stores or purchasing any of the products or services we offer, you may be asked to provide certain information, such as your email address, billing, payment, and shipping information. You represent and warrant that all the information you provide in our stores is correct, current and complete and that you have all rights necessary to provide this information.
          </p>
          <p className="text-muted-foreground">
            You are solely responsible for maintaining the security of your account credentials and for all of your account activity. You may not transfer, sell, assign, or license your account to any other person.
          </p>
        </section>

        {/* Section 2 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">2. Our Products</h2>
          <p className="text-muted-foreground mb-2">
            We have made every effort to provide an accurate representation of our products and services in our online stores. However, please note that colors or product appearance may differ from how they may appear on your screen due to the type of device you use to access the store and your device settings and configuration.
          </p>
          <p className="text-muted-foreground mb-2">
            We do not warrant that the appearance or quality of any products or services purchased by you will meet your expectations or be the same as depicted or rendered in our online stores. All descriptions of products are subject to change at any time without notice at our sole discretion.
          </p>
          <p className="text-muted-foreground">
            We reserve the right to discontinue any product at any time and may limit the quantities of any products that we offer to any person, geographic region or jurisdiction, on a case-by-case basis.
          </p>
        </section>

        {/* Section 3 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">3. Orders</h2>
          <p className="text-muted-foreground mb-2">
            When you place an order, you are making an offer to purchase. Piccoload reserves the right to accept or decline your order for any reason at its discretion. Your order is not accepted until Piccoload confirms acceptance. We must receive and process your payment before your order is accepted.
          </p>
          <p className="text-muted-foreground mb-2">
            Please review your order carefully before submitting, as Piccoload may be unable to accommodate cancellation requests after an order is accepted. In the event that we do not accept, make a change to, or cancel an order, we will attempt to notify you by contacting the e‑mail, billing address, and/or phone number provided at the time the order was made.
          </p>
          <p className="text-muted-foreground">
            Your purchases are subject to return or exchange solely in accordance with our{" "}
            <Link to="/refund-policy" className="underline hover:text-foreground">Refund Policy</Link>. You represent and warrant that your purchases are for your own personal or household use and not for commercial resale or export.
          </p>
        </section>

        {/* Section 4 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">4. Prices and Billing</h2>
          <p className="text-muted-foreground mb-2">
            Prices, discounts and promotions are subject to change without notice. The price charged for a product or service will be the price in effect at the time the order is placed and will be set out in your order confirmation email. Unless otherwise expressly stated, posted prices do not include taxes, shipping, handling, customs or import charges.
          </p>
          <p className="text-muted-foreground mb-2">
            Prices posted in our online stores may be different from prices offered in physical stores or in online or other stores operated by third parties. We may offer, from time to time, promotions on the Services that may affect pricing and that are governed by terms and conditions separate from these Terms. If there is a conflict between the terms for a promotion and these Terms, the promotion terms will govern.
          </p>
          <p className="text-muted-foreground">
            You agree to provide current, complete and accurate purchase, payment and account information for all purchases made at our stores. You represent and warrant that (i) the credit card information you provide is true, correct, and complete, (ii) you are duly authorised to use such credit card for the purchase, (iii) charges incurred by you will be honoured by your credit card company, and (iv) you will pay charges incurred by you at the posted prices, including shipping and handling charges and all applicable taxes, if any.
          </p>
        </section>

        {/* Section 5 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">5. Shipping and Delivery</h2>
          <p className="text-muted-foreground mb-2">
            We are not liable for shipping and delivery delays. All delivery times are estimates only and are not guaranteed. We are not responsible for delays caused by shipping carriers, customs processing, or events outside our control.
          </p>
          <p className="text-muted-foreground">
            Once we transfer products to the carrier, title and risk of loss passes to you.
          </p>
        </section>

        {/* Section 6 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">6. Intellectual Property</h2>
          <p className="text-muted-foreground mb-2">
            Our Services, including but not limited to all trademarks, brands, text, displays, images, graphics, product reviews, video, and audio, and the design, selection, and arrangement thereof, are owned by Piccoload, its affiliates or licensors and are protected by U.S. and foreign patent, copyright and other intellectual property laws.
          </p>
          <p className="text-muted-foreground mb-2">
            These Terms permit you to use the Services for your personal, non-commercial use only. You must not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on the Services without our prior written consent.
          </p>
          <p className="text-muted-foreground">
            Piccoload's names, logos, product and service names, designs, and slogans are trademarks of Piccoload or its affiliates or licensors. You must not use such trademarks without the prior written permission of Piccoload. Shopify's name, logo, product and service names, designs and slogans are trademarks of Shopify. All other names, logos, product and service names, designs, and slogans on the Services are the trademarks of their respective owners.
          </p>
        </section>

        {/* Section 7 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">7. Optional Tools</h2>
          <p className="text-muted-foreground mb-2">
            You may be provided with access to customer tools offered by third parties as part of the Services, which we neither monitor nor have any control nor input. You acknowledge and agree that we provide access to such tools "as is" and "as available" without any warranties, representations or conditions of any kind and without any endorsement.
          </p>
          <p className="text-muted-foreground">
            We shall have no liability whatsoever arising from or relating to your use of optional third-party tools. Any use by you of the optional tools offered through the site is entirely at your own risk and discretion. We may also, in the future, offer new features through the Services (including the release of new tools and resources). Such new features shall also be deemed part of the Services and are subject to these Terms of Service.
          </p>
        </section>

        {/* Section 8 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">8. Third-Party Links</h2>
          <p className="text-muted-foreground mb-2">
            The Services may contain materials and hyperlinks to websites provided or operated by third parties (including any embedded third party functionality). We are not responsible for examining or evaluating the content or accuracy of any third-party materials or websites you choose to access.
          </p>
          <p className="text-muted-foreground">
            If you decide to leave the Services to access these materials or third party sites, you do so at your own risk. We are not liable for any harm or damages related to your access of any third-party websites, or your purchase or use of any products, services, resources, or content on any third-party websites. Complaints, claims, concerns, or questions regarding third-party products and services should be directed to the third-party.
          </p>
        </section>

        {/* Section 9 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">9. Relationship with Shopify</h2>
          <p className="text-muted-foreground mb-2">
            Piccoload is powered by Shopify, which enables us to provide the Services to you. However, any sales and purchases you make in our Store are made directly with Piccoload.
          </p>
          <p className="text-muted-foreground">
            By using the Services, you acknowledge and agree that Shopify is not responsible for any aspect of any sales between you and Piccoload, including any injury, damage, or loss resulting from purchased products and services. You hereby expressly release Shopify and its affiliates from all claims, damages, and liabilities arising from or related to your purchases and transactions with Piccoload.
          </p>
        </section>

        {/* Section 10 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">10. Privacy Policy</h2>
          <p className="text-muted-foreground mb-2">
            All personal information we collect through the Services is subject to our{" "}
            <Link to="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>, and certain personal information may be subject to Shopify's Privacy Policy.
          </p>
          <p className="text-muted-foreground">
            By using the Services, you acknowledge that you have read these privacy policies. Because the Services are hosted by Shopify, Shopify collects and processes personal information about your access to and use of the Services in order to provide and improve the Services for you. Information you submit to the Services will be transmitted to and shared with Shopify as well as third parties that may be located in other countries than where you reside, in order to provide services to you.
          </p>
        </section>

        {/* Section 11 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">11. Feedback</h2>
          <p className="text-muted-foreground mb-2">
            If you submit, upload, post, email, or otherwise transmit any ideas, suggestions, feedback, reviews, proposals, plans, or other content (collectively, "Feedback"), you grant us a perpetual, worldwide, sublicensable, royalty-free license to use, reproduce, modify, publish, distribute and display such Feedback in any medium for any purpose, including for commercial use.
          </p>
          <p className="text-muted-foreground mb-2">
            You represent and warrant that: (i) you own or have all necessary rights to all Feedback; (ii) you have disclosed any compensation or incentives received in connection with your submission of Feedback; and (iii) your Feedback will comply with these Terms.
          </p>
          <p className="text-muted-foreground">
            We are and shall be under no obligation (1) to maintain your Feedback in confidence; (2) to pay compensation for your Feedback; or (3) to respond to your Feedback. You are solely responsible for any Feedback you make and its accuracy. We take no responsibility and assume no liability for any Feedback posted by you or any third-party.
          </p>
        </section>

        {/* Section 12 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">12. Errors, Inaccuracies and Omissions</h2>
          <p className="text-muted-foreground">
            Occasionally there may be information on or in the Services that contain typographical errors, inaccuracies or omissions that may relate to product descriptions, pricing, promotions, offers, product shipping charges, transit times and availability. We reserve the right to correct any errors, inaccuracies or omissions, and to change or update information or cancel orders if any information is inaccurate at any time without prior notice (including after you have submitted your order).
          </p>
        </section>

        {/* Section 13 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">13. Prohibited Uses</h2>
          <p className="text-muted-foreground mb-2">
            You may access and use the Services for lawful purposes only. You may not access or use the Services, directly or indirectly: (a) for any unlawful or malicious purpose; (b) to violate any international, federal, provincial or state regulations, rules, laws, or local ordinances; (c) to infringe upon or violate our intellectual property rights or the intellectual property rights of others; (d) to harass, abuse, insult, harm, defame, slander, disparage, intimidate, or harm any of our employees or any other person; (e) to transmit false or misleading information; (f) to send, knowingly receive, upload, download, use, or re-use any material that does not comply with these Terms; (g) to transmit, or procure the sending of, any advertising or promotional material, including any "junk mail," "chain letter," "spam," or any other similar solicitation; (h) to impersonate or attempt to impersonate any other person or entity; or (i) to engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Services.
          </p>
          <p className="text-muted-foreground">
            In addition, you agree not to: (a) upload or transmit viruses or any other type of malicious code; (b) reproduce, duplicate, copy, sell, resell or exploit any portion of the Services; (c) collect or track the personal information of others; (d) spam, phish, pharm, pretext, spider, crawl, or scrape; or (e) interfere with or circumvent the security features of the Services. We reserve the right to suspend, disable, or terminate your account at any time, without notice, if we determine that you have violated any part of these Terms.
          </p>
        </section>

        {/* Section 14 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">14. Termination</h2>
          <p className="text-muted-foreground">
            We may terminate this agreement or your access to the Services (or any part thereof) in our sole discretion at any time without notice, and you will remain liable for all amounts due up to and including the date of termination. The following sections will continue to apply following any termination: Intellectual Property, Feedback, Termination, Disclaimer of Warranties, Limitation of Liability, Indemnification, Severability, Waiver; Entire Agreement, Assignment, Governing Law, Privacy Policy, and any other provisions that by their nature should survive termination.
          </p>
        </section>

        {/* Section 15 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">15. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground mb-2">
            The information presented on or through the Services is made available solely for general information purposes. We do not warrant the accuracy, completeness, or usefulness of this information. Any reliance you place on such information is strictly at your own risk.
          </p>
          <p className="text-muted-foreground font-semibold">
            EXCEPT AS EXPRESSLY STATED BY PICCOLOAD, THE SERVICES AND ALL PRODUCTS OFFERED THROUGH THE SERVICES ARE PROVIDED 'AS IS' AND 'AS AVAILABLE' FOR YOUR USE, WITHOUT ANY REPRESENTATION, WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING ALL IMPLIED WARRANTIES OR CONDITIONS OF MERCHANTABILITY, MERCHANTABLE QUALITY, FITNESS FOR A PARTICULAR PURPOSE, DURABILITY, TITLE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE, REPRESENT OR WARRANT THAT YOUR USE OF THE SERVICES WILL BE UNINTERRUPTED, TIMELY, SECURE OR ERROR-FREE. SOME JURISDICTIONS LIMIT OR DO NOT ALLOW THE DISCLAIMER OF IMPLIED OR OTHER WARRANTIES SO THE ABOVE DISCLAIMER MAY NOT APPLY TO YOU.
          </p>
        </section>

        {/* Section 16 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">16. Limitation of Liability</h2>
          <p className="text-muted-foreground font-semibold">
            TO THE FULLEST EXTENT PROVIDED BY LAW, IN NO CASE SHALL PICCOLOAD, OUR PARTNERS, DIRECTORS, OFFICERS, EMPLOYEES, AFFILIATES, AGENTS, CONTRACTORS, SERVICE PROVIDERS OR LICENSORS, OR THOSE OF SHOPIFY AND ITS AFFILIATES, BE LIABLE FOR ANY INJURY, LOSS, CLAIM, OR ANY DIRECT, INDIRECT, INCIDENTAL, PUNITIVE, SPECIAL, OR CONSEQUENTIAL DAMAGES OF ANY KIND, INCLUDING, WITHOUT LIMITATION, LOST PROFITS, LOST REVENUE, LOST SAVINGS, LOSS OF DATA, REPLACEMENT COSTS, OR ANY SIMILAR DAMAGES, WHETHER BASED IN CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY OR OTHERWISE, ARISING FROM YOUR USE OF ANY OF THE SERVICES OR ANY PRODUCTS PROCURED USING THE SERVICES, OR FOR ANY OTHER CLAIM RELATED IN ANY WAY TO YOUR USE OF THE SERVICES OR ANY PRODUCT, EVEN IF ADVISED OF THEIR POSSIBILITY.
          </p>
        </section>

        {/* Section 17 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">17. Indemnification</h2>
          <p className="text-muted-foreground">
            You agree to indemnify, defend and hold harmless Piccoload, Shopify, and our affiliates, partners, officers, directors, employees, agents, contractors, licensors, and service providers from any losses, damages, liabilities or claims, including reasonable attorneys' fees, payable to any third party due to or arising out of (1) your breach of these Terms of Service or the documents they incorporate by reference, (2) your violation of any law or the rights of a third party, or (3) your access to and use of the Services. We will notify you of any indemnifiable claim, provided that a failure to promptly notify will not relieve you of your obligations unless you are materially prejudiced.
          </p>
        </section>

        {/* Section 18 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">18. Severability</h2>
          <p className="text-muted-foreground">
            In the event that any provision of these Terms of Service is determined to be unlawful, void or unenforceable, such provision shall nonetheless be enforceable to the fullest extent permitted by applicable law, and the unenforceable portion shall be deemed to be severed from these Terms of Service, such determination shall not affect the validity and enforceability of any other remaining provisions.
          </p>
        </section>

        {/* Section 19 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">19. Waiver; Entire Agreement</h2>
          <p className="text-muted-foreground">
            The failure of us to exercise or enforce any right or provision of these Terms of Service shall not constitute a waiver of such right or provision. These Terms of Service and any policies or operating rules posted by us on this site or in respect to the Service constitutes the entire agreement and understanding between you and us and governs your use of the Service, superseding any prior or contemporaneous agreements, communications and proposals, whether oral or written, between you and us. Any ambiguities in the interpretation of these Terms of Service shall not be construed against the drafting party.
          </p>
        </section>

        {/* Section 20 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">20. Assignment</h2>
          <p className="text-muted-foreground">
            You may not delegate, transfer or assign this Agreement or any of your rights or obligations under these Terms without our prior written consent, and any such attempt will be null and void. We may transfer, assign, or delegate these Terms and our rights and obligations without consent or notice to you.
          </p>
        </section>

        {/* Section 21 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">21. Governing Law</h2>
          <p className="text-muted-foreground">
            These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of England and Wales. You and Piccoload consent to venue and personal jurisdiction in such courts.
          </p>
        </section>

        {/* Section 22 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">22. Headings</h2>
          <p className="text-muted-foreground">
            The headings used in this agreement are included for convenience only and will not limit or otherwise affect these Terms.
          </p>
        </section>

        {/* Section 23 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">23. Changes to Terms of Service</h2>
          <p className="text-muted-foreground">
            You can review the most current version of the Terms of Service at any time on this page. We reserve the right, in our sole discretion, to update, change, or replace any part of these Terms of Service by posting updates and changes to our website. It is your responsibility to check our website periodically for changes. Your continued use of or access to the Services following the posting of any changes to these Terms of Service constitutes acceptance of those changes.
          </p>
        </section>

        {/* Section 24 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">24. Contact Information</h2>
          <p className="text-muted-foreground mb-2">
            Questions about the Terms of Service should be sent to us at{" "}
            <a href="mailto:hello@piccoload.com" className="underline hover:text-foreground">hello@piccoload.com</a>.
          </p>
          <div className="text-muted-foreground space-y-1">
            <p>Piccoload is operated by Herbert and Ellis Ltd, a company registered in England and Wales.</p>
            <p>Registered office: Unit 4, Longdon Road Industrial Estate, Mercian Close, Shrewsbury, SY3 9EA</p>
            <p>Company number: 14347864</p>
            <p>
              Email:{" "}
              <a href="mailto:hello@piccoload.com" className="underline hover:text-foreground">hello@piccoload.com</a>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
