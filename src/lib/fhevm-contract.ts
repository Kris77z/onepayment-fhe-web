/**
 * FHEVM Contract Interaction Utilities
 * Provides functions to interact with FHEVM contracts using viem
 */

import { createPublicClient, createWalletClient, custom, http, type Address, type Hash } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getContractAddresses, getNetworkConfig } from './config';

const CONTRACT_ADDRESSES = getContractAddresses();
const NETWORK_CONFIG = getNetworkConfig();

// FHEPaymentGateway Contract ABI
// Note: This is a simplified ABI. In production, generate from contract artifacts
export const FHE_PAYMENT_GATEWAY_ABI = [
  {
    name: 'addPayment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'encryptedAmount', type: 'bytes32' }, // euint32 is bytes32
    ],
    outputs: [],
  },
  {
    name: 'applyRate',
    type: 'function',
    stateMutability: 'pure',
    inputs: [
      { name: 'encryptedAmount', type: 'bytes32' },
      { name: 'rate', type: 'uint32' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'getEncryptedBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bytes' }],
  },
  {
    name: 'PaymentAdded',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'encryptedAmount', type: 'bytes' },
    ],
  },
  {
    name: 'BalanceUpdated',
    type: 'event',
    inputs: [{ name: 'user', type: 'address', indexed: true }],
  },
] as const;

export interface FHEVMContractError extends Error {
  code?: string;
  data?: unknown;
}

/**
 * Create public client for reading contract state
 */
export function createFHEVMPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(NETWORK_CONFIG.rpcUrl),
  });
}

/**
 * Create wallet client for writing to contracts
 */
export function createFHEVMWalletClient(account: Address) {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Wallet not available');
  }

  return createWalletClient({
    chain: baseSepolia,
    transport: custom(window.ethereum),
    account,
  });
}

/**
 * Add encrypted payment to user balance
 * 
 * @param walletClient - Wallet client instance
 * @param userAddress - User address
 * @param encryptedAmount - Encrypted amount (bytes32)
 * @returns Transaction hash
 */
export async function addPayment(
  walletClient: ReturnType<typeof createFHEVMWalletClient>,
  userAddress: Address,
  encryptedAmount: `0x${string}`
): Promise<Hash> {
  const publicClient = createFHEVMPublicClient();

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESSES.fhePaymentGateway as Address,
    abi: FHE_PAYMENT_GATEWAY_ABI,
    functionName: 'addPayment',
    args: [userAddress, encryptedAmount],
  });

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === 'reverted') {
    throw new Error('Transaction reverted');
  }

  return hash;
}

/**
 * Get encrypted balance for a user
 * 
 * @param userAddress - User address
 * @returns Encrypted balance (sealed output bytes)
 */
export async function getEncryptedBalance(userAddress: Address): Promise<`0x${string}`> {
  const publicClient = createFHEVMPublicClient();

  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.fhePaymentGateway as Address,
    abi: FHE_PAYMENT_GATEWAY_ABI,
    functionName: 'getEncryptedBalance',
    args: [userAddress],
  });

  return result as `0x${string}`;
}

/**
 * Apply rate to encrypted amount (read-only)
 * 
 * @param encryptedAmount - Encrypted amount
 * @param rate - Rate in basis points (e.g., 10000 = 100%)
 * @returns Result of multiplication (encrypted)
 */
export async function applyRate(
  encryptedAmount: `0x${string}`,
  rate: number
): Promise<`0x${string}`> {
  const publicClient = createFHEVMPublicClient();

  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.fhePaymentGateway as Address,
    abi: FHE_PAYMENT_GATEWAY_ABI,
    functionName: 'applyRate',
    args: [encryptedAmount, rate],
  });

  return result as `0x${string}`;
}

/**
 * Listen for PaymentAdded events
 * 
 * @param userAddress - User address to filter events
 * @param callback - Callback function for events
 * @returns Unwatch function
 */
export function watchPaymentAdded(
  userAddress: Address,
  callback: (event: { user: Address; encryptedAmount: `0x${string}` }) => void
) {
  const publicClient = createFHEVMPublicClient();

  return publicClient.watchContractEvent({
    address: CONTRACT_ADDRESSES.fhePaymentGateway as Address,
    abi: FHE_PAYMENT_GATEWAY_ABI,
    eventName: 'PaymentAdded',
    args: {
      user: userAddress,
    },
    onLogs: (logs) => {
      logs.forEach((log) => {
        callback({
          user: log.args.user as Address,
          encryptedAmount: log.args.encryptedAmount as `0x${string}`,
        });
      });
    },
  });
}

/**
 * Get ERC20 token balance
 * 
 * @param tokenAddress - ERC20 token contract address
 * @param userAddress - User address
 * @returns Token balance (as bigint)
 */
export async function getERC20Balance(
  tokenAddress: Address,
  userAddress: Address
): Promise<bigint> {
  const publicClient = createFHEVMPublicClient();
  
  // Import ERC20 ABI
  const { ERC20_ABI } = await import('./erc20-abi');
  
  const result = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  });

  return result as bigint;
}

/**
 * Get contract address
 */
export function getFHEPaymentGatewayAddress(): Address {
  return CONTRACT_ADDRESSES.fhePaymentGateway as Address;
}

