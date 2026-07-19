/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { TicketClient } from "@/app/(waiter)/waiter/tickets/[id]/ticket-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as useChannelHook from "@/components/realtime/use-channel";

vi.mock("@/components/realtime/use-channel", () => ({
  useRealtimeChannel: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-order-cart", () => ({
  useOrderCart: vi.fn(() => []),
}));

const mockTicket = {
  id: "ticket-1",
  ticketNo: 123,
  tableId: "table-1",
  waiterId: "waiter-1",
  status: "OPEN" as const,
  guestCount: 2,
  openedAt: new Date().toISOString(),
};

const mockMenu = {
  categories: [{ id: "cat-1", name: "Mains" }],
  items: [],
};

describe("Waiter Serving UI", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("should show ready lines in the pickup area and allow marking them served", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        lines: [
          {
            id: "line-1",
            itemNameSnapshot: "Burger",
            quantity: 1,
            status: "READY",
          },
        ],
      }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TicketClient initialTicket={mockTicket} menu={mockMenu} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Ready for Pickup \(1\)/i)).toBeTruthy();
    });

    expect(screen.getByText("1x")).toBeTruthy();
    expect(screen.getByText("Burger")).toBeTruthy();

    let mutationResolve: (value: unknown) => void;
    const mutationPromise = new Promise((resolve) => {
      mutationResolve = resolve;
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async (url) => {
        if (typeof url === "string" && url.includes("/served")) {
          await mutationPromise;
          return { ok: true, json: async () => ({ success: true }) };
        }
      },
    );

    const serveBtn = screen.getByRole("button", { name: /Mark Served/i });
    fireEvent.click(serveBtn);

    // Button should be disabled during mutation (duplicate submit disabled)
    await waitFor(() => {
      expect(serveBtn.hasAttribute("disabled")).toBe(true);
    });

    // Resolve the mutation
    mutationResolve!({ ok: true, json: async () => ({ success: true }) });

    // Mock refetch returning empty array
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lines: [] }),
    });

    await waitFor(() => {
      expect(screen.queryByText(/Ready for Pickup/i)).toBeNull();
    });
  });

  it("realtime READY event updates UI without full page refresh", async () => {
    // Initial fetch returns empty
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lines: [] }),
    });

    let channelCallback: (event: Record<string, unknown>) => void = () => {};
    vi.spyOn(useChannelHook, "useRealtimeChannel").mockImplementation(
      ({ onEvent }) => {
        channelCallback = onEvent as (event: Record<string, unknown>) => void;
      },
    );

    render(
      <QueryClientProvider client={queryClient}>
        <TicketClient initialTicket={mockTicket} menu={mockMenu} />
      </QueryClientProvider>,
    );

    // Initial state: no pickup area
    expect(screen.queryByText(/Ready for Pickup/i)).toBeNull();

    // Wait for the first fetch to complete so the query is fully active
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Mock refetch triggered by realtime event
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        lines: [
          {
            id: "line-2",
            itemNameSnapshot: "Fries",
            quantity: 2,
            status: "READY",
          },
        ],
      }),
    });

    // Simulate realtime event
    channelCallback({ status: "READY", previousStatus: "PREPARING" });

    // Verify UI updates
    await waitFor(() => {
      expect(screen.getByText(/Ready for Pickup \(1\)/i)).toBeTruthy();
    });
    expect(screen.getByText("2x")).toBeTruthy();
    expect(screen.getByText("Fries")).toBeTruthy();
  });
});
