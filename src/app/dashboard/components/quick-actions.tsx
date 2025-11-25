"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, History, ArrowRight, Zap, Lock } from "lucide-react";

// Type workaround for React version conflicts
const ZapIcon = Zap as any;
const WalletIcon = Wallet as any;
const HistoryIcon = History as any;
const ArrowRightIcon = ArrowRight as any;
const LockIcon = Lock as any;
import Link from "next/link";
import { useEVMWallet } from "@/lib/evm-wallet-provider";

export function QuickActions() {
  const { isConnected } = useEVMWallet();

  const actions = [
    {
      title: "Make Payment",
      description: "Initiate FHE + x402 payment",
      icon: <ZapIcon className="w-5 h-5" />,
      href: "/dashboard/payment",
      variant: "default" as const,
    },
    {
      title: "View Balance",
      description: "Check USDC and FHE balances",
      icon: <WalletIcon className="w-5 h-5" />,
      href: "/dashboard/payment",
      variant: "outline" as const,
    },
    {
      title: "Transaction History",
      description: "View all payment records",
      icon: <HistoryIcon className="w-5 h-5" />,
      href: "/dashboard/history",
      variant: "outline" as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common operations and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Button
                variant={action.variant}
                className="w-full h-auto flex flex-col items-start gap-2 p-4"
                disabled={!isConnected && action.title === "Make Payment"}
              >
                <div className="flex items-center gap-2 w-full">
                  {action.icon}
                  <span className="font-medium">{action.title}</span>
                  <ArrowRightIcon className="w-4 h-4 ml-auto" />
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  {action.description}
                </span>
              </Button>
            </Link>
          ))}
        </div>
        {!isConnected && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ⚠️ Connect your wallet to make payments
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

