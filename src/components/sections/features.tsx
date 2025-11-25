"use client";

import * as React from "react"
import { Shield, Zap, Globe, Lock, Wallet, Users } from "lucide-react";

const features = [
  {
    icon: React.createElement(Shield as any, { className: "w-6 h-6" }) as any,
    title: "Enterprise Security",
    description: "Multi-layer security protection with 2FA, whitelist, PIN codes and more to ensure fund safety."
  },
  {
    icon: React.createElement(Zap as any, { className: "w-6 h-6" }) as any,
    title: "Real-time Processing",
    description: "Fast transaction processing with real-time status tracking for complete payment transparency."
  },
  {
    icon: React.createElement(Globe as any, { className: "w-6 h-6" }) as any,
    title: "Multi-chain Support",
    description: "Support for Ethereum, TRON, BSC and other major blockchain networks for diverse business needs."
  },
  {
    icon: React.createElement(Lock as any, { className: "w-6 h-6" }) as any,
    title: "FHE Confidential Payments",
    description: "Powered by Zama FHEVM, enabling fully homomorphic encryption for confidential payment amounts. Transaction amounts remain encrypted throughout the entire payment process, ensuring complete privacy."
  },
  {
    icon: React.createElement(Users as any, { className: "w-6 h-6" }) as any,
    title: "Dedicated Support",
    description: "Dedicated account manager providing full integration assistance and technical support."
  },
  {
    icon: React.createElement(Wallet as any, { className: "w-6 h-6" }) as any,
    title: "Gasless x402 Payments",
    description: "Powered by EVM x402 protocol, enabling gasless transactions and agent-driven micro-payments. Users pay zero gas fees while maintaining full control."
  }
];

export default function Features() {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extralight tracking-tight mb-6">
            Why Choose PayAgent Gateway
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Next-generation EVM payment platform powered by x402 protocol and FHE homomorphic encryption, delivering gasless, confidential, and enterprise-grade payment solutions
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-medium">{feature.title}</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
