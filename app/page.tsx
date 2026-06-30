import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import AudienceSections from "@/components/landing/AudienceSections";
import Features from "@/components/landing/Features";
import WhyNotChatGPT from "@/components/landing/WhyNotChatGPT";
import IntelligenceLayer from "@/components/landing/IntelligenceLayer";
import HowItWorks from "@/components/landing/HowItWorks";
import ROICalculator from "@/components/landing/ROICalculator";
import Pricing from "@/components/landing/Pricing";
import FAQ, { FAQS } from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const homeFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqJsonLd) }} />
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <AudienceSections />
        <IntelligenceLayer />
        <Features />
        <WhyNotChatGPT />
        <ROICalculator />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
