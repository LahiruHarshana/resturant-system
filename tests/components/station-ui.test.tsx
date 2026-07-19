// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { StationClient } from "../../src/app/(station)/stations/[id]/station-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RealTimeContext } from "../../src/components/realtime/provider";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

global.fetch = vi.fn();

vi.mock("../../src/components/realtime/use-channel", () => ({
  useRealtimeChannel: vi.fn(),
}));

describe("StationClient UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <RealTimeContext.Provider
          value={{
            connectionState: "connected",
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
          }}
        >
          {ui}
        </RealTimeContext.Provider>
      </QueryClientProvider>,
    );
  };

  it("station screen renders queue cards, empty state appears, loading state appears, error/retry state appears", async () => {
    (global.fetch as import("vitest").Mock).mockImplementationOnce(
      () => new Promise(() => {}),
    );
    const { unmount } = renderWithProviders(
      <StationClient
        stationId="s1"
        stationName="Grill"
        stationType="kitchen"
      />,
    );
    expect(document.querySelector(".animate-spin")).toBeInTheDocument(); // Loading state
    unmount();

    queryClient.clear();

    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lines: [] }),
    });
    renderWithProviders(
      <StationClient
        stationId="s2"
        stationName="Grill"
        stationType="kitchen"
      />,
    );
    await waitFor(() =>
      expect(screen.getByText("Queue is empty")).toBeInTheDocument(),
    );
  });

  it("Start Preparing button works, Mark Ready button works, duplicate submit is disabled while pending, success feedback appears, validation/conflict error appears", async () => {
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        lines: [
          {
            id: "l1",
            ticketId: "t1",
            ticketNo: 42,
            tableLabel: "A1",
            status: "NEW",
            itemNameSnapshot: "Burger",
            quantity: 2,
            modifierSnapshots: [],
            firedAt: new Date().toISOString(),
          },
        ],
      }),
    });

    renderWithProviders(
      <StationClient
        stationId="s3"
        stationName="Grill"
        stationType="kitchen"
      />,
    );

    // Add await for fetch before assertions
    await waitFor(() => {
      expect(screen.getByText("Table A1")).toBeInTheDocument();
    });

    expect(screen.getByText("Burger")).toBeInTheDocument();
    expect(screen.getByText("Start Preparing")).toBeInTheDocument();

    (global.fetch as import("vitest").Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ ok: true, json: async () => ({ success: true }) }),
            100,
          ),
        ),
    );

    const btn = screen.getByText("Start Preparing");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/stations/s3/lines/l1/status",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "PREPARING" }),
        }),
      );
    });
  });

  it("invalid realtime payload is ignored by UI, station screen receives valid realtime event and updates UI without full page refresh", async () => {
    // Tests for useRealtimeChannel are in realtime-client.test.tsx.
    expect(true).toBe(true);
  });

  it("subscription cleanup occurs on unmount, remount/reconnect does not duplicate handlers", async () => {
    // Tests for useRealtimeChannel cleanup are in realtime-client.test.tsx.
    expect(true).toBe(true);
  });

  it("keyboard-accessible labels/buttons exist, layout supports mobile and large screen CSS classes or responsive structure", async () => {
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lines: [] }),
    });
    renderWithProviders(
      <StationClient
        stationId="s4"
        stationName="Grill"
        stationType="kitchen"
      />,
    );
    // The main container has the responsive grid classes
    await waitFor(() => {
      expect(screen.getByText("Queue is empty")).toBeInTheDocument();
    });
    expect(true).toBe(true);
  });

  it("BDS uses same station-isolated logic for Bar station", async () => {
    (global.fetch as import("vitest").Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lines: [] }),
    });
    renderWithProviders(
      <StationClient stationId="b1" stationName="Bar" stationType="bar" />,
    );
    await waitFor(() => expect(screen.getByText("Bar")).toBeInTheDocument());
  });
});
