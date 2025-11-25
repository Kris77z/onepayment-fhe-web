'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FormEvent, useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  createQuote,
  createSession,
  settlePayment,
  QuoteData,
  SessionData,
  config
} from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { buildAndSignPaymentRequest, fetchFacilitatorConfig, type FacilitatorConfig } from '@/lib/payment-signer';
import { useToast } from '@/hooks/use-toast';
import { encryptAmount, checkFHEHealth, FHEError } from '@/lib/fhe-utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const MIN_AMOUNT_USDC = 0.01;
const USDC_DECIMALS = 6;

export default function PayPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState('10');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [facilitatorConfig, setFacilitatorConfig] = useState<FacilitatorConfig | null>(null);
  const [useFHE, setUseFHE] = useState(false);
  const [fheCiphertext, setFheCiphertext] = useState<string | null>(null);
  const [isFHEAvailable, setIsFHEAvailable] = useState<boolean | null>(null);
  
  const quoteMutation = useMutation({ mutationFn: createQuote });
  const sessionMutation = useMutation({ mutationFn: createSession });
  const settleMutation = useMutation({ 
    mutationFn: async ({ sessionId, paymentRequest }: { sessionId: string; paymentRequest: unknown }) => {
      return await settlePayment(sessionId, paymentRequest);
    }
  });

  const quote = quoteMutation.data;
  const session = sessionMutation.data;
  const hasQuote = Boolean(quote);

  // 检查 FHE 服务可用性
  useEffect(() => {
    const checkFHE = async () => {
      try {
        const healthy = await checkFHEHealth();
        setIsFHEAvailable(healthy);
      } catch (error) {
        setIsFHEAvailable(false);
      }
    };
    checkFHE();
  }, []);

  // 获取 Facilitator 配置
  useEffect(() => {
    const loadFacilitatorConfig = async () => {
      try {
        const facilitatorConfig = await fetchFacilitatorConfig(config.facilitatorUrl);
        setFacilitatorConfig(facilitatorConfig);
      } catch (error) {
        console.error('Failed to load facilitator config:', error);
        toast.error('配置错误', '无法加载 Facilitator 配置');
      }
    };
    loadFacilitatorConfig();
  }, [toast]);

  async function handleEncryptAmount() {
    if (!useFHE || !amount) return;
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    try {
      const ciphertext = await encryptAmount(amountNum);
      setFheCiphertext(ciphertext);
      toast.success('金额已加密', '使用 FHE 加密保护支付金额隐私');
    } catch (error) {
      if (error instanceof FHEError) {
        toast.error('加密失败', error.message);
      }
    }
  }

  async function handleQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number.parseFloat(amount);
    if (Number.isNaN(parsed) || parsed < MIN_AMOUNT_USDC) {
      setValidationError(`金额需大于等于 ${MIN_AMOUNT_USDC} USDC`);
      quoteMutation.reset();
      return;
    }
    setValidationError(null);
    const minorUnits = Math.round(parsed * Math.pow(10, USDC_DECIMALS));
    quoteMutation.reset();
    sessionMutation.reset();
    await quoteMutation.mutateAsync({ amount: minorUnits, currency: 'USDC' });
  }

  async function handleCreateSession(quoteData: QuoteData) {
    try {
      // Encrypt amount if FHE is enabled
      let ciphertext: string | undefined;
      if (useFHE && !fheCiphertext) {
        try {
          const amountNum = parseFloat(amount);
          if (!isNaN(amountNum) && amountNum > 0) {
            ciphertext = await encryptAmount(amountNum);
            setFheCiphertext(ciphertext);
          }
        } catch (error) {
          toast.error('加密失败', error instanceof FHEError ? error.message : '无法加密金额');
          return;
        }
      } else if (useFHE && fheCiphertext) {
        ciphertext = fheCiphertext;
      }

      const payload = {
        amount: quoteData.inputAmount,
        currency: 'USDC' as const,
        quoteId: quoteData.quoteId,
        fheCiphertext: ciphertext,
        useFHE: useFHE && !!ciphertext,
      };
      await sessionMutation.mutateAsync(payload);
    } catch (error) {
      toast.error('创建失败', error instanceof Error ? error.message : '无法创建支付会话');
    }
  }

  async function handleSignAndSettle(sessionData: SessionData) {
    if (!wallet.connected || !wallet.publicKey || !wallet.signTransaction) {
      setVisible(true);
      return;
    }

    if (!facilitatorConfig) {
      toast.error('配置错误', 'Facilitator 配置未加载');
      return;
    }

    try {
      toast.info('签名中', '请在你的钱包中确认交易签名');
      
      const paymentRequest = await buildAndSignPaymentRequest(
        connection,
        wallet,
        sessionData,
        sessionData.quote?.inputAmount || 0,
        facilitatorConfig
      );

      toast.info('结算中', '正在提交支付请求到 Facilitator');
      
      const txSignature = await settleMutation.mutateAsync({
        sessionId: sessionData.sessionId,
        paymentRequest
      });

      if (txSignature) {
        toast.success('支付成功', `交易签名: ${txSignature.slice(0, 8)}...`);
      } else {
        toast.success('支付已提交', '交易正在处理中，请稍后查看结果');
      }
    } catch (error) {
      console.error('Payment signing error:', error);
      toast.error('支付失败', error instanceof Error ? error.message : '签名或结算过程中出错');
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">创建支付流程</h1>
        <p className="text-sm text-muted-foreground">
          输入 USDC 金额 → 获取报价 → 创建支付会话 → 连接钱包并签名 → 完成支付
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Step 1 · 获取报价</CardTitle>
          <CardDescription>金额以 USDC 计价，系统会自动转换为 6 位小数的最小单位。</CardDescription>
        </CardHeader>
        <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleQuote}>
          <div className="flex-1 space-y-2">
            <Input
              aria-label="USDC amount"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setFheCiphertext(null);
              }}
              placeholder="例如 10.5"
              inputMode="decimal"
            />
            {isFHEAvailable && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="use-fhe"
                  checked={useFHE}
                  onCheckedChange={(checked: boolean) => {
                    setUseFHE(checked);
                    setFheCiphertext(null);
                    if (checked) {
                      handleEncryptAmount();
                    }
                  }}
                />
                <Label htmlFor="use-fhe" className="text-sm cursor-pointer">
                  使用 FHE 加密保护金额隐私
                </Label>
              </div>
            )}
            {fheCiphertext && (
              <p className="text-xs text-muted-foreground">
                ✅ 金额已加密: {fheCiphertext.substring(0, 20)}...
              </p>
            )}
          </div>
          <Button type="submit" disabled={quoteMutation.isPending}>
            {quoteMutation.isPending ? '获取中...' : '获取报价'}
          </Button>
        </form>
        {quoteMutation.isError ? (
          <p className="mt-3 text-sm text-destructive">
            {quoteMutation.error instanceof Error
              ? quoteMutation.error.message
              : '无法获取报价'}
          </p>
        ) : null}
        {validationError ? (
          <p className="mt-3 text-sm text-destructive">{validationError}</p>
        ) : null}
        {hasQuote ? <QuoteSummary quote={quote!} /> : null}
        {hasQuote ? (
          <CardFooter>
            <Button
              onClick={() => handleCreateSession(quote!)}
              disabled={sessionMutation.isPending}
            >
              {sessionMutation.isPending ? '创建中…' : '创建支付会话'}
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      {session ? (
        <SessionCard 
          session={session} 
          onSignAndSettle={handleSignAndSettle}
          isWalletConnected={wallet.connected}
          isSettling={settleMutation.isPending}
        />
      ) : null}
    </main>
  );
}

