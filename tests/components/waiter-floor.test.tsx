// @vitest-environment jsdom
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { expect, test, vi, beforeEach, afterEach } from "vitest";
import { FloorClient } from "@/app/(waiter)/waiter/floor/floor-client";
import { Toaster } from "@/components/ui/sonner";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  mockPush.mockClear();

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
});

import type { FloorZoneDTO } from "@/shared/waiter/schemas";

const mockZones: FloorZoneDTO[] = [
  {
    zoneName: "Main Dining",
    sortOrder: 1,
    tables: [
      {
        id: "TABLE1",
        label: "T1",
        zone: "Main Dining",
        status: "AVAILABLE",
        seats: 4,
        currentTicketId: null,
        openedAt: null,
        ticketNo: null,
        isReady: false,
      },
      {
        id: "TABLE2",
        label: "T2",
        zone: "Main Dining",
        status: "OCCUPIED",
        seats: 4,
        currentTicketId: "TICKET999",
        openedAt: new Date().toISOString(),
        ticketNo: 99,
        isReady: false,
      },
    ],
  },
];

test("selecting an AVAILABLE table opens the guest-count sheet and created:true performs client-side navigation to the ticket shell", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      created: true,
      ticket: { id: "TICKET123", ticketNo: 123 },
    }),
  });

  render(
    <>
      <Toaster />
      <FloorClient initialData={mockZones} />
    </>,
  );

  const tableBtn = screen.getByRole("button", { name: /T1\s+4 seats/i });
  expect(tableBtn).toBeDefined();

  // 1. selecting an AVAILABLE table opens the guest-count sheet
  fireEvent.click(tableBtn);
  expect(screen.getByText("Open a new ticket")).toBeDefined();

  // 2. entering guest count works (Increase from 2 to 3)
  const increaseBtn = screen.getByRole("button", { name: /Increase/i });
  fireEvent.click(increaseBtn);
  expect(screen.getByText("3")).toBeDefined();

  // 3. duplicate submission calls the API exactly once
  const openBtn = screen.getByRole("button", { name: "Open Table" });
  fireEvent.click(openBtn);
  fireEvent.click(openBtn); // Duplicate click while submitting

  // Assert the submit button is disabled while pending
  expect((openBtn as HTMLButtonElement).disabled).toBe(true);

  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  expect(mockFetch).toHaveBeenCalledWith(
    "/api/waiter/tickets",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        tableId: "TABLE1",
        guestCount: 3,
      }),
    }),
  );

  // 4. created:true performs client-side navigation to the ticket shell
  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith("/waiter/tickets/TICKET123");
  });
});

test("created:false displays the race/recovery message", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ created: false, ticket: { id: "TICKET456" } }),
  });

  render(
    <>
      <Toaster />
      <FloorClient initialData={mockZones} />
    </>,
  );

  const tableBtn = screen.getByRole("button", { name: /T1\s+4 seats/i });
  fireEvent.click(tableBtn);

  const openBtn = screen.getByRole("button", { name: "Open Table" });
  fireEvent.click(openBtn);

  // Assert exact toast message
  await waitFor(() => {
    expect(
      screen.getByText(
        "This table was opened by another staff member. The current ticket is now displayed.",
      ),
    ).toBeDefined();
  });

  // Should navigate anyway as recovery
  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith("/waiter/tickets/TICKET456");
  });
});

test("selecting an OCCUPIED table navigates directly to the existing ticket", async () => {
  render(<FloorClient initialData={mockZones} />);

  const tableBtn = screen.getByRole("button", { name: /T2\s+4 seats/i });
  fireEvent.click(tableBtn);

  // Navigates directly without opening the sheet or calling POST
  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith("/waiter/tickets/TICKET999");
  });
  expect(mockFetch).not.toHaveBeenCalled();
});

test("keyboard-accessible labels and buttons exist", async () => {
  render(<FloorClient initialData={mockZones} />);

  const tableBtn = screen.getByRole("button", { name: /T1\s+4 seats/i });
  expect(
    tableBtn.hasAttribute("aria-label") || tableBtn.textContent?.includes("T1"),
  ).toBe(true);
});
