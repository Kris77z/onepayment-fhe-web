'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { API_BASE } from '@/lib/api'
import { ethers } from 'ethers'

const TOKENS = {
  // BSC 主网 USDT（示例）
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  // 如需更换，请在输入框中覆盖
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
} as const

const RECEIVER = '0x46d2d17d0e835a7f3a2269c9ad0d80d859996d63'

function getInjected(): any {
  const w: any = window as any
  return w.okxwallet || w.ethereum
}

async function getProvider(): Promise<ethers.BrowserProvider> {
  const injected = getInjected()
  if (!injected) throw new Error('No wallet found')
  const provider = new ethers.BrowserProvider(injected)
  return provider
}

async function ensureBsc(injected: any){
  const targetChainIdHex = '0x38' // 56
  try{
    const current = await injected.request({ method: 'eth_chainId' })
    if(current?.toLowerCase() === targetChainIdHex){ return }
    await injected.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetChainIdHex }] })
  }catch(e:any){
    if(e?.code === 4902){
      await injected.request({ method: 'wallet_addEthereumChain', params: [{
        chainId: targetChainIdHex,
        chainName: 'BNB Smart Chain',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        rpcUrls: ['https://bsc-dataseed1.binance.org'],
        blockExplorerUrls: ['https://bscscan.com']
      }]})
    } else {
      throw e
    }
  }
}

async function getDecimals(contractAddress: string, provider: ethers.Provider): Promise<number> {
  const erc20 = new ethers.Interface(['function decimals() view returns (uint8)'])
  const data = erc20.encodeFunctionData('decimals', [])
  const res = await provider.call({ to: contractAddress, data })
  const [decimals] = erc20.decodeFunctionResult('decimals', res)
  return Number(decimals)
}

async function getBalance(contractAddress: string, account: string, provider: ethers.Provider): Promise<bigint> {
  const erc20 = new ethers.Interface(['function balanceOf(address) view returns (uint256)'])
  const data = erc20.encodeFunctionData('balanceOf', [account])
  const res = await provider.call({ to: contractAddress, data })
  const [balance] = erc20.decodeFunctionResult('balanceOf', res)
  return balance as bigint
}

export function PayDirect() {
  const [amount, setAmount] = React.useState('20.00')
  const [loading, setLoading] = React.useState(false)
  const [contractAddr, setContractAddr] = React.useState<string>(TOKENS['USDT'])
  const [account, setAccount] = React.useState<string>('')
  const [orderId, setOrderId] = React.useState<string>(()=>`ORDER_${Date.now()}`)
  const [lastTx, setLastTx] = React.useState<string>('')
  const [lastStatus, setLastStatus] = React.useState<string>('')

  const start = async()=>{
    try{
      setLoading(true)
      const injected = getInjected()
      if(!injected){ throw new Error('未检测到钱包插件（OKX/MetaMask 等）') }
      const accs = await injected.request({ method: 'eth_requestAccounts' })
      setAccount(accs?.[0] || '')
      await ensureBsc(injected)
      const provider = await getProvider()
      const network = await provider.getNetwork()
      if(Number(network.chainId) !== 56){
        throw new Error('请切换到 BSC Mainnet (chainId 56)')
      }
      const signer = await provider.getSigner()
      const sender = await signer.getAddress()
      const token = contractAddr.trim()
      const decimals = await getDecimals(token, provider)
      const value = Number.parseFloat(amount || '0')
      if(!Number.isFinite(value) || value <= 0){ throw new Error('请输入正确金额') }
      const units = ethers.parseUnits(value.toFixed(2), decimals)

      const balance = await getBalance(token, sender, provider)
      if(balance < units){ throw new Error('余额不足：请获取该代币，或降低金额') }

      // after_block & deadline
      const currentBlock = await provider.getBlockNumber()
      const after_block = String(currentBlock)
      const deadline = String(Math.floor(Date.now()/1000) + 60*10)
      const blockchain = 'bsc'

      await fetch(`${API_BASE}/api/payments/attempts`, {
        method:'POST', headers:{'Content-Type':'application/json', 'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || ''},
        body: JSON.stringify({
          blockchain, sender, receiver: RECEIVER,
          to_token: token, to_amount: value.toString(), to_decimals: decimals,
          after_block, deadline
        })
      })

      const erc20 = new ethers.Contract(token, [
        'function transfer(address to,uint256 value) returns (bool)'
      ], signer)
      const tx = await erc20.transfer(RECEIVER, units)
      toast.message('已发送交易', { description: tx.hash })
      const txHash = tx.hash
      setLastTx(txHash)

      const poll = async()=>{
        const res = await fetch(`${API_BASE}/api/payments/status`, {
          method:'POST', headers:{'Content-Type':'application/json', 'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || ''},
          body: JSON.stringify({
            blockchain, transaction: txHash, sender, receiver: RECEIVER,
            to_token: token, after_block, deadline
          })
        })
        const data = await res.json()
        return data
      }

      let result: any
      for(let i=0;i<30;i++){
        result = await poll()
        if(result?.status === 'success' || result?.status === 'failed'){ break }
        await new Promise(r=>setTimeout(r, 5000))
      }

      if(result?.status === 'success'){
        try{
          await fetch(`${API_BASE}/api/orders/${orderId}/payments/notify`, {
            method:'POST', headers:{'Content-Type':'application/json', 'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || ''},
            body: JSON.stringify({ txHash: txHash, chain: blockchain })
          })
        }catch{}
        toast.success('支付成功（已通知后端入账）')
        setLastStatus('success')
      }else{
        const reason = result?.failed_reason || 'UNKNOWN'
        toast.error(`支付失败: ${reason}`)
        setLastStatus(`failed(${reason})`)
      }
    }catch(e:any){
      toast.error(e?.message || '操作失败')
      setLastStatus('error')
    }finally{
      setLoading(false)
    }
  }

  return (
    <Card className="border-white/10 bg-card/50">
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="text-sm text-muted-foreground">BSC Mainnet 直转测试 (ERC20 transfer)</div>
        <div className="text-xs text-muted-foreground">Receiver: {RECEIVER}</div>
        <div className="text-xs text-muted-foreground">Account: {account || '未连接'}</div>
        {lastTx && (
          <div className="text-xs text-muted-foreground">Last TX: {lastTx}</div>
        )}
        {lastStatus && (
          <div className="text-xs text-muted-foreground">Last Status: {lastStatus}</div>
        )}
        <div className="flex items-center gap-2">
          <Input
            value={orderId}
            onChange={(e)=>setOrderId(e.target.value)}
            placeholder="Order ID"
            className="w-48"
          />
          <Input
            value={amount}
            onChange={(e)=>{ const v=e.target.value; if(/^[0-9]+(?:\.[0-9]{0,2})?$/.test(v)) setAmount(v) }}
            placeholder="Amount"
            className="w-32"
          />
          <Input
            value={contractAddr}
            onChange={(e)=>setContractAddr(e.target.value)}
            placeholder="Token contract"
            className="w-[420px]"
          />
          <Button onClick={start} disabled={loading}>{loading? '处理中...' : '发送'}</Button>
        </div>
      </CardContent>
    </Card>
  )
}


