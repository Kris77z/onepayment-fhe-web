"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ExternalLink } from "lucide-react";

// Type workaround for React version conflicts
const ArrowRightIcon = ArrowRight as any;
const ExternalLinkIcon = ExternalLink as any;
import { useEffect, useState } from "react";
import { getTransactionHistory, TransactionRecord } from "@/lib/transaction-history";
import { useEVMWallet } from "@/lib/evm-wallet-provider";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

function explorerBase(chain: string): string | null {
  const c = chain.toLowerCase();
  if(c === 'bsc') return 'https://bscscan.com/tx/';
  if(c === 'ethereum') return 'https://etherscan.io/tx/';
  if(c === 'arbitrum') return 'https://arbiscan.io/tx/';
  if(c === 'polygon') return 'https://polygonscan.com/tx/';
  if(c === 'base' || c === 'base-sepolia') return 'https://sepolia.basescan.org/tx/';
  return null;
}

export function RecentTransactions() {
  const { address } = useEVMWallet();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  useEffect(() => {
    const loadTransactions = () => {
      const txHistory = getTransactionHistory();
      let txs: TransactionRecord[];

      if (address) {
        txs = txHistory.getTransactionsByAddress(address);
      } else {
        txs = txHistory.getAllTransactions();
      }

      // Get recent 5 transactions
      setTransactions(txs.slice(0, 5));
    };

    loadTransactions();
    // Refresh every 5 seconds
    const interval = setInterval(loadTransactions, 5000);
    return () => clearInterval(interval);
  }, [address]);

  const getTypeLabel = (type: TransactionRecord['type']) => {
    switch (type) {
      case 'payment':
        return 'Payment';
      case 'fhe_payment':
        return 'FHE Payment';
      case 'x402_payment':
        return 'x402 Payment';
      default:
        return type;
    }
  };

  const getStatusColor = (status: TransactionRecord['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest payment activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No transactions yet</p>
            <p className="text-xs mt-1">Transactions will appear here after you make payments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest payment activities</CardDescription>
          </div>
          <Link href="/dashboard/history">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((tx) => {
            const linkBase = explorerBase(tx.network);
            const txUrl = linkBase ? `${linkBase}${tx.hash}` : null;

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{getTypeLabel(tx.type)}</span>
                    <Badge
                      variant={tx.status === 'success' ? 'default' : tx.status === 'pending' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {tx.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {tx.amount && (
                      <span className="font-medium">{tx.amount} USDC</span>
                    )}
                    {tx.encryptedAmount && (
                      <span className="font-mono text-xs">
                        Encrypted: {tx.encryptedAmount.slice(0, 10)}...
                      </span>
                    )}
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}</span>
                  </div>
                  {tx.metadata?.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {tx.metadata.description}
                    </p>
                  )}
                </div>
                {txUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(txUrl, '_blank')}
                    className="ml-2 flex-shrink-0"
                  >
                    <ExternalLinkIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

