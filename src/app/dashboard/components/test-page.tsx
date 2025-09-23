'use client'

import React from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { ethers } from 'ethers'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token'
import { connectWithOnboard } from '@/lib/onboard'
import QRCode from 'qrcode'
import { getJson } from '@/lib/api'

interface EthereumProvider {
  request: <T = unknown>(args: { method: string; params?: unknown[] }) => Promise<T>
}

interface WalletError {
  code: number
  message: string
}

// Minimal Solana Provider interface
interface SolanaProvider {
  isPhantom?: boolean
  isSolflare?: boolean
  publicKey?: { toString(): string }
  connect: () => Promise<{ publicKey: { toString(): string } }>
  signAndSendTransaction?: (tx: Transaction) => Promise<{ signature: string }>
  signTransaction?: (tx: Transaction) => Promise<Transaction>
}

const getSolanaProvider = (): SolanaProvider | null => {
  const w = window as unknown as { solana?: SolanaProvider; okxwallet?: { solana?: SolanaProvider } }
  return w.okxwallet?.solana || w.solana || null
}

declare global {
  interface Window {
    okxwallet?: EthereumProvider
    ethereum?: EthereumProvider
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3002'
const RECEIVER = '0x46d2d17d0e835a7f3a2269c9ad0d80d859996d63'
// 默认收款地址（可根据你的实际地址调整），并在 UI 中显示
const SOLANA_RECEIVER = '8RphPY9oWHqJ6TDDWycqQ5mBcXAf5QmuUzVuifX7u8To'
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com'

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)'
]

// 常量（主网默认：BSC）
const TOKENS = {
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
}

const TOKEN_DECIMALS_DEFAULTS: Record<'USDT'|'USDC', number> = {
  USDT: 18,
  USDC: 18,
}

// Solana 主网 SPL Token mint
const SOLANA_MINTS: Record<'USDT'|'USDC', string> = {
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
}

// 支持的链配置（Ethereum / BSC / Arbitrum / Solana）
const CHAIN_CONFIGS = {
  'ethereum': {
    chainId: '0x1',
    chainName: 'Ethereum Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.infura.io/v3/'],
    blockExplorerUrls: ['https://etherscan.io'],
    logo: '/images/eth.png',
    displayName: 'Ethereum'
  },
  'arbitrum': {
    chainId: '0xa4b1',
    chainName: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io'],
    logo: '/images/arb-chain.png',
    displayName: 'Arbitrum'
  },
  'bsc': {
    chainId: '0x38',
    chainName: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-dataseed1.binance.org'],
    blockExplorerUrls: ['https://bscscan.com'],
    logo: '/images/bsc-chain.png',
    displayName: 'BSC'
  },
  'solana': {
    chainId: 'solana',
    chainName: 'Solana',
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    rpcUrls: [SOLANA_RPC],
    blockExplorerUrls: ['https://solscan.io'],
    logo: '/images/sol-chain.png',
    displayName: 'Solana'
  }
}

