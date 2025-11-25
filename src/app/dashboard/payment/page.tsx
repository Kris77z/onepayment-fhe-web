'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Code, Webhook, BarChart3, Settings, Zap, Lock, Loader2 } from "lucide-react";

// Type workaround for React version conflicts
const ZapIcon = Zap as any;
const CopyIcon = Copy as any;
const ExternalLinkIcon = ExternalLink as any;
const CodeIcon = Code as any;
const WebhookIcon = Webhook as any;
const BarChart3Icon = BarChart3 as any;
const SettingsIcon = Settings as any;
const LockIcon = Lock as any;
const Loader2Icon = Loader2 as any;
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FHEX402Payment } from '@/components/payment/fhe-x402-payment';
import { BalanceDisplay } from '@/components/payment/balance-display';
import { useEVMWallet } from '@/lib/evm-wallet-provider';
import { getX402Config } from '@/lib/config';
import { getJson, postJson } from '@/lib/api';

interface MerchantInfo {
  apiKey?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  defaultNetwork?: string;
  defaultCurrency?: string;
  defaultPaymentMode?: string;
  autoSettle?: boolean;
}

interface AnalyticsData {
  totalRevenue: number;
  totalPayments: number;
  successRate: number;
  revenueGrowth: number;
  paymentsGrowth: number;
  x402Percentage: number;
  fhePercentage: number;
}

