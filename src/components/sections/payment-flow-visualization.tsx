"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import * as React from "react"
import { Lock, Wallet, Zap, CheckCircle, ArrowRight } from "lucide-react";
import { useState } from "react";

interface FlowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed';
}

const flowSteps: FlowStep[] = [
  {
    id: '1',
    title: 'User Selects Payment Mode',
    description: 'User can choose plaintext payment or FHE encrypted payment mode',
    icon: React.createElement(Wallet as any, { className: "w-6 h-6" }) as any,
    status: 'pending'
  },
  {
    id: '2',
    title: 'FHE Encrypt Amount',
    description: 'If encryption mode is selected, use Zama FHEVM to encrypt the payment amount',
    icon: React.createElement(Lock as any, { className: "w-6 h-6" }) as any,
    status: 'pending'
  },
  {
    id: '3',
    title: 'x402 Gasless Payment',
    description: 'Initiate Gasless USDC transfer via x402 protocol, Facilitator pays Gas fees',
    icon: React.createElement(Zap as any, { className: "w-6 h-6" }) as any,
    status: 'pending'
  },
  {
    id: '4',
    title: 'FHE Store to Contract',
    description: 'Store encrypted amount to FHEPaymentGateway smart contract',
    icon: React.createElement(Lock as any, { className: "w-6 h-6" }) as any,
    status: 'pending'
  },
  {
    id: '5',
    title: 'Payment Complete',
    description: 'Receive dual transaction records: x402 transaction hash and FHE storage transaction hash',
    icon: React.createElement(CheckCircle as any, { className: "w-6 h-6" }) as any,
    status: 'pending'
  }
];

export default function PaymentFlowVisualization() {
  const [activeStep, setActiveStep] = useState(0);

  const getStepStatus = (index: number): FlowStep['status'] => {
    if (index < activeStep) return 'completed';
    if (index === activeStep) return 'active';
    return 'pending';
  };

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4">
              FHE + x402 Payment Flow
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Understand the complete flow of confidential Gasless payments, from user selection to payment completion
            </p>
          </div>

          {/* Flow Steps */}
          <div className="relative">
            {/* Connection Lines - Desktop */}
            <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
            
            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10">
              {flowSteps.map((step, index) => {
                const status = getStepStatus(index);
                return (
                  <div
                    key={step.id}
                    className="flex flex-col items-center"
                    onMouseEnter={() => setActiveStep(index)}
                    onMouseLeave={() => setActiveStep(0)}
                  >
                    {/* Step Card */}
                    <Card 
                      className={`
                        w-full border transition-all duration-300 cursor-pointer
                        ${status === 'active' ? 'border-primary bg-primary/5 scale-105' : ''}
                        ${status === 'completed' ? 'border-green-500/50 bg-green-500/5' : ''}
                        ${status === 'pending' ? 'border-white/10 bg-card/50' : ''}
                      `}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex flex-col items-center text-center space-y-3">
                          {/* Icon */}
                          <div className={`
                            p-3 rounded-lg transition-colors
                            ${status === 'active' ? 'bg-primary text-primary-foreground' : ''}
                            ${status === 'completed' ? 'bg-green-500 text-white' : ''}
                            ${status === 'pending' ? 'bg-muted text-muted-foreground' : ''}
                          `}>
                            {status === 'completed' ? (
                              React.createElement(CheckCircle as any, { className: "w-6 h-6" }) as any
                            ) : (
                              step.icon
                            )}
                          </div>
                          
                          {/* Step Number */}
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                            ${status === 'active' ? 'bg-primary text-primary-foreground' : ''}
                            ${status === 'completed' ? 'bg-green-500 text-white' : ''}
                            ${status === 'pending' ? 'bg-muted text-muted-foreground' : ''}
                          `}>
                            {step.id}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0 text-center">
                        <CardTitle className="text-sm font-medium mb-2">
                          {step.title}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {step.description}
                        </CardDescription>
                      </CardContent>
                    </Card>

                    {/* Arrow - Mobile */}
                    {index < flowSteps.length - 1 && (
                      <div className="lg:hidden my-4">
                        {React.createElement(ArrowRight as any, { className: "w-5 h-5 text-muted-foreground" }) as any}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Flow Description */}
          <Card className="mt-12 border-white/10 bg-card/50">
            <CardHeader>
              <CardTitle>Flow Description</CardTitle>
              <CardDescription>
                Complete explanation of FHE + x402 combined payment flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">User Selects Payment Mode</h4>
                    <p className="text-sm text-muted-foreground">
                      Users can choose plaintext payment (x402 Gasless only) or encrypted payment (FHE + x402 combined). Encrypted payment mode protects payment amount privacy.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">FHE Encrypt Amount</h4>
                    <p className="text-sm text-muted-foreground">
                      If encryption mode is selected, the frontend uses Zama Relayer SDK to encrypt the payment amount. Encrypted amounts can perform homomorphic operations without decryption.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">x402 Gasless Payment</h4>
                    <p className="text-sm text-muted-foreground">
                      Initiate USDC transfer via x402 protocol. Users only need to sign the payment request, and the Facilitator (PayAI or Coinbase CDP) pays all Gas fees on their behalf. Users don't need to hold native tokens.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">FHE Store to Contract</h4>
                    <p className="text-sm text-muted-foreground">
                      Store encrypted amount to FHEPaymentGateway smart contract. The contract can perform homomorphic addition, multiplication, and other operations on encrypted amounts without decryption.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    5
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Payment Complete</h4>
                    <p className="text-sm text-muted-foreground">
                      After payment completion, users receive two transaction hashes: x402 transaction hash (main payment record) and FHE storage transaction hash (encrypted amount storage record). Both transactions are recorded on the blockchain, ensuring traceability and privacy protection.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

