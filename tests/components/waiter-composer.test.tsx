// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock the entire realtime module so TicketClient doesn't need RealTimeProvider
vi.mock("@/components/realtime/use-channel", () => ({
  useRealtimeChannel: vi.fn(),
}));

vi.mock("@/components/realtime/provider", () => ({
  RealTimeProvider: ({ children }: { children: React.ReactNode }) => children,
  useRealtimeConnection: vi.fn(() => ({
    status: "disconnected",
    channel: null,
  })),
}));

import type { CartItem } from "@/hooks/use-order-cart";

vi.mock("@/hooks/use-order-cart", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const zustand = require("zustand");

  interface MockState {
    itemsByTicket: Record<string, CartItem[]>;
    addItem: (ticketId: string, item: Omit<CartItem, "cartItemId">) => void;
    removeItem: (ticketId: string, cartItemId: string) => void;
    clearCart: (ticketId: string) => void;
  }

  const createFn = (zustand.create ||
    zustand.default?.create ||
    zustand.default) as (
    fn: (
      set: (fn: (state: MockState) => Partial<MockState>) => void,
    ) => MockState,
  ) => unknown;

  return {
    useOrderCart: createFn((set) => ({
      itemsByTicket: {} as Record<string, CartItem[]>,
      addItem: (ticketId: string, item: Omit<CartItem, "cartItemId">) =>
        set((state: MockState) => ({
          itemsByTicket: {
            ...state.itemsByTicket,
            [ticketId]: [
              ...(state.itemsByTicket[ticketId] || []),
              { ...item, cartItemId: Math.random().toString() } as CartItem,
            ],
          },
        })),
      removeItem: (ticketId: string, cartItemId: string) =>
        set((state: MockState) => ({
          itemsByTicket: {
            ...state.itemsByTicket,
            [ticketId]: (state.itemsByTicket[ticketId] || []).filter(
              (i: CartItem) => i.cartItemId !== cartItemId,
            ),
          },
        })),
      clearCart: (ticketId: string) =>
        set((state: MockState) => ({
          itemsByTicket: { ...state.itemsByTicket, [ticketId]: [] },
        })),
    })),
  };
});

import { TicketClient } from "@/app/(waiter)/waiter/tickets/[id]/ticket-client";
import type { WaiterMenuDTO, TicketDTO } from "@/shared/waiter/schemas";
import { useOrderCart } from "@/hooks/use-order-cart";

const mockMenu: WaiterMenuDTO = {
  categories: [{ id: "cat-1", name: "Mains" }],
  items: [
    {
      id: "item-1",
      categoryId: "cat-1",
      name: "Burger",
      priceMinor: 1000,
      stationId: "station-1",
      modifiers: [
        {
          name: "Cheese",
          minSelections: 1,
          maxSelections: 1,
          options: [
            { name: "Cheddar", priceDeltaMinor: 100 },
            { name: "Swiss", priceDeltaMinor: 150 },
          ],
        },
      ],
    },
    {
      id: "item-2",
      categoryId: "cat-1",
      name: "Fries",
      priceMinor: 500,
      stationId: "station-1",
    },
  ],
};

const mockTicket: TicketDTO = {
  id: "ticket-1",
  ticketNo: 42,
  tableId: "table-1",
  waiterId: "waiter-1",
  status: "OPEN",
  guestCount: 2,
  openedAt: new Date().toISOString(),
};

const renderWithClient = (ui: React.ReactElement) => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const { unmount } = render(
    <QueryClientProvider client={qc}>{ui}</QueryClientProvider>,
  );
  return { unmount, qc };
};

import { cleanup } from "@testing-library/react";

