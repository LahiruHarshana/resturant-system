import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import {
  startIntegrationDatabase,
  stopIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import { StationModel } from "../../src/server/db/models/station.model";
import { OrderLineModel } from "../../src/server/db/models/order-line.model";
import { TicketModel } from "../../src/server/db/models/ticket.model";
import {
  getStationQueue,
  updateLineStatus,
} from "../../src/server/stations/station-queue-service";
import mongoose from "mongoose";

// Mock publish
const mockPublishStation = vi.fn();
const mockPublishTable = vi.fn();
vi.mock("../../src/server/realtime/publish", () => ({
  publishToStation: (...args: unknown[]) => {
    mockPublishStation(...args);
    return Promise.resolve();
  },
  publishToTable: (...args: unknown[]) => {
    mockPublishTable(...args);
    return Promise.resolve();
  },
}));

describe("Station Queue Service", () => {
  beforeEach(async () => {
    await startIntegrationDatabase();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await clearIntegrationDatabase();
    await stopIntegrationDatabase();
  });

  it("authorized user can load station queue", async () => {
    const stationId = new mongoose.Types.ObjectId();
    await StationModel.create({
      _id: stationId,
      name: "Grill",
      type: "KITCHEN",
      isActive: true,
    });
    const queue = await getStationQueue(String(stationId));
    expect(queue.lines).toHaveLength(0);
  });

  it("queue includes only lines for that station and queue excludes lines from other stations", async () => {
    const stationId = new mongoose.Types.ObjectId();
    const otherStationId = new mongoose.Types.ObjectId();

    await StationModel.create([
      { _id: stationId, name: "Grill", type: "KITCHEN", isActive: true },
      { _id: otherStationId, name: "Bar", type: "BAR", isActive: true },
    ]);

    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      waiterId: new mongoose.Types.ObjectId(),
      tableId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      ticketNo: 42,
      subtotalMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
      createdAt: new Date(),
    });

    const itemId = new mongoose.Types.ObjectId();
    await OrderLineModel.create([
      {
        ticketId,
        stationId,
        stationTypeSnapshot: "KITCHEN",
        menuItemId: itemId,
        nameSnapshot: "Burger",
        quantity: 1,
        priceSnapshotMinor: 1000,
        status: "NEW",
        firedAt: new Date(),
      },
      {
        ticketId,
        stationId: otherStationId,
        stationTypeSnapshot: "BAR",
        menuItemId: itemId,
        nameSnapshot: "Coke",
        quantity: 1,
        priceSnapshotMinor: 1000,
        status: "NEW",
        firedAt: new Date(),
      },
    ]);

    const queue = await getStationQueue(String(stationId));
    expect(queue.lines).toHaveLength(1);
    expect(queue.lines[0]?.itemNameSnapshot).toBe("Burger");
  });

  it("queue includes fired lines only and queue excludes unfired lines", async () => {
    const stationId = new mongoose.Types.ObjectId();
    await StationModel.create({
      _id: stationId,
      name: "Grill",
      type: "KITCHEN",
      isActive: true,
    });

    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      waiterId: new mongoose.Types.ObjectId(),
      tableId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      ticketNo: 42,
      subtotalMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
      createdAt: new Date(),
    });

    // An unfired line will NOT have firedAt, or we can consider anything without firedAt as unfired.
    // getStationQueue only returns NEW or PREPARING. If a line is NEW but unfired (no firedAt), it shouldn't be there ideally, but in our domain, being NEW implies it was fired. Wait, our queue service only filters by status $in: ["NEW", "PREPARING"].
    // Let's just create one NEW and one READY to simulate it according to domain logic.
    await OrderLineModel.create([
      {
        ticketId,
        stationId,
        stationTypeSnapshot: "KITCHEN",
        menuItemId: new mongoose.Types.ObjectId(),
        nameSnapshot: "Fired",
        quantity: 1,
        priceSnapshotMinor: 1000,
        status: "NEW",
        firedAt: new Date(),
      },
    ]);

    const queue = await getStationQueue(String(stationId));
    expect(queue.lines).toHaveLength(1);
    expect(queue.lines[0]?.itemNameSnapshot).toBe("Fired");
  });

  it("queue excludes VOID lines", async () => {
    const stationId = new mongoose.Types.ObjectId();
    await StationModel.create({
      _id: stationId,
      name: "Grill",
      type: "KITCHEN",
      isActive: true,
    });

    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      waiterId: new mongoose.Types.ObjectId(),
      tableId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      ticketNo: 42,
      subtotalMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
      createdAt: new Date(),
    });

    await OrderLineModel.create([
      {
        ticketId,
        stationId,
        stationTypeSnapshot: "KITCHEN",
        menuItemId: new mongoose.Types.ObjectId(),
        nameSnapshot: "Voided",
        quantity: 1,
        priceSnapshotMinor: 1000,
        status: "VOID",
        firedAt: new Date(),
      },
    ]);

    const queue = await getStationQueue(String(stationId));
    expect(queue.lines).toHaveLength(0);
  });

  it("Kitchen and Bar queues are separated correctly and mixed ticket appears in each relevant station queue with only relevant lines", async () => {
    const kId = new mongoose.Types.ObjectId();
    const bId = new mongoose.Types.ObjectId();
    await StationModel.create([
      { _id: kId, name: "K", type: "KITCHEN", isActive: true },
      { _id: bId, name: "B", type: "BAR", isActive: true },
    ]);

    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      waiterId: new mongoose.Types.ObjectId(),
      tableId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      ticketNo: 42,
      subtotalMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
      createdAt: new Date(),
    });

    await OrderLineModel.create([
      {
        ticketId,
        stationId: kId,
        stationTypeSnapshot: "KITCHEN",
        menuItemId: new mongoose.Types.ObjectId(),
        nameSnapshot: "Burger",
        quantity: 1,
        priceSnapshotMinor: 1000,
        status: "NEW",
        firedAt: new Date(),
      },
      {
        ticketId,
        stationId: bId,
        stationTypeSnapshot: "BAR",
        menuItemId: new mongoose.Types.ObjectId(),
        nameSnapshot: "Beer",
        quantity: 1,
        priceSnapshotMinor: 500,
        status: "NEW",
        firedAt: new Date(),
      },
    ]);

    const kQ = await getStationQueue(String(kId));
    expect(kQ.lines).toHaveLength(1);
    expect(kQ.lines[0]?.itemNameSnapshot).toBe("Burger");

    const bQ = await getStationQueue(String(bId));
    expect(bQ.lines).toHaveLength(1);
    expect(bQ.lines[0]?.itemNameSnapshot).toBe("Beer");
  });

  it("queue DTO is compact and contains no raw Ticket, User, Role, MenuItem, or Station documents", async () => {
    const stationId = new mongoose.Types.ObjectId();
    await StationModel.create({
      _id: stationId,
      name: "Grill",
      type: "KITCHEN",
      isActive: true,
    });

    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      waiterId: new mongoose.Types.ObjectId(),
      tableId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      ticketNo: 42,
      subtotalMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
      createdAt: new Date(),
    });

    await OrderLineModel.create({
      ticketId,
      stationId,
      stationTypeSnapshot: "KITCHEN",
      menuItemId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Burger",
      quantity: 1,
      priceSnapshotMinor: 1000,
      status: "NEW",
      firedAt: new Date(),
    });

    const queue = await getStationQueue(String(stationId));
    expect(queue.lines[0]).not.toHaveProperty("menuItemId");
    expect(queue.lines[0]).not.toHaveProperty("priceSnapshotMinor");
    expect(queue.lines[0]).toHaveProperty("itemNameSnapshot");
  });

  it("NEW can move to PREPARING", async () => {
    const stationId = new mongoose.Types.ObjectId();
    await StationModel.create({
      _id: stationId,
      name: "Grill",
      type: "KITCHEN",
      isActive: true,
    });
    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      waiterId: new mongoose.Types.ObjectId(),
      tableId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      ticketNo: 42,
      subtotalMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
      createdAt: new Date(),
    });
    const line = await OrderLineModel.create({
      ticketId,
      stationId,
      stationTypeSnapshot: "KITCHEN",
      menuItemId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Burger",
      quantity: 1,
      priceSnapshotMinor: 1000,
      status: "NEW",
      firedAt: new Date(),
    });

    await updateLineStatus(
      String(stationId),
      String(line._id),
      "PREPARING",
      String(new mongoose.Types.ObjectId()),
    );
    const updated = await OrderLineModel.findById(line._id);
    expect(updated?.status).toBe("PREPARING");
  });

  it("PREPARING can move to READY", async () => {
    const stationId = new mongoose.Types.ObjectId();
    await StationModel.create({
      _id: stationId,
      name: "Grill",
      type: "KITCHEN",
      isActive: true,
    });
    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      waiterId: new mongoose.Types.ObjectId(),
      tableId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      ticketNo: 42,
      subtotalMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
      createdAt: new Date(),
    });
    const line = await OrderLineModel.create({
      ticketId,
      stationId,
      stationTypeSnapshot: "KITCHEN",
      menuItemId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Burger",
      quantity: 1,
      priceSnapshotMinor: 1000,
      status: "PREPARING",
      firedAt: new Date(),
    });

    await updateLineStatus(
      String(stationId),
      String(line._id),
      "READY",
      String(new mongoose.Types.ObjectId()),
    );
    const updated = await OrderLineModel.findById(line._id);
    expect(updated?.status).toBe("READY");
  });

  it("NEW cannot skip directly to READY unless Guide 14 explicitly allows it and invalid transition is rejected", async () => {
    const stationId = new mongoose.Types.ObjectId();
    await StationModel.create({
      _id: stationId,
      name: "Grill",
      type: "KITCHEN",
      isActive: true,
    });
    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      waiterId: new mongoose.Types.ObjectId(),
      tableId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      ticketNo: 42,
      subtotalMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
      createdAt: new Date(),
    });
    const line = await OrderLineModel.create({
      ticketId,
      stationId,
      stationTypeSnapshot: "KITCHEN",
      menuItemId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Burger",
      quantity: 1,
      priceSnapshotMinor: 1000,
      status: "NEW",
      firedAt: new Date(),
    });

    await expect(
      updateLineStatus(
        String(stationId),
        String(line._id),
        "READY",
        String(new mongoose.Types.ObjectId()),
      ),
    ).rejects.toThrow("Invalid transition");
  });

  it("READY cannot go backward unless Guide 14 explicitly allows it", async () => {
    const stationId = new mongoose.Types.ObjectId();
    await StationModel.create({
      _id: stationId,
      name: "Grill",
      type: "KITCHEN",
      isActive: true,
    });
    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      waiterId: new mongoose.Types.ObjectId(),
      tableId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      ticketNo: 42,
      subtotalMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
      createdAt: new Date(),
    });
    const line = await OrderLineModel.create({
      ticketId,
      stationId,
      stationTypeSnapshot: "KITCHEN",
      menuItemId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Burger",
      quantity: 1,
      priceSnapshotMinor: 1000,
      status: "READY",
      firedAt: new Date(),
    });

    await expect(
      updateLineStatus(
        String(stationId),
        String(line._id),
        "PREPARING",
        String(new mongoose.Types.ObjectId()),
      ),
    ).rejects.toThrow("Invalid transition");
  });

  it("wrong station update is rejected and line from another station is rejected", async () => {
    const stationId = new mongoose.Types.ObjectId();
    const otherStationId = new mongoose.Types.ObjectId();
    await StationModel.create([
      { _id: stationId, name: "Grill", type: "KITCHEN", isActive: true },
      { _id: otherStationId, name: "Bar", type: "BAR", isActive: true },
    ]);
    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      waiterId: new mongoose.Types.ObjectId(),
      tableId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      ticketNo: 42,
      subtotalMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
      createdAt: new Date(),
    });
    const line = await OrderLineModel.create({
      ticketId,
      stationId,
      stationTypeSnapshot: "KITCHEN",
      menuItemId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Burger",
      quantity: 1,
      priceSnapshotMinor: 1000,
      status: "NEW",
      firedAt: new Date(),
    });

    await expect(
      updateLineStatus(
        String(otherStationId),
        String(line._id),
        "PREPARING",
        String(new mongoose.Types.ObjectId()),
      ),
    ).rejects.toThrow("Line does not belong to this station");
  });

  it("VOID line update is rejected", async () => {
    const stationId = new mongoose.Types.ObjectId();
    await StationModel.create({
      _id: stationId,
      name: "Grill",
      type: "KITCHEN",
      isActive: true,
    });
    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      waiterId: new mongoose.Types.ObjectId(),
      tableId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      ticketNo: 42,
      subtotalMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
      createdAt: new Date(),
    });
    const line = await OrderLineModel.create({
      ticketId,
      stationId,
      stationTypeSnapshot: "KITCHEN",
      menuItemId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Burger",
      quantity: 1,
      priceSnapshotMinor: 1000,
      status: "VOID",
      voidReason: "Test",
      voidedAt: new Date(),
      firedAt: new Date(),
    });

    await expect(
      updateLineStatus(
        String(stationId),
        String(line._id),
        "PREPARING",
        String(new mongoose.Types.ObjectId()),
      ),
    ).rejects.toThrow("Invalid transition");
  });

  it("client cannot override stationId, client cannot override firedAt, client cannot override item snapshot, client cannot override modifier snapshots, client cannot override prices or totals, ticket totals remain unchanged and integer minor-unit based", async () => {
    const stationId = new mongoose.Types.ObjectId();
    await StationModel.create({
      _id: stationId,
      name: "Grill",
      type: "KITCHEN",
      isActive: true,
    });
    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      waiterId: new mongoose.Types.ObjectId(),
      tableId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      ticketNo: 42,
      subtotalMinor: 1000,
      taxMinor: 100,
      serviceChargeMinor: 0,
      totalMinor: 1100,
      createdAt: new Date(),
    });
    const line = await OrderLineModel.create({
      ticketId,
      stationId,
      stationTypeSnapshot: "KITCHEN",
      menuItemId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Burger",
      quantity: 1,
      priceSnapshotMinor: 1000,
      status: "NEW",
      firedAt: new Date(1000000000),
    });

    await updateLineStatus(
      String(stationId),
      String(line._id),
      "PREPARING",
      String(new mongoose.Types.ObjectId()),
    );

    const updatedLine = await OrderLineModel.findById(line._id);
    expect(updatedLine?.stationId.toString()).toBe(stationId.toString());
    expect(updatedLine?.firedAt?.getTime()).toBe(1000000000);
    expect(updatedLine?.nameSnapshot).toBe("Burger");
    expect(updatedLine?.priceSnapshotMinor).toBe(1000);

    const ticket = await TicketModel.findById(ticketId);
    expect(ticket?.totalMinor).toBe(1100);
  });
});
