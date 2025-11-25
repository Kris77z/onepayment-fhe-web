/**
 * Transaction History Management
 * Tracks and manages payment transactions
 */

import { Hash } from 'viem';
import { getContractAddresses } from './config';

export interface TransactionRecord {
  id: string;
  hash: Hash;
  type: 'payment' | 'fhe_payment' | 'x402_payment';
  from: string;
  to: string;
  amount?: string;
  encryptedAmount?: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
  blockNumber?: number;
  network: string;
  metadata?: {
    endpoint?: string;
    description?: string;
    [key: string]: any;
  };
}

class TransactionHistoryManager {
  private storageKey = 'x402_fhe_transactions';
  private transactions: TransactionRecord[] = [];

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load transactions from localStorage
   */
  private loadFromStorage() {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.transactions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load transaction history:', error);
      this.transactions = [];
    }
  }

  /**
   * Save transactions to localStorage
   */
  private saveToStorage() {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.transactions));
    } catch (error) {
      console.error('Failed to save transaction history:', error);
    }
  }

  /**
   * Add a new transaction record
   */
  addTransaction(transaction: Omit<TransactionRecord, 'id' | 'timestamp'>): string {
    const id = `${transaction.hash}-${Date.now()}`;
    const record: TransactionRecord = {
      ...transaction,
      id,
      timestamp: Date.now(),
    };

    this.transactions.unshift(record); // Add to beginning
    this.saveToStorage();
    return id;
  }

  /**
   * Update transaction status
   */
  updateTransaction(hash: Hash, updates: Partial<TransactionRecord>): boolean {
    const index = this.transactions.findIndex((tx) => tx.hash === hash);
    if (index === -1) {
      return false;
    }

    this.transactions[index] = {
      ...this.transactions[index],
      ...updates,
    };
    this.saveToStorage();
    return true;
  }

  /**
   * Get all transactions
   */
  getAllTransactions(): TransactionRecord[] {
    return [...this.transactions];
  }

  /**
   * Get transactions by type
   */
  getTransactionsByType(type: TransactionRecord['type']): TransactionRecord[] {
    return this.transactions.filter((tx) => tx.type === type);
  }

  /**
   * Get transactions by address
   */
  getTransactionsByAddress(address: string): TransactionRecord[] {
    return this.transactions.filter(
      (tx) => tx.from.toLowerCase() === address.toLowerCase() || tx.to.toLowerCase() === address.toLowerCase()
    );
  }

  /**
   * Get recent transactions
   */
  getRecentTransactions(limit: number = 10): TransactionRecord[] {
    return this.transactions.slice(0, limit);
  }

  /**
   * Clear all transactions
   */
  clearAll(): void {
    this.transactions = [];
    this.saveToStorage();
  }

  /**
   * Get transaction by hash
   */
  getTransactionByHash(hash: Hash): TransactionRecord | undefined {
    return this.transactions.find((tx) => tx.hash === hash);
  }
}

// Singleton instance
let transactionHistoryManager: TransactionHistoryManager | null = null;

export function getTransactionHistory(): TransactionHistoryManager {
  if (!transactionHistoryManager) {
    transactionHistoryManager = new TransactionHistoryManager();
  }
  return transactionHistoryManager;
}

