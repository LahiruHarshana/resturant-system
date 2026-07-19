import { describe, expect, it } from "vitest";
import {
  getAdminChannel,
  getCashierChannel,
  getStationChannel,
  getTableChannel,
  getUserChannel,
} from "../../src/server/realtime/channels";
import { REALTIME_EVENTS } from "../../src/shared/realtime/events";
import {
  getTestRealTimeProvider,
  __resetRealTimeProviderForTest,
} from "../../src/server/realtime";
import {
  publishToStation,
  publishToTable,
} from "../../src/server/realtime/publish";

describe("Realtime Channels", () => {
  it("should sanitize IDs and return deterministic channel names", () => {
    expect(getStationChannel("station-123")).toBe(
      "private-station-station-123",
    );
    expect(getTableChannel("tbl_456")).toBe("private-table-tbl_456");
    expect(getCashierChannel()).toBe("private-cashier");
    expect(getAdminChannel()).toBe("private-admin");
    expect(getUserChannel("user-123")).toBe("private-user-user-123");
  });

  it("should reject unsafe IDs", () => {
    expect(() => getStationChannel("invalid ch@nnel name!!")).toThrow();
    expect(() => getTableChannel("")).toThrow();
  });
});

describe("Realtime Server Publish Utilities", () => {
  it("validates event payload and publishes to provider", async () => {
    __resetRealTimeProviderForTest();
    const provider = getTestRealTimeProvider();

    const payload = {
      id: "line-1",
      ticketId: "ticket-1",
      ticketNo: 100,
      stationId: "station-1",
      stationTypeSnapshot: "KITCHEN",
      status: "NEW",
      itemNameSnapshot: "Burger",
      quantity: 1,
      timestamp: new Date().toISOString(),
    };

    const result = await publishToStation(
      "station-1",
      REALTIME_EVENTS.LINE_CREATED_V1,
      payload,
    );
    expect(result.success).toBe(true);

    expect(provider.publishedEvents.length).toBe(1);
    expect(provider.publishedEvents[0]!.channel).toBe(
      "private-station-station-1",
    );
    expect(provider.publishedEvents[0]!.event).toBe(
      REALTIME_EVENTS.LINE_CREATED_V1,
    );
    expect(provider.publishedEvents[0]!.payload).toEqual(payload);
  });

  it("rejects invalid payloads without throwing an unhandled exception", async () => {
    __resetRealTimeProviderForTest();
    const provider = getTestRealTimeProvider();

    // Missing required fields for LINE_CREATED_V1
    const invalidPayload = { id: "line-1" };

    const result = await publishToStation(
      "station-1",
      REALTIME_EVENTS.LINE_CREATED_V1,
      invalidPayload,
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(provider.publishedEvents.length).toBe(0);
  });

  it("ignores unsupported events safely", async () => {
    const result = await publishToTable("table-1", "unknown.event", {});
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
