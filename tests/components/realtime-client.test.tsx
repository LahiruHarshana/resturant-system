// @vitest-environment jsdom
import { render, screen, cleanup, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import {
  RealTimeProvider,
  useRealtimeConnection,
} from "../../src/components/realtime/provider";
import { useRealtimeChannel } from "../../src/components/realtime/use-channel";
import { z } from "zod";

const mockBind = vi.fn();
const mockUnbind = vi.fn();
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockDisconnect = vi.fn();
const mockConnectionBind = vi.fn();

// Mock pusher-js
vi.mock("pusher-js", () => {
  return {
    default: class MockPusher {
      connection = {
        bind: mockConnectionBind,
      };
      subscribe = mockSubscribe.mockReturnValue({
        bind: mockBind,
        unbind: mockUnbind,
      });
      unsubscribe = mockUnsubscribe;
      disconnect = mockDisconnect;
    },
  };
});

// A dummy component to test the connection state
function ConnectionStateDisplay() {
  const { connectionState } = useRealtimeConnection();
  return <div data-testid="conn-state">{connectionState}</div>;
}

// A dummy component to test useRealtimeChannel
const testSchema = z.object({
  id: z.string(),
  value: z.number(),
});

function ChannelSubscriber({ onEvent }: { onEvent: (data: unknown) => void }) {
  useRealtimeChannel({
    channelName: "private-test-channel",
    eventName: "test.event",
    schema: testSchema,
    onEvent,
  });
  return <div>Subscribed</div>;
}

describe("Realtime Client Provider & Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_PUSHER_KEY = "test-key";
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER = "test-cluster";
  });

  afterEach(() => {
    cleanup();
  });

  it("connection state is exposed and initially connecting", () => {
    render(
      <RealTimeProvider>
        <ConnectionStateDisplay />
      </RealTimeProvider>,
    );
    expect(screen.getByTestId("conn-state").textContent).toBe("connecting");
  });

  it("cleanup prevents memory leaks by disconnecting pusher on unmount", () => {
    const { unmount } = render(
      <RealTimeProvider>
        <ConnectionStateDisplay />
      </RealTimeProvider>,
    );
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("client subscription registers handler on connect", () => {
    // Manually trigger connected state
    mockConnectionBind.mockImplementation(
      (event: string, cb: (state: unknown) => void) => {
        if (event === "state_change") {
          setTimeout(() => cb({ current: "connected" }), 10);
        }
      },
    );

    const onEvent = vi.fn();
    render(
      <RealTimeProvider>
        <ChannelSubscriber onEvent={onEvent} />
      </RealTimeProvider>,
    );

    // Wait for connected state to trigger subscription
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(mockSubscribe).toHaveBeenCalledWith("private-test-channel");
        expect(mockBind).toHaveBeenCalledWith(
          "test.event",
          expect.any(Function),
        );
        resolve();
      }, 50);
    });
  });

  it("handler is removed on unmount", async () => {
    mockConnectionBind.mockImplementation(
      (event: string, cb: (state: unknown) => void) => {
        if (event === "state_change") cb({ current: "connected" });
      },
    );

    const { rerender } = render(
      <RealTimeProvider>
        <ChannelSubscriber onEvent={vi.fn()} />
      </RealTimeProvider>,
    );

    await act(async () => {});

    // Unmount just the subscriber, not the provider
    rerender(
      <RealTimeProvider>
        <div>Unmounted</div>
      </RealTimeProvider>,
    );

    expect(mockUnbind).toHaveBeenCalled();
    expect(mockUnsubscribe).toHaveBeenCalledWith("private-test-channel");
  });

  it("remount does not duplicate handlers (simulated by strict mode unbind-bind)", async () => {
    mockConnectionBind.mockImplementation(
      (event: string, cb: (state: unknown) => void) => {
        if (event === "state_change") cb({ current: "connected" });
      },
    );

    const { rerender } = render(
      <RealTimeProvider>
        <ChannelSubscriber onEvent={vi.fn()} />
      </RealTimeProvider>,
    );

    await act(async () => {});
    expect(mockBind).toHaveBeenCalledTimes(1);

    // Rerender exactly same props
    rerender(
      <RealTimeProvider>
        <ChannelSubscriber onEvent={vi.fn()} />
      </RealTimeProvider>,
    );

    await act(async () => {});
    // Should unbind the previous and bind the new one
    expect(mockUnbind).toHaveBeenCalled();
    expect(mockBind).toHaveBeenCalledTimes(2);
  });

  it("invalid payload is ignored safely without throwing", async () => {
    mockConnectionBind.mockImplementation(
      (event: string, cb: (state: unknown) => void) => {
        if (event === "state_change") cb({ current: "connected" });
      },
    );

    const onEvent = vi.fn();
    render(
      <RealTimeProvider>
        <ChannelSubscriber onEvent={onEvent} />
      </RealTimeProvider>,
    );

    await act(async () => {});

    // Extract the handler passed to Pusher's bind
    const bindCall = mockBind.mock.calls.find(
      (c: unknown[]) => c[0] === "test.event",
    );
    const handler = bindCall![1];

    // Emit invalid payload
    expect(() => {
      handler({ id: "123", value: "not-a-number" });
    }).not.toThrow();

    expect(onEvent).not.toHaveBeenCalled();

    // Emit valid payload
    handler({ id: "123", value: 42 });
    expect(onEvent).toHaveBeenCalledWith({ id: "123", value: 42 });
  });

  it("reconnect-style resubscription does not duplicate handlers", async () => {
    let stateCb: (state: unknown) => void = () => {};
    mockConnectionBind.mockImplementation(
      (event: string, cb: (state: unknown) => void) => {
        if (event === "state_change") stateCb = cb;
      },
    );

    render(
      <RealTimeProvider>
        <ChannelSubscriber onEvent={vi.fn()} />
      </RealTimeProvider>,
    );

    await act(async () => {});
    // Transition to connected
    act(() => stateCb({ current: "connected" }));

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(mockBind).toHaveBeenCalledTimes(1);

    // Transition to disconnected
    act(() => stateCb({ current: "disconnected" }));

    // Transition back to connected
    act(() => stateCb({ current: "connected" }));

    // The effect will re-run on connection state change.
    // It should have unbinded and un-subscribed then re-subscribed and re-binded.
    // mockUnbind is called 3 times:
    // 1. First connect (prevent duplicates)
    // 2. Disconnect (cleanup)
    // 3. Second connect (prevent duplicates)
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockUnbind).toHaveBeenCalledTimes(3);
    expect(mockSubscribe).toHaveBeenCalledTimes(2);
    expect(mockBind).toHaveBeenCalledTimes(2);
  });
});
