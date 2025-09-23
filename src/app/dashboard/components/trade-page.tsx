'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { IconExchange, IconWallet, IconSend } from "@tabler/icons-react";
import Image from "next/image";
import { getJson } from "@/lib/api";
import { useEffect } from "react";

type ChainTokenMap = Record<string, Record<'USDT'|'USDC', { address: string; decimals: number }>>

export function TradePage() {
  const [sendAmount, setSendAmount] = useState('');
  const [sendToken, setSendToken] = useState<'USDT'|'USDC'>('USDC');

  // Token configs with logos (USDT / USDC only)
  const tokenConfigs: Record<'USDT'|'USDC', { name: string; logo: string }> = {
    USDT: { name: 'USDT', logo: '/images/usdt.png' },
    USDC: { name: 'USDC', logo: '/images/usdc.png' },
  };

  // Chain configs with logos
  const chainConfigs: Record<string, { name: string; logo: string }> = {
    'ethereum': { name: 'Ethereum', logo: '/images/eth-chian.png' },
    'bsc': { name: 'BSC', logo: '/images/bsc-chain.png' },
    'arbitrum': { name: 'Arbitrum', logo: '/images/arb-chain.png' },
    'solana': { name: 'Solana', logo: '/images/sol-chain.png' },
  }

  const [chain, setChain] = useState('ethereum')

  // Optional: fetch allowed chain-token map for validation (real business)
  const [chainTokenMap, setChainTokenMap] = useState<ChainTokenMap>({} as ChainTokenMap)
  useEffect(()=>{ (async()=>{
    try{ const data = await getJson<ChainTokenMap>(`/api/config/tokens`); setChainTokenMap(data||{} as ChainTokenMap) }catch{} })() },[])

  // Swap feature pending

  return (
    <div className="flex justify-center">
      <div className="space-y-6 max-w-4xl w-full">

      <Tabs defaultValue="send" className="w-full space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send">
            <IconSend className="mr-2 h-4 w-4" />
            Send
          </TabsTrigger>
          <TabsTrigger value="swap">
            <IconExchange className="mr-2 h-4 w-4" />
            Swap
          </TabsTrigger>
        </TabsList>

        {/* Swap Tokens */}
        <TabsContent value="swap" className="space-y-6 mt-4">
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <IconExchange className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">Swap is coming soon. Direct Send is available below.</h3>
                  <p className="text-sm text-muted-foreground mt-2">Token swap feature is under development</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Tokens */}
        <TabsContent value="send" className="space-y-6 mt-4">
          <Card>
            <CardContent className="space-y-6 pt-6">
              {/* Select Token */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Select Token</div>
                <Select value={sendToken} onValueChange={(v)=>setSendToken(v as 'USDT'|'USDC')}>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <Image src={tokenConfigs[sendToken].logo} alt={sendToken} width={16} height={16} className="rounded-full" />
                        <span>{tokenConfigs[sendToken].name}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tokenConfigs).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Image src={cfg.logo} alt={key} width={16} height={16} className="rounded-full" />
                          <span>{cfg.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Chain */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Select Chain</div>
                <Select value={chain} onValueChange={(v)=>setChain(v)}>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <Image src={chainConfigs[chain]?.logo || '/images/eth-chian.png'} alt={chain} width={16} height={16} className="rounded-full" />
                        <span>{chainConfigs[chain]?.name || chain}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(chainConfigs).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Image src={cfg.logo} alt={key} width={16} height={16} className="rounded-full" />
                          <span>{cfg.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Recipient Address */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Recipient Address</div>
                <Input placeholder="0x..." />
                <div className="text-sm text-muted-foreground">
                  Please double-check the address, transfers cannot be reversed
                </div>
              </div>

              {/* Send Amount */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Send Amount</div>
                <div className="flex gap-2">
                  <Input placeholder="0.00" className="flex-1" />
                  <Button variant="outline">Max</Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Available balance: 1,234.56 USDC
                </div>
              </div>

              {/* Network Fee */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Network Fee</div>
                <div className="flex gap-2">
                  <Badge variant="outline">Slow (~5min) - $1.23</Badge>
                  <Badge variant="default">Standard (~2min) - $2.45</Badge>
                  <Badge variant="outline">Fast (~30s) - $4.89</Badge>
                </div>
              </div>

              {/* Total */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span>Send Amount</span>
                  <span>100.00 USDC</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Network Fee</span>
                  <span>$2.45</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Total</span>
                  <span>102.45 USDC</span>
                </div>
              </div>

              <Button className="w-full" size="lg">
                Confirm
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
