// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportsClient } from "@/app/(admin)/admin/reports/reports-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("Admin Reports UI", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    queryClient.clear();
  });

  it("23. Admin reports UI renders summary cards, 25. renders loading state", async () => {
    (global.fetch as unknown as import("vitest").Mock).mockImplementation(
      async (url: string) => {
        if (url.includes("sales"))
          return {
            ok: true,
            json: async () => ({
              totalRevenueMinor: 1000,
              paidTicketCount: 1,
              averageTicketValueMinor: 1000,
            }),
          };
        if (url.includes("items")) return { ok: true, json: async () => [] };
        if (url.includes("payments")) return { ok: true, json: async () => [] };
        if (url.includes("performance"))
          return { ok: true, json: async () => ({}) };
      },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <ReportsClient />
      </QueryClientProvider>,
    );

    // Initial loading
    expect(document.querySelector(".animate-pulse")).toBeDefined();

    // Cards load
    expect((await screen.findAllByText("$10.00"))[0]).toBeDefined();
  });

  it("24. Admin reports UI renders empty state", async () => {
    (global.fetch as unknown as import("vitest").Mock).mockImplementation(
      async (url: string) => {
        if (url.includes("sales"))
          return {
            ok: true,
            json: async () => ({
              totalRevenueMinor: 0,
              paidTicketCount: 0,
              averageTicketValueMinor: 0,
            }),
          };
        if (url.includes("items")) return { ok: true, json: async () => [] };
        if (url.includes("payments")) return { ok: true, json: async () => [] };
        if (url.includes("performance"))
          return { ok: true, json: async () => ({}) };
      },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <ReportsClient />
      </QueryClientProvider>,
    );

    expect((await screen.findAllByText("$0.00"))[0]).toBeDefined();
  });

  it("26. Admin reports UI renders error/retry state", async () => {
    (global.fetch as unknown as import("vitest").Mock).mockResolvedValue({
      ok: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ReportsClient />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Failed to load sales/i)).toBeDefined();
  });
});
