'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { EVMWalletProvider } from '@/lib/evm-wallet-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <EVMWalletProvider>
        {children}
      </EVMWalletProvider>
    </QueryClientProvider>
  );
}

