'use client';

import { SectionCards } from "@/components/section-cards";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import PaymentsTable from "./payments-table";
import { PaymentStatsCards } from "./payment-stats-cards";
import { SystemStatusCards } from "./system-status-cards";

export function OverviewPage() {
  return (
    <div className="flex flex-col gap-4">
      {/* Overview cards - income, expenses, users, growth */}
      <SectionCards />
      
      {/* Payment Statistics Cards - x402/FHE stats */}
      <PaymentStatsCards />
      
      {/* System Status Cards - Facilitator, Network, FHE Service */}
      <SystemStatusCards />
      
      {/* Interactive Chart */}
      <ChartAreaInteractive />
      
      {/* Transaction History Table */}
      <PaymentsTable />
    </div>
  );
}