export default function PaymentPage() {
  const { address, isConnected } = useEVMWallet();
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [defaultNetwork, setDefaultNetwork] = useState('base-sepolia');
  const [defaultCurrency, setDefaultCurrency] = useState('USDC');
  const [defaultPaymentMode, setDefaultPaymentMode] = useState('fhe');
  const [autoSettle, setAutoSettle] = useState(true);

  const config = getX402Config();
  const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gateway.payagent.com';

  useEffect(() => {
    loadMerchantInfo();
    loadAnalytics();
  }, []);

  const loadMerchantInfo = async () => {
    try {
      const info = await getJson<MerchantInfo>('/me/merchant');
      setMerchantInfo(info);
      setWebhookUrl(info.webhookUrl || '');
      setDefaultNetwork(info.defaultNetwork || 'base-sepolia');
      setDefaultCurrency(info.defaultCurrency || 'USDC');
      setDefaultPaymentMode(info.defaultPaymentMode || 'fhe');
      setAutoSettle(info.autoSettle !== false);
    } catch (error) {
      console.error('Failed to load merchant info:', error);
      // Set defaults if API fails
      setMerchantInfo({
        apiKey: undefined,
        webhookUrl: '',
        webhookSecret: undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await getJson<AnalyticsData>('/me/dashboard/analytics?range=30d');
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Set defaults if API fails
      setAnalytics({
        totalRevenue: 0,
        totalPayments: 0,
        successRate: 0,
        revenueGrowth: 0,
        paymentsGrowth: 0,
        x402Percentage: 0,
        fhePercentage: 0,
      });
    }
  };

  const handleSaveWebhook = async () => {
    setSaving(true);
    try {
      await postJson('/me/merchant/webhook', { webhookUrl });
      toast.success('Webhook URL saved successfully');
      await loadMerchantInfo();
    } catch (error) {
      toast.error('Failed to save webhook URL');
      console.error('Failed to save webhook:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await postJson('/me/merchant/settings', {
        defaultNetwork,
        defaultCurrency,
        defaultPaymentMode,
        autoSettle,
      });
      toast.success('Settings saved successfully');
      await loadMerchantInfo();
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    if (!text || text.includes('xxx')) {
      toast.error(`${label} not available`);
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
        <div className="flex items-center justify-center py-20">
                    <Loader2Icon className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Payment Gateway</h1>
        <p className="text-sm text-muted-foreground">
          Enterprise-grade payment gateway powered by x402 + FHE. Accept crypto payments with zero gas fees and complete privacy.
        </p>
      </section>

      <Tabs defaultValue="integration" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="integration">
            <CodeIcon className="w-4 h-4 mr-2" />
            Integration
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <WebhookIcon className="w-4 h-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3Icon className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="test">
            <ZapIcon className="w-4 h-4 mr-2" />
            Test Payment
          </TabsTrigger>
          <TabsTrigger value="settings">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Integration Tab */}
        <TabsContent value="integration" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>API Integration</CardTitle>
                <CardDescription>
                  Integrate PayAgent Gateway into your application using our REST API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>API Base URL</Label>
                  <div className="flex gap-2">
                    <Input value={apiBaseUrl} readOnly />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(apiBaseUrl, 'API Base URL')}
                    >
                      <CopyIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={merchantInfo?.apiKey || 'Loading...'} 
                      readOnly 
                      type="password" 
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(merchantInfo?.apiKey || '', 'API Key')}
                      disabled={!merchantInfo?.apiKey}
                    >
                      <CopyIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Keep your API key secure. Never expose it in client-side code.
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="font-medium mb-2 text-sm">Quick Start</h4>
                  <pre className="text-xs overflow-x-auto">
{`// Create a payment request
const response = await fetch('${apiBaseUrl}/api/v1/payments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${merchantInfo?.apiKey || 'YOUR_API_KEY'}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: '10.00',
    currency: 'USDC',
    network: 'base-sepolia',
    useFHE: true,
    metadata: {
      orderId: 'ORDER_123',
      description: 'Product purchase'
    }
  })
});

const payment = await response.json();
// Redirect user to payment.url`}
                  </pre>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <a href="https://docs.payagent.com/api" target="_blank" rel="noopener noreferrer">
                      <ExternalLinkIcon className="w-4 h-4 mr-2" />
                      API Documentation
                    </a>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleCopy(merchantInfo?.apiKey || '', 'API Key')}
                    disabled={!merchantInfo?.apiKey}
                  >
                    <CopyIcon className="w-4 h-4 mr-2" />
                    Copy API Key
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SDK Integration</CardTitle>
                <CardDescription>
                  Use our SDK for easier integration in your preferred language
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">JavaScript/TypeScript</span>
                      <Badge variant="secondary">Recommended</Badge>
                    </div>
                    <pre className="text-xs overflow-x-auto">
{`npm install @payagent/gateway-sdk

import { PayAgentGateway } from '@payagent/gateway-sdk';

const gateway = new PayAgentGateway({
  apiKey: '${merchantInfo?.apiKey || 'YOUR_API_KEY'}',
  network: 'base-sepolia'
});

const payment = await gateway.createPayment({
  amount: '10.00',
  currency: 'USDC',
  useFHE: true
});`}
                    </pre>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">Python</span>
                    </div>
                    <pre className="text-xs overflow-x-auto">
{`pip install payagent-gateway

from payagent import Gateway

gateway = Gateway(api_key='${merchantInfo?.apiKey || 'YOUR_API_KEY'}')

payment = gateway.create_payment(
    amount='10.00',
    currency='USDC',
    use_fhe=True
)`}
                    </pre>
                  </div>
                </div>

                <Button variant="outline" className="w-full" asChild>
                  <a href="https://docs.payagent.com/sdk" target="_blank" rel="noopener noreferrer">
                    <ExternalLinkIcon className="w-4 h-4 mr-2" />
                    View All SDKs
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Features</CardTitle>
              <CardDescription>
                Key features of PayAgent Gateway
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <ZapIcon className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm mb-1">Gasless Payments</h4>
                    <p className="text-xs text-muted-foreground">
                      Powered by x402 protocol. Users pay zero gas fees while Facilitator sponsors transactions.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <LockIcon className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm mb-1">Confidential Payments</h4>
                    <p className="text-xs text-muted-foreground">
                      FHE encryption ensures payment amounts remain private throughout the entire process.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <BarChart3Icon className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm mb-1">Real-time Analytics</h4>
                    <p className="text-xs text-muted-foreground">
                      Track payments, revenue, and user activity with comprehensive analytics dashboard.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <WebhookIcon className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm mb-1">Webhook Events</h4>
                    <p className="text-xs text-muted-foreground">
                      Receive real-time notifications for payment events via secure webhooks.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Configure webhooks to receive real-time payment notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-domain.com/webhook"
                  />
                  <Button onClick={handleSaveWebhook} disabled={saving}>
                    {saving ? <Loader2Icon className="w-4 h-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your server endpoint that will receive webhook events
                </p>
              </div>

              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <div className="flex gap-2">
                  <Input 
                    value={merchantInfo?.webhookSecret || 'Not configured'} 
                    readOnly 
                    type="password" 
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(merchantInfo?.webhookSecret || '', 'Webhook Secret')}
                    disabled={!merchantInfo?.webhookSecret}
                  >
                    <CopyIcon className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this secret to verify webhook signatures
                </p>
              </div>

              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="font-medium mb-2 text-sm">Webhook Events</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">payment.created</Badge>
                    <span className="text-muted-foreground">When a payment is created</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">payment.completed</Badge>
                    <span className="text-muted-foreground">When a payment is successfully completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">payment.failed</Badge>
                    <span className="text-muted-foreground">When a payment fails</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">payment.refunded</Badge>
                    <span className="text-muted-foreground">When a payment is refunded</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2 text-sm">Example Webhook Handler</h4>
                <pre className="text-xs overflow-x-auto">
{`import crypto from 'crypto';

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-payagent-signature'];
  const payload = JSON.stringify(req.body);
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = req.body;
  switch (event.type) {
    case 'payment.completed':
      // Update order status in your database
      break;
    case 'payment.failed':
      // Handle failed payment
      break;
  }
  
  res.status(200).send('OK');
});`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Revenue</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {analytics ? formatCurrency(analytics.totalRevenue) : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {analytics && analytics.revenueGrowth > 0 ? (
                    <span className="text-green-600">+{analytics.revenueGrowth.toFixed(1)}%</span>
                  ) : analytics && analytics.revenueGrowth < 0 ? (
                    <span className="text-red-600">{analytics.revenueGrowth.toFixed(1)}%</span>
                  ) : (
                    <span>No change</span>
                  )} from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Payments</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {analytics ? formatNumber(analytics.totalPayments) : '0'}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {analytics && analytics.paymentsGrowth > 0 ? (
                    <span className="text-green-600">+{analytics.paymentsGrowth.toFixed(1)}%</span>
                  ) : analytics && analytics.paymentsGrowth < 0 ? (
                    <span className="text-red-600">{analytics.paymentsGrowth.toFixed(1)}%</span>
                  ) : (
                    <span>No change</span>
                  )} from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Success Rate</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {analytics ? `${analytics.successRate.toFixed(1)}%` : '0%'}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Payment completion rate
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Methods Breakdown</CardTitle>
              <CardDescription>Distribution of payment types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ZapIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm">x402 Gasless Payments</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${analytics?.x402Percentage || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {analytics ? `${analytics.x402Percentage.toFixed(0)}%` : '0%'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LockIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm">FHE Confidential Payments</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${analytics?.fhePercentage || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {analytics ? `${analytics.fhePercentage.toFixed(0)}%` : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Payment Tab */}
        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Payment</CardTitle>
              <CardDescription>
                Test the payment flow with a sample transaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isConnected ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your wallet to test payments
                  </p>
                  <Button>Connect Wallet</Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-6">
                    <FHEX402Payment
                      endpoint="/api/premium"
                      description="Test Payment - $0.01 USDC"
                      onPaymentSuccess={(txHash) => {
                        toast.success('Payment successful!', {
                          description: `Transaction: ${txHash.slice(0, 10)}...`,
                        });
                        loadAnalytics();
                      }}
                    />
                  </div>
                  <div className="space-y-6">
                    <BalanceDisplay />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gateway Settings</CardTitle>
              <CardDescription>
                Configure your payment gateway preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Network</Label>
                <select 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={defaultNetwork}
                  onChange={(e) => setDefaultNetwork(e.target.value)}
                >
                  <option value="base-sepolia">Base Sepolia (Testnet)</option>
                  <option value="base">Base (Mainnet)</option>
                  <option value="polygon">Polygon</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Default Currency</Label>
                <select 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                >
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Default Payment Mode</Label>
                <select 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={defaultPaymentMode}
                  onChange={(e) => setDefaultPaymentMode(e.target.value)}
                >
                  <option value="fhe">FHE Confidential (Recommended)</option>
                  <option value="x402">x402 Gasless Only</option>
                  <option value="both">Both (User Choice)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-medium text-sm">Auto-settle Payments</h4>
                  <p className="text-xs text-muted-foreground">
                    Automatically settle payments when received
                  </p>
                </div>
                <input 
                  type="checkbox" 
                  checked={autoSettle}
                  onChange={(e) => setAutoSettle(e.target.checked)}
                  className="w-4 h-4" 
                />
              </div>

              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
