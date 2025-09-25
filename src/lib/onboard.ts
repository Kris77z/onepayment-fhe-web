// 动态导入，避免在服务端打包期解析依赖链（pino-pretty）
import type { OnboardAPI, WalletState } from '@web3-onboard/core'

let onboardSingleton: OnboardAPI | null = null

export async function getOnboard(): Promise<OnboardAPI> {
  if (onboardSingleton) return onboardSingleton
  if (typeof window === 'undefined') {
    throw new Error('getOnboard must be called in browser')
  }

  const [{ default: Onboard }, { default: injectedModule }, { default: walletConnectModule }] = await Promise.all([
    import('@web3-onboard/core'),
    import('@web3-onboard/injected-wallets'),
    import('@web3-onboard/walletconnect')
  ])

  const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'b95b3a526564c9e0e5700eb061374ffb'

  const injected = injectedModule()
  const walletconnect = walletConnectModule({ projectId: WC_PROJECT_ID })

  const chains = [
    {
      id: '0x1',
      token: 'ETH',
      label: 'Ethereum',
      rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC || 'https://rpc.ankr.com/eth',
    },
    {
      id: '0x38',
      token: 'BNB',
      label: 'BNB Smart Chain',
      rpcUrl: process.env.NEXT_PUBLIC_BSC_RPC || 'https://bsc-dataseed1.binance.org',
    },
    {
      id: '0xa4b1',
      token: 'ETH',
      label: 'Arbitrum One',
      rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
    },
    // 占位：Solana 非 EVM，Onboard EVM 链表不加入；改由后续 Solana 连接层单独实现
  ]

  onboardSingleton = Onboard({
    wallets: [walletconnect, injected],
    chains,
    appMetadata: {
      name: 'OnePay',
      description: 'USDT/USDC 结算支付',
      recommendedInjectedWallets: [
        { name: 'MetaMask', url: 'https://metamask.io' },
        { name: 'OKX Wallet', url: 'https://www.okx.com/web3' },
      ],
    },
  })

  return onboardSingleton
}

export async function connectWithOnboard(): Promise<WalletState[] | undefined> {
  const onboard = await getOnboard()
  const wallets = await onboard.connectWallet()
  return wallets
}


