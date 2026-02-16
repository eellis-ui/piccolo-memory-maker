import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StorySection from "@/components/landing/StorySection";
import CTASection from "@/components/landing/CTASection";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <StorySection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default About;
