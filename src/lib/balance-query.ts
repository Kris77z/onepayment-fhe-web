/**
 * Balance Query Utilities
 * Query encrypted and plaintext balances from contracts
 */

import { Address, PublicClient } from 'viem';
import { createFHEVMPublicClient, getEncryptedBalance } from './fhevm-contract';
import { getContractAddresses } from './config';
import { ERC20_ABI } from './erc20-abi';

export interface BalanceInfo {
  address: Address;
  encryptedBalance: string | null;
  plaintextBalance: string | null;
  usdcBalance: string | null;
  lastUpdated: number;
}

/**
 * Query encrypted balance from FHEPaymentGateway contract
 */
export async function queryEncryptedBalance(userAddress: Address): Promise<string | null> {
  try {
    const balance = await getEncryptedBalance(userAddress);
    return balance;
  } catch (error) {
    console.error('Failed to query encrypted balance:', error);
    return null;
  }
}

/**
 * Query USDC balance from ERC-20 contract
 */
export async function queryUSDCBalance(
  userAddress: Address,
  publicClient?: PublicClient
): Promise<string | null> {
  try {
    const client = publicClient || createFHEVMPublicClient();
    const contracts = getContractAddresses();

    const balance = await client.readContract({
      address: contracts.usdc as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    });

    // Convert from wei (6 decimals for USDC)
    const balanceFormatted = (Number(balance) / 1e6).toFixed(6);
    return balanceFormatted;
  } catch (error) {
    console.error('Failed to query USDC balance:', error);
    return null;
  }
}

/**
 * Query all balances for a user
 */
export async function queryAllBalances(
  userAddress: Address,
  publicClient?: PublicClient
): Promise<BalanceInfo> {
  const [encryptedBalance, usdcBalance] = await Promise.all([
    queryEncryptedBalance(userAddress),
    queryUSDCBalance(userAddress, publicClient),
  ]);

  return {
    address: userAddress,
    encryptedBalance,
    plaintextBalance: null, // Would need decryption service
    usdcBalance,
    lastUpdated: Date.now(),
  };
}

