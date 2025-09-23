"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Store, Key, ArrowRight } from "lucide-react";

const goAuth = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/auth';
  }
};

const steps = [
  {
    icon: <UserPlus className="w-8 h-8" />,
    title: "Start your journey",
    description: "Join OnePay by signing up with a non-custodial wallet, phone number, or email to start accepting payments.",
    detail: "Support multiple registration methods: Tonkeeper, Google, Telegram, Apple, Phone/Email, Facebook",
    mockUI: (
      <div className="bg-background/50 rounded-lg p-4 border border-white/10">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button variant="outline" size="sm" className="text-xs">Tonkeeper</Button>
          <Button variant="outline" size="sm" className="text-xs">Google</Button>
          <Button variant="outline" size="sm" className="text-xs">Telegram</Button>
          <Button variant="outline" size="sm" className="text-xs">Apple</Button>
        </div>
      </div>
    )
  },
  {
    icon: <Store className="w-8 h-8" />,
    title: "Create your first merchant",
    description: "Set up your first merchant account with OnePay to start accepting payments and get a reliable Business Wallet.",
    detail: "Quick merchant configuration to get dedicated payment processing capabilities",
    mockUI: (
      <div className="bg-background/50 rounded-lg p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Store className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Create merchant</span>
        </div>
        <Button size="sm" className="w-full text-xs" onClick={goAuth}>Create</Button>
      </div>
    )
  },
  {
    icon: <Key className="w-8 h-8" />,
    title: "Generate API keys",
    description: "In your merchant account, generate API keys and integrate OnePay using API, SDK tools, and ready-made plugins.",
    detail: "Get Payment API key and Payout API key to start technical integration",
    mockUI: (
      <div className="bg-background/50 rounded-lg p-4 border border-white/10">
        <div className="text-xs text-muted-foreground mb-2">Your API keys</div>
        <div className="flex items-center justify-between mb-2 p-2 bg-background/50 rounded">
          <span className="text-xs font-mono">Payment API key</span>
          <span className="text-green-500 text-xs">Active</span>
        </div>
        <div className="text-xs font-mono bg-muted/20 p-2 rounded mb-2">
          kTaz9Eh*******OBh9aG5
        </div>
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={goAuth}>
          Regenerate the Payment API key
        </Button>
      </div>
    )
  }
];

export default function HowToAccept() {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4">
              How to accept crypto payments with OnePay
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to start your crypto payment journey
            </p>
          </div>
          
          <div className="relative">
            {/* Connection Lines */}
            <div className="hidden lg:block absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
              <div className="flex justify-between items-center">
                <div className="w-1/3"></div>
                <ArrowRight className="w-6 h-6 text-muted-foreground" />
                <div className="w-1/3"></div>
                <ArrowRight className="w-6 h-6 text-muted-foreground" />
                <div className="w-1/3"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
              {steps.map((step, index) => (
                <Card key={index} className="border-white/10 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-primary/10 text-primary">
                        {step.icon}
                      </div>
                      <div className="text-2xl font-light text-primary">
                        {index + 1}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-medium mb-3">
                      {step.title}
                    </h3>
                    
                    <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                      {step.description}
                    </p>
                    
                    {/* Mock UI */}
                    <div className="mb-4">
                      {step.mockUI}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {step.detail}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {/* CTA */}
          <div className="text-center mt-12">
            <Button size="lg" className="text-base px-8 py-3 h-auto" onClick={goAuth}>
              GET STARTED
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
