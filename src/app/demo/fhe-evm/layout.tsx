'use client';

import { AppProviders } from '../../providers';

export const dynamic = 'force-dynamic';

export default function FHEEVMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      {children}
    </AppProviders>
  );
}

