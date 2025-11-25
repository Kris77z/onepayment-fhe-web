"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Lock, Zap } from "lucide-react";
import React from "react";

// Type workaround for React version conflicts
const ZapIcon = Zap as any;
const LockIcon = Lock as any;
const WalletIcon = Wallet as any;
import { useEffect, useState } from "react";
import { getTransactionHistory, TransactionRecord } from "@/lib/transaction-history";
import { formatCurrency } from "@/lib/utils";
import { useEVMWallet } from "@/lib/evm-wallet-provider";

interface PaymentStats {
  x402Count: number;
  fheCount: number;
  combinedCount: number;
  totalAmount: number;
  fheAmount: number;
  x402Amount: number;
}

export function PaymentStatsCards() {
  const { address } = useEVMWallet();
  const [stats, setStats] = useState<PaymentStats>({
    x402Count: 0,
    fheCount: 0,
    combinedCount: 0,
    totalAmount: 0,
    fheAmount: 0,
    x402Amount: 0,
  });

  useEffect(() => {
    const calculateStats = () => {
      const txHistory = getTransactionHistory();
      let transactions: TransactionRecord[];

      if (address) {
        transactions = txHistory.getTransactionsByAddress(address);
      } else {
        transactions = txHistory.getAllTransactions();
      }

      // Filter successful transactions only
      const successfulTxs = transactions.filter((tx) => tx.status === 'success');

      const x402Txs = successfulTxs.filter((tx) => tx.type === 'x402_payment');
      const fheTxs = successfulTxs.filter((tx) => tx.type === 'fhe_payment');
      const combinedTxs = successfulTxs.filter((tx) => tx.type === 'fhe_payment' && tx.metadata?.x402TxHash);

      const x402Amount = x402Txs.reduce((sum, tx) => {
        return sum + (tx.amount ? parseFloat(tx.amount) : 0);
      }, 0);

      const fheAmount = fheTxs.reduce((sum, tx) => {
        return sum + (tx.amount ? parseFloat(tx.amount) : 0);
      }, 0);

      setStats({
        x402Count: x402Txs.length,
        fheCount: fheTxs.length,
        combinedCount: combinedTxs.length,
        totalAmount: x402Amount + fheAmount,
        fheAmount,
        x402Amount,
      });
    };

    calculateStats();
    // Refresh stats every 5 seconds
    const interval = setInterval(calculateStats, 5000);
    return () => clearInterval(interval);
  }, [address]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <ZapIcon className="w-4 h-4" />
            x402 Payments
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.x402Count}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Total: {formatCurrency(stats.x402Amount)}
          </div>
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              Gasless Payments
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <LockIcon className="w-4 h-4" />
            FHE Payments
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.fheCount}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Total: {formatCurrency(stats.fheAmount)}
          </div>
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              Confidential Payments
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <WalletIcon className="w-4 h-4" />
            Combined Payments
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.combinedCount}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            FHE + x402 Combined
          </div>
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              Gasless + Confidential
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

