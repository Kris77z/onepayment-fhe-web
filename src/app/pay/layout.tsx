'use client';

import { AppProviders } from '../providers';
import { SolanaWalletProvider } from '@/lib/wallet-provider';

export const dynamic = 'force-dynamic';

export default function PayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <SolanaWalletProvider>
        {children}
      </SolanaWalletProvider>
    </AppProviders>
  );
}

