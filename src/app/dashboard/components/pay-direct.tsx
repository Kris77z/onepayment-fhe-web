'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useToast } from '@/hooks/use-toast'
import { createQuote, createSession, settlePayment, config } from '@/lib/api-client'
import { buildAndSignPaymentRequest, fetchFacilitatorConfig, type FacilitatorConfig } from '@/lib/payment-signer'

const USDC_DECIMALS = 6
const MIN_AMOUNT_USDC = 0.01

export function PayDirect() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const { setVisible } = useWalletModal()
  const { toast } = useToast()
  
  const [amount, setAmount] = React.useState('20.00')
  const [loading, setLoading] = React.useState(false)
  const [orderId, setOrderId] = React.useState<string>(()=>`ORDER_${Date.now()}`)
  const [lastTx, setLastTx] = React.useState<string>('')
  const [lastStatus, setLastStatus] = React.useState<string>('')
  const [facilitatorConfig, setFacilitatorConfig] = React.useState<FacilitatorConfig | null>(null)

  // 获取 Facilitator 配置
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const config = await fetchFacilitatorConfig(process.env.NEXT_PUBLIC_FACILITATOR_URL || 'http://localhost:3001')
        if (!cancelled) setFacilitatorConfig(config)
      } catch (e) {
        console.error('Failed to fetch facilitator config:', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const start = async()=>{
    try{
      setLoading(true)
      setLastStatus('')
      setLastTx('')

      // 检查钱包连接
      if (!wallet.connected || !wallet.publicKey) {
        setVisible(true)
        throw new Error('Please connect your Solana wallet')
      }

      // 验证金额
      const value = Number.parseFloat(amount || '0')
      if(!Number.isFinite(value) || value < MIN_AMOUNT_USDC){ 
        throw new Error(`Amount must be at least ${MIN_AMOUNT_USDC} USDC`) 
      }

      // 获取 Facilitator 配置
      if (!facilitatorConfig) {
        const config = await fetchFacilitatorConfig(process.env.NEXT_PUBLIC_FACILITATOR_URL || 'http://localhost:3001')
        setFacilitatorConfig(config)
      }
      const fConfig = facilitatorConfig || await fetchFacilitatorConfig(process.env.NEXT_PUBLIC_FACILITATOR_URL || 'http://localhost:3001')

      // 创建报价
      const quote = await createQuote({
        amount: value,
        currency: 'USDC',
      })

      // 创建支付会话
      const session = await createSession({
        quoteId: quote.quoteId,
        amount: value,
        currency: 'USDC',
        memo: orderId ? `Order: ${orderId}` : undefined,
      })

      // 构建并签名支付请求
      const amountMinorUnits = Math.floor(value * Math.pow(10, USDC_DECIMALS))
      const paymentRequest = await buildAndSignPaymentRequest(
        connection,
        wallet,
        {
          sessionId: session.sessionId,
          merchantAddress: fConfig.payTo,
          nonce: session.nonce,
          expiresAt: session.expiresAt,
          facilitatorUrl: process.env.NEXT_PUBLIC_FACILITATOR_URL || 'http://localhost:3001'
        },
        amountMinorUnits,
        fConfig
      )

      // 提交支付请求到后端
      const transactionSignature = await settlePayment(session.sessionId, paymentRequest)
      
      if (transactionSignature) {
        toast.success('Payment Successful', `Transaction: ${transactionSignature.slice(0, 8)}...`)
        setLastStatus('success')
        setLastTx(transactionSignature)
      } else {
        throw new Error('Payment failed: No transaction signature received')
      }
    }catch(e:any){
      const errorMsg = e?.message || 'Operation failed'
      toast.error('Payment Failed', errorMsg)
      setLastStatus(`error: ${errorMsg}`)
    }finally{
      setLoading(false)
    }
  }

  return (
    <Card className="border-white/10 bg-card/50">
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="text-sm text-muted-foreground">Solana Devnet x402 Payment Test (Gasless USDC Transfer)</div>
        {facilitatorConfig && (
          <>
            <div className="text-xs text-muted-foreground">Receiver: {facilitatorConfig.payTo}</div>
            <div className="text-xs text-muted-foreground">Fee Payer: {facilitatorConfig.feePayer || 'User'}</div>
          </>
        )}
        <div className="text-xs text-muted-foreground">
          Account: {wallet.publicKey ? `${wallet.publicKey.toBase58().slice(0, 8)}...${wallet.publicKey.toBase58().slice(-8)}` : 'Not connected'}
        </div>
        {!wallet.connected && (
          <Button onClick={() => setVisible(true)} variant="outline" size="sm">
            Connect Wallet
          </Button>
        )}
        {lastTx && (
          <div className="text-xs text-muted-foreground">
            Last TX: <a href={`https://solscan.io/tx/${lastTx}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{lastTx.slice(0, 16)}...</a>
          </div>
        )}
        {lastStatus && (
          <div className={`text-xs ${lastStatus.startsWith('success') ? 'text-green-500' : 'text-red-500'}`}>
            Last Status: {lastStatus}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            value={orderId}
            onChange={(e)=>setOrderId(e.target.value)}
            placeholder="Order ID"
            className="w-48"
          />
          <Input
            value={amount}
            onChange={(e)=>{ 
              const v=e.target.value
              if(/^[0-9]+(?:\.[0-9]{0,6})?$/.test(v) || v === '') setAmount(v) 
            }}
            placeholder="Amount (USDC)"
            className="w-32"
          />
          <Button 
            onClick={start} 
            disabled={loading || !wallet.connected || !facilitatorConfig}
            className="flex-1 md:flex-none"
          >
            {loading ? 'Processing...' : 'Send Payment'}
          </Button>
        </div>
        {!facilitatorConfig && (
          <div className="text-xs text-yellow-500">Loading facilitator configuration...</div>
        )}
      </CardContent>
    </Card>
  )
}
