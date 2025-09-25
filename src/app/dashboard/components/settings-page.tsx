'use client';

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// removed Badge (no longer used after inline mode help)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Image from 'next/image'
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
  IconLock,
  IconClock
} from '@tabler/icons-react'
import { postJson, getJson, API_BASE } from '@/lib/api'
import { cn } from '@/lib/utils'

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
  api_key?: string
  webhook_url: string
  webhook_secret_preview?: string
  fee_bps: number
  status: string
  preferences?: MerchantPreferences
}

type FailedWebhookItem = { id: string; targetUrl: string; status: string; lastError?: string; updatedAt: string }

type ApiError = Error & { status?: number; data?: { error?: string } }

const formatRevealCountdown = (expiresAt: string) => {
  if (!expiresAt) return ''
  try {
    return formatDistanceToNow(new Date(expiresAt), { addSuffix: true })
  } catch {
    return ''
  }
}

export function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiCopyState, setApiCopyState] = useState<'idle' | 'copied'>('idle')
  const [webhookCopyState, setWebhookCopyState] = useState<'idle' | 'copied'>('idle')
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
  const [revealedApiKey, setRevealedApiKey] = useState<string>('')
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [webhookSecretPreview, setWebhookSecretPreview] = useState<string>('');
  const [revealedWebhookSecret, setRevealedWebhookSecret] = useState<string>('');
  const [webhookSecretExpiresAt, setWebhookSecretExpiresAt] = useState<string>('');
  const [webhookSaving, setWebhookSaving] = useState(false);
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

  const copyToClipboard = async (text: string, type: 'api' | 'webhook') => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'api') {
        setApiCopyState('copied')
        setTimeout(() => setApiCopyState('idle'), 2000)
      } else {
        setWebhookCopyState('copied')
        setTimeout(() => setWebhookCopyState('idle'), 2000)
      }
    } catch (error) {
      console.error('copy failed', error)
    }
  }
  async function handleToggleApiVisibility(){
    const next = !showApiKey
    if(next){
      try{
        // 如果已有明文（旋转产生的新 Key 或此前已揭示），直接展示
        if(revealedApiKey || newApiKey || overrideApiKey || merchant?.api_key){
          setShowApiKey(true)
          return
        }
        if(!API_BASE){
          try{ (await import('sonner')).toast?.error?.('后端未配置：请设置 NEXT_PUBLIC_API_BASE') }catch{}
          return
        }
        // 会话态揭示（无 2FA），由后端做冷却与审计
        const res = await postJson<{ api_key: string; expires_at?: string }>(`/me/merchant/api-key/reveal`, {})
        if(res?.api_key){ setRevealedApiKey(res.api_key); setShowApiKey(true); return }
      }catch(error){
        const err = error as ApiError
        const status = typeof err?.status === 'number' ? err.status : undefined
        const code = String(err?.data?.error || err?.message || 'RequestFailed')
        if(status === 401 || status === 403 || code.toUpperCase() === 'UNAUTHORIZED'){
          try{ (await import('sonner')).toast?.error?.('登录已过期，请重新登录') }catch{}
          try{ setTimeout(()=>{ window.location.href = `/auth?redirect=${encodeURIComponent(location.pathname)}` }, 1200) }catch{}
        }else{
          try{ (await import('sonner')).toast?.error?.(code) }catch{}
        }
        console.error('reveal failed', code)
      }
    }
    setShowApiKey(next)
  }

  // API Quickstart envs (dev convenience)
  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '')
  const MERCHANT_ID = ''
  const API_KEY: string = ''
  const maskedKey: string = API_KEY && API_KEY.length >= 8 ? `${API_KEY.slice(0,4)}••••••••${API_KEY.slice(-4)}` : ''
  const base = 'https://api.onepayment.pro/v1'
  const MERCHANT_PLACEHOLDER = MERCHANT_ID || '<YOUR_MERCHANT_ID>'
  const APIKEY_PLACEHOLDER = API_KEY || '<YOUR_API_KEY>'
  const EVM_DEFAULT_RECEIVER = '0x2f28db7b3a6f62f0c425f0196db2dfea29d824a0'
  const SOL_DEFAULT_RECEIVER = 'DVgDzRZpwM4iNbMihUiTyhy6FVE6SBYeSGiXqtaSpcST'

  // Builders: invoice (per-order) & static (long-lived)
  const buildCurlInvoice = (chain:string, token:string, amount:string)=>`curl -X POST ${base}/payment/invoices \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-Key: ${APIKEY_PLACEHOLDER}' \\
  -d '{"chain":"${chain}","token_symbol":"${token}","expected_amount":"${amount}"}'`
  const buildNodeInvoice = (chain:string, token:string, amount:string)=>`const BASE='${base}';\nconst API_KEY=process.env.ONEPAY_API_KEY;\nconst res = await fetch(\`${'${BASE}'}/payment/invoices\`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY }, body: JSON.stringify({ chain: '${'${chain}'}', token_symbol: '${'${token}'}', expected_amount: '${'${amount}'}' }) });\nconst data = await res.json();\n// { order_id, pay_url, qrcode_text, deep_link }\nconsole.log(data);`

  const buildCurlStatic = (chain:string, token:string, amount:string)=>`curl -X POST ${base}/payment/static \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-Key: ${APIKEY_PLACEHOLDER}' \\
  -d '{"chain":"${chain}","token_symbol":"${token}","amount":"${amount}"}'`
  const buildNodeStatic = (chain:string, token:string, amount:string)=>`const BASE='${base}';\nconst API_KEY=process.env.ONEPAY_API_KEY;\nconst res = await fetch(\`${'${BASE}'}/payment/static\`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY }, body: JSON.stringify({ chain: '${'${chain}'}', token_symbol: '${'${token}'}', amount: '${'${amount}'}' }) });\nconst data = await res.json();\n// { deep_link, qrcode_text }\nconsole.log(data);`
  const buildHtmlStatic = () => `<img src="${base}/payment/qr?text={URL_ENCODED_DEEP_LINK}" alt="Pay QR" width="256" height="256" />\n<!-- Replace {URL_ENCODED_DEEP_LINK} with encodeURIComponent(deep_link) on your server-side -->`

  // Payment URL Generator state
  const [genChain, setGenChain] = useState('bsc')
  const [genToken, setGenToken] = useState<'USDT'|'USDC'>('USDT')
  const [genAmount, setGenAmount] = useState('20.00')
  const [genResult, setGenResult] = useState<{curl?:string;node?:string;html?:string;error?:string}|null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [orderExpiryMin, setOrderExpiryMin] = useState<number>(15)
  const [genMode, setGenMode] = useState<'invoice'|'static'>('invoice')

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
    setGenLoading(true)
    setGenResult(null)
    try{
      if(genMode === 'invoice'){
        setGenResult({
          curl: buildCurlInvoice(genChain, genToken, genAmount),
          node: buildNodeInvoice(genChain, genToken, genAmount),
        })
      }else{
        setGenResult({
          curl: buildCurlStatic(genChain, genToken, genAmount),
          node: buildNodeStatic(genChain, genToken, genAmount),
          html: buildHtmlStatic(),
        })
      }
    }catch(e: unknown){
      const err = e as ApiError
      setGenResult({ error: err?.data?.error || (e as Error)?.message || 'Generate failed' })
    }finally{ setGenLoading(false) }
  }

  // Helpers
  function apiHeaders(): Record<string, string> {
    // 会话端点无需 API KEY；保留覆写选项以便开发联调
    return overrideApiKey ? { 'X-API-Key': overrideApiKey } : {}
  }

  async function loadMerchant(){
    try{
      setMerchantLoading(true)
      // 优先会话端点
      const data = await getJson<MerchantInfo>(overrideApiKey ? `/api/merchant/self` : `/me/merchant`, { headers: apiHeaders() })
      setMerchant(data)
      setWebhookUrl(data?.webhook_url || '')
      setWebhookSecretPreview(data?.webhook_secret_preview || '')
      setRevealedWebhookSecret('')
      setWebhookSecretExpiresAt('')
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
      const res = await postJson<{ api_key:string }>(overrideApiKey ? `/api/merchant/api-keys/rotate` : `/me/merchant/api-keys/rotate`, {}, { headers: apiHeaders() })
      if(res?.api_key){
        setNewApiKey(res.api_key)
        setOverrideApiKey(res.api_key)
        await loadMerchant()
      }
    }catch{}
  }

  async function saveWebhook(options?: { regenerate?: boolean }){
    try{
      setWebhookSaving(true)
      const payload: Record<string, unknown> = { webhook_url: webhookUrl }
      if(options?.regenerate){ payload.regenerate_secret = true }
      const res = await postJson<{ webhook_url: string; webhook_secret_preview?: string; webhook_secret?: string; expires_at?: string }>(
        overrideApiKey ? `/api/merchant/webhook-config` : `/me/merchant/webhook-config`,
        payload,
        { headers: apiHeaders() }
      )
      setWebhookUrl(res?.webhook_url || '')
      setWebhookSecretPreview(res?.webhook_secret_preview || '')
      if(res?.webhook_secret){
        setRevealedWebhookSecret(res.webhook_secret)
        setWebhookSecretExpiresAt(res.expires_at || '')
      }else{
        setRevealedWebhookSecret('')
        setWebhookSecretExpiresAt('')
      }
      try{ (await import('sonner')).toast?.success?.('Webhook settings saved') }catch{}
    }catch{}
    finally{ setWebhookSaving(false) }
  }

  async function revealWebhookSecret(){
    try{
      const res = await postJson<{ webhook_secret: string; expires_at?: string }>(overrideApiKey ? `/api/merchant/webhook-secret/reveal` : `/me/merchant/webhook-secret/reveal`, {}, { headers: apiHeaders() })
      setRevealedWebhookSecret(res?.webhook_secret || '')
      setWebhookSecretExpiresAt(res?.expires_at || '')
    }catch(error){
      const err = error as ApiError
      const code = err?.data?.error || err.message
      if(String(code).toUpperCase()==='UNAUTHORIZED'){
        toast.error('Unauthorized. Please login to reveal the secret.')
      }else if(String(code).toUpperCase()==='RATE_LIMITED'){
        toast.error('Please wait before revealing again.')
      }else{
        toast.error(code || 'Reveal failed')
      }
    }
  }

  // Copy helpers to always copy plaintext
  async function handleCopyApiKey(){
    try{
      let plain = revealedApiKey || newApiKey || overrideApiKey || merchant?.api_key
      if(!plain){
        const res = await postJson<{ api_key: string; expires_at?: string }>(`/me/merchant/api-key/reveal`, {})
        plain = res?.api_key
        if(plain){ setRevealedApiKey(plain); setShowApiKey(true) }
      }
      if(plain){ await copyToClipboard(plain, 'api'); toast.success('API Key copied') }
      else{ toast.error('Click the eye icon to reveal first') }
    }catch(e: unknown){ const err = e as Error; toast.error(err?.message||'Copy failed') }
  }

  async function handleCopyWebhookSecret(){
    try{
      let plain = revealedWebhookSecret
      if(!plain){ await revealWebhookSecret(); plain = revealedWebhookSecret }
      if(plain){ await copyToClipboard(plain, 'webhook'); toast.success('Webhook secret copied') }
      else{ toast.error('Click the eye icon to reveal first') }
    }catch(e: unknown){ const err = e as Error; toast.error(err?.message||'Copy failed') }
  }

  async function testWebhook(){
    try{
      await postJson(overrideApiKey ? `/api/merchant/webhook/test` : `/me/merchant/webhook/test`, {}, { headers: apiHeaders() })
      await loadFailedWebhooks()
    }catch{}
  }

  // 2FA handlers
  async function setup2FA(){
    setTotpError(''); setTotpLoading(true)
    try{
      const res = await postJson<{ otpauth:string; qrcode_data_url:string; secret_base32?: string }>(overrideApiKey ? `/api/merchant/2fa/setup` : `/me/merchant/2fa/setup`, {}, { headers: apiHeaders() })
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
      await postJson(overrideApiKey ? `/api/merchant/2fa/verify` : `/me/merchant/2fa/verify`, { code: totpCode }, { headers: apiHeaders() })
      setTotpSetup(null); setTotpCode(''); await loadMerchant()
    }catch(e: unknown){
      const err = (e as ApiError)
      const m = err?.data?.error || (e as Error)?.message || 'Verify failed'
      setTotpError(String(m))
    }finally{ setTotpLoading(false) }
  }
  async function disable2FA(){
    setTotpError(''); setTotpLoading(true)
    try{ await postJson(overrideApiKey ? `/api/merchant/2fa/disable` : `/me/merchant/2fa/disable`, {}, { headers: apiHeaders() }); await loadMerchant() }
    catch(e: unknown){ const err=(e as ApiError); const m= err?.data?.error||(e as Error)?.message||'Disable failed'; setTotpError(String(m)) } 
    finally{ setTotpLoading(false) }
  }
  async function retryWebhook(id: string){
    try{
      await postJson(overrideApiKey ? `/api/webhooks/${encodeURIComponent(id)}/retry` : `/me/webhooks/${encodeURIComponent(id)}/retry`, {}, { headers: apiHeaders() })
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
              <CardDescription>Server-side API key for backend integration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Merchant ID</div>
                  <div className="text-sm font-medium font-mono">
                    {merchantLoading ? 'Loading...' : (merchant?.id ? `${merchant.id.slice(0,6)}…${merchant.id.slice(-4)}` : 'N/A')}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="text-sm font-medium">{merchant?.status || '-'}</div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Key</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={showApiKey ? (merchant?.api_key || revealedApiKey || newApiKey || overrideApiKey || merchant?.api_key_masked || '••••••') : (merchant?.api_key_masked || '••••••')}
                      readOnly
                      className="font-mono"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleToggleApiVisibility}
                        aria-label={showApiKey ? 'Hide API Key' : 'Show API Key'}
                      >
                        {showApiKey ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                      </Button>
                      {/* Copy button moved inside code blocks for snippets; keep API key copy here for convenience */}
                      <Button variant="outline" size="sm" onClick={handleCopyApiKey} className={cn(apiCopyState === 'copied' && 'border-emerald-400 text-emerald-500')}>
                        <IconCopy className="h-4 w-4 mr-2" />
                        {apiCopyState === 'copied' ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                  {!showApiKey && (
                    <p className="text-xs text-muted-foreground">Masked by default for security. Click the eye icon to reveal.</p>
                  )}
                </div>
                {/* 移除 Rotate，仅保留复制按钮。若需重新签发请走后台运维流程 */}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1">
                <h3 className="text-lg font-medium">Webhook Settings</h3>
                <p className="text-sm text-muted-foreground">Configure the callback URL and shared secret used for OnePay payment notifications.</p>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://your-domain.com/api/onepay/webhook"
                    value={webhookUrl}
                    onChange={(e)=>setWebhookUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-secret">Webhook Secret</Label>
                  <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Input
                      id="webhook-secret"
                      readOnly
                      placeholder="••••••"
                      value={revealedWebhookSecret || webhookSecretPreview || '••••••'}
                      className="font-mono"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={revealWebhookSecret}
                        aria-label="Reveal Webhook Secret"
                      >
                        <IconEye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyWebhookSecret}
                        disabled={!revealedWebhookSecret && !webhookSecretPreview}
                        className={cn(webhookCopyState==='copied' && 'border-emerald-400 text-emerald-500')}
                      >
                        <IconCopy className="h-4 w-4 mr-2" />
                        {webhookCopyState === 'copied' ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                </div>
                {webhookSecretExpiresAt ? (
                  <p className="text-xs text-muted-foreground">
                    Secret visible for <span className="font-medium">{formatRevealCountdown(webhookSecretExpiresAt) || 'a short time'}</span>. Please store it securely.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Click “Reveal secret” to view the full value for 2 minutes. Use it in your server as <code>ONEPAY_WEBHOOK_SECRET</code>.</p>
                )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div />
                <div className="flex gap-2">
                  <Button onClick={()=>saveWebhook()} disabled={webhookSaving}>
                    {webhookSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* 示例不再默认展示，改为下方生成后显示 */}

              {/* API Snippet Generator (Server-side only) */}
              <div className="space-y-3 pt-2">
                <h3 className="text-lg font-medium">API Snippet Generator</h3>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-56">
                        <div className="text-sm font-medium">Mode</div>
                        <Select value={genMode} onValueChange={(v)=>setGenMode(v as 'invoice'|'static')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="invoice">Per-order (invoice)</SelectItem>
                            <SelectItem value="static">Static Button (long-lived)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* mode help moved below each snippet title */}
                    </div>
                  </div>
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
                  {genMode === 'invoice' && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Order expiry (min)</div>
                      <Input type="number" value={orderExpiryMin} onChange={(e)=> setOrderExpiryMin(Math.max(1, Number(e.target.value||15)))} />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleGenerate} disabled={genLoading}>{genLoading ? 'Generating...' : 'Generate Snippets'}</Button>
                </div>
                {genResult?.error && (
                  <div className="text-xs text-red-500">{genResult.error}</div>
                )}
                {(!genResult?.error && genResult?.curl) && (
                  <div className="space-y-5 text-xs">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">cURL (Server)</div>
                      <p className="text-xs text-muted-foreground">
                        Minimal endpoints: <code>/onepay/create-payment</code> + <code>/onepay/webhook</code> (Express), or
                        <code> /api/onepay/orders</code> + <code>/api/onepay/webhook</code> (Next). Recommended: add
                        <code> /api/onepay/attempt</code>, <code> /api/onepay/status</code>, <code> /api/onepay/notify</code>.
                      </p>
                      <div className="relative group">
                        <pre className="rounded-lg border p-3 overflow-x-auto">{genResult.curl}</pre>
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={()=>copyToClipboard(genResult!.curl!, 'api')}
                          aria-label="Copy cURL"
                        >
                          <IconCopy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Node.js (Server)</div>
                      <p className="text-xs text-muted-foreground">
                        Same endpoints as cURL above. Keep API Key and Webhook Secret on server-side only.
                      </p>
                      <div className="relative group">
                        <pre className="rounded-lg border p-3 overflow-x-auto">{genResult.node}</pre>
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={()=>copyToClipboard(genResult!.node!, 'api')}
                          aria-label="Copy Node"
                        >
                          <IconCopy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Express (One route + Webhook)</div>
                      <p className="text-xs text-muted-foreground">
                        Minimal setup: mount <code>/onepay/create-payment</code> and <code>/onepay/webhook</code>.
                        You can later add attempt/status/notify for better UX and idempotency.
                      </p>
                      {/* Install section */}
                      <div className="space-y-1">
                        <div className="text-muted-foreground">Install</div>
                        <div className="relative group">
                          <pre className="rounded-lg border p-3 overflow-x-auto">{`npm install @onepay/merchant-sdk`}</pre>
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={()=>copyToClipboard('npm install @onepay/merchant-sdk', 'api')}
                            aria-label="Copy"
                          >
                            <IconCopy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Integration section */}
                      <div className="space-y-1">
                        <div className="text-muted-foreground">Integration (mount to your existing server)</div>
                        <div className="relative group">
                          <pre className="rounded-lg border p-3 overflow-x-auto">{`
import { createOnePayHandlers } from '@onepay/merchant-sdk'

// in your server entry where 'app' is already created
const h = createOnePayHandlers({
  baseUrl: process.env.ONEPAY_BASE_URL!,
  apiKey: process.env.ONEPAY_API_KEY!,
  webhookSecret: process.env.ONEPAY_WEBHOOK_SECRET!,
  onEvent: async (evt) => {
    // TODO: update order status in DB
  }
})

app.post('/onepay/create-payment', h.createPayment)
app.post('/onepay/webhook', h.webhook)
`}</pre>
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={()=>copyToClipboard(`import { createOnePayHandlers } from '@onepay/merchant-sdk'\n\nconst h = createOnePayHandlers({\n  baseUrl: process.env.ONEPAY_BASE_URL!,\n  apiKey: process.env.ONEPAY_API_KEY!,\n  webhookSecret: process.env.ONEPAY_WEBHOOK_SECRET!,\n  onEvent: async (evt) => { /* update order status */ }\n})\n\napp.post('/onepay/create-payment', h.createPayment)\napp.post('/onepay/webhook', h.webhook)`, 'api')}
                            aria-label="Copy integration"
                          >
                            <IconCopy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {genMode === 'static' && genResult?.html && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">HTML &lt;img&gt; (Client)</div>
                        <p className="text-xs text-muted-foreground">
                          Static QR mode: only <code>/api/onepay/webhook</code> is required; consider offline matching on backend.
                        </p>
                        <div className="relative group">
                          <pre className="rounded-lg border p-3 overflow-x-auto">{genResult.html}</pre>
                          <Button
                            variant="outline"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={()=>copyToClipboard(genResult!.html!, 'api')}
                            aria-label="Copy HTML"
                          >
                            <IconCopy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
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
