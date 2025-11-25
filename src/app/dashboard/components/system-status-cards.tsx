"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Wifi, Server, Lock } from "lucide-react";

// Type workaround for React version conflicts
const CheckCircleComp = CheckCircle as any;
const XCircleComp = XCircle as any;
const ClockComp = Clock as any;
const WifiComp = Wifi as any;
const ServerComp = Server as any;
const LockComp = Lock as any;
import { useEffect, useState } from "react";
import { useEVMWallet } from "@/lib/evm-wallet-provider";
import { getX402Config } from "@/lib/config";
import { checkFHEHealth } from "@/lib/fhe-utils";

interface SystemStatus {
  facilitator: {
    status: 'online' | 'offline' | 'checking';
    name: string;
    responseTime?: number;
    url?: string;
  };
  network: {
    status: 'connected' | 'disconnected' | 'wrong';
    name: string;
    chainId?: number;
  };
  fhe: {
    status: 'online' | 'offline' | 'checking';
    responseTime?: number;
  };
}

export function SystemStatusCards() {
  const { isConnected, chainId, isCorrectNetwork } = useEVMWallet();
  const [status, setStatus] = useState<SystemStatus>({
    facilitator: { status: 'checking', name: 'Unknown' },
    network: { status: 'disconnected', name: 'Not Connected' },
    fhe: { status: 'checking' },
  });

  useEffect(() => {
    const checkFacilitator = async () => {
      try {
        const startTime = Date.now();
        const config = getX402Config();
        
        // Try to fetch facilitator health/status
        // For EVM x402, we can check the facilitator URL directly
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${config.facilitatorUrl}/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - startTime;

        // Determine facilitator name from URL
        let facilitatorName = 'PayAI';
        if (config.facilitatorUrl.includes('cdp.coinbase.com')) {
          facilitatorName = 'Coinbase CDP';
        } else if (config.facilitatorUrl.includes('payai.network')) {
          facilitatorName = 'PayAI';
        }

        if (response.ok) {
          setStatus((prev) => ({
            ...prev,
            facilitator: {
              status: 'online',
              name: facilitatorName,
              responseTime,
              url: config.facilitatorUrl,
            },
          }));
        } else {
          throw new Error('Facilitator health check failed');
        }
      } catch (error) {
        // If health endpoint doesn't exist, try a simple GET request
        try {
          const config = getX402Config();
          const startTime = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(config.facilitatorUrl, {
            method: 'GET',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;

          let facilitatorName = 'PayAI';
          if (config.facilitatorUrl.includes('cdp.coinbase.com')) {
            facilitatorName = 'Coinbase CDP';
          } else if (config.facilitatorUrl.includes('payai.network')) {
            facilitatorName = 'PayAI';
          }

          setStatus((prev) => ({
            ...prev,
            facilitator: {
              status: response.ok ? 'online' : 'offline',
              name: facilitatorName,
              responseTime: response.ok ? responseTime : undefined,
              url: config.facilitatorUrl,
            },
          }));
        } catch (e) {
          setStatus((prev) => ({
            ...prev,
            facilitator: { status: 'offline', name: 'Unknown' },
          }));
        }
      }
    };

    const checkFHE = async () => {
      try {
        const startTime = Date.now();
        const healthy = await checkFHEHealth();
        const responseTime = Date.now() - startTime;

        setStatus((prev) => ({
          ...prev,
          fhe: {
            status: healthy ? 'online' : 'offline',
            responseTime: healthy ? responseTime : undefined,
          },
        }));
      } catch (error) {
        setStatus((prev) => ({
          ...prev,
          fhe: { status: 'offline' },
        }));
      }
    };

    checkFacilitator();
    checkFHE();

    // Refresh status every 30 seconds
    const interval = setInterval(() => {
      checkFacilitator();
      checkFHE();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const networkName = chainId === 84532 ? 'Base Sepolia' : chainId ? `Chain ${chainId}` : 'Not Connected';
    let networkStatus: 'connected' | 'disconnected' | 'wrong' = 'disconnected';
    
    if (isConnected) {
      networkStatus = isCorrectNetwork ? 'connected' : 'wrong';
    }

    setStatus((prev) => ({
      ...prev,
      network: {
        status: networkStatus,
        name: networkName,
        chainId: chainId ?? undefined,
      },
    }));
  }, [isConnected, chainId, isCorrectNetwork]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'connected':
        return <CheckCircleComp className="w-4 h-4 text-green-500" />;
      case 'offline':
      case 'disconnected':
        return <XCircleComp className="w-4 h-4 text-red-500" />;
      case 'checking':
        return <ClockComp className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'wrong':
        return <XCircleComp className="w-4 h-4 text-yellow-500" />;
      default:
        return <ClockComp className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
      case 'connected':
        return <Badge variant="outline" className="text-xs text-green-600 border-green-600">Online</Badge>;
      case 'offline':
      case 'disconnected':
        return <Badge variant="outline" className="text-xs text-red-600 border-red-600">Offline</Badge>;
      case 'checking':
        return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">Checking</Badge>;
      case 'wrong':
        return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">Wrong Network</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Unknown</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <ServerComp className="w-4 h-4" />
            Facilitator
          </CardDescription>
          <CardTitle className="text-lg font-semibold">
            {status.facilitator.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {getStatusIcon(status.facilitator.status)}
            {getStatusBadge(status.facilitator.status)}
          </div>
          {status.facilitator.responseTime && (
            <div className="mt-2 text-xs text-muted-foreground">
              Response: {status.facilitator.responseTime}ms
            </div>
          )}
          {status.facilitator.url && (
            <div className="mt-2 text-xs text-muted-foreground truncate">
              {status.facilitator.url.replace('https://', '').replace('http://', '')}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <WifiComp className="w-4 h-4" />
            Network
          </CardDescription>
          <CardTitle className="text-lg font-semibold">
            {status.network.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {getStatusIcon(status.network.status)}
            {getStatusBadge(status.network.status)}
          </div>
          {status.network.chainId && (
            <div className="mt-2 text-xs text-muted-foreground">
              Chain ID: {status.network.chainId}
            </div>
          )}
          {status.network.status === 'wrong' && (
            <div className="mt-2 text-xs text-yellow-600">
              Please switch to Base Sepolia
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <LockComp className="w-4 h-4" />
            FHE Service
          </CardDescription>
          <CardTitle className="text-lg font-semibold">
            FHE Relayer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {getStatusIcon(status.fhe.status)}
            {getStatusBadge(status.fhe.status)}
          </div>
          {status.fhe.responseTime && (
            <div className="mt-2 text-xs text-muted-foreground">
              Response: {status.fhe.responseTime}ms
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

