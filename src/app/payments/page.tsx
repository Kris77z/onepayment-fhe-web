import Navbar from "@/components/sections/navbar";
import Footer from "@/components/sections/footer";
import PaymentHero from "@/components/sections/payment-hero";
import PaymentMethods from "@/components/sections/payment-methods";
import PaymentFeatures from "@/components/sections/payment-features";
import PaymentFlowVisualization from "@/components/sections/payment-flow-visualization";
import HowToAccept from "@/components/sections/how-to-accept";
import SupportedAssets from "@/components/sections/supported-assets";
import ContactSection from "@/components/sections/contact-section";

export default function PaymentsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <PaymentHero />
        
        {/* Payment Flow Visualization */}
        <PaymentFlowVisualization />
        
        {/* Payment Methods */}
        <PaymentMethods />
        
        {/* Features */}
        <PaymentFeatures />
        
        {/* How to Accept */}
        <HowToAccept />
        
        {/* Supported Assets */}
        <SupportedAssets />
        
        {/* Contact Section */}
        <ContactSection />
        
      </main>
      <Footer />
    </div>
  );
}