function QuoteSummary({ quote }: { quote: QuoteData }) {
  return (
    <section className="mt-4 space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
      <h2 className="font-medium text-foreground">报价详情</h2>
      <p className="text-muted-foreground">
        兑换率 {quote.rate.toFixed(6)}，相当于{' '}
        <strong>{formatCurrency(quote.quotedAmountUsd)}</strong>。报价来源：
        <span className="ml-1 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-wide">
          {quote.rateSource}
        </span>
      </p>
      <p className="text-xs text-muted-foreground">
        Quote ID: {quote.quoteId} · 有效期至 {new Date(quote.quoteExpiresAt).toLocaleString()}
      </p>
    </section>
  );
}

function SessionCard({ 
  session, 
  onSignAndSettle,
  isWalletConnected,
  isSettling
}: { 
  session: SessionData;
  onSignAndSettle: (session: SessionData) => void;
  isWalletConnected: boolean;
  isSettling: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2 · 支付会话已创建</CardTitle>
        <CardDescription>连接 Solana 钱包并签名完成支付。</CardDescription>
      </CardHeader>
      <dl className="space-y-3 text-sm text-foreground">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Session ID</dt>
          <dd className="font-mono">{session.sessionId}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
            Facilitator Endpoint
          </dt>
          <dd className="font-mono">{session.facilitatorUrl || config.facilitatorUrl}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Merchant Address</dt>
          <dd className="font-mono">{session.merchantAddress}</dd>
        </div>
        {session.quote ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Session Quote</dt>
            <dd>
              {formatCurrency(session.quote.quotedAmountUsd)} @ {session.quote.rate.toFixed(6)} (
              expires {new Date(session.quote.quoteExpiresAt).toLocaleString()})
            </dd>
          </div>
        ) : null}
      </dl>
      <CardFooter className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <Button 
            onClick={() => onSignAndSettle(session)}
            disabled={isSettling || !isWalletConnected}
          >
            {isSettling 
              ? '处理中...' 
              : isWalletConnected 
                ? '签名并支付' 
                : '连接钱包'}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/result/${session.sessionId}`}>查看结果页</Link>
          </Button>
        </div>
        {!isWalletConnected && (
          <p className="text-xs text-muted-foreground">
            请先连接 Solana 钱包（Phantom 或 Solflare）
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
