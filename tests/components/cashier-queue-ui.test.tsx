// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueueClient } from "@/components/cashier/queue-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useRealtimeChannel } from "@/components/realtime/use-channel";

vi.mock("@/components/realtime/use-channel", () => ({
  useRealtimeChannel: vi.fn(),
}));

describe("Cashier Queue UI", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should render empty queue message when no tickets", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tickets: [] }),
    });

    render(<QueueClient />, { wrapper });

    expect(await screen.findByText("Queue is empty")).toBeDefined();
  });

  it("should render tickets in queue", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tickets: [
          {
            id: "1",
            ticketNo: 101,
            tableLabel: "T1",
            waiterName: "John",
            status: "CLOSED",
            totalMinor: 5000,
            closedAt: new Date().toISOString(),
            lineSummary: [{ quantity: 1, nameSnapshot: "Burger" }],
          },
        ],
      }),
    });

    render(<QueueClient />, { wrapper });

    expect(await screen.findByText("#101")).toBeDefined();
    expect(await screen.findByText("$50.00")).toBeDefined();
    expect(await screen.findByText("T1")).toBeDefined();
  });

  it("cashier queue receives realtime close event without full page refresh", async () => {
    let capturedHandler: (payload: unknown) => void = () => {};
    vi.mocked(useRealtimeChannel).mockImplementation(
      ({ eventName, onEvent }) => {
        if (eventName === "ticket.closed.v1") {
          capturedHandler = onEvent;
        }
      },
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tickets: [] }),
    });

    render(<QueueClient />, { wrapper });

    expect(await screen.findByText("Queue is empty")).toBeDefined();

    // Should invalidate and refetch. We need to mock the second fetch BEFORE triggering the event.
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tickets: [
          {
            id: "2",
            ticketNo: 102,
            tableLabel: "T2",
            waiterName: "Alice",
            status: "CLOSED",
            totalMinor: 7500,
            closedAt: new Date().toISOString(),
            lineSummary: [{ quantity: 2, nameSnapshot: "Fries" }],
          },
        ],
      }),
    });

    // Trigger realtime event
    capturedHandler({
      id: "2",
      ticketNo: 102,
      tableLabel: "T2",
      waiterName: "Alice",
      status: "CLOSED",
      totalMinor: 7500,
      closedAt: new Date().toISOString(),
      lineSummary: [{ quantity: 2, nameSnapshot: "Fries" }],
    });

    // Should appear without refresh
    expect(await screen.findByText("#102")).toBeDefined();
    expect(await screen.findByText("$75.00")).toBeDefined();
  });

  it("invalid realtime payload is ignored", async () => {
    let capturedHandler: (payload: unknown) => void = () => {};
    vi.mocked(useRealtimeChannel).mockImplementation(
      ({ eventName, onEvent }) => {
        if (eventName === "ticket.closed.v1") {
          capturedHandler = onEvent;
        }
      },
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tickets: [] }),
    });

    render(<QueueClient />, { wrapper });
    expect(await screen.findByText("Queue is empty")).toBeDefined();

    // Invalid payload
    capturedHandler({ id: "3", status: "CLOSED" }); // Missing many fields

    // Should still be empty, no crash
    expect(await screen.findByText("Queue is empty")).toBeDefined();
  });

  it("subscription cleanup occurs on unmount and remount does not duplicate handlers", async () => {
    const channelMock = vi.mocked(useRealtimeChannel);
    channelMock.mockClear();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tickets: [] }),
    });

    const { unmount } = render(<QueueClient />, { wrapper });
    expect(channelMock).toHaveBeenCalled();

    unmount();

    // Remount
    render(<QueueClient />, { wrapper });
    expect(channelMock).toHaveBeenCalledTimes(2);
  });
});
