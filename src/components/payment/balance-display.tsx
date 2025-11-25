'use client';

/**
 * Balance Display Component
 * Shows encrypted and plaintext balances
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEVMWallet } from '@/lib/evm-wallet-provider';
import { queryAllBalances, BalanceInfo } from '@/lib/balance-query';
import { createFHEVMPublicClient } from '@/lib/fhevm-contract';

export function BalanceDisplay() {
  const { address, isConnected, publicClient } = useEVMWallet();
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      loadBalance();
    }
  }, [isConnected, address]);

  const loadBalance = async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      const client = (publicClient || createFHEVMPublicClient()) as any;
      const balanceInfo = await queryAllBalances(address, client);
      setBalance(balanceInfo);
      setLastUpdated(balanceInfo.lastUpdated);
    } catch (error) {
      console.error('Failed to load balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance Inquiry</CardTitle>
          <CardDescription>View balances after connecting wallet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Please connect your wallet first</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Balance Inquiry</CardTitle>
            <CardDescription>View encrypted and plaintext balances</CardDescription>
          </div>
          <Button onClick={loadBalance} disabled={isLoading} size="sm" variant="outline">
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && !balance ? (
          <div className="text-center py-4 text-muted-foreground">
            <p>Loading...</p>
          </div>
        ) : balance ? (
          <>
            <div className="space-y-3">
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">USDC Balance</span>
                  <span className="text-lg font-bold">
                    {balance.usdcBalance ? `${balance.usdcBalance} USDC` : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border p-3 bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Encrypted Balance (FHE)</span>
                  <span className="text-sm font-mono">
                    {balance.encryptedBalance
                      ? `${balance.encryptedBalance.slice(0, 10)}...${balance.encryptedBalance.slice(-8)}`
                      : 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Encrypted balance stored in FHEPaymentGateway contract
                </p>
              </div>

              {balance.plaintextBalance && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Plaintext Balance</span>
                    <span className="text-lg font-bold">{balance.plaintextBalance} USDC</span>
                  </div>
                </div>
              )}
            </div>

            {lastUpdated && (
              <p className="text-xs text-muted-foreground text-center">
                Last updated: {new Date(lastUpdated).toLocaleString('en-US')}
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p>Failed to load balance information</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