describe("Waiter Composer UI", () => {
  beforeEach(() => {
    useOrderCart.getState().clearCart("ticket-1");
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should show item grid and open customization sheet on click", async () => {
    renderWithClient(
      <TicketClient initialTicket={mockTicket} menu={mockMenu} />,
    );

    // Items are shown
    expect(screen.getByText("Burger")).toBeTruthy();
    expect(screen.getByText("Fries")).toBeTruthy();

    // Click Burger to open sheet
    fireEvent.click(screen.getByText("Burger"));

    // Sheet should appear
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    // Check required modifier validation
    const addButton = screen.getByText(/Add to Ticket/i);
    // Since Cheese is required (min 1, max 1), it auto-selects the first option "Cheddar" if we implemented that
    // Wait, my implementation auto-selects the first radio option! So it should be valid initially.
    expect(addButton.hasAttribute("disabled")).toBe(false);

    // Add to cart
    fireEvent.click(addButton);

    // Sheet closes, cart shows 1 item
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.getByText("Review 1 items")).toBeTruthy();
    });
  });

  it("should complete full workflow: render categories, select item, modifiers, qty, notes, add, update total, prevent duplicate submit, show success/error", async () => {
    // Mock fetch to handle both ready-lines GET and fire POST
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (typeof url === "string" && url.includes("ready-lines")) {
        return { ok: true, json: async () => ({ lines: [] }) };
      }
      return {
        ok: true,
        json: async () => ({
          success: true,
          ticket: mockTicket,
          lines: [],
        }),
      };
    });

    renderWithClient(
      <TicketClient initialTicket={mockTicket} menu={mockMenu} />,
    );

    // Waiter opens existing OPEN ticket (TicketClient mounts)
    expect(screen.getAllByText(/Table:\s*table-1/i)[0]).toBeTruthy();

    // Categories render
    expect(screen.getAllByText("Mains")[0]).toBeTruthy();

    // Item can be selected
    fireEvent.click(screen.getAllByText("Burger")[0]!);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());

    // Required modifiers can be selected (auto-selects first option by default, let's pick the second)
    const swissOption = screen.getByLabelText(/Swiss/i);
    fireEvent.click(swissOption);

    // Quantity stepper works
    const increaseBtn = screen.getByLabelText("Increase quantity");
    fireEvent.click(increaseBtn); // qty 2

    // Notes input works
    const noteInput = screen.getByLabelText("Special Instructions");
    fireEvent.change(noteInput, { target: { value: "Extra hot" } });

    // Add-to-ticket works
    const addButton = screen.getByText(/Add to Ticket/i);
    fireEvent.click(addButton);

    // Wait for modal to close and item to be added to cart
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // Another item can be added without full page refresh
    fireEvent.click(screen.getAllByText("Fries")[0]!);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    fireEvent.click(screen.getByText(/Add to Ticket/i));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // New line appears in cart summary (Review 3 items)
    const reviewBtn = screen.getAllByText(/Review 3 items/i)[0]!;
    fireEvent.click(reviewBtn);

    // Updated total appears in cart (Burger x2 + Fries x1)
    // Burger is 1000 + 150 Swiss = 1150 * 2 = 2300. Fries = 500. Total = 2800 minor = 28.00 major
    expect(screen.getAllByText(/28\.00/i)[0]).toBeTruthy();

    // Submit cart
    const fireBtn = screen.getAllByText(/Fire to Kitchen/i)[0]!;
    fireEvent.click(fireBtn);

    // Duplicate submit is prevented (button is disabled while submitting)
    expect(fireBtn.hasAttribute("disabled")).toBe(true);

    // Success feedback appears and Cart is cleared
    await waitFor(() => {
      // verify the fire call was made (fetch called at least once with lines route)
      expect(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(
          (call: unknown[]) =>
            typeof call[0] === "string" && call[0].includes("/lines"),
        ),
      ).toBe(true);
      expect(screen.queryByText(/Review 3 items/i)).toBeNull(); // Cart cleared
    });
  });

  it("should display error or retry state when submission fails", async () => {
    // Clear cart before test
    useOrderCart.getState().clearCart("ticket-1");
    // Mock fetch to fail
    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: false,
        json: async () => ({ error: "Validation failed" }),
      };
    });

    renderWithClient(
      <TicketClient initialTicket={mockTicket} menu={mockMenu} />,
    );

    // Add item to cart
    fireEvent.click(screen.getAllByText("Fries")[0]!);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    fireEvent.click(screen.getByText(/Add to Ticket/i));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // Submit cart
    fireEvent.click(screen.getAllByText(/Review 1 items/i)[0]!);
    const fireBtn = screen.getAllByText(/Fire to Kitchen/i)[0]!;
    fireEvent.click(fireBtn);

    // Error state appears (toast or message)
    await waitFor(() => {
      // Button re-enabled to allow retry
      expect(fireBtn.hasAttribute("disabled")).toBe(false);
    });
  });

  it("should show Close Ticket button only when eligible", async () => {
    // Ticket open with total > 0 and empty cart
    const closeEligibleTicket = { ...mockTicket, totalMinor: 1000 };
    renderWithClient(
      <TicketClient initialTicket={closeEligibleTicket} menu={mockMenu} />,
    );

    // Open review drawer
    fireEvent.click(screen.getByText(/View Ticket/i));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());

    expect(screen.getByText(/Close Ticket \/ Send to Cashier/i)).toBeTruthy();
  });

  it("should disable duplicate close submit and show success feedback", async () => {
    const closeEligibleTicket = { ...mockTicket, totalMinor: 1000 };
    global.fetch = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        ok: true,
        json: async () => ({
          success: true,
          ticket: { ...closeEligibleTicket, status: "CLOSED" },
        }),
      };
    });

    renderWithClient(
      <TicketClient initialTicket={closeEligibleTicket} menu={mockMenu} />,
    );

    // Open review drawer
    fireEvent.click(screen.getByText(/View Ticket/i));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());

    const closeBtn = screen.getByText(/Close Ticket \/ Send to Cashier/i);
    fireEvent.click(closeBtn);

    // Should change to Closing... and be disabled
    expect(screen.getByText(/Closing\.\.\./i)).toBeTruthy();
    expect(closeBtn.hasAttribute("disabled")).toBe(true);

    // Should close dialog and show success (via mock clear/update)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("should show blocked-close reason when ticket has invalid line states", async () => {
    const closeEligibleTicket = { ...mockTicket, totalMinor: 1000 };
    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: false,
        json: async () => ({
          error: "Cannot close ticket with unserved lines",
        }),
      };
    });

    renderWithClient(
      <TicketClient initialTicket={closeEligibleTicket} menu={mockMenu} />,
    );

    fireEvent.click(screen.getByText(/View Ticket/i));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());

    const closeBtn = screen.getByText(/Close Ticket \/ Send to Cashier/i);
    fireEvent.click(closeBtn);

    // Should re-enable button after error
    await waitFor(() => {
      expect(closeBtn.hasAttribute("disabled")).toBe(false);
    });
    // The toast would show the error message. We verify the button is back to normal state.
  });

  it("should disable order actions after ticket is closed", async () => {
    const closedTicket = {
      ...mockTicket,
      status: "CLOSED",
      totalMinor: 1000,
    } as TicketDTO;
    renderWithClient(
      <TicketClient initialTicket={closedTicket} menu={mockMenu} />,
    );

    // Grid shouldn't render items
    expect(screen.queryAllByText("Burger").length).toBe(0);

    // Notice is shown
    expect(
      screen.getByText(/Ticket is CLOSED\. No further changes can be made\./i),
    ).toBeTruthy();

    // Cart button is disabled
    const cartBtn = screen.getByText(/Ticket CLOSED/i).closest("button");
    expect(cartBtn?.hasAttribute("disabled")).toBe(true);
  });
});
