'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import { 
  IconShield, 
  IconBell, 
  IconKey, 
  IconCopy, 
  IconEye, 
  IconEyeOff,
  IconPlus,
  IconTrash,
  IconRefresh,
  IconMail,
  IconBrowserCheck,
  IconExchange,
  IconAlertTriangle,
  IconBulb,
  IconLock
} from "@tabler/icons-react";
import { postJson, getJson } from "@/lib/api";

// Types
type MerchantPreferences = {
  email?: boolean
  push?: boolean
  trading?: boolean
  security?: boolean
  news?: boolean
  totp_enabled?: boolean
  timezone?: string
  currency?: string
}

type MerchantInfo = {
  id: string
  name: string
  api_key_masked: string
  webhook_url: string
  fee_bps: number
  status: string
  preferences?: MerchantPreferences
}

type FailedWebhookItem = { id: string; targetUrl: string; status: string; lastError?: string; updatedAt: string }

type ApiError = Error & { status?: number; data?: { error?: string } }

export function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: true,
    trading: true,
    security: true,
    news: false,
  });


  // Merchant basics (server-managed)
  const [merchantLoading, setMerchantLoading] = useState(false)
  const [merchant, setMerchant] = useState<null | MerchantInfo>(null)
  const [overrideApiKey, setOverrideApiKey] = useState<string>('')
  const [newApiKey, setNewApiKey] = useState<string>('')
  const [webhookUrl, setWebhookUrl] = useState<string>('')
  const [failedWebhooks, setFailedWebhooks] = useState<Array<FailedWebhookItem>>([])
  const [failedLoading, setFailedLoading] = useState(false)
  const [totpSetup, setTotpSetup] = useState<{ otpauth?: string; qrcode_data_url?: string; secret_base32?: string }|null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpError, setTotpError] = useState('')

  const handleNotificationChange = async (key: string, value: boolean) => {
    const next = { ...notifications, [key]: value }
    setNotifications(next)
    try{ await postJson(`/api/merchant/preferences`, { [key]: value }, { headers: apiHeaders() }) }catch{}
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Add toast notification
  };


  // API Quickstart envs (dev convenience)
  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '')
  const MERCHANT_ID = process.env.NEXT_PUBLIC_MERCHANT_ID || ''
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY || ''
  const maskedKey = API_KEY ? `${API_KEY.slice(0,4)}••••••••${API_KEY.slice(-4)}` : ''
  const base = API_BASE || 'http://localhost:3002'
  const MERCHANT_PLACEHOLDER = MERCHANT_ID || '<YOUR_MERCHANT_ID>'
  const APIKEY_PLACEHOLDER = API_KEY || '<YOUR_API_KEY>'
  const EVM_DEFAULT_RECEIVER = '0x2f28db7b3a6f62f0c425f0196db2dfea29d824a0'
  const SOL_DEFAULT_RECEIVER = 'DVgDzRZpwM4iNbMihUiTyhy6FVE6SBYeSGiXqtaSpcST'
  const curlCreateOrder = `curl -X POST ${base}/api/orders \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-Key: ${APIKEY_PLACEHOLDER}' \\
  -d '{"id":"ORDER_001","chain":"bsc-testnet","token_symbol":"USDT","token_address":"0x337610d27c682E347C9cD60BD4b3b107C9d34dDd","decimals":18,"expected_amount":"20.00"}'`
  const nodeCreateOrder = `const res = await fetch('${base}/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': '${APIKEY_PLACEHOLDER}' }, body: JSON.stringify({ id: 'ORDER_001', chain: 'bsc-testnet', token_symbol: 'USDT', token_address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', decimals: 18, expected_amount: '20.00' }) });\nconst data = await res.json();\nconsole.log(data);`

  // Payment URL Generator state
  const [genChain, setGenChain] = useState('bsc-testnet')
  const [genToken, setGenToken] = useState<'USDT'|'USDC'>('USDT')
  const [genAmount, setGenAmount] = useState('20.00')
  const [genFixed, setGenFixed] = useState(true)
  const [genResult, setGenResult] = useState<{pay_url?:string;deep_link?:string;qrcode_text?:string;error?:string}|null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [orderExpiryMin, setOrderExpiryMin] = useState<number>(15)

  // Chain configs with logos
  const chainConfigs = {
    'bsc': { name: 'BSC', logo: '/images/bsc-chain.png' },
    'arbitrum': { name: 'Arbitrum', logo: '/images/arb-chain.png' },
    'ethereum': { name: 'Ethereum', logo: '/images/eth-chian.png' },
    'solana': { name: 'Solana', logo: '/images/sol-chain.png' }
  }
  
  // Token configs with logos
  const tokenConfigs = {
    'USDT': { name: 'USDT', logo: '/images/usdt.png' },
    'USDC': { name: 'USDC', logo: '/images/usdc.png' }
  }


  async function handleGenerate(){
    try{
      setGenLoading(true)
      setGenResult(null)
      const body = {
        id: `DEMO_${Date.now()}`,
        chain: genChain,
        token_symbol: genToken,
        expected_amount: genAmount,
        // Default expiry time (minutes)
        deadline: Math.floor(Date.now()/1000 + Math.max(1, orderExpiryMin)*60)
      }
      const resp = await postJson<{pay_url?: string; deep_link?: string; qrcode_text?: string}>(`/api/orders`, body, { headers: apiHeaders() })
      setGenResult({ pay_url: resp?.pay_url, deep_link: resp?.deep_link, qrcode_text: resp?.qrcode_text })
    }catch(e: unknown){
      const err = e as ApiError
      const errorMessage = err?.data?.error || (e as Error)?.message || 'Generate failed'
      setGenResult({ error: errorMessage })
    }finally{
      setGenLoading(false)
    }
  }

  // Helpers
  function apiHeaders(): Record<string, string> {
    return overrideApiKey ? { 'X-API-Key': overrideApiKey } : {}
  }

  async function loadMerchant(){
    try{
      setMerchantLoading(true)
      const data = await getJson<MerchantInfo>(`/api/merchant/self`, { headers: apiHeaders() })
      setMerchant(data)
      setWebhookUrl(data?.webhook_url || '')
      if(data?.preferences){ setNotifications((prev)=>({ ...prev, ...data.preferences })) }
    }catch{
      // ignore
    }finally{
      setMerchantLoading(false)
    }
  }

  async function loadFailedWebhooks(){
    try{
      setFailedLoading(true)
      const res = await getJson<{ items: Array<FailedWebhookItem> }>(`/api/webhooks/failed`, { headers: apiHeaders() })
      setFailedWebhooks(res?.items || [])
    }catch{
      setFailedWebhooks([])
    }finally{
      setFailedLoading(false)
    }
  }

  useEffect(()=>{
    // load override from session storage if present
    try{ const s = sessionStorage.getItem('onepay_override_api_key'); if(s) setOverrideApiKey(s) }catch{}
    loadMerchant(); loadFailedWebhooks();
  },[])

  async function rotateApiKey(){
    try{
      const res = await postJson<{ api_key:string }>(`/api/merchant/api-keys/rotate`, {}, { headers: apiHeaders() })
      if(res?.api_key){
        setNewApiKey(res.api_key)
        setOverrideApiKey(res.api_key)
        await loadMerchant()
      }
    }catch{}
  }

  async function saveWebhook(){
    try{
      await postJson(`/api/merchant/webhook`, { webhook_url: webhookUrl }, { headers: apiHeaders() })
      await loadMerchant()
    }catch{}
  }

  async function testWebhook(){
    try{
      await postJson(`/api/merchant/webhook/test`, {}, { headers: apiHeaders() })
      await loadFailedWebhooks()
    }catch{}
  }

  // 2FA handlers
  async function setup2FA(){
    setTotpError(''); setTotpLoading(true)
    try{
      const res = await postJson<{ otpauth:string; qrcode_data_url:string; secret_base32?: string }>(`/api/merchant/2fa/setup`, {}, { headers: apiHeaders() })
      setTotpSetup(res)
    }catch(e: unknown){
      const err = e as ApiError
      const m = err?.data?.error || (e as Error)?.message || 'Setup failed'
      setTotpError(String(m))
    }finally{ setTotpLoading(false) }
  }
  async function verify2FA(){
    setTotpError(''); setTotpLoading(true)
    try{
      await postJson(`/api/merchant/2fa/verify`, { code: totpCode }, { headers: apiHeaders() })
      setTotpSetup(null); setTotpCode(''); await loadMerchant()
    }catch(e: unknown){
      const err = (e as ApiError)
      const m = err?.data?.error || (e as Error)?.message || 'Verify failed'
      setTotpError(String(m))
    }finally{ setTotpLoading(false) }
  }
  async function disable2FA(){
    setTotpError(''); setTotpLoading(true)
    try{ await postJson(`/api/merchant/2fa/disable`, {}, { headers: apiHeaders() }); await loadMerchant() }
    catch(e: unknown){ const err=(e as ApiError); const m= err?.data?.error||(e as Error)?.message||'Disable failed'; setTotpError(String(m)) } 
    finally{ setTotpLoading(false) }
  }
  async function retryWebhook(id: string){
    try{
      await postJson(`/api/webhooks/${encodeURIComponent(id)}/retry`, {}, { headers: apiHeaders() })
      await loadFailedWebhooks()
    }catch{}
  }

  return (
    <div className="flex justify-center">
      <div className="space-y-6 max-w-4xl w-full">

      <Tabs defaultValue="api" className="w-full space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="api">
            <IconKey className="mr-2 h-4 w-4" />
            API
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <IconBell className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
        </TabsList>


        {/* General Settings */}
        <TabsContent value="notifications" className="space-y-6 mt-4">
          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconMail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">Receive important updates via email</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notifications.email}
                      onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconBrowserCheck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Browser push</p>
                        <p className="text-sm text-muted-foreground">Receive push notifications in your browser</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notifications.push}
                      onCheckedChange={(checked) => handleNotificationChange('push', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Notification types */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-medium">Notification types</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconExchange className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Transaction updates</p>
                        <p className="text-sm text-muted-foreground">Completed, failed, and status updates</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notifications.trading}
                      onCheckedChange={(checked) => handleNotificationChange('trading', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconAlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Security alerts</p>
                        <p className="text-sm text-muted-foreground">Login activity and security notices</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notifications.security}
                      onCheckedChange={(checked) => handleNotificationChange('security', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconBulb className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Product updates</p>
                        <p className="text-sm text-muted-foreground">New features and announcements</p>
                      </div>
                    </div>
                    <Switch 
                      checked={notifications.news}
                      onCheckedChange={(checked) => handleNotificationChange('news', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-medium">Two-factor authentication</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconLock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Authenticator app</p>
                        <p className="text-sm text-muted-foreground">Use Google Authenticator or other apps</p>
                      </div>
                    </div>
                    <Switch 
                      checked={Boolean(merchant?.preferences?.totp_enabled)}
                      onCheckedChange={(checked) => {
                        if (checked && !merchant?.preferences?.totp_enabled) {
                          setup2FA()
                        } else if (!checked && merchant?.preferences?.totp_enabled) {
                          disable2FA()
                        }
                      }}
                      disabled={totpLoading}
                    />
                  </div>
                  {!merchant?.preferences?.totp_enabled && totpSetup && (
                    <div className="space-y-3 pl-0">
                      {totpSetup.qrcode_data_url && (
                        <img src={totpSetup.qrcode_data_url} alt="TOTP QR" className="w-40 h-40" />
                      )}
                      {totpSetup.secret_base32 && (
                        <div className="text-xs">
                          <div className="text-muted-foreground mb-1">Or enter this key manually:</div>
                          <pre className="rounded border p-2 font-mono text-xs select-all inline-block">{totpSetup.secret_base32}</pre>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">Scan the QR with Google Authenticator / 1Password, then enter the 6-digit code.</div>
                      <div className="flex gap-2">
                        <Input value={totpCode} onChange={(e)=>setTotpCode(e.target.value)} placeholder="123456" className="w-40" />
                        <Button size="sm" onClick={verify2FA} disabled={totpLoading}>{totpLoading ? 'Verifying...' : 'Verify'}</Button>
                      </div>
                      {totpError && <div className="text-xs text-red-500">{totpError}</div>}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Settings */}
        <TabsContent value="api" className="space-y-6 mt-4">
          {/* Merchant & API Key */}
          <Card>
            <CardHeader>
              <CardTitle>Merchant & API Key</CardTitle>
              <CardDescription>Manage your merchant configuration and API keys (please update environment variables after rotation).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Merchant</div>
                  <div className="text-sm font-medium">{merchantLoading ? 'Loading...' : (merchant?.name || 'N/A')}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="text-sm font-medium">{merchant?.status || '-'}</div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <div className="text-sm font-medium">API Key (Read-only Masked)</div>
                  <div className="flex gap-2">
                    <Input value={merchant?.api_key_masked || maskedKey} readOnly className="font-mono" />
                    <Button variant="outline" size="sm" onClick={rotateApiKey}>
                      <IconRefresh className="h-4 w-4 mr-2" />Rotate
                    </Button>
                  </div>
                </div>
                {newApiKey && (
                  <div className="space-y-2 md:col-span-2">
                    <div className="text-sm font-medium">New API Key (One-time display, save immediately)</div>
                    <div className="flex gap-2">
                      <Input value={newApiKey} readOnly className="font-mono" />
                      <Button variant="outline" size="sm" onClick={()=>copyToClipboard(newApiKey)}>
                        <IconCopy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={()=>{ try{ sessionStorage.setItem('onepay_override_api_key', newApiKey); setOverrideApiKey(newApiKey) }catch{} }}>Use for this session</Button>
                      <div className="text-xs text-muted-foreground">Requests from this page will carry X-API-Key.</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Note: This page will use the new key for subsequent requests, but you still need to update it in your server/frontend environment variables.</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook</CardTitle>
              <CardDescription>Configure callback URL and send test events (with HMAC signature).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <div className="text-sm font-medium">Callback URL</div>
                  <div className="flex gap-2">
                    <Input value={webhookUrl} onChange={(e)=>setWebhookUrl(e.target.value)} placeholder="https://your.domain/webhook" />
                    <Button variant="outline" size="sm" onClick={saveWebhook}>Save</Button>
                    <Button size="sm" onClick={testWebhook}>Send Test</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Base URL</div>
                  <Input value={API_BASE} readOnly className="font-mono" />
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-medium">Merchant ID</div>
                  <Input value={MERCHANT_ID || 'Auto-bound to your account'} readOnly className="font-mono" />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <div className="text-sm font-medium">API Key (server-side only)</div>
                  <div className="flex gap-2">
                    <Input value={maskedKey} readOnly className="font-mono" />
                    <Button variant="outline" size="sm" onClick={()=>copyToClipboard(API_KEY)}><IconCopy className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="text-sm font-medium">cURL Example</div>
                  <pre className="rounded-lg border p-3 text-xs overflow-x-auto">{curlCreateOrder}</pre>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-medium">Node.js Example</div>
                  <pre className="rounded-lg border p-3 text-xs overflow-x-auto">{nodeCreateOrder}</pre>
                </div>
              </div>

              {/* Payment URL Generator */}
              <div className="space-y-3 pt-6 border-t">
                <h3 className="text-lg font-medium">Payment URL Generator</h3>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Chain</div>
                    <Select value={genChain} onValueChange={setGenChain}>
                      <SelectTrigger>
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <Image src={chainConfigs[genChain as keyof typeof chainConfigs]?.logo || '/images/bsc-chain.png'} alt={genChain} width={16} height={16} className="rounded-full" />
                            <span>{chainConfigs[genChain as keyof typeof chainConfigs]?.name || genChain}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(chainConfigs).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Image src={config.logo} alt={key} width={16} height={16} className="rounded-full" />
                              <span>{config.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Token</div>
                    <Select value={genToken} onValueChange={(v) => setGenToken(v as 'USDT'|'USDC')}>
                      <SelectTrigger>
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <Image src={tokenConfigs[genToken]?.logo || '/images/usdt.png'} alt={genToken} width={16} height={16} className="rounded-full" />
                            <span>{tokenConfigs[genToken]?.name || genToken}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(tokenConfigs).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Image src={config.logo} alt={key} width={16} height={16} className="rounded-full" />
                              <span>{config.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Amount</div>
                    <Input value={genAmount} onChange={(e)=>setGenAmount(e.target.value)} placeholder="20.00" />
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Order expiry (min)</div>
                    <Input type="number" value={orderExpiryMin} onChange={(e)=> setOrderExpiryMin(Math.max(1, Number(e.target.value||15)))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleGenerate} disabled={genLoading}>{genLoading ? 'Generating...' : 'Generate'}</Button>
                  {genResult?.pay_url && (
                    <Button variant="outline" onClick={()=>copyToClipboard(genResult.pay_url!)}><IconCopy className="h-4 w-4 mr-2" />Copy pay_url</Button>
                  )}
                </div>
                {genResult?.error && (
                  <div className="text-xs text-red-500">{genResult.error}</div>
                )}
                {(genResult?.pay_url || genResult?.deep_link) && (
                  <div className="grid md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-3">
                      <div className="text-sm font-medium">pay_url</div>
                      <pre className="rounded-lg border p-3 overflow-x-auto">{genResult?.pay_url}</pre>
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm font-medium">deep_link</div>
                      <pre className="rounded-lg border p-3 overflow-x-auto">{genResult?.deep_link}</pre>
                    </div>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
