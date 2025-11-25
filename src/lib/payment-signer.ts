import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { createTransferCheckedInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import type { WalletContextState } from '@solana/wallet-adapter-react';

const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const USDC_DECIMALS = 6;

export interface PaymentRequest {
  payload: {
    amount: string;
    recipient: string;
    resourceId: string;
    resourceUrl: string;
    nonce: string;
    timestamp: number;
    expiry: number;
  };
  signature: string;
  clientPublicKey: string;
  signedTransaction: string;
}

export interface FacilitatorConfig {
  feePayer: string;
  asset: string;
  payTo: string;
  decimals: number;
}

/**
 * 从 Facilitator /supported 端点获取支付配置
 */
export async function fetchFacilitatorConfig(facilitatorUrl: string): Promise<FacilitatorConfig> {
  const response = await fetch(`${facilitatorUrl}/supported`);
  if (!response.ok) {
    throw new Error(`Failed to fetch facilitator config: ${response.statusText}`);
  }
  const data = await response.json();
  const kind = data.kinds?.[0];
  if (!kind || !kind.extra) {
    throw new Error('Invalid facilitator config format');
  }
  return {
    feePayer: kind.extra.feePayer || '',
    asset: kind.extra.asset || USDC_MINT_DEVNET,
    payTo: kind.extra.payTo || '',
    decimals: kind.extra.decimals || USDC_DECIMALS,
  };
}

/**
 * 构建并签名 x402 Payment Request
 */
export async function buildAndSignPaymentRequest(
  connection: Connection,
  wallet: WalletContextState,
  session: {
    sessionId: string;
    merchantAddress: string;
    nonce: string;
    expiresAt: string;
    facilitatorUrl: string;
  },
  amount: number, // 原子单位
  facilitatorConfig: FacilitatorConfig
): Promise<PaymentRequest> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected or does not support signing');
  }

  const fromPubkey = wallet.publicKey;
  const toPubkey = new PublicKey(session.merchantAddress);
  const mintPubkey = new PublicKey(facilitatorConfig.asset);
  const feePayerPubkey = facilitatorConfig.feePayer 
    ? new PublicKey(facilitatorConfig.feePayer)
    : null;

  // 获取关联代币账户
  const fromTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    fromPubkey
  );

  const toTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    toPubkey
  );

  // 构建转账交易
  const transaction = new Transaction().add(
    createTransferCheckedInstruction(
      fromTokenAccount,
      mintPubkey,
      toTokenAccount,
      fromPubkey,
      BigInt(amount),
      facilitatorConfig.decimals
    )
  );

  // 设置手续费支付方
  if (feePayerPubkey) {
    transaction.feePayer = feePayerPubkey;
  }

  // 获取最新 blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  // 请求钱包签名
  const signedTransaction = await wallet.signTransaction(transaction);

  // 序列化已签名交易
  const serialized = signedTransaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  // 构造 Payment Request payload
  const timestamp = Date.now();
  const expiry = new Date(session.expiresAt).getTime();

  const payload = {
    amount: amount.toString(),
    recipient: session.merchantAddress,
    resourceId: `/api/payments/${session.sessionId}`,
    resourceUrl: `/api/payments/${session.sessionId}`,
    nonce: session.nonce,
    timestamp,
    expiry,
  };

  // 构造完整的 Payment Request
  const paymentRequest: PaymentRequest = {
    payload,
    signature: '', // x402 协议中，签名在 signedTransaction 中
    clientPublicKey: wallet.publicKey.toBase58(),
    signedTransaction: serialized.toString('base64'),
  };

  return paymentRequest;
}

