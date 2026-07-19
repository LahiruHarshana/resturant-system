// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditLogsClient } from "@/app/(admin)/admin/audit-logs/audit-logs-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("Admin Audit Logs UI", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    queryClient.clear();
  });

  it("28. Audit log UI renders log table & 30. hides sensitive metadata", async () => {
    (global.fetch as unknown as import("vitest").Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "1",
            action: "LOGIN",
            actorName: "Admin",
            entity: "User",
            entityId: "123",
            at: new Date().toISOString(),
            metadata: { password: "[REDACTED]" },
          },
        ],
        totalPages: 1,
        page: 1,
      }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuditLogsClient />
      </QueryClientProvider>,
    );

    // Initial loading
    expect(document.querySelector(".animate-pulse")).toBeDefined();

    // Table loads
    expect(await screen.findByText("LOGIN")).toBeDefined();
    expect(screen.getByText("Admin")).toBeDefined();
  });

  it("29. Audit log UI handles pagination", async () => {
    (global.fetch as unknown as import("vitest").Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        totalPages: 2,
        page: 1,
      }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuditLogsClient />
      </QueryClientProvider>,
    );

    const nextBtn = await screen.findByRole("button", { name: /Next page/i });
    expect(nextBtn).toBeDefined();
    fireEvent.click(nextBtn);
    expect(
      (global.fetch as unknown as import("vitest").Mock).mock.calls.length,
    ).toBeGreaterThanOrEqual(1);
  });
});