// 各链常见 USDT/USDC 合约（未确认则留空，需填写自定义合约）
const TOKENS_BY_CHAIN: Record<'ethereum'|'bsc'|'arbitrum'|'solana', Record<'USDT'|'USDC', string>> = {
  'ethereum': {
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606EB48',
  },
  'arbitrum': {
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
  'bsc': {
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  },
  'solana': {
    USDT: SOLANA_MINTS.USDT,
    USDC: SOLANA_MINTS.USDC,
  },
}

// 工具：根据 chainId(number) 反查 chain key
const findChainKeyById = (chainIdNum: number): 'ethereum'|'bsc'|'arbitrum' | null => {
  for (const [key, cfg] of Object.entries(CHAIN_CONFIGS) as Array<['ethereum'|'bsc'|'arbitrum', { chainId: string }]>) {
    if (parseInt(cfg.chainId, 16) === Number(chainIdNum)) return key
  }
  return null
}

const getTokenAddressForChain = (
  chainKey: 'ethereum'|'bsc'|'arbitrum'|'solana',
  token: 'USDT' | 'USDC',
  custom?: string
) => {
  if (custom && custom.trim()) return custom.trim()
  const byChain = TOKENS_BY_CHAIN[chainKey]
  const addr = byChain?.[token]
  return addr && addr.length > 0 ? addr : TOKENS[token]
}

interface TestMetrics {
  backendConnected: boolean
  walletConnected: boolean
  networkSwitched: boolean
  balanceChecked: boolean
  attemptsCalled: boolean
  transferExecuted: boolean
  statusPolled: boolean
  notifyCalled: boolean
  testCompleted: boolean
  totalSteps: number
  currentStep: number
}

export default function TestPage() {
  const [loading, setLoading] = React.useState(false)
  const [account, setAccount] = React.useState<string>('')
  const [amount, setAmount] = React.useState<string>('1')
  const [selectedToken, setSelectedToken] = React.useState<'USDT' | 'USDC'>('USDT')
  const [customContract, setCustomContract] = React.useState<string>('')
  const [selectedChain, setSelectedChain] = React.useState<'ethereum'|'bsc'|'arbitrum'|'solana'>('bsc')
  const [orderId, setOrderId] = React.useState<string>(() => `ORDER_${Date.now()}`)
  const [lastTx, setLastTx] = React.useState<string>('')
  const [lastStatus, setLastStatus] = React.useState<string>('')
  const [debugLogs, setDebugLogs] = React.useState<string[]>([])
  const [metrics, setMetrics] = React.useState<TestMetrics>({
    backendConnected: false,
    walletConnected: false,
    networkSwitched: false,
    balanceChecked: false,
    attemptsCalled: false,
    transferExecuted: false,
    statusPolled: false,
    notifyCalled: false,
    testCompleted: false,
    totalSteps: 8,
    currentStep: 0
  })
  const [testStartTime, setTestStartTime] = React.useState<number>(0)
  const [tokenBalance, setTokenBalance] = React.useState<string>('')
  const [decimalsState, setDecimalsState] = React.useState<number | null>(null)
  const [decimalsInput, setDecimalsInput] = React.useState<string>('')
  const [eipUri, setEipUri] = React.useState<string>('')
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('')
  const [manualTxHash, setManualTxHash] = React.useState<string>('')
  const [connectMode, setConnectMode] = React.useState<'auto'|'injected'|'walletconnect'|'offline'>('auto')
  const [solSignature, setSolSignature] = React.useState<string>('')
  const [resolvedTokenAddress, setResolvedTokenAddress] = React.useState<string>('')
  const [rpcStatus, setRpcStatus] = React.useState<Record<string, { status: 'checking'|'ok'|'warning'|'error', message: string, latency?: number }>>({})

  const updateMetrics = (updates: Partial<TestMetrics>) => {
    setMetrics(prev => ({ ...prev, ...updates }))
  }

  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const icon = {
      info: '🔍',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type]
    setDebugLogs(prev => [...prev.slice(-19), `[${timestamp}] ${icon} ${message}`])
  }

  const checkRpcHealth = async (chain: string, isEvm: boolean = true) => {
    const start = Date.now()
    setRpcStatus(prev => ({ ...prev, [chain]: { status: 'checking', message: '检测中...' } }))
    
    try {
      if (isEvm) {
        // EVM 链：测试 eth_chainId + eth_blockNumber
        const res = await fetch(`${API_BASE}/api/evm/code?chain=${chain}&address=0x0000000000000000000000000000000000000000`)
        if (res.ok) {
          const latency = Date.now() - start
          setRpcStatus(prev => ({ ...prev, [chain]: { status: 'ok', message: `${latency}ms`, latency } }))
        } else {
          const text = await res.text()
          setRpcStatus(prev => ({ ...prev, [chain]: { status: 'error', message: `${res.status}: ${text}` } }))
        }
      } else {
        // Solana：测试 getHealth + getSlot
        const healthRes = await fetch(`${API_BASE}/api/solana/rpc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' })
        })
        if (healthRes.ok) {
          const health = await healthRes.json()
          if (health.result === 'ok') {
            // 再测试 getSlot 获取延迟
            const slotRes = await fetch(`${API_BASE}/api/solana/rpc`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'getSlot' })
            })
            const latency = Date.now() - start
            if (slotRes.ok) {
              const slot = await slotRes.json()
              setRpcStatus(prev => ({ ...prev, [chain]: { status: 'ok', message: `${latency}ms (slot: ${slot.result})`, latency } }))
            } else {
              setRpcStatus(prev => ({ ...prev, [chain]: { status: 'warning', message: `健康但无法获取 slot (${latency}ms)` } }))
            }
          } else {
            setRpcStatus(prev => ({ ...prev, [chain]: { status: 'warning', message: health.result || 'unknown' } }))
          }
        } else {
          const text = await healthRes.text()
          setRpcStatus(prev => ({ ...prev, [chain]: { status: 'error', message: `${healthRes.status}: ${text}` } }))
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setRpcStatus(prev => ({ ...prev, [chain]: { status: 'error', message } }))
    }
  }

  const checkAllRpcs = async () => {
    const chains = [
      { name: 'ethereum', isEvm: true },
      { name: 'bsc', isEvm: true },
      { name: 'arbitrum', isEvm: true },
      { name: 'solana', isEvm: false }
    ]
    
    for (const { name, isEvm } of chains) {
      await checkRpcHealth(name, isEvm)
      // 避免并发过多，稍微延迟
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  const getTokenAddress = async (overrideChain?: 'ethereum'|'bsc'|'arbitrum'|'solana') => {
    // 对于 Solana，始终返回 mint，避免被 EVM 注入的 chainId 干扰
    const chainKey = overrideChain || selectedChain
    if (chainKey === 'solana') {
      return getTokenAddressForChain('solana', selectedToken, customContract)
    }
    // EVM：优先使用钱包当前网络
    try {
      const injected = window.okxwallet || window.ethereum
      if (injected) {
        const currentChainIdHex = await injected.request<string>({ method: 'eth_chainId' })
        const currentChainId = parseInt(currentChainIdHex, 16)
        const chainKey = findChainKeyById(currentChainId)
        if (chainKey) {
          return getTokenAddressForChain(chainKey, selectedToken, customContract)
        }
      }
    } catch {}
    return getTokenAddressForChain(chainKey, selectedToken, customContract)
  }

  const normalizeAddress = (addr: string): string => {
    if (!addr) return ''
    const trimmed = addr.trim()
    // 若是标准 0x 地址，统一用小写以避免 ethers 对混合大小写的校验报错
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return trimmed.toLowerCase()
    return trimmed
  }

  // 当链/代币/自定义合约变化时，解析并缓存合约地址，避免在渲染中调用异步函数
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const addr = normalizeAddress(await getTokenAddress())
        if (!cancelled) setResolvedTokenAddress(addr)
      } catch {
        if (!cancelled) setResolvedTokenAddress('')
      }
    })()
    return () => { cancelled = true }
  }, [selectedChain, selectedToken, customContract, account])

  const checkBackend = async () => {
    try {
      addLog('检查后端连接...', 'info')
      const response = await fetch(`${API_BASE}/healthz`, { method: 'GET' })
      addLog(`后端健康检查: ${response.status} ${response.statusText}`, 'info')
      
      if (response.ok) {
        addLog('后端连接正常', 'success')
        updateMetrics({ backendConnected: true })
        toast.success('后端连接正常')
      } else {
        addLog('后端可能有问题', 'warning')
        updateMetrics({ backendConnected: false })
        toast.warning(`后端状态: ${response.status}`)
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      addLog(`后端连接失败: ${message}`, 'error')
      updateMetrics({ backendConnected: false })
      toast.error(`后端连接失败: ${message}`)
    }
  }

  const connectWallet = async () => {
    try {
      addLog('开始连接钱包...', 'info')
      if(connectMode === 'offline'){
        toast.warning('当前为离线模式：仅用于生成二维码')
        return
      }

      // auto: 先尝试 Injected，无则回退 Onboard
      if(connectMode === 'auto'){
        if(selectedChain === 'solana'){
          const sp = getSolanaProvider()
          if(sp){
            const resp = await sp.connect()
            const addr = resp?.publicKey?.toString?.()
            if(addr){
              setAccount(addr)
              updateMetrics({ walletConnected: true })
              addLog(`Solana 钱包已连接: ${addr.slice(0,6)}...${addr.slice(-4)}`, 'success')
              toast.success('钱包已连接')
              await checkTokenBalance(addr)
            }
            return
          }
        }
        // 其余情况：打开 Onboard（EVM 或 WalletConnect）
        addLog('打开钱包选择器（Onboard）...', 'info')
        const wallets = await connectWithOnboard()
        if(wallets && wallets[0]){
          const addr = wallets[0].accounts?.[0]?.address
          if(addr){
            setAccount(addr)
            updateMetrics({ walletConnected: true })
            addLog(`钱包已连接: ${addr.slice(0,6)}...${addr.slice(-4)}`, 'success')
            toast.success('钱包已连接')
            await checkTokenBalance(addr)
          }
        }
        return
      }

      if(connectMode === 'injected'){
        if(selectedChain === 'solana'){
          const sp = getSolanaProvider()
          if(!sp){ toast.error('未检测到 Solana 钱包'); return }
          const resp = await sp.connect()
          const addr = resp?.publicKey?.toString?.()
          if(addr){
            setAccount(addr)
            updateMetrics({ walletConnected: true })
            addLog(`Solana 钱包已连接: ${addr.slice(0,6)}...${addr.slice(-4)}`, 'success')
            toast.success('钱包已连接')
          }
          return
        }
        const injected = window.okxwallet || window.ethereum
        if (!injected) { toast.error('未检测到浏览器钱包'); return }
        const accounts = await injected.request<string[]>({ method: 'eth_requestAccounts' })
        if (accounts?.[0]) {
          setAccount(accounts[0])
          updateMetrics({ walletConnected: true })
          addLog(`钱包已连接: ${accounts[0].slice(0,6)}...${accounts[0].slice(-4)}`, 'success')
          toast.success('钱包已连接')
          await checkTokenBalance(accounts[0])
        }
        return
      }

      if(connectMode === 'walletconnect'){
        if(selectedChain === 'solana'){
          toast.warning('Solana 暂未提供 WalletConnect，建议使用浏览器钱包注入（Phantom/OKX/Solflare）')
          return
        }
        const wallets = await connectWithOnboard()
        if(wallets && wallets[0]){
          const addr = wallets[0].accounts[0].address
          setAccount(addr)
          updateMetrics({ walletConnected: true })
          addLog(`钱包已连接: ${addr.slice(0,6)}...${addr.slice(-4)}`, 'success')
          toast.success('钱包已连接')
          await checkTokenBalance(addr)
        } else {
          toast.error('连接失败')
        }
        return
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      addLog(`连接失败: ${message}`, 'error')
      updateMetrics({ walletConnected: false })
      toast.error(message || '连接钱包失败')
    }
  }

  const checkTokenBalance = async (walletAddress?: string, chainOverride?: 'ethereum'|'bsc'|'arbitrum'|'solana') => {
    try {
      const effectiveChain = chainOverride || selectedChain
      let address = walletAddress || account
      if (!address) return

      addLog('检查代币余额...', 'info')
      if(effectiveChain === 'solana'){
        // 优先取注入钱包的 Solana 公钥（兼容 OKX/Phantom/Solflare）
        const sp = getSolanaProvider()
        const injectedPk = sp?.publicKey?.toString?.()
        if (injectedPk) {
          address = injectedPk
          addLog(`Solana 注入地址: ${address.slice(0,6)}...${address.slice(-4)}`,'info')
        } else if(/^0x/i.test(address)){
          addLog('未检测到 Solana 注入，且地址为 EVM 0x，余额查询将失败','warning')
          throw new Error('SOLANA_WALLET_NOT_CONNECTED')
        }
        const conn = new Connection(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3002'}/api/solana/rpc`, 'confirmed')
        const owner = new PublicKey(address)
        const mint = new PublicKey(SOLANA_MINTS[selectedToken])
        const ata = await getAssociatedTokenAddress(mint, owner)
        try {
          const acc = await getAccount(conn, ata)
          const bal = Number(acc.amount) / 1_000_000
          setTokenBalance(bal.toString())
          setDecimalsState(6)
          updateMetrics({ balanceChecked: true })
          addLog(`当前 ${selectedToken} 余额(ATA): ${bal}`, 'success')
        } catch {
          // 回退：有些钱包可能不是 ATA，按 mint 枚举所有 token account
          try {
            const parsed = await conn.getParsedTokenAccountsByOwner(owner, { mint })
            const first = parsed.value?.[0]
            if(first){
              const info = first.account.data.parsed.info as {tokenAmount: {amount: string; decimals: number}}
              const amountStr: string = info.tokenAmount.amount
              const decimals: number = info.tokenAmount.decimals
              const bal = Number(amountStr) / Math.pow(10, decimals)
              setTokenBalance(bal.toString())
              setDecimalsState(decimals)
              updateMetrics({ balanceChecked: true })
              addLog(`当前 ${selectedToken} 余额(非ATA): ${bal}`, 'success')
            }else{
              setTokenBalance('0')
              setDecimalsState(6)
              updateMetrics({ balanceChecked: true })
              addLog(`当前 ${selectedToken} 余额: 0 （未找到账户）`, 'warning')
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            addLog(`Solana 余额查询异常: ${msg}`, 'error')
            throw e
          }
        }
        return
      }
      // EVM 读链：先做合约代码预检，避免 BAD_DATA 500
      const resolvedTokenAddr = await getTokenAddress(effectiveChain)
      const codeRes = await fetch(`${API_BASE}/api/evm/code?chain=${encodeURIComponent(effectiveChain)}&address=${encodeURIComponent(resolvedTokenAddr)}`)
      if(codeRes.ok){
        const code = await codeRes.json() as { hasCode: boolean }
        if(!code.hasCode){
          toast.error(`${effectiveChain} 未配置 ${selectedToken} 合约，请填写自定义地址或改选 USDT`)
          addLog(`预检失败：该地址无合约代码 chain=${effectiveChain} address=${resolvedTokenAddr||'<empty>'}`, 'error')
          setTokenBalance('查询失败')
          return
        }
      }

      const rpcRes = await fetch(`${API_BASE}/api/evm/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain: effectiveChain,
          token: resolvedTokenAddr,
          owner: address
        })
      })
      if(!rpcRes.ok){
        const txt = await rpcRes.text();
        throw new Error(`EVM RPC ${rpcRes.status}: ${txt}`)
      }
      const { decimals, balance } = await rpcRes.json() as { decimals: number, balance: string }
      const balanceFormatted = ethers.formatUnits(BigInt(balance), decimals)
      setTokenBalance(balanceFormatted)
      setDecimalsState(Number(decimals))
      updateMetrics({ balanceChecked: true })
      addLog(`当前 ${selectedToken} 余额: ${balanceFormatted}`, 'success')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      if(/Payment Required|Out of CU|402/.test(message)){
        addLog('RPC 配额已用尽：请更换后端 RPC 或稍后再试', 'warning')
        toast.warning('RPC 配额不足，请稍后或更换 RPC')
      }
      addLog(`余额查询失败: ${message}`, 'error')
      setTokenBalance('查询失败')
    }
  }

  // 执行 Solana SPL 代币转账并等待确认，返回交易签名
  const sendSolanaSplTransfer = async (amountStr: string): Promise<string> => {
    if (selectedChain !== 'solana') throw new Error('当前非 Solana 链')
    const sp = getSolanaProvider()
    if (!sp) throw new Error('未检测到 Solana 钱包')

    // 确保已连接并获取公钥
    const pk = sp.publicKey?.toString?.() || (await sp.connect()).publicKey.toString()
    if (!pk) throw new Error('无法获取钱包公钥')
    setAccount(pk)
    addLog(`Solana 钱包: ${pk.slice(0,6)}...${pk.slice(-4)}`,'info')

    // 构造连接与账户
    const conn = new Connection(`${API_BASE}/api/solana/rpc`, 'confirmed')
    const owner = new PublicKey(pk)
    const mint = new PublicKey(SOLANA_MINTS[selectedToken])
    const destOwner = new PublicKey(SOLANA_RECEIVER)

    // 源/目标 ATA
    const fromAta = await getAssociatedTokenAddress(mint, owner)
    const toAta = await getAssociatedTokenAddress(mint, destOwner)

    // 读取最新区块信息
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed')

    const tx = new Transaction()
    tx.feePayer = owner
    tx.recentBlockhash = blockhash

    // 确保目标 ATA 存在，不存在则由付款人创建
    try {
      await getAccount(conn, toAta)
    } catch {
      tx.add(
        createAssociatedTokenAccountInstruction(
          owner, // payer
          toAta, // ata to create
          destOwner, // owner of ata
          mint
        )
      )
      addLog('已加入创建接收方 ATA 指令', 'info')
    }

    // 计算最小单位金额（USDT/USDC on Solana 默认 6 位小数）
    const decimals = 6
    const units = BigInt(Math.round(Number(amountStr) * Math.pow(10, decimals)))

    // 加入 transfer 指令
    tx.add(createTransferInstruction(fromAta, toAta, owner, units))
    addLog('已构造 SPL 代币转账指令', 'info')

    // 调起钱包签名并发送
    let signature: string
    if (sp.signAndSendTransaction) {
      const res = await sp.signAndSendTransaction(tx)
      signature = res.signature
    } else if (sp.signTransaction) {
      const signed = await sp.signTransaction(tx)
      const raw = signed.serialize()
      signature = await conn.sendRawTransaction(raw)
    } else {
      throw new Error('当前钱包不支持 signAndSendTransaction/signTransaction')
    }

    addLog(`交易已发送: ${signature}`, 'success')
    toast.message('交易已发送', { description: signature })

    // 等待确认（使用 getSignatureStatuses 轮询，避免 block height 误判过期）
    addLog('等待交易确认...', 'info')
    let confirmed = false
    for (let i = 0; i < 20; i++) {
      const st = await conn.getSignatureStatuses([signature], { searchTransactionHistory: true })
      const s = st.value?.[0]
      if (s && (s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized')) {
        confirmed = true
        break
      }
      await new Promise(r => setTimeout(r, 3000))
    }
    if (!confirmed) throw new Error('CONFIRM_TIMEOUT')
    addLog('交易确认成功', 'success')
    return signature
  }

  const resolveDecimals = (): number => {
    if (decimalsState !== null) return decimalsState
    if (decimalsInput.trim()) {
      const n = Number(decimalsInput.trim())
      if (!Number.isNaN(n) && n > 0 && n <= 36) return n
    }
    return TOKEN_DECIMALS_DEFAULTS[selectedToken]
  }

  const generatePaymentQr = async () => {
    try {
      if(selectedChain === 'solana'){
        // 生成 Solana Pay URI: solana:<recipient>?amount=..&spl-token=<mint>
        if (!amount || Number(amount) <= 0) { toast.error('请输入有效金额'); return }
        const mint = SOLANA_MINTS[selectedToken]
        const uri = `solana:${SOLANA_RECEIVER}?amount=${Number(amount)}&spl-token=${mint}`
        setEipUri(uri)
        const url = await QRCode.toDataURL(uri, { margin: 1, width: 256 })
        setQrDataUrl(url)
        addLog('已生成 Solana Pay 支付二维码', 'success')
        return
      }
      const tokenAddress = normalizeAddress(await getTokenAddress())
      const injected = window.okxwallet || window.ethereum
      const chainIdHex = injected ? await injected.request<string>({ method: 'eth_chainId' }) : '0x61'
      const chainIdDec = parseInt(String(chainIdHex), 16) || 97
      const decimals = resolveDecimals()
      if (!amount || Number(amount) <= 0) {
        toast.error('请输入有效金额')
        return
      }
      const units = ethers.parseUnits(amount, decimals).toString()
      const uri = `ethereum:${tokenAddress}@${chainIdDec}/transfer?address=${RECEIVER}&uint256=${units}`
      setEipUri(uri)
      const url = await QRCode.toDataURL(uri, { margin: 1, width: 256 })
      setQrDataUrl(url)
      addLog('已生成 EIP-681 支付二维码', 'success')
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      addLog(`生成二维码失败: ${message}`, 'error')
      toast.error(`生成二维码失败: ${message}`)
    }
  }

  const verifyManualTx = async () => {
    try {
      const txHash = manualTxHash.trim()
      if (!txHash) { toast.error('请输入交易哈希'); return }
      const tokenAddress = normalizeAddress(await getTokenAddress())
      const after_block = '0'
      const deadline = Math.floor(Date.now() / 1000 + 600).toString()
      const blockchain = 'bsc'
      const statusPayload = { blockchain, transaction: txHash, sender: '', receiver: RECEIVER, to_token: tokenAddress, after_block, deadline }
      addLog(`手动校验 txHash 请求: ${JSON.stringify(statusPayload)}`)
      const res = await fetch(`${API_BASE}/api/payments/status?orderId=${encodeURIComponent(orderId)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(statusPayload)
      })
      const text = await res.text()
      addLog(`手动校验响应: ${res.status} ${res.statusText} ${text}`)
      if (!res.ok) { toast.error('校验失败'); return }
      const data = text ? JSON.parse(text) : {}
      if (data.status === 'success') {
        toast.success('支付成功，已确认')
      } else {
        toast.error(`支付失败: ${data.failed_reason || 'UNKNOWN'}`)
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      addLog(`手动校验异常: ${message}`, 'error')
      toast.error(message)
    }
  }

  const switchToChain = async (chainKey: keyof typeof CHAIN_CONFIGS) => {
    try {
      const injected = window.okxwallet || window.ethereum
      // Solana 不使用 EVM 切链接口，直接切换本地状态
      if (chainKey === 'solana') {
        setCustomContract('')
        setSelectedChain('solana')
        // 如果已有注入钱包，直接同步公钥
        const w = (window as unknown as { solana?: SolanaProvider }).solana
        const pk = w?.publicKey?.toString?.()
        if (pk) { setAccount(pk) }
        else { setAccount('') }
        updateMetrics({ networkSwitched: true })
        toast.success('已切换到 Solana')
        addLog('✅ 成功切换到 Solana（无需 EVM 切链）', 'success')
        return
      }

      if (!injected) { toast.error('未检测到钱包'); return }

      const chainConfig = CHAIN_CONFIGS[chainKey]
      addLog(`请求切换到 ${chainConfig.displayName}...`, 'info')
      // 确保先唤起钱包权限
      try {
        await injected.request({ method: 'eth_requestAccounts' })
      } catch (e) {
        // 忽略这里的拒绝，后续切链仍会唤起
      }
      
      try {
        // 尝试切换到目标链
        await injected.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainConfig.chainId }],
        })
      } catch (switchError: unknown) {
        // 如果链不存在，尝试添加
        if (typeof switchError === 'object' && switchError !== null && 'code' in switchError && (switchError as WalletError).code === 4902) {
          await injected.request({
            method: 'wallet_addEthereumChain',
            params: [chainConfig],
          })
        } else {
          throw switchError
        }
      }
      // 再次读取当前链ID进行校验
      const currentChainId = (await injected.request<string>({ method: 'eth_chainId' }))?.toLowerCase()
      if (currentChainId === chainConfig.chainId.toLowerCase()) {
        setCustomContract('') // 切链后清空自定义合约，避免误用
        setSelectedChain(chainKey as 'ethereum'|'bsc'|'arbitrum')
        updateMetrics({ networkSwitched: true })
        toast.success(`已切换到 ${chainConfig.displayName}`)
        addLog(`✅ 成功切换到 ${chainConfig.displayName} (chainId=${currentChainId})`, 'success')
        // 切链后同步 EVM 账户并刷新余额
        try {
          const accounts = await injected.request<string[]>({ method: 'eth_requestAccounts' })
          const evmAddr = accounts?.[0]
          if(evmAddr){ setAccount(evmAddr); await checkTokenBalance(evmAddr, chainKey as 'ethereum'|'bsc'|'arbitrum') }
        } catch {}
      } else {
        addLog(`切换后校验失败: 当前 chainId=${currentChainId}, 期望=${chainConfig.chainId}`, 'error')
        toast.error('切换失败或被拒绝')
        return
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      addLog(`切换网络失败: ${message}`, 'error')
      toast.error(message)
    }
  }

  const ensureBscTestnet = async (injected: EthereumProvider) => {
    try {
      await injected.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_CONFIGS['bsc'].chainId }],
      })
    } catch (switchError: unknown) {
      if (switchError && typeof switchError === 'object' && 'code' in switchError && switchError.code === 4902) {
        await injected.request({
          method: 'wallet_addEthereumChain',
          params: [CHAIN_CONFIGS['bsc']],
        })
      } else {
        throw switchError
      }
    }
  }

  const getProvider = async () => {
    const injected = window.okxwallet || window.ethereum
    if (!injected) throw new Error('未检测到钱包')
    return new ethers.BrowserProvider(injected as ethers.Eip1193Provider)
  }

  const startTest = async () => {
    if (!account) {
      toast.error('请先连接钱包')
      return
    }

    const value = parseFloat(amount)
    if (isNaN(value) || value <= 0) {
      toast.error('请输入有效金额')
      return
    }

    setLoading(true)
    setTestStartTime(Date.now())
    const newOrderId = `ORDER_${Date.now()}`
    setOrderId(newOrderId)
    setLastTx('')
    setLastStatus('testing...')
    setDebugLogs([]) // 清空之前的日志
    
    // 重置测试指标
    updateMetrics({
      networkSwitched: false,
      balanceChecked: false,
      attemptsCalled: false,
      transferExecuted: false,
      statusPolled: false,
      notifyCalled: false,
      testCompleted: false,
      currentStep: 0
    })

    try {
      addLog('开始完整闭环测试', 'info')
      addLog(`测试金额: ${value} ${selectedToken}`, 'info')
      addLog(`订单ID: ${newOrderId}`, 'info')

      // Step 1: 确认当前网络（Solana 与 EVM 分支）
      updateMetrics({ currentStep: 1 })
      if(selectedChain === 'solana'){
        addLog('当前网络: solana', 'success')
        addLog(`接收方: ${SOLANA_RECEIVER}`, 'info')
        addLog(`代币合约: ${SOLANA_MINTS[selectedToken]}`, 'info')
        updateMetrics({ networkSwitched: true, currentStep: 2 })

        // 余额预检
        await checkTokenBalance(account)

        // Step 3: attempts（Solana）
        const conn = new Connection(`${API_BASE}/api/solana/rpc`, 'confirmed')
        const slot = await conn.getSlot('confirmed')
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10
        const senderPk = account
        const attemptPayloadSol = {
          blockchain: 'solana',
          sender: senderPk,
          receiver: SOLANA_RECEIVER,
          to_token: SOLANA_MINTS[selectedToken],
          to_amount: value.toString(),
          to_decimals: 6,
          after_block: String(slot),
          deadline: String(deadline)
        }
        try {
          addLog('调用后端 /api/payments/attempts (solana)...','info')
          const r = await fetch(`${API_BASE}/api/payments/attempts?orderId=${encodeURIComponent(newOrderId)}`,{
            method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(attemptPayloadSol)
          })
          const txt = await r.text()
          if(!r.ok){ addLog(`attempts(solana) 失败: ${r.status} ${txt}`,'warning') }
          else { addLog('attempts(solana) 成功','success'); updateMetrics({ attemptsCalled: true }) }
        } catch (e) {
          addLog(`attempts(solana) 异常: ${e instanceof Error ? e.message : String(e)}`,'warning')
        }

        // Step 4: 构造并发送 SPL 转账（唤醒钱包签名）
        addLog('执行链上 SPL 代币转账...','info')
        const signature = await sendSolanaSplTransfer(value.toString())
        setLastTx(signature)
        updateMetrics({ transferExecuted: true, currentStep: 5 })

        // Step 5: 轮询后端 status（若后端暂未支持将返回 UNSUPPORTED_CHAIN）
        addLog('开始轮询后端支付状态 (solana)...','info')
        let pollCount = 0
        const maxPolls = 12
        while(pollCount < maxPolls){
          pollCount++
          addLog(`轮询第 ${pollCount} 次 (最多 ${maxPolls} 次)...`, 'info')
          await new Promise(r=>setTimeout(r,5000))
          const statusPayload = {
            blockchain: 'solana',
            transaction: signature,
            sender: senderPk,
            receiver: SOLANA_RECEIVER,
            to_token: SOLANA_MINTS[selectedToken],
            after_block: String(slot),
            deadline: String(deadline)
          }
          const res = await fetch(`${API_BASE}/api/payments/status?orderId=${encodeURIComponent(newOrderId)}`, {
            method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(statusPayload)
          })
          const txt = await res.text()
          addLog(`📥 status 原始响应: ${txt || '<empty>'}`)
          if(!res.ok) continue
          let data: {status?: string; failed_reason?: string}
          try { data = txt ? JSON.parse(txt) : {} } catch { data = {} }
          if(data?.status === 'success'){
            addLog('后端确认支付成功！', 'success')
            updateMetrics({ statusPolled: true, currentStep: 6 })
            try {
              addLog('调用 notify 通知入账...', 'info')
              const notifyRes = await fetch(`${API_BASE}/api/orders/${newOrderId}/payments/notify`,{
                method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ txHash: signature, chain: 'solana' })
              })
              if(notifyRes.ok){ addLog('notify 成功','success'); updateMetrics({ notifyCalled: true, currentStep: 7 }) }
            } catch {}
            updateMetrics({ testCompleted: true, currentStep: 8 })
            const duration = ((Date.now() - testStartTime) / 1000).toFixed(1)
            addLog(`完整闭环测试成功！耗时 ${duration}s`, 'success')
            toast.success('测试成功！支付已完成并通知后端入账')
            setLastStatus('success')
            return
          } else if(data?.status === 'failed'){
            const reason = data?.failed_reason || 'UNKNOWN'
            addLog(`后端确认支付失败: ${reason}`,'error')
            toast.error(`测试失败: ${reason}`)
            setLastStatus(`failed(${reason})`)
            return
          }
        }
        addLog('轮询超时，后端未在预期时间内确认交易', 'warning')
        toast.error('测试超时: 后端未在预期时间内确认交易')
        setLastStatus('timeout')
        return
      }
      const injected = window.okxwallet || window.ethereum
      const provider = await getProvider()
      const network = await provider.getNetwork()
      addLog(`当前网络: ${network.name} (chainId: ${network.chainId})`, 'success')
      const currentChainKey = (findChainKeyById(Number(network.chainId)) || selectedChain) as 'ethereum'|'bsc'|'arbitrum'
      setSelectedChain(currentChainKey)
      updateMetrics({ networkSwitched: true, currentStep: 2 })

      const signer = await provider.getSigner()
      const signerAddress = await signer.getAddress()
      const tokenAddress = normalizeAddress(await getTokenAddress())
      addLog(`发送方: ${signerAddress.slice(0,6)}...${signerAddress.slice(-4)}`, 'info')
      addLog(`接收方: ${RECEIVER.slice(0,6)}...${RECEIVER.slice(-4)}`, 'info')
      addLog(`代币合约: ${tokenAddress.slice(0,6)}...${tokenAddress.slice(-4)}`, 'info')

      // Step 2: 检查余额
      addLog('检查代币余额...', 'info')
      const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
      const decimals = await erc20.decimals()
      const balance = await erc20.balanceOf(signerAddress)
      const units = ethers.parseUnits(value.toString(), decimals)
      
      const balanceFormatted = ethers.formatUnits(balance, decimals)
      addLog(`当前余额: ${balanceFormatted} (需要: ${value})`, 'success')
      setTokenBalance(balanceFormatted)
      updateMetrics({ balanceChecked: true, currentStep: 3 })

      if (balance < units) {
        addLog('余额不足，测试终止', 'error')
        toast.error('余额不足')
        setLastStatus('insufficient_balance')
        return
      }

      // Step 3: 调用后端 attempts
      addLog('调用后端 /api/payments/attempts...', 'info')
      const currentBlock = await provider.getBlockNumber()
      const after_block = currentBlock.toString()
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10
      const blockchain = currentChainKey

      const attemptPayload = {
        blockchain,
        sender: signerAddress,
        receiver: RECEIVER,
        to_token: tokenAddress,
        to_amount: value.toString(),
        to_decimals: Number(decimals), // 确保是数字类型
        after_block,
        deadline: deadline.toString()
      }
      
      const attemptResponse = await fetch(`${API_BASE}/api/payments/attempts?orderId=${encodeURIComponent(newOrderId)}` , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attemptPayload)
      })

      if (!attemptResponse.ok) {
        const errorText = await attemptResponse.text()
        addLog(`attempts 失败: ${attemptResponse.status} ${errorText}`, 'error')
        throw new Error(`attempts 调用失败: ${attemptResponse.status} ${errorText}`)
      }

      const responseText = await attemptResponse.text()
      try {
        const _attemptResult = responseText ? JSON.parse(responseText) : {}
        addLog('attempts 调用成功', 'success')
        updateMetrics({ attemptsCalled: true, currentStep: 4 })
      } catch (parseError) {
        const message = parseError instanceof Error ? parseError.message : String(parseError)
        addLog(`attempts JSON 解析失败: ${message}`, 'error')
        throw new Error(`attempts 返回无效 JSON: ${message}`)
      }

      // Step 4: 执行转账
      addLog('执行链上 ERC20 转账...', 'info')
      const erc20WithSigner = new ethers.Contract(tokenAddress, ERC20_ABI, signer)
      const tx = await erc20WithSigner.transfer(RECEIVER, units)
      const txHash = tx.hash
      setLastTx(txHash)
      addLog(`交易已发送: ${txHash}`, 'success')
      toast.message('交易已发送', { description: txHash })

      addLog('等待交易确认...', 'info')
      const receipt = await tx.wait()
      if (receipt?.status !== 1) {
        addLog('交易在链上失败', 'error')
        throw new Error('交易失败')
      }
      addLog(`交易确认成功 (区块: ${receipt.blockNumber})`, 'success')
      updateMetrics({ transferExecuted: true, currentStep: 5 })

      // Step 5: 轮询后端 status
      addLog('开始轮询后端支付状态...', 'info')
      let pollCount = 0
      const maxPolls = 12 // 最多轮询 1 分钟
      
      while (pollCount < maxPolls) {
        pollCount++
        addLog(`轮询第 ${pollCount} 次 (最多 ${maxPolls} 次)...`, 'info')
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        const statusPayload = {
          blockchain,
          transaction: txHash,
          sender: signerAddress,
          receiver: RECEIVER,
          to_token: tokenAddress,
          after_block,
          deadline: deadline.toString()
        }
        
        addLog(`📤 status 请求: ${JSON.stringify(statusPayload)}`)
        
        const res = await fetch(`${API_BASE}/api/payments/status?orderId=${encodeURIComponent(newOrderId)}` , {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(statusPayload)
        })

        addLog(`📡 status 响应状态: ${res.status} ${res.statusText}`)

        if (!res.ok) {
          const errorText = await res.text()
          addLog(`⚠️ status 请求失败: ${res.status} ${errorText}`)
          continue
        }

        // 检查响应内容
        const statusResponseText = await res.text()
        addLog(`📥 status 原始响应: ${statusResponseText}`)

        let data
        try {
          data = statusResponseText ? JSON.parse(statusResponseText) : {}
          addLog(`✅ status 解析成功: ${JSON.stringify(data)}`)
        } catch (parseError) {
          addLog(`❌ status JSON 解析失败: ${parseError}`)
          addLog(`🔍 响应内容: "${statusResponseText}"`)
          continue
        }
        
        if (data.status === 'success') {
          addLog('后端确认支付成功！', 'success')
          updateMetrics({ statusPolled: true, currentStep: 6 })
          
          // Step 6: 通知后端入账
          try {
            addLog('调用 notify 通知入账...', 'info')
            const notifyPayload = { txHash, chain: blockchain }
            
            const notifyResponse = await fetch(`${API_BASE}/api/orders/${newOrderId}/payments/notify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(notifyPayload)
            })
            
            if (notifyResponse.ok) {
              const _notifyResult = await notifyResponse.json()
              addLog('notify 成功', 'success')
              updateMetrics({ notifyCalled: true, currentStep: 7 })
            } else {
              const notifyError = await notifyResponse.text()
              addLog(`notify 失败: ${notifyResponse.status} ${notifyError}`, 'warning')
            }
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e)
            addLog(`notify 异常: ${message}`, 'error')
          }

          // Step 7: 测试完成
          updateMetrics({ testCompleted: true, currentStep: 8 })
          const duration = ((Date.now() - testStartTime) / 1000).toFixed(1)
          addLog(`完整闭环测试成功！耗时 ${duration}s`, 'success')
          toast.success('测试成功！支付已完成并通知后端入账')
          setLastStatus('success')
          return
        } else if (data.status === 'failed') {
          const reason = data.failed_reason || 'UNKNOWN'
          addLog(`后端确认支付失败: ${reason}`, 'error')
          if (reason === 'UNSUPPORTED_CHAIN') {
            toast.error('测试失败: 后端未配置 BSC_TESTNET_RPC')
          } else {
            toast.error(`测试失败: ${reason}`)
          }
          setLastStatus(`failed(${reason})`)
          return
        } else {
          addLog(`支付状态: ${data.status || 'pending'}`, 'info')
        }
      }

      addLog('轮询超时，后端未在预期时间内确认交易', 'warning')
      toast.error('测试超时: 后端未在预期时间内确认交易')
      setLastStatus('timeout')

    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      addLog(`测试异常: ${message}`, 'error')
      toast.error(message || '测试失败')
      setLastStatus('error')
    } finally {
      setLoading(false)
      const duration = testStartTime ? ((Date.now() - testStartTime) / 1000).toFixed(1) : '0'
      addLog(`测试流程结束，总耗时 ${duration}s`, 'info')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">支付闭环测试</h2>
          <p className="text-muted-foreground">测试：attempts → transfer → status → notify</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Dev Metrics (range=30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <DevMetrics />
          </CardContent>
        </Card>
      </div>

      {/* 进度跟踪面板 */}
      {(loading || metrics.currentStep > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>测试进度</span>
              <Badge variant={metrics.testCompleted ? 'default' : loading ? 'secondary' : 'outline'}>
                {metrics.testCompleted ? '已完成' : loading ? '进行中' : '待开始'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={(metrics.currentStep / metrics.totalSteps) * 100} className="h-2" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className={`flex items-center space-x-2 ${metrics.networkSwitched ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <div className={`w-2 h-2 rounded-full ${metrics.networkSwitched ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>网络切换</span>
                </div>
                <div className={`flex items-center space-x-2 ${metrics.balanceChecked ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <div className={`w-2 h-2 rounded-full ${metrics.balanceChecked ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>余额检查</span>
                </div>
                <div className={`flex items-center space-x-2 ${metrics.attemptsCalled ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <div className={`w-2 h-2 rounded-full ${metrics.attemptsCalled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>后端注册</span>
                </div>
                <div className={`flex items-center space-x-2 ${metrics.transferExecuted ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <div className={`w-2 h-2 rounded-full ${metrics.transferExecuted ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>链上转账</span>
                </div>
                <div className={`flex items-center space-x-2 ${metrics.statusPolled ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <div className={`w-2 h-2 rounded-full ${metrics.statusPolled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>状态确认</span>
                </div>
                <div className={`flex items-center space-x-2 ${metrics.notifyCalled ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <div className={`w-2 h-2 rounded-full ${metrics.notifyCalled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>入账通知</span>
                </div>
                <div className={`flex items-center space-x-2 ${metrics.testCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <div className={`w-2 h-2 rounded-full ${metrics.testCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>测试完成</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 状态面板 */}
      <Card>
        <CardHeader>
          <CardTitle>连接状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Badge variant={metrics.backendConnected ? 'default' : 'secondary'}>
                  {metrics.backendConnected ? '已连接' : '未连接'}
                </Badge>
                <span className="text-sm">后端</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Badge variant={metrics.walletConnected ? 'default' : 'secondary'}>
                  {metrics.walletConnected ? '已连接' : '未连接'}
                </Badge>
                <span className="text-sm">钱包</span>
              </div>
              {account && (
                <div className="text-xs text-muted-foreground">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Badge variant={tokenBalance ? 'default' : 'secondary'}>余额</Badge>
                <span className="text-sm">{selectedToken}</span>
              </div>
              {tokenBalance && (
                <div className="text-xs text-muted-foreground">
                  {parseFloat(tokenBalance).toFixed(4)}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Badge variant={lastStatus ? 'default' : 'secondary'}>状态</Badge>
              </div>
              {lastStatus && (
                <div className="text-xs text-muted-foreground">
                  {lastStatus}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RPC 状态检测面板 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>RPC 状态检测</CardTitle>
            <Button variant="outline" size="sm" onClick={checkAllRpcs}>
              检测所有 RPC
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: 'ethereum', displayName: 'Ethereum', isEvm: true },
              { name: 'bsc', displayName: 'BSC', isEvm: true },
              { name: 'arbitrum', displayName: 'Arbitrum', isEvm: true },
              { name: 'solana', displayName: 'Solana', isEvm: false }
            ].map(({ name, displayName, isEvm }) => {
              const status = rpcStatus[name]
              const getStatusColor = () => {
                if (!status) return 'bg-gray-300'
                switch (status.status) {
                  case 'ok': return 'bg-green-500'
                  case 'warning': return 'bg-yellow-500'
                  case 'error': return 'bg-red-500'
                  case 'checking': return 'bg-blue-500 animate-pulse'
                  default: return 'bg-gray-300'
                }
              }
              
              return (
                <div key={name} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                    <span className="text-sm font-medium">{displayName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => checkRpcHealth(name, isEvm)}
                    >
                      测试
                    </Button>
                  </div>
                  {status && (
                    <div className="text-xs text-muted-foreground">
                      {status.message}
                      {status.latency && status.latency > 1000 && (
                        <span className="text-yellow-600 ml-1">(慢)</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            <div className="space-y-1">
              <div>• 绿色：RPC 正常响应</div>
              <div>• 黄色：部分功能异常或响应较慢（&gt;1s）</div>
              <div>• 红色：RPC 无法连接或返回错误</div>
              <div>• 蓝色（闪烁）：检测中</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>测试控制台</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 连接检查 */}
          <div className="space-y-2">
            <div className="text-sm font-medium">连接检查</div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={checkBackend} variant="outline" size="sm">
                检查后端
              </Button>
              <Select value={connectMode} onValueChange={(v: 'auto'|'injected'|'walletconnect'|'offline')=>setConnectMode(v)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">自动（Injected→WalletConnect）</SelectItem>
                  <SelectItem value="injected">浏览器钱包（Injected）</SelectItem>
                  <SelectItem value="walletconnect">手机钱包（WalletConnect）</SelectItem>
                  <SelectItem value="offline">离线（仅二维码）</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={connectWallet} variant="outline" size="sm">
                {account ? '重新连接' : '连接钱包'}
              </Button>
              {account && (
                <Button 
                  onClick={() => checkTokenBalance()} 
                  variant="outline" 
                  size="sm"
                  disabled={!account}
                >
                  刷新余额
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Token Selection */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Token</div>
            <div className="flex items-center gap-2">
              <Select value={selectedToken} onValueChange={(value: 'USDT' | 'USDC') => setSelectedToken(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="自定义合约地址（可选）"
                value={customContract}
                onChange={(e) => setCustomContract(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              当前合约: {resolvedTokenAddress || '解析中...'}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Amount</div>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-32"
            />
          </div>

          <Separator />

          {/* EIP-681 支付二维码 */}
          <div className="space-y-2">
            <div className="text-sm font-medium">EIP‑681 一扫即付（手机钱包）</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="decimals（留空自动）"
                    value={decimalsInput}
                    onChange={(e)=>setDecimalsInput(e.target.value)}
                    className="w-40"
                  />
                  <Button variant="outline" size="sm" onClick={generatePaymentQr}>
                    生成支付二维码
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  说明：将金额换算为最小单位，生成符合 EIP‑681 的支付 URI，支持 OKX/MetaMask 手机端扫码自动填充。
                </div>
                {eipUri && (
                  <div className="text-xs">
                    <div className="font-medium text-muted-foreground">支付 URI：</div>
                    <div className="font-mono break-all">{eipUri}</div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center">
                {qrDataUrl ? (
                  <div className="relative w-56 h-56">
                    <img src={qrDataUrl} alt="支付二维码" className="w-56 h-56 border rounded-2xl" />
                    {/* 居中叠加代币Logo */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src={selectedToken === 'USDT' ? '/images/usdt.png' : '/images/usdc.png'}
                        alt={selectedToken}
                        className="w-12 h-12 rounded-xl shadow-lg border-2 border-white bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-56 h-56 border rounded-2xl flex items-center justify-center text-xs text-muted-foreground">
                    生成后显示二维码
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* 测试信息 */}
          <div className="space-y-2">
            <div className="text-sm font-medium">测试信息</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="font-medium text-muted-foreground">接收地址:</div>
                <div className="font-mono break-all">{selectedChain === 'solana' ? SOLANA_RECEIVER : RECEIVER}</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-muted-foreground">订单ID:</div>
                <div className="font-mono">{orderId}</div>
              </div>
              {lastTx && (
                <div className="space-y-1">
                  <div className="font-medium text-muted-foreground">最近交易:</div>
                  <div className="font-mono break-all">{lastTx}</div>
                </div>
              )}
              {lastStatus && (
                <div className="space-y-1">
                  <div className="font-medium text-muted-foreground">最近状态:</div>
                  <div className="font-mono">{lastStatus}</div>
                </div>
              )}
            </div>
          </div>

          {/* 开始测试 / 切换网络 */}
          <Button 
            onClick={startTest} 
            disabled={loading || !account}
            className="w-full"
          >
            {loading ? '测试中...' : '开始完整闭环测试'}
          </Button>
          <div className="flex items-center justify-end">
            <Select value={selectedChain} onValueChange={(value) => switchToChain(value as keyof typeof CHAIN_CONFIGS)}>
              <SelectTrigger className="w-52">
                <div className="flex items-center gap-2">
                  <img 
                    src={CHAIN_CONFIGS[selectedChain].logo} 
                    alt={CHAIN_CONFIGS[selectedChain].displayName}
                    className="w-4 h-4 rounded-full"
                  />
                  <span className="truncate">{CHAIN_CONFIGS[selectedChain].displayName}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CHAIN_CONFIGS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <img 
                        src={config.logo} 
                        alt={config.displayName}
                        className="w-4 h-4 rounded-full"
                      />
                      <span>{config.displayName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 调试日志 */}
      {debugLogs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>调试日志</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {debugLogs.length} 条记录
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setDebugLogs([])}
                >
                  清空
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 p-4 rounded-lg font-mono text-xs max-h-96 overflow-y-auto space-y-1">
              {debugLogs.map((log, index) => {
                const isSuccess = log.includes('✅')
                const isError = log.includes('❌') 
                const isWarning = log.includes('⚠️')
                const isInfo = log.includes('🔍')
                
                let textColor = 'text-gray-300'
                if (isSuccess) textColor = 'text-green-400'
                else if (isError) textColor = 'text-red-400'
                else if (isWarning) textColor = 'text-yellow-400'
                else if (isInfo) textColor = 'text-blue-400'
                
                return (
                  <div key={index} className={`break-all ${textColor} leading-relaxed`}>
                    {log}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 快捷工具 */}
      <Card>
        <CardHeader>
          <CardTitle>快捷工具</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const newOrderId = `ORDER_${Date.now()}`
                  setOrderId(newOrderId)
                  addLog(`生成新订单ID: ${newOrderId}`, 'info')
                }}
              >
                生成新订单ID
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (!lastTx) { toast.warning('没有交易记录'); return }
                  if (selectedChain === 'solana') {
                    window.open(`https://solscan.io/tx/${lastTx}`, '_blank')
                  } else if (selectedChain === 'bsc') {
                    window.open(`https://bscscan.com/tx/${lastTx}`, '_blank')
                  } else if (selectedChain === 'ethereum') {
                    window.open(`https://etherscan.io/tx/${lastTx}`, '_blank')
                  } else if (selectedChain === 'arbitrum') {
                    window.open(`https://arbiscan.io/tx/${lastTx}`, '_blank')
                  } else {
                    window.open(`${lastTx}`, '_blank')
                  }
                }}
                disabled={!lastTx}
              >
                查看交易
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify({
                    orderId,
                    amount,
                    selectedToken,
                    tokenAddress: resolvedTokenAddress,
                    receiver: RECEIVER,
                    lastTx,
                    lastStatus
                  }, null, 2))
                  toast.success('测试数据已复制到剪贴板')
                }}
              >
                复制测试数据
              </Button>
            </div>
            
            {/* 常用地址快速填入 */}
            <div className="space-y-2">
              <div className="text-sm font-medium">常用测试合约地址</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomContract(TOKENS.USDT)
                    setSelectedToken('USDT')
                  }}
                >
                  USDT (BSC)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomContract(TOKENS.USDC)
                    setSelectedToken('USDC')
                  }}
                >
                  USDC (BSC)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomContract('')
                  }}
                >
                  清空自定义
                </Button>
              </div>
            </div>

            {/* 离线扫码后的手动校验（可选） */}
            <div className="space-y-2">
              <div className="text-sm font-medium">离线扫码后的手动校验（可选）</div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="粘贴 txHash 进行校验"
                  value={manualTxHash}
                  onChange={(e)=>setManualTxHash(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={verifyManualTx}>校验</Button>
              </div>
              <div className="text-xs text-muted-foreground">
                说明：当网页与钱包无连接（纯扫码转账）时，可粘贴交易哈希进行校验闭环；正式环境可由服务端自动匹配最新来账，无需人工粘贴。
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>测试流程说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="font-medium">测试步骤：</div>
              <div className="space-y-1 text-muted-foreground">
                <div>1. 连接钱包并切换到 BSC Testnet</div>
                <div>2. 选择代币（USDT/USDC）和金额</div>
                <div>3. 调用后端 <code>/api/payments/attempts</code></div>
                <div>4. 执行链上 ERC20 转账</div>
                <div>5. 轮询后端 <code>/api/payments/status</code></div>
                <div>6. 成功后调用 <code>/api/orders/:orderId/payments/notify</code></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">注意事项：</div>
              <div className="space-y-1 text-muted-foreground">
                <div>• 确保后端已启动并配置了 BSC_TESTNET_RPC</div>
                <div>• 钱包需要有足够的 BNB 作为 Gas 费</div>
                <div>• 钱包需要有足够的测试代币余额</div>
                <div>• 测试代币可在 BSC Testnet 水龙头获取</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DevMetrics(){
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string>('')
  const [data, setData] = React.useState<{ total_fees: number; payers_count: number; period: { from: string; to: string } } | null>(null)
  const MERCHANT_ID = process.env.NEXT_PUBLIC_MERCHANT_ID || 'demo-merchant'
  React.useEffect(()=>{
    let cancelled = false
    ;(async()=>{
      try{
        setLoading(true)
        const d = await getJson<{ total_fees:number; payers_count:number; period:{from:string;to:string} }>(`/api/dev/${encodeURIComponent(MERCHANT_ID)}/stats?range=30d`)
        if(!cancelled) setData(d)
      }catch(e){ if(!cancelled) setErr(e instanceof Error ? e.message : String(e)) }
      finally{ if(!cancelled) setLoading(false) }
    })()
    return ()=>{ cancelled = true }
  },[])
  return (
    <div className="text-sm">
      {loading ? 'Loading...' : (
        <div className="flex gap-6">
          <div>
            <div className="text-muted-foreground">Total Fees</div>
            <div className="font-semibold">${data ? data.total_fees.toFixed(2) : '0.00'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Payers</div>
            <div className="font-semibold">{data ? data.payers_count : 0}</div>
          </div>
        </div>
      )}
      {err && <div className="text-xs text-red-500">{err}</div>}
    </div>
  )
}
