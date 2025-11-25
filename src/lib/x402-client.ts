/**
 * x402 Client for Frontend
 * Handles x402 payment protocol integration for EVM networks
 * 
 * Reference: https://docs.payai.network/x402/clients/typescript/axios
 */

import { WalletClient, Address } from 'viem';
import { getX402Config, getNetworkConfig } from './config';

export interface PaymentRequirements {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description?: string;
  mimeType?: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  asset: string;
  outputSchema?: any;
  extra?: any;
}

export interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature: string;
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
}

export interface X402PaymentResponse {
  transaction: string;
  network: string;
  payer: string;
  amount: string;
}

export class X402Client {
  private walletClient: WalletClient | null = null;
  private facilitatorUrl: string;
  private serverUrl: string;

  constructor(walletClient: WalletClient | null = null) {
    const x402Config = getX402Config();
    this.facilitatorUrl = x402Config.facilitatorUrl;
    this.serverUrl = x402Config.serverUrl;
    this.walletClient = walletClient;
  }

  /**
   * Set wallet client for signing payments
   */
  setWalletClient(walletClient: WalletClient) {
    this.walletClient = walletClient;
  }

  /**
   * Make a payment request to a protected endpoint
   * 
   * @param endpoint - The endpoint path (e.g., '/api/premium')
   * @param options - Request options
   * @returns The response data from the server
   */
  async request(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      headers?: Record<string, string>;
      body?: any;
    } = {}
  ): Promise<any> {
    if (!this.walletClient) {
      throw new Error('Wallet client not set. Please connect wallet first.');
    }

    const url = `${this.serverUrl}${endpoint}`;
    const method = options.method || 'GET';

    try {
      // Step 1: Initial request
      let response = await fetch(url, {
        method,
        headers: options.headers || {},
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      // Step 2: Handle 402 Payment Required
      if (response.status === 402) {
        const responseData = await response.json();
        
        // x402 server returns { accepts: PaymentRequirements[] } format
        let paymentRequirements: PaymentRequirements[];
        if (Array.isArray(responseData)) {
          // Direct array format
          paymentRequirements = responseData;
        } else if (responseData.accepts && Array.isArray(responseData.accepts)) {
          // Object with accepts field format
          paymentRequirements = responseData.accepts;
        } else {
          throw new Error('Invalid payment requirements format from server');
        }
        
        // Validate payment requirements
        if (!paymentRequirements || paymentRequirements.length === 0) {
          throw new Error('No payment requirements received from server');
        }
        
        const firstRequirement = paymentRequirements[0];
        if (!firstRequirement || !firstRequirement.payTo) {
          throw new Error('Invalid payment requirements: missing payTo field');
        }
        
        // Step 3: Create and sign payment payload
        const xPaymentHeader = await this.createPaymentPayload(
          firstRequirement, // Use first payment requirement
          this.walletClient!
        );

        // Step 4: Retry request with X-PAYMENT header
        response = await fetch(url, {
          method,
          headers: {
            ...(options.headers || {}),
            'X-PAYMENT': xPaymentHeader, // Base64 encoded payment payload
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Payment request failed:', response.status, errorText);
          throw new Error(`Payment request failed: ${response.status} - ${errorText}`);
        }

        // Step 5: Check settlement response header
        const settlementHeader = response.headers.get('X-PAYMENT-RESPONSE');
        console.log('📋 Response headers:', {
          'X-PAYMENT-RESPONSE': settlementHeader,
          'Access-Control-Expose-Headers': response.headers.get('Access-Control-Expose-Headers'),
          status: response.status,
        });

        if (settlementHeader) {
          try {
            const settlement: X402PaymentResponse = JSON.parse(
              Buffer.from(settlementHeader, 'base64').toString()
            );
            console.log('✅ Payment settled:', settlement);
            
            if (!settlement.transaction) {
              console.warn('⚠️ Settlement response missing transaction hash:', settlement);
            }
            
            // Return settlement info including transaction hash
            const data = await response.json();
            return {
              ...data,
              settlement: {
                transaction: settlement.transaction,
                network: settlement.network,
                payer: settlement.payer,
              },
            };
          } catch (parseError) {
            console.error('❌ Failed to parse settlement header:', parseError);
            console.error('Raw settlement header:', settlementHeader);
            throw new Error(`Failed to parse settlement response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
          }
        } else {
          // Settlement header not present - this might mean settlement failed or is pending
          console.warn('⚠️ No X-PAYMENT-RESPONSE header found. Settlement may have failed or is pending.');
          const data = await response.json();
          return {
            ...data,
            settlement: null, // Explicitly mark as no settlement
          };
        }
      } else if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('x402 request error:', error);
      throw error;
    }
  }

  /**
   * Create and sign payment payload using EIP-3009 TransferWithAuthorization
   * 
   * @param requirements - Payment requirements from server
   * @param walletClient - Wallet client for signing
   * @returns Signed payment payload (encoded as Base64)
   */
  private async createPaymentPayload(
    requirements: PaymentRequirements,
    walletClient: WalletClient
  ): Promise<string> {
    if (!walletClient.account) {
      throw new Error('Wallet account not available');
    }

    // Validate requirements
    if (!requirements.payTo) {
      throw new Error('Payment requirements missing payTo field');
    }
    if (!requirements.maxAmountRequired) {
      throw new Error('Payment requirements missing maxAmountRequired field');
    }
    if (!requirements.asset) {
      throw new Error('Payment requirements missing asset field');
    }

    const from = walletClient.account.address;
    const to = requirements.payTo as Address;
    const value = BigInt(requirements.maxAmountRequired);
    
    // Generate random 32-byte nonce
    const nonceBytes = crypto.getRandomValues(new Uint8Array(32));
    const nonce = `0x${Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
    
    // Calculate validity timestamps
    const now = Math.floor(Date.now() / 1000);
    const validAfter = BigInt(now - 600); // 10 minutes before
    const validBefore = BigInt(now + (requirements.maxTimeoutSeconds || 3600));

    // Get ERC-20 token name and version from extra field
    const tokenName = requirements.extra?.name || 'USD Coin';
    const tokenVersion = requirements.extra?.version || '2';

    // Create EIP-712 typed data for EIP-3009 TransferWithAuthorization
    const domain = {
      name: tokenName,
      version: tokenVersion,
      chainId: getNetworkConfig().chainId,
      verifyingContract: requirements.asset as Address,
    };

    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };

    const message = {
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce,
    };

    // Sign the authorization
    const signature = await walletClient.signTypedData({
      account: walletClient.account,
      domain,
      types,
      primaryType: 'TransferWithAuthorization',
      message,
    });

    // Build payment payload according to x402 spec
    const paymentPayload = {
      x402Version: 1,
      scheme: requirements.scheme,
      network: requirements.network,
      payload: {
        signature,
        authorization: {
          from,
          to,
          value: value.toString(),
          validAfter: validAfter.toString(),
          validBefore: validBefore.toString(),
          nonce,
        },
      },
    };

    // Encode to Base64 for X-PAYMENT header
    return Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  }

  /**
   * Get payment requirements for an endpoint
   * 
   * @param endpoint - The endpoint path
   * @returns Payment requirements array
   */
  async getPaymentRequirements(endpoint: string): Promise<PaymentRequirements[]> {
    const url = `${this.serverUrl}${endpoint}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status === 402) {
      return await response.json();
    }

    throw new Error('Endpoint does not require payment');
  }
}

/**
 * Create x402 client instance
 */
export function createX402Client(walletClient: WalletClient | null = null): X402Client {
  return new X402Client(walletClient);
}

