"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CONTACT_URL } from "@/lib/links";
import Link from "next/link";

export default function PaymentHero() {
  const { toast } = useToast();
  const goAuth = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = '/auth';
  };

  return (
    <>
    <section className="relative min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-background via-background to-background/95 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      </div>
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight mb-8">
            <span className="block">OnePay</span>
            <span className="block text-transparent bg-gradient-to-r from-primary to-primary/60 bg-clip-text">
              Crypto Payment Gateway
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Accept crypto payments with many benefits and manage your merchant with ease
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" className="text-base px-8 py-3 h-auto" onClick={goAuth}>
              GET STARTED
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 py-3 h-auto" asChild>
              <Link href={CONTACT_URL}>Contact us</Link>
            </Button>
          </div>
          
          {/* Features List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-white/10">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-sm">No rolling reserves</span>
            </div>
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-white/10">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-sm">Global coverage</span>
            </div>
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-white/10">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-sm">Instant transactions</span>
            </div>
          </div>
        </div>
      </div>
      
    </section>
    </>
  );
}
