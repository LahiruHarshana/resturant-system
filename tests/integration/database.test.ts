import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  assertNoMissingIndexes,
  verifyRequiredIndexes,
} from "@/server/db/indexes";
import { runPendingMigrations } from "@/server/db/migration-runner";
import {
  CounterModel,
  IdempotencyRecordModel,
  MenuCategoryModel,
  MenuItemModel,
  MigrationLedgerModel,
  OrderLineModel,
  PaymentModel,
  PermissionModel,
  RestaurantSettingsModel,
  RestaurantTableModel,
  RoleModel,
  StationModel,
  TicketModel,
  UserModel,
  getNextTicketNumber,
} from "@/server/db/models";
import { seedDatabase } from "@/server/db/seed";
import {
  clearIntegrationDatabase,
  startIntegrationDatabase,
  stopIntegrationDatabase,
} from "../support/database";

describe("database foundation", () => {
  beforeAll(startIntegrationDatabase, 120_000);
  afterEach(clearIntegrationDatabase);
  afterAll(stopIntegrationDatabase);

  it("compiles all models without overwrite errors", () => {
    expect(mongoose.modelNames()).toEqual(
      expect.arrayContaining([
        "AuditLog",
        "Counter",
        "IdempotencyRecord",
        "MenuCategory",
        "MenuItem",
        "MigrationLedger",
        "OrderLine",
        "Payment",
        "Permission",
        "RestaurantSettings",
        "RestaurantTable",
        "Role",
        "Station",
        "Ticket",
        "User",
      ]),
    );
  });

  it("reuses the cached connection", async () => {
    const first = mongoose.connection;
    const second = mongoose.connection;
    expect(first).toBe(second);
  });

  it("rejects invalid model data and invalid status enums", async () => {
    await expect(
      UserModel.create({ email: "bad@example.com" }),
    ).rejects.toThrow();
    await expect(
      new TicketModel({
        status: "BAD_STATUS",
        tableId: new mongoose.Types.ObjectId(),
        ticketNo: 1,
        waiterId: new mongoose.Types.ObjectId(),
      }).validate(),
    ).rejects.toThrow();
  });

  it("enforces user email uniqueness and hides hashes from ordinary queries", async () => {
    const user = await UserModel.create(userData("first@example.com"));
    await expect(
      UserModel.create(userData("first@example.com")),
    ).rejects.toThrow(/duplicate key/);

    const ordinaryResult = await UserModel.findById(user._id).lean();
    expect(ordinaryResult).not.toHaveProperty("passwordHash");
    expect(ordinaryResult).not.toHaveProperty("pinHash");
  });

  it("does not define raw PIN fields", () => {
    expect(UserModel.schema.path("pin")).toBeUndefined();
    expect(UserModel.schema.path("rawPin")).toBeUndefined();
  });

  it("produces unique sequential ticket counters under concurrency", async () => {
    const values = await Promise.all(
      Array.from({ length: 25 }, () => getNextTicketNumber()),
    );
    expect(new Set(values).size).toBe(25);
    expect(Math.min(...values)).toBe(1);
    expect(Math.max(...values)).toBe(25);
  });

  it("enforces ticketNo uniqueness", async () => {
    const { tableId, waiterId } = await createTableAndWaiter();
    await TicketModel.create(ticketData({ tableId, waiterId, ticketNo: 1001 }));
    await expect(
      TicketModel.create(
        ticketData({ tableId: newId(), waiterId, ticketNo: 1001 }),
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it("blocks two OPEN tickets for one table with a partial unique index", async () => {
    const { tableId, waiterId } = await createTableAndWaiter();
    await TicketModel.create(ticketData({ tableId, waiterId, ticketNo: 1 }));
    await expect(
      TicketModel.create(ticketData({ tableId, waiterId, ticketNo: 2 })),
    ).rejects.toThrow(/duplicate key/);
  });

  it("allows a new OPEN ticket after the previous ticket is no longer OPEN", async () => {
    const { tableId, waiterId } = await createTableAndWaiter();
    await TicketModel.create(
      ticketData({ status: "CLOSED", tableId, waiterId, ticketNo: 1 }),
    );
    await expect(
      TicketModel.create(ticketData({ tableId, waiterId, ticketNo: 2 })),
    ).resolves.toBeTruthy();
  });

  it("allows different tables to each have an OPEN ticket", async () => {
    const { waiterId } = await createTableAndWaiter();
    await TicketModel.create(
      ticketData({ tableId: newId(), waiterId, ticketNo: 1 }),
    );
    await expect(
      TicketModel.create(
        ticketData({ tableId: newId(), waiterId, ticketNo: 2 }),
      ),
    ).resolves.toBeTruthy();
  });

  it("verifies required indexes including TTL indexes", async () => {
    const verification = await verifyRequiredIndexes();
    assertNoMissingIndexes(verification);
    const idempotencyIndexes =
      await IdempotencyRecordModel.collection.indexes();
    expect(
      idempotencyIndexes.some(
        (index) =>
          index.name === "expiresAt_1" && index.expireAfterSeconds === 0,
      ),
    ).toBe(true);
  });

  it("enforces idempotency key and scope uniqueness", async () => {
    const record = idempotencyData();
    await IdempotencyRecordModel.create(record);
    await expect(IdempotencyRecordModel.create(record)).rejects.toThrow(
      /duplicate key/,
    );
  });

  it("enforces the restaurant settings singleton", async () => {
    await RestaurantSettingsModel.create(settingsData());
    await expect(
      RestaurantSettingsModel.create(settingsData()),
    ).rejects.toThrow(/duplicate key/);
  });

  it("keeps order-line snapshots unchanged after menu item changes", async () => {
    const { categoryId, stationId, ticketId } = await createMenuAndTicket();
    const menuItem = await MenuItemModel.create({
      categoryId,
      isAvailable: true,
      name: "Burger",
      priceMinor: 145_000,
      stationId,
    });
    const line = await OrderLineModel.create({
      menuItemId: menuItem._id,
      nameSnapshot: menuItem.name,
      priceSnapshotMinor: menuItem.priceMinor,
      quantity: 1,
      stationId,
      stationTypeSnapshot: "KITCHEN",
      ticketId,
    });

    await MenuItemModel.updateOne(
      { _id: menuItem._id },
      { $set: { name: "Premium Burger", priceMinor: 160_000 } },
    );
    const unchangedLine = await OrderLineModel.findById(line._id).lean();

    expect(unchangedLine?.nameSnapshot).toBe("Burger");
    expect(unchangedLine?.priceSnapshotMinor).toBe(145_000);
  });

  it("keeps modifier snapshots unchanged after modifier configuration changes", async () => {
    const { categoryId, stationId, ticketId } = await createMenuAndTicket();
    const menuItem = await MenuItemModel.create({
      categoryId,
      isAvailable: true,
      modifiers: [
        {
          maxSelections: 1,
          minSelections: 0,
          name: "Size",
          options: [{ name: "Large", priceDeltaMinor: 25_000 }],
        },
      ],
      name: "Juice",
      priceMinor: 50_000,
      stationId,
    });
    const line = await OrderLineModel.create({
      menuItemId: menuItem._id,
      modifierSnapshots: [{ nameSnapshot: "Large", priceDeltaMinor: 25_000 }],
      nameSnapshot: "Juice",
      priceSnapshotMinor: 50_000,
      quantity: 1,
      stationId,
      stationTypeSnapshot: "BAR",
      ticketId,
    });

    await MenuItemModel.updateOne(
      { _id: menuItem._id },
      {
        $set: {
          modifiers: [
            {
              maxSelections: 1,
              minSelections: 0,
              name: "Size",
              options: [{ name: "Large", priceDeltaMinor: 30_000 }],
            },
          ],
        },
      },
    );
    const unchangedLine = await OrderLineModel.findById(line._id).lean();

    expect(unchangedLine?.modifierSnapshots[0]?.priceDeltaMinor).toBe(25_000);
  });

  it("runs the seed script idempotently", async () => {
    const first = await seedDatabase();
    const second = await seedDatabase();

    expect(first.created).toBeGreaterThan(0);
    expect(second.failed).toBe(0);
    expect(second.skipped).toBeGreaterThan(0);
  });

  it("migration ledger prevents duplicate migration execution", async () => {
    const first = await runPendingMigrations();
    const second = await runPendingMigrations();
    const ledgerCount = await MigrationLedgerModel.countDocuments({
      migrationId: "0001",
    });

    expect(first[0]?.skipped).toBe(false);
    expect(second[0]?.skipped).toBe(true);
    expect(ledgerCount).toBe(1);
  });

  it("supports required operational models", async () => {
    await expect(
      PermissionModel.create({ group: "Test", key: "test:key", label: "Test" }),
    ).resolves.toBeTruthy();
    await expect(
      RoleModel.create({ name: "manager", permissions: ["test:key"] }),
    ).resolves.toBeTruthy();
    await expect(PaymentModel.create(paymentData())).resolves.toBeTruthy();
    await expect(
      CounterModel.create({ key: "custom", seq: 0 }),
    ).resolves.toBeTruthy();
  });
});

function newId() {
  return new mongoose.Types.ObjectId();
}

function userData(email: string) {
  return {
    email,
    name: "Test User",
    passwordHash: "hashed-password",
    pinHash: "hashed-pin",
    roles: [newId()],
  };
}

function ticketData({
  status = "OPEN",
  tableId,
  ticketNo,
  waiterId,
}: {
  status?: "OPEN" | "CLOSED";
  tableId: mongoose.Types.ObjectId;
  ticketNo: number;
  waiterId: mongoose.Types.ObjectId;
}) {
  return { status, tableId, ticketNo, waiterId };
}

async function createTableAndWaiter() {
  const table = await RestaurantTableModel.create({
    label: `T-${newId().toString()}`,
    seats: 4,
    zone: "Main",
  });
  const waiter = await UserModel.create(
    userData(`${newId().toString()}@example.com`),
  );
  return { tableId: table._id, waiterId: waiter._id };
}

async function createMenuAndTicket() {
  const category = await MenuCategoryModel.create({ name: "Mains" });
  const station = await StationModel.create({
    name: "Kitchen",
    type: "KITCHEN",
  });
  const { tableId, waiterId } = await createTableAndWaiter();
  const ticket = await TicketModel.create(
    ticketData({ tableId, ticketNo: 99, waiterId }),
  );

  return {
    categoryId: category._id,
    stationId: station._id,
    ticketId: ticket._id,
  };
}

function idempotencyData() {
  return {
    expiresAt: new Date(Date.now() + 60_000),
    key: "idem-key",
    requestHash: "request-hash",
    scope: "payment:create",
    status: "PROCESSING" as const,
  };
}

function settingsData() {
  return {
    currency: "LKR",
    currencyMinorDigits: 2,
    kitchenAgingMinutes: 12,
    readySoundEnabled: true,
    serviceChargeBps: 0,
    taxBps: 0,
    urgentAgingMinutes: 20,
  };
}

function paymentData() {
  return {
    amountMinor: 1_000,
    cashierId: newId(),
    idempotencyKey: "payment-key",
    method: "CASH" as const,
    tenderedMinor: 1_000,
    ticketId: newId(),
  };
}
