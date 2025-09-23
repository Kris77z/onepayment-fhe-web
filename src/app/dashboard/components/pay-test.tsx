'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { API_BASE } from '@/lib/api'

declare global {
  interface Window { DePayWidgets?: any }
}

const USDT_TESTNET = '0x221c5B1a293aAc1187ED3a7D7d2d9aD7fE1F3FB0'
const USDC_TESTNET = '0x64544969ed7EBf5f083679233325356EbE738930'
const RECEIVER = '0x46d2d17d0e835a7f3a2269c9ad0d80d859996d63'

function ensureWidgets(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.DePayWidgets) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-depay="widgets"]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('widgets load error')))
      return
    }
    const s = document.createElement('script')
    s.src = 'https://integrate.depay.com/widgets/v13.js'
    s.async = true
    s.defer = true
    s.setAttribute('data-depay', 'widgets')
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('widgets load error'))
    document.head.appendChild(s)
  })
}

async function startPayment(tokenAddress: string, amount: number) {
  await ensureWidgets()
  if (!window.DePayWidgets) throw new Error('DePayWidgets not available')
  const orderId = 'ORDER_TEST_001'
  await window.DePayWidgets.Payment({
    accept: [{
      // 注意：若报“unsupported blockchain”，请切换为 'bsc'（主网）
      blockchain: 'bsc',
      token: tokenAddress,
      amount,
      receiver: RECEIVER,
    }],
    track: {
      endpoint: `${API_BASE}/api/payments/attempts`,
      poll: { endpoint: `${API_BASE}/api/payments/status` },
    },
    validated: (tx: any) => fetch(`${API_BASE}/api/orders/${orderId}/payments/notify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash: tx.id, chain: tx.blockchain })
    })
  })
}

export function PayTest() {
  const [amount, setAmount] = React.useState('20.00')
  const parsed = Number.parseFloat(amount || '0')
  return (
    <Card className="border-white/10 bg-card/50">
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="text-sm text-muted-foreground">Environment: BSC Testnet</div>
        <div className="text-xs text-muted-foreground">Receiver: {RECEIVER}</div>
        <div className="flex items-center gap-2">
          <Input
            value={amount}
            onChange={(e)=>{
              const v = e.target.value
              if(/^\d*(?:\.\d{0,2})?$/.test(v)) setAmount(v)
            }}
            placeholder="Amount"
            className="w-32"
          />
          <Button onClick={async()=>{
            try{ await startPayment(USDT_TESTNET, Number.isFinite(parsed)? parsed : 0) }catch(e:any){ toast.error(e?.message||'Start failed') }
          }}>Pay USDT</Button>
          <Button variant="outline" onClick={async()=>{
            try{ await startPayment(USDC_TESTNET, Number.isFinite(parsed)? parsed : 0) }catch(e:any){ toast.error(e?.message||'Start failed') }
          }}>Pay USDC</Button>
        </div>
      </CardContent>
    </Card>
  )
}


