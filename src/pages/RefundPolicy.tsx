import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const RefundPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-3xl">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">
          Refunds &amp; Cancellations Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          This Refunds &amp; Cancellations Policy applies to all orders placed on piccoload.com.
        </p>

        {/* 1 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            1. Customized Products Are Non-Refundable
          </h2>
          <p className="text-muted-foreground mb-2">
            All items sold by piccoload.com are custom-made using customer-submitted photos.
          </p>
          <p className="text-muted-foreground mb-2">
            Once artwork is approved and orders placed, no refunds, cancellations, or order
            modifications may be made from that point forward.
          </p>
          <p className="text-muted-foreground mb-2">
            Because all Piccolo'd books are made using customer-submitted photos, results may vary
            depending on image quality and subject matter. We cannot guarantee that every photo will
            produce a flattering or stylistically identical coloring-page likeness. Requests for
            refunds or cancellations based solely on dissatisfaction with artistic interpretation
            (including perceived unflattering features or likeness) are not eligible under our refund
            policy due to approval.
          </p>
          <p className="text-muted-foreground">
            The customer acknowledges this condition during checkout.
          </p>
        </section>

        {/* 2 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            2. Photo Quality Responsibility
          </h2>
          <p className="text-muted-foreground mb-2">
            piccoload.com is not responsible for unsatisfactory results caused by:
          </p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Low-resolution photos</li>
            <li>Blurry images</li>
            <li>Poor lighting or composition</li>
            <li>Incorrect images supplied by the customer</li>
          </ul>
        </section>

        {/* 3 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            3. Damaged or Defective Orders
          </h2>
          <p className="text-muted-foreground mb-2">
            If your product arrives damaged or incorrect due to a manufacturing error, you must
            notify us within <strong>seven (7) days</strong>.
          </p>
          <p className="text-muted-foreground mb-2">You must provide:</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1 mb-2">
            <li>Your order number</li>
            <li>Description of the issue</li>
            <li>Photo evidence</li>
          </ul>
          <p className="text-muted-foreground mb-2">
            After verification, we will reprint and replace the item at no cost.
          </p>
          <p className="text-muted-foreground">
            Refunds are not provided for customized goods.
          </p>
        </section>

        {/* 4 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            4. Non-Delivery Claims
          </h2>
          <p className="text-muted-foreground mb-2">
            Claims for missing packages must be made within <strong>14 days</strong> of the expected
            delivery date.
          </p>
          <p className="text-muted-foreground">
            piccoload.com is not responsible for non-delivery caused by incorrect addresses provided
            by the customer.
          </p>
        </section>

        {/* 5 */}
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            5. Contact Information
          </h2>
          <p className="text-muted-foreground mb-2">
            For all refund, cancellation, or order-issue inquiries, contact us at:
          </p>
          <p className="text-muted-foreground">
            📧{" "}
            <a
              href="mailto:hello@piccoload.com"
              className="text-primary underline hover:text-primary/80"
            >
              hello@piccoload.com
            </a>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default RefundPolicy;
