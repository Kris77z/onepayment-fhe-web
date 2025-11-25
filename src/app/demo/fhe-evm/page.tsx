'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useEVMWallet } from '@/lib/evm-wallet-provider';
import {
  encryptAmountFHEVM,
  decryptAmountFHEVM,
  checkFHEVMHealth,
  formatAmount,
  validateAmount,
  FHEVMError,
} from '@/lib/fhevm-relayer';
import {
  addPayment,
  getEncryptedBalance,
  createFHEVMWalletClient,
  getFHEPaymentGatewayAddress,
} from '@/lib/fhevm-contract';
import { getContractAddresses } from '@/lib/config';

export default function FHEVMDemoPage() {
  const { toast } = useToast();
  const { address, isConnected, connect, walletClient } = useEVMWallet();
  const [amount, setAmount] = useState('100');
  const [encryptedValue, setEncryptedValue] = useState<string | null>(null);
  const [decryptedAmount, setDecryptedAmount] = useState<number | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [isGettingBalance, setIsGettingBalance] = useState(false);
  const [contractBalance, setContractBalance] = useState<string | null>(null);

  const contractAddress = getContractAddresses().fhePaymentGateway;

  const handleCheckHealth = async () => {
    setIsHealthChecking(true);
    try {
      const healthy = await checkFHEVMHealth();
      setIsHealthy(healthy);
      if (healthy) {
        toast.success('FHEVM 服务正常', 'FHEVM Relayer SDK 运行正常，可以进行加密/解密操作');
      } else {
        toast.error('FHEVM 服务不可用', '请确保 FHEVM Relayer SDK 已正确配置');
      }
    } catch (error) {
      setIsHealthy(false);
      toast.error('健康检查失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsHealthChecking(false);
    }
  };

  const handleEncrypt = async () => {
    const amountNum = parseInt(amount, 10);
    const validation = validateAmount(amountNum);

    if (!validation.isValid) {
      toast.error('验证失败', validation.error || '金额格式不正确');
      return;
    }

    if (!address) {
      toast.error('钱包未连接', '请先连接钱包');
      return;
    }

    setIsEncrypting(true);
    setEncryptedValue(null);
    setDecryptedAmount(null);

    try {
      const encrypted = await encryptAmountFHEVM(amountNum, contractAddress, address);
      setEncryptedValue(encrypted.encryptedValue);
      toast.success('加密成功', `金额 ${amountNum} 已加密`);
    } catch (error) {
      if (error instanceof FHEVMError) {
        toast.error('加密失败', error.message);
      } else {
        toast.error('加密失败', error instanceof Error ? error.message : '未知错误');
      }
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDecrypt = async () => {
    if (!encryptedValue) {
      toast.error('没有密文', '请先加密一个金额');
      return;
    }

    setIsDecrypting(true);
    setDecryptedAmount(null);

    try {
      const decrypted = await decryptAmountFHEVM(encryptedValue, contractAddress);
      setDecryptedAmount(decrypted);
      toast.success('解密成功', `解密金额: ${decrypted}`);
    } catch (error) {
      if (error instanceof FHEVMError) {
        toast.error('解密失败', error.message);
      } else {
        toast.error('解密失败', error instanceof Error ? error.message : '未知错误');
      }
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleAddPayment = async () => {
    if (!isConnected || !address) {
      toast.error('钱包未连接', '请先连接钱包');
      return;
    }

    if (!encryptedValue) {
      toast.error('没有加密金额', '请先加密一个金额');
      return;
    }

    setIsAddingPayment(true);

    try {
      const client = createFHEVMWalletClient(address);
      const txHash = await addPayment(client, address, encryptedValue as `0x${string}`);
      
      toast.success('支付成功', `交易哈希: ${txHash.slice(0, 10)}...`);

      // Refresh balance
      await handleGetBalance();
    } catch (error) {
      toast.error('支付失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsAddingPayment(false);
    }
  };

  const handleGetBalance = async () => {
    if (!address) {
      toast.error('钱包未连接', '请先连接钱包');
      return;
    }

    setIsGettingBalance(true);

    try {
      const balance = await getEncryptedBalance(address);
      setContractBalance(balance);
      toast.success('余额获取成功', '已获取加密余额');
    } catch (error) {
      toast.error('获取余额失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsGettingBalance(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">FHEVM 加密/解密演示</h1>
        <p className="text-sm text-muted-foreground">
          测试 FHEVM（全同态加密虚拟机）的加密、解密和合约交互功能
        </p>
      </section>

      {/* Wallet Connection */}
      <Card>
        <CardHeader>
          <CardTitle>钱包连接</CardTitle>
          <CardDescription>连接 EVM 钱包以使用 FHEVM 功能</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                钱包状态: {isConnected ? `✅ 已连接 (${address?.slice(0, 6)}...${address?.slice(-4)})` : '❌ 未连接'}
              </p>
              <p className="text-xs text-muted-foreground">
                合约地址: {contractAddress}
              </p>
            </div>
            {!isConnected && (
              <Button onClick={connect}>
                连接钱包
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Health Check */}
      <Card>
        <CardHeader>
          <CardTitle>服务状态</CardTitle>
          <CardDescription>检查 FHEVM Relayer SDK 是否可用</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                服务状态:{' '}
                {isHealthy === null
                  ? '未检查'
                  : isHealthy
                  ? '✅ 正常'
                  : '❌ 不可用'}
              </p>
            </div>
            <Button onClick={handleCheckHealth} disabled={isHealthChecking}>
              {isHealthChecking ? '检查中...' : '检查服务'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Encryption */}
      <Card>
        <CardHeader>
          <CardTitle>加密金额</CardTitle>
          <CardDescription>输入金额进行 FHEVM 加密</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">金额 (整数，uint32)</Label>
            <Input
              id="amount"
              type="number"
              step="1"
              min="1"
              max="4294967295"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="例如: 100"
            />
            <p className="text-xs text-muted-foreground">
              支持范围: 1 - 4,294,967,295 (uint32 最大值)
            </p>
          </div>
          <Button onClick={handleEncrypt} disabled={isEncrypting || !isConnected}>
            {isEncrypting ? '加密中...' : '加密'}
          </Button>
          {encryptedValue && (
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">加密结果:</p>
              <p className="font-mono text-xs break-all">{encryptedValue}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decryption */}
      <Card>
        <CardHeader>
          <CardTitle>解密金额</CardTitle>
          <CardDescription>解密之前加密的金额</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleDecrypt} disabled={isDecrypting || !encryptedValue}>
            {isDecrypting ? '解密中...' : '解密'}
          </Button>
          {decryptedAmount !== null && (
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">解密结果:</p>
              <p className="text-2xl font-bold">{decryptedAmount}</p>
              {encryptedValue && (
                <p className="text-xs text-muted-foreground">
                  原始金额: {amount} | 解密金额: {decryptedAmount} |{' '}
                  {parseInt(amount, 10) === decryptedAmount ? '✅ 匹配' : '❌ 不匹配'}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Interaction */}
      <Card>
        <CardHeader>
          <CardTitle>合约交互</CardTitle>
          <CardDescription>与 FHEPaymentGateway 合约交互</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={handleAddPayment}
              disabled={isAddingPayment || !isConnected || !encryptedValue}
            >
              {isAddingPayment ? '支付中...' : '添加支付到合约'}
            </Button>
            <Button
              onClick={handleGetBalance}
              disabled={isGettingBalance || !isConnected}
              variant="outline"
            >
              {isGettingBalance ? '获取中...' : '获取加密余额'}
            </Button>
          </div>
          {contractBalance && (
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">合约中的加密余额:</p>
              <p className="font-mono text-xs break-all">{contractBalance}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>关于 FHEVM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>FHEVM（全同态加密虚拟机）</strong>允许在不解密数据的情况下对加密数据进行计算。
          </p>
          <p>在这个演示中，您可以：</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>加密支付金额</li>
            <li>解密加密后的金额</li>
            <li>将加密金额添加到链上合约</li>
            <li>从合约中获取加密余额</li>
          </ul>
          <p className="mt-4">
            <strong>注意：</strong>当前实现使用 placeholder，实际部署时需要安装真正的 FHEVM Relayer SDK。
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

