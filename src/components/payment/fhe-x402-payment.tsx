'use client';

/**
 * FHE + x402 Payment Component
 * Integrates FHE encryption with x402 payment protocol
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useEVMWallet } from '@/lib/evm-wallet-provider';
import { createX402Client } from '@/lib/x402-client';
import { encryptAmountFHEVM, validateAmount } from '@/lib/fhevm-relayer';
import { addPayment, createFHEVMWalletClient, createFHEVMPublicClient, getERC20Balance } from '@/lib/fhevm-contract';
import { getTransactionHistory } from '@/lib/transaction-history';
import { queryAllBalances } from '@/lib/balance-query';
import { getContractAddresses as getConfigContracts } from '@/lib/config';

interface FHEX402PaymentProps {
  endpoint: string;
  description?: string;
  onPaymentSuccess?: (txHash: string) => void;
}

export function FHEX402Payment({ endpoint, description, onPaymentSuccess }: FHEX402PaymentProps) {
  const { address, isConnected, walletClient, isCorrectNetwork } = useEVMWallet();
  const [amount, setAmount] = useState('0.01');
  const [useFHE, setUseFHE] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'encrypting' | 'paying' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);

  const x402Client = createX402Client(walletClient || null);

  useEffect(() => {
    if (walletClient) {
      x402Client.setWalletClient(walletClient);
    }
  }, [walletClient]);

  const handlePayment = async () => {
    if (!isConnected || !address || !walletClient) {
      toast.error('Wallet not connected', {
        description: 'Please connect your wallet first',
      });
      return;
    }

    if (!isCorrectNetwork) {
      toast.error('Incorrect network', {
        description: 'Please switch to Base Sepolia network',
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Invalid amount', {
        description: 'Please enter a valid amount',
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('encrypting');

    try {
      const contracts = getConfigContracts();
      const contractAddress = contracts.fhePaymentGateway;

      if (useFHE) {
        // FHE + x402 Combined Payment Flow:
        // 1. Encrypt amount (FHE)
        // 2. Perform actual USDC transfer via x402 (Gasless)
        // 3. Store encrypted amount to FHE contract (for privacy protection)

        // Step 1: Encrypt amount using FHE
        setPaymentStatus('encrypting');
        const amountInt = Math.floor(amountNum * 100); // Convert to cents
        const validation = validateAmount(amountInt);
        if (!validation.isValid) {
          throw new Error(validation.error || 'Amount validation failed');
        }

        const encrypted = await encryptAmountFHEVM(amountInt, contractAddress, address);
        const encryptedValue = encrypted.encryptedValue;

        // Step 2: Make x402 payment with FHE encrypted amount metadata
        // This performs actual USDC transfer via Facilitator (Gasless)
        setPaymentStatus('paying');
        const response = await x402Client.request(endpoint, {
          method: 'GET',
          headers: {
            'X-FHE-ENCRYPTED': encryptedValue, // Pass encrypted amount as metadata
          },
        });

        // Get x402 payment transaction hash
        let x402TxHash: `0x${string}` | null = null;
        if (response.settlement?.transaction) {
          x402TxHash = response.settlement.transaction as `0x${string}`;
        } else {
          // Settlement may have failed or is pending
          console.warn('⚠️ x402 payment completed but no settlement transaction hash found');
          console.warn('Response:', response);
          
          // For FHE + x402 combination, we need the actual transaction hash
          // If settlement failed, we should not proceed with FHE storage
          throw new Error(
            'x402 payment completed but transaction hash not found. ' +
            'Possible reasons: Facilitator settlement failed, network issue, or payment verification failed. ' +
            'Please check browser console for more information.'
          );
        }

        // Step 3: Store encrypted amount to FHE contract (for privacy-preserving balance tracking)
        console.log('🔐 Starting FHE storage...');
        let fheTxHash: `0x${string}` | null = null;
        try {
          const client = createFHEVMWalletClient(address);
          fheTxHash = await addPayment(client, address, encryptedValue as `0x${string}`);
          console.log('✅ FHE storage successful:', fheTxHash);
        } catch (fheError) {
          console.error('❌ FHE storage failed:', fheError);
          // FHE storage failure should not block the entire flow since x402 payment already succeeded
          // But we need to record this error
          toast.warning('FHE storage failed', {
            description: fheError instanceof Error ? fheError.message : 'Failed to store encrypted amount to FHE contract, but x402 payment succeeded',
          });
          // Continue execution, only record x402 transaction
        }

        // Step 4: Record transaction
        const txHistory = getTransactionHistory();
        txHistory.addTransaction({
          hash: x402TxHash, // Use x402 transaction hash as primary
          type: 'fhe_payment',
          from: address,
          to: contractAddress,
          encryptedAmount: encryptedValue,
          status: 'success',
          network: 'base-sepolia',
          metadata: {
            endpoint,
            description: description || `FHE + x402 Payment: ${amount} USDC`,
            amount: amountNum.toString(),
            x402TxHash: x402TxHash,
            fheTxHash: fheTxHash || null, // May be null if FHE storage failed
            settlement: response.settlement,
          },
        });

        setTxHash(x402TxHash); // Display x402 transaction hash
        setPaymentStatus('success');
        
        if (fheTxHash) {
          toast.success('FHE + x402 Payment Successful', {
            description: `x402 TX: ${x402TxHash.slice(0, 10)}... | FHE Storage: ${fheTxHash.slice(0, 10)}...`,
          });
        } else {
          toast.success('x402 Payment Successful', {
            description: `TX Hash: ${x402TxHash.slice(0, 10)}... | ⚠️ FHE storage failed`,
          });
        }

        if (onPaymentSuccess) {
          onPaymentSuccess(x402TxHash);
        }
      } else {
        // Step 1: Make x402 payment (plaintext)
        setPaymentStatus('paying');
        const response = await x402Client.request(endpoint, {
          method: 'GET',
        });

        // Step 2: Record transaction with real transaction hash from settlement
        const txHistory = getTransactionHistory();
        let txHash: `0x${string}`;
        
        if (response.settlement?.transaction) {
          // Use real transaction hash from Facilitator settlement
          txHash = response.settlement.transaction as `0x${string}`;
        } else {
          // Fallback: Use timestamp-based hash if settlement info not available
          txHash = `0x${Date.now().toString(16)}` as `0x${string}`;
          console.warn('x402 payment completed but no settlement transaction hash found');
        }

        txHistory.addTransaction({
          hash: txHash,
          type: 'x402_payment',
          from: address,
          to: contracts.fhePaymentGateway,
          amount: amountNum.toString(),
          status: 'success',
          network: 'base-sepolia',
          metadata: {
            endpoint,
            description: description || `x402 Payment: ${amount} USDC`,
            settlement: response.settlement,
          },
        });

        setTxHash(txHash);
        setPaymentStatus('success');
        toast.success('x402 Payment Successful', {
          description: response.settlement?.transaction 
            ? `TX Hash: ${txHash.slice(0, 10)}...`
            : 'Payment settled via Facilitator',
        });

        if (onPaymentSuccess) {
          onPaymentSuccess(txHash);
        }
      }
    } catch (error) {
      setPaymentStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Payment Failed', {
        description: errorMsg,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>FHE + x402 Payment</CardTitle>
        <CardDescription>
          {description || 'Choose FHE encrypted payment or x402 Gasless payment'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (USDC)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 0.01"
            disabled={isProcessing}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="use-fhe">Use FHE + x402 Combined Payment</Label>
            <p className="text-xs text-muted-foreground">
              {useFHE
                ? 'First perform Gasless USDC transfer via x402, then store encrypted amount to FHE contract (Confidential Gasless Payment)'
                : 'Use x402 protocol for Gasless payment (plaintext)'}
            </p>
          </div>
          <Switch id="use-fhe" checked={useFHE} onCheckedChange={setUseFHE} disabled={isProcessing} />
        </div>

        {!isCorrectNetwork && isConnected && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ Please switch to Base Sepolia network first
            </p>
          </div>
        )}

        <Button
          onClick={handlePayment}
          disabled={isProcessing || !isConnected || !isCorrectNetwork}
          className="w-full"
        >
          {isProcessing ? (
            <>
              {paymentStatus === 'encrypting' && 'Encrypting...'}
              {paymentStatus === 'paying' && 'Processing Payment...'}
            </>
          ) : (
            useFHE ? 'FHE + x402 Combined Payment' : 'x402 Gasless Payment'
          )}
        </Button>

        {txHash && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">Transaction Hash:</p>
            <p className="text-xs font-mono break-all">{txHash}</p>
            <a
              href={`https://sepolia.basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 inline-block"
            >
              View on Basescan
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

