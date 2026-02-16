import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    question: "How many photos can I include in my book?",
    answer: "Each book includes up to 20 photo conversions. Every photo is transformed into a beautiful line drawing ready for colouring.",
  },
  {
    question: "What if I order multiple books?",
    answer: "By default, each additional book contains the same 20 images. If you'd like each book to have different photos, you can add the 'Unique Photos' add-on for £5, which gives each book its own set of 20 unique images.",
  },
  {
    question: "What kind of photos work best?",
    answer: "Photos with clear subjects and good contrast work best — think portraits, pets, landmarks, and nature shots. Avoid very dark or blurry images for the best results.",
  },
  {
    question: "How long does delivery take?",
    answer: "Books are printed and dispatched within 3–5 working days. UK delivery typically takes an additional 2–3 working days.",
  },
  {
    question: "Can I preview my book before ordering?",
    answer: "Yes! After uploading your photos and approving the line-art conversions, you'll see a full preview of your book before checkout.",
  },
  {
    question: "What paper quality do you use?",
    answer: "We use premium 170gsm uncoated paper, perfect for colouring with pencils, pens, or markers. The cover is printed on thick 350gsm card.",
  },
  {
    question: "Do you ship internationally?",
    answer: "Currently we ship within the UK. International shipping is coming soon — sign up for updates to be the first to know!",
  },
  {
    question: "Can I get a refund?",
    answer: "Because each book is custom-made, we can't offer refunds. However, if there's a printing defect, we'll happily replace your book free of charge.",
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
                  Everything you need to know about creating your personalised colouring book
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
