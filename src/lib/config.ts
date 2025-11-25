/**
 * Configuration for FHEVM + x402 Integration
 * Centralized configuration management
 */

export const config = {
  // FHEVM Relayer Configuration
  fhevm: {
    relayerUrl: process.env.NEXT_PUBLIC_FHEVM_RELAYER_URL || 'https://relayer.fhevm.org',
    gatewayUrl: process.env.NEXT_PUBLIC_FHEVM_GATEWAY_URL || 'https://gateway.fhevm.org',
  },

  // FHEVM Contract Addresses (Base Sepolia)
  contracts: {
    fhePaymentGateway: process.env.NEXT_PUBLIC_FHE_PAYMENT_GATEWAY_ADDRESS || '0x21834a2D140C4A2Ba31E88f1abF2e1E9b021625e',
    fheCounter: process.env.NEXT_PUBLIC_FHE_COUNTER_ADDRESS || '0x9104651690Fe3dcFfdD3c3972C42AE9a710C0748',
    usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },

  // Base Sepolia Network Configuration
  network: {
    rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10),
    name: 'base-sepolia',
  },

  // x402 Configuration
  x402: {
    serverUrl: process.env.NEXT_PUBLIC_X402_SERVER_URL || 'http://localhost:3001',
    facilitatorUrl: process.env.NEXT_PUBLIC_FACILITATOR_URL || 'https://facilitator.payai.network',
  },
} as const;

// Type-safe config getters
export function getFHEVMConfig() {
  return config.fhevm;
}

export function getContractAddresses() {
  return config.contracts;
}

export function getNetworkConfig() {
  return config.network;
}

export function getX402Config() {
  return config.x402;
}

