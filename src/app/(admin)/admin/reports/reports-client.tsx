"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { MoneyText } from "@/components/ui/money-text";

interface ReportItem {
  menuItemId: string;
  nameSnapshot: string;
  revenueMinor: number;
  quantity: number;
}

interface ReportPayment {
  method: string;
  totalMinor: number;
  count: number;
}

export function ReportsClient() {
  const [range, setRange] = useState("today");

  const getDates = () => {
    const now = new Date();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const from = new Date(to);
    if (range === "today") from.setDate(from.getDate() - 1);
    if (range === "yesterday") {
      to.setDate(to.getDate() - 1);
      from.setDate(from.getDate() - 2);
    }
    if (range === "7days") from.setDate(from.getDate() - 7);
    if (range === "30days") from.setDate(from.getDate() - 30);
    return { from, to };
  };

  const { from, to } = getDates();
  const queryStr = `?from=${from.toISOString()}&to=${to.toISOString()}`;

  const {
    data: sales,
    isLoading: isSalesLoading,
    error: salesError,
  } = useQuery({
    queryKey: ["reports", "sales", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/reports/sales${queryStr}`);
      if (!res.ok) throw new Error("Failed to load sales");
      return res.json();
    },
  });

  const {
    data: items,
    isLoading: isItemsLoading,
    error: itemsError,
  } = useQuery({
    queryKey: ["reports", "items", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/reports/items${queryStr}`);
      if (!res.ok) throw new Error("Failed to load items");
      return res.json();
    },
  });

  const {
    data: payments,
    isLoading: isPaymentsLoading,
    error: paymentsError,
  } = useQuery({
    queryKey: ["reports", "payments", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/reports/payments${queryStr}`);
      if (!res.ok) throw new Error("Failed to load payments");
      return res.json();
    },
  });

  const {
    data: performance,
    isLoading: isPerformanceLoading,
    error: performanceError,
  } = useQuery({
    queryKey: ["reports", "performance", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/reports/performance${queryStr}`);
      if (!res.ok) throw new Error("Failed to load performance");
      return res.json();
    },
  });

  const isLoading =
    isSalesLoading ||
    isItemsLoading ||
    isPaymentsLoading ||
    isPerformanceLoading;
  const error = salesError || itemsError || paymentsError || performanceError;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Reports"
        description="View operational metrics and sales performance."
        actions={
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white p-2 text-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            aria-label="Date range"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        }
      />

      {isLoading && <LoadingSkeleton />}
      {error && <ErrorState title="Error" description={error.message} />}

      {!isLoading && !error && sales && (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Total Revenue
              </h3>
              <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                <MoneyText amountMinor={sales.totalRevenueMinor} />
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Paid Tickets
              </h3>
              <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {sales.paidTicketCount}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Average Ticket
              </h3>
              <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                <MoneyText amountMinor={sales.averageTicketValueMinor} />
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Exceptions
              </h3>
              <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
                {performance?.exceptions?.voidedLines || 0} voids
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Top Items */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Top Menu Items
              </h3>
              {items && items.length > 0 ? (
                <ul className="space-y-4">
                  {items.map((item: ReportItem) => (
                    <li
                      key={item.menuItemId}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {item.nameSnapshot}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {item.quantity} sold
                        </p>
                      </div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        <MoneyText amountMinor={item.revenueMinor} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-500 dark:text-zinc-400">
                  No items sold in this period.
                </p>
              )}
            </div>

            {/* Payments */}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Payment Methods
              </h3>
              {payments && payments.length > 0 ? (
                <ul className="space-y-4">
                  {payments.map((p: ReportPayment) => (
                    <li
                      key={p.method}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {p.method}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {p.count} transactions
                        </p>
                      </div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        <MoneyText amountMinor={p.totalMinor} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-500 dark:text-zinc-400">
                  No payments in this period.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
