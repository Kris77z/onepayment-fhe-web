'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createPublicClient, createWalletClient, custom, http, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getNetworkConfig } from './config';

interface EVMWalletContextType {
  address: Address | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  publicClient: ReturnType<typeof createPublicClient> | null;
  walletClient: ReturnType<typeof createWalletClient> | null;
  chainId: number | null;
  switchToBaseSepolia: () => Promise<void>;
  isCorrectNetwork: boolean;
}

const EVMWalletContext = createContext<EVMWalletContextType | undefined>(undefined);

export function useEVMWallet() {
  const context = useContext(EVMWalletContext);
  if (!context) {
    throw new Error('useEVMWallet must be used within EVMWalletProvider');
  }
  return context;
}

export function EVMWalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [publicClient, setPublicClient] = useState<ReturnType<typeof createPublicClient> | null>(null);
  const [walletClient, setWalletClient] = useState<ReturnType<typeof createWalletClient> | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const networkConfig = getNetworkConfig();
  const expectedChainId = networkConfig.chainId;
  const isCorrectNetwork = chainId === expectedChainId;

  // Initialize public client
  useEffect(() => {
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(networkConfig.rpcUrl),
    });
    setPublicClient(client as any);
  }, [networkConfig.rpcUrl]);

  // Check current chain ID
  const checkChainId = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    try {
      const chainIdHex = await window.ethereum.request({
        method: 'eth_chainId',
      }) as string;
      if (chainIdHex) {
        const chainIdNum = parseInt(chainIdHex, 16);
        setChainId(chainIdNum);
      }
    } catch (error) {
      console.error('Failed to check chain ID:', error);
    }
  }, []);

  // Initialize wallet client
  const initializeWalletClient = useCallback((accountAddress: Address) => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    const client = createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum),
      account: accountAddress as Address,
    });
    setWalletClient(client);
  }, []);

  // Check if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === 'undefined' || !window.ethereum) {
        return;
      }

      try {
        await checkChainId();
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        }) as Address[];
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
          initializeWalletClient(accounts[0]);
        }
      } catch (error) {
        console.error('Failed to check wallet connection:', error);
      }
    };

    checkConnection();
  }, [checkChainId, initializeWalletClient]);

  const switchToBaseSepolia = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask or other EVM wallet not found');
    }

    const baseSepoliaChainIdHex = `0x${expectedChainId.toString(16)}`;

    try {
      // Try to switch to Base Sepolia
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: baseSepoliaChainIdHex }],
      });
      await checkChainId();
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          // Add Base Sepolia network to MetaMask
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: baseSepoliaChainIdHex,
                chainName: 'Base Sepolia',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: [networkConfig.rpcUrl],
                blockExplorerUrls: ['https://sepolia.basescan.org'],
              },
            ],
          });
          await checkChainId();
        } catch (addError) {
          console.error('Failed to add Base Sepolia network:', addError);
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
  }, [expectedChainId, networkConfig.rpcUrl, checkChainId]);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask or other EVM wallet not found');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as Address[];

      if (accounts && accounts.length > 0) {
        await checkChainId();
        const accountAddress = accounts[0];
        setAddress(accountAddress);
        setIsConnected(true);
        initializeWalletClient(accountAddress);

        // Listen for account changes
        window.ethereum.on('accountsChanged', (newAccounts: Address[]) => {
          if (newAccounts.length > 0) {
            setAddress(newAccounts[0]);
            initializeWalletClient(newAccounts[0]);
          } else {
            disconnect();
          }
        });

        // Listen for chain changes
        window.ethereum.on('chainChanged', () => {
          checkChainId();
          window.location.reload();
        });
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }, [initializeWalletClient, checkChainId]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setWalletClient(null);
  }, []);

  return (
    <EVMWalletContext.Provider
      value={{
        address,
        isConnected,
        connect,
        disconnect,
        publicClient,
        walletClient,
        chainId,
        switchToBaseSepolia,
        isCorrectNetwork,
      }}
    >
      {children}
    </EVMWalletContext.Provider>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

