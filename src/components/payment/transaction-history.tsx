'use client';

/**
 * Transaction History Component
 * Displays payment transaction history
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTransactionHistory, TransactionRecord } from '@/lib/transaction-history';
import { useEVMWallet } from '@/lib/evm-wallet-provider';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function TransactionHistory() {
  const { address } = useEVMWallet();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'payment' | 'fhe_payment' | 'x402_payment'>('all');

  useEffect(() => {
    loadTransactions();
  }, [address, filter]);

  const loadTransactions = () => {
    const txHistory = getTransactionHistory();
    let txs: TransactionRecord[];

    if (address) {
      txs = txHistory.getTransactionsByAddress(address);
    } else {
      txs = txHistory.getAllTransactions();
    }

    if (filter !== 'all') {
      txs = txs.filter((tx) => tx.type === filter);
    }

    setTransactions(txs);
  };

  const handleClear = () => {
    if (confirm('确定要清除所有交易记录吗？')) {
      const txHistory = getTransactionHistory();
      txHistory.clearAll();
      loadTransactions();
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

  const getTypeLabel = (type: TransactionRecord['type']) => {
    switch (type) {
      case 'payment':
        return '普通支付';
      case 'fhe_payment':
        return 'FHE 加密支付';
      case 'x402_payment':
        return 'x402 Gasless 支付';
      default:
        return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>交易历史</CardTitle>
            <CardDescription>查看所有支付交易记录</CardDescription>
          </div>
          {transactions.length > 0 && (
            <Button onClick={handleClear} variant="outline" size="sm">
              清除记录
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={(v: any) => setFilter(v as typeof filter)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="payment">普通</TabsTrigger>
            <TabsTrigger value="fhe_payment">FHE</TabsTrigger>
            <TabsTrigger value="x402_payment">x402</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>暂无交易记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="rounded-lg border p-4 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{getTypeLabel(tx.type)}</span>
                          <span className={`text-xs ${getStatusColor(tx.status)}`}>
                            {tx.status === 'success' ? '✅' : tx.status === 'pending' ? '⏳' : '❌'}
                            {tx.status === 'success' ? '成功' : tx.status === 'pending' ? '处理中' : '失败'}
                          </span>
                        </div>
                        {tx.metadata?.description && (
                          <p className="text-xs text-muted-foreground mt-1">{tx.metadata.description}</p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(tx.timestamp), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">From:</span>
                        <p className="font-mono break-all">{tx.from.slice(0, 6)}...{tx.from.slice(-4)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">To:</span>
                        <p className="font-mono break-all">{tx.to.slice(0, 6)}...{tx.to.slice(-4)}</p>
                      </div>
                    </div>

                    {(tx.amount || tx.encryptedAmount) && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">
                          {tx.encryptedAmount ? '加密金额: ' : '金额: '}
                        </span>
                        <span className="font-mono">
                          {tx.encryptedAmount
                            ? `${tx.encryptedAmount.slice(0, 10)}...`
                            : `${tx.amount} USDC`}
                        </span>
                      </div>
                    )}

                    {tx.hash && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {tx.metadata?.x402TxHash && tx.metadata?.fheTxHash ? 'x402 交易哈希:' : '交易哈希:'}
                          </span>
                          <a
                            href={`https://sepolia.basescan.org/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-blue-600 hover:underline break-all"
                          >
                            {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                          </a>
                        </div>
                        {tx.metadata?.fheTxHash && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">FHE 存储哈希:</span>
                            <a
                              href={`https://sepolia.basescan.org/tx/${tx.metadata.fheTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-blue-600 hover:underline break-all"
                            >
                              {tx.metadata.fheTxHash.slice(0, 10)}...{tx.metadata.fheTxHash.slice(-8)}
                            </a>
                          </div>
                        )}
                        {tx.metadata?.x402TxHash && !tx.metadata?.fheTxHash && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-400">
                            ⚠️ FHE 存储交易缺失
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

