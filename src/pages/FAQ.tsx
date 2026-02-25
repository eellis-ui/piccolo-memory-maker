import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    question: "What quality and materials can I expect?",
    answer: "We use premium 170gsm uncoated paper, perfect for coloring with pencils, pens, or markers. The cover is printed on thick 350gsm card stock. Every book is professionally printed and bound to last.",
  },
  {
    question: "How long will it take from ordering to delivery?",
    answer: "Books are printed and dispatched within 3–5 business days. US delivery typically takes an additional 3–5 business days, so you can expect your book within 1–2 weeks of ordering.",
  },
  {
    question: "What if something goes wrong – do you offer returns or replacements?",
    answer: "Because each book is custom-made from your uploaded photos, returns for standard \"change of mind\" are disallowed.\n\nCan I request changes?\n\nYou can make lots of changes throughout the 'creating stage'. You have the chance to choose custom front cover images, personalise the text, choose up to 20 images per book, and review your line art. Once the design is considered approved, no further changes or revisions can be made.\n\nIf you receive a damaged, misprinted or incorrect item, please contact our support team within 14 days of delivery with your order number and a photo of the issue. We will arrange a replacement or refund. If your book is simply no longer wanted, we may not accept a return given the bespoke nature — check our \"Refund Policy\" link for full details.",
  },
  {
    question: "Can anyone make a Piccoload book, even if they're not tech-savvy?",
    answer: "Absolutely! Our builder walks you through every step — just upload your photos, approve the line-art conversions, customize your cover, and checkout. No design skills needed.",
  },
  {
    question: "What kind of photos work best?",
    answer: "Photos with clear subjects and good contrast work best — think portraits, pets, landmarks, and nature shots. Avoid very dark, blurry, or overly busy images for the best line-art results.",
  },
  {
    question: "Where do you ship and what are the costs?",
    answer: "We currently ship within the United States with shipping included in the price. International shipping is coming soon — sign up for updates to be the first to know!",
  },
  {
    question: "What size is the Piccoload book?",
    answer: "Each book is a generous 8.3\" × 11.7\" (A4) format — close to standard US letter size. The large pages give you plenty of room to color and add detail, and they look great on display.",
  },
  {
    question: "How many photos can I include in my book?",
    answer: "Each book includes up to 20 photo conversions. Every photo is transformed into a beautiful line drawing ready for coloring. You can also add extra pages if you want more!",
  },
  {
    question: "What if I order multiple books?",
    answer: "By default, each additional book contains the same 20 images. If you'd like each book to have different photos, you can add the 'Unique Photos' add-on for $5, which gives each book its own set of 20 unique images.",
  },
];

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-16">
                <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
                  Frequently Asked Questions
                </h1>
                <p className="text-muted-foreground text-lg">
                  Find answers to common questions about our Piccoload Books!
                </p>
              </div>

              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left font-display text-lg">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
