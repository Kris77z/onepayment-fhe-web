"use client";

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bot, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { useState } from "react";

interface AgentStatus {
  name: string;
  status: 'online' | 'offline' | 'processing';
  lastActivity: string;
  description: string;
  icon: React.ReactNode;
  stats: {
    totalCalls: number;
    successRate: string;
    avgResponseTime: string;
  };
}

const agents: AgentStatus[] = [
  {
    name: 'RateAgent',
    status: 'online',
    lastActivity: '2 minutes ago',
    description: 'Intelligent agent that automatically fetches exchange rates and pays fees',
    icon: React.createElement(TrendingUp as any, { className: "w-6 h-6" }) as any,
    stats: {
      totalCalls: 1247,
      successRate: '99.8%',
      avgResponseTime: '1.2s'
    }
  },
  {
    name: 'FHE Agent',
    status: 'online',
    lastActivity: '5 minutes ago',
    description: 'Processes homomorphic computation and storage of encrypted amounts',
    icon: React.createElement(Bot as any, { className: "w-6 h-6" }) as any,
    stats: {
      totalCalls: 892,
      successRate: '100%',
      avgResponseTime: '0.8s'
    }
  }
];

export default function RateAgentDisplay() {
  const [selectedAgent, setSelectedAgent] = useState(0);

  const getStatusColor = (status: AgentStatus['status']) => {
    switch (status) {
      case 'online':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'processing':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'offline':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
    }
  };

  const getStatusIcon = (status: AgentStatus['status']) => {
    switch (status) {
      case 'online':
        return React.createElement(CheckCircle as any, { className: "w-4 h-4" }) as any;
      case 'processing':
        return React.createElement(Clock as any, { className: "w-4 h-4" }) as any;
      case 'offline':
        return <div className="w-4 h-4 rounded-full bg-red-500" />;
    }
  };

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4">
              Agentic Finance - Intelligent Agent Services
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Autonomous intelligent agents that enable automated economic behavior and service payments
            </p>
          </div>

          {/* Agent Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {agents.map((agent, index) => (
              <Card
                key={index}
                className={`
                  border transition-all duration-300 cursor-pointer
                  ${selectedAgent === index ? 'border-primary bg-primary/5' : 'border-white/10 bg-card/50'}
                  hover:border-primary/50 hover:bg-primary/5
                `}
                onClick={() => setSelectedAgent(index)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {agent.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {agent.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className={`
                      flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium
                      ${getStatusColor(agent.status)}
                    `}>
                      {getStatusIcon(agent.status)}
                      <span className="capitalize">{agent.status}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-light mb-1">{agent.stats.totalCalls}</div>
                      <div className="text-xs text-muted-foreground">Total Calls</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-light mb-1">{agent.stats.successRate}</div>
                      <div className="text-xs text-muted-foreground">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-light mb-1">{agent.stats.avgResponseTime}</div>
                      <div className="text-xs text-muted-foreground">Avg Response</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-muted-foreground">
                      Last Activity: {agent.lastActivity}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Agent Information */}
          <Card className="border-white/10 bg-card/50">
            <CardHeader>
              <CardTitle>{agents[selectedAgent].name} Details</CardTitle>
              <CardDescription>
                Learn how {agents[selectedAgent].name} works and its capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedAgent === 0 ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      {React.createElement(TrendingUp as any, { className: "w-4 h-4" }) as any}
                      RateAgent Features
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      RateAgent is an autonomous intelligent agent primarily responsible for automatically fetching exchange rate information and paying related fees.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <h5 className="font-medium text-sm mb-1">Fetch Exchange Rates</h5>
                        <p className="text-xs text-muted-foreground">
                          RateAgent automatically fetches exchange rate information such as USDC/USD through Chainlink oracles, ensuring payment amount accuracy.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <h5 className="font-medium text-sm mb-1">Auto Pay Fees</h5>
                        <p className="text-xs text-muted-foreground">
                          When service fees need to be paid, RateAgent automatically initiates micro-payments to the Facilitator via x402 protocol without manual intervention.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <h5 className="font-medium text-sm mb-1">Atomic Settlement</h5>
                        <p className="text-xs text-muted-foreground">
                          RateAgent's payment logic is bundled with the main payment flow, ensuring atomicity between fee payment and main payment, avoiding partial success scenarios.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Use Cases:</strong> When payment flows require exchange rate conversion or service fee payments, RateAgent automatically triggers and completes related operations.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      {React.createElement(Bot as any, { className: "w-4 h-4" }) as any}
                      FHE Agent Features
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      FHE Agent specializes in processing homomorphic computation and storage of encrypted amounts, ensuring payment amounts remain encrypted throughout the entire process.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <h5 className="font-medium text-sm mb-1">Encrypted Amount Processing</h5>
                        <p className="text-xs text-muted-foreground">
                          FHE Agent receives encrypted payment amounts from the frontend and securely stores them in the FHEPaymentGateway smart contract.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <h5 className="font-medium text-sm mb-1">Homomorphic Operations</h5>
                        <p className="text-xs text-muted-foreground">
                          Without decryption, FHE Agent can perform homomorphic addition (accumulated payments) and homomorphic multiplication (exchange rate conversion) on encrypted amounts.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <h5 className="font-medium text-sm mb-1">Privacy Protection</h5>
                        <p className="text-xs text-muted-foreground">
                          Throughout the process, payment amounts remain encrypted. Only authorized parties with decryption keys can view actual amounts, ensuring complete privacy.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Technical Advantages:</strong> Uses Zama FHEVM technology, which is EVM-native FHE implementation, requiring no bridging and delivering excellent performance.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

