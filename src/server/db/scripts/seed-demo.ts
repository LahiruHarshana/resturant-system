import { connectForDatabaseScript } from "./runtime";
import { RoleModel } from "../models/role.model";
import { UserModel } from "../models/user.model";
import { ZoneModel } from "../models/zone.model";
import { RestaurantTableModel } from "../models/restaurant-table.model";
import { StationModel } from "../models/station.model";
import { MenuCategoryModel } from "../models/menu-category.model";
import { MenuItemModel } from "../models/menu-item.model";
import { RestaurantSettingsModel } from "../models/restaurant-settings.model";
import { canonicalPermissionKeys } from "@/shared/authorization/permissions";
import bcrypt from "bcryptjs";

async function run() {
  const runtime = await connectForDatabaseScript();
  console.log(`Connected to DB: ${runtime.databaseName}`);

  const passwordHash = await bcrypt.hash("password123", 10);
  const pinHash = await bcrypt.hash("1234", 10);

  // 1. Roles
  const rolesData = [
    {
      name: "super_admin",
      isSystem: true,
      permissions: canonicalPermissionKeys,
      description: "Full access",
    },
    {
      name: "manager",
      isSystem: true,
      permissions: [
        "menu:manage",
        "table:manage",
        "settings:manage",
        "order:read",
        "order:create",
        "order:update",
        "order:delete",
        "order:void",
        "order:discount",
      ],
      description: "Manager access",
    },
    {
      name: "server",
      isSystem: true,
      permissions: ["order:read", "order:create", "order:update", "table:read"],
      description: "Server access",
    },
    {
      name: "kitchen",
      isSystem: true,
      permissions: ["line:read:kitchen", "line:update:kitchen"],
      description: "Kitchen KDS",
    },
    {
      name: "bar",
      isSystem: true,
      permissions: ["line:read:bar", "line:update:bar"],
      description: "Bar BDS",
    },
  ];

  const roleMap = new Map();
  for (const r of rolesData) {
    const role = await RoleModel.findOneAndUpdate(
      { name: r.name },
      { $set: r },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    roleMap.set(r.name, role._id);
  }
  console.log("Roles seeded");

  // 2. Users
  const usersData = [
    {
      email: "admin@example.com",
      name: "Alice Admin",
      roles: [roleMap.get("super_admin")],
      pinEnabled: true,
    },
    {
      email: "manager@example.com",
      name: "Bob Manager",
      roles: [roleMap.get("manager")],
      pinEnabled: true,
    },
    {
      email: "server@example.com",
      name: "Charlie Server",
      roles: [roleMap.get("server")],
      pinEnabled: true,
    },
    {
      email: "kitchen@example.com",
      name: "Dave Kitchen",
      roles: [roleMap.get("kitchen")],
      pinEnabled: false,
    },
  ];

  for (const u of usersData) {
    await UserModel.findOneAndUpdate(
      { email: u.email },
      { $set: { ...u, passwordHash, pinHash, isActive: true } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
  console.log("Users seeded");

  // 3. Settings
  await RestaurantSettingsModel.findOneAndUpdate(
    { key: "default" },
    {
      $set: {
        currency: "USD",
        currencyMinorDigits: 2,
        kitchenAgingMinutes: 15,
        urgentAgingMinutes: 30,
        readySoundEnabled: true,
        receiptFooter: "Thank you for visiting!",
        restaurantName: "Demo Restaurant",
        restaurantAddress: "123 Demo St, Demoville",
        restaurantPhone: "+1 (555) 000-0000",
        restaurantEmail: "hello@demo.invalid",
        serviceChargeBps: 1000,
        taxBps: 800,
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
  console.log("Settings seeded");

  // 4. Zones & Tables
  const zonesData = ["Main Dining", "Patio", "Bar Area"];
  for (const [idx, z] of zonesData.entries()) {
    await ZoneModel.findOneAndUpdate(
      { name: z },
      { $set: { name: z, sortOrder: idx, isActive: true } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  const tablesData = [
    { label: "T1", seats: 4, zone: "Main Dining" },
    { label: "T2", seats: 4, zone: "Main Dining" },
    { label: "P1", seats: 2, zone: "Patio" },
    { label: "B1", seats: 1, zone: "Bar Area" },
  ];

  for (const t of tablesData) {
    await RestaurantTableModel.findOneAndUpdate(
      { label: t.label },
      { $set: { ...t, status: "AVAILABLE" } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
  console.log("Zones and Tables seeded");

  // 5. Stations
  const stationsData = [
    { name: "Hot Line", type: "KITCHEN", sortOrder: 0 },
    { name: "Salad Station", type: "KITCHEN", sortOrder: 1 },
    { name: "Main Bar", type: "BAR", sortOrder: 2 },
  ];

  const stationMap = new Map();
  for (const s of stationsData) {
    const station = await StationModel.findOneAndUpdate(
      { name: s.name },
      { $set: s },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    stationMap.set(s.name, station._id);
  }
  console.log("Stations seeded");

  // 6. Categories
  const categoriesData = [
    { name: "Starters", sortOrder: 0 },
    { name: "Mains", sortOrder: 1 },
    { name: "Beverages", sortOrder: 2 },
  ];

  const catMap = new Map();
  for (const c of categoriesData) {
    const cat = await MenuCategoryModel.findOneAndUpdate(
      { name: c.name },
      { $set: c },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    catMap.set(c.name, cat._id);
  }
  console.log("Categories seeded");

  // 7. Menu Items
  const menuItemsData = [
    {
      name: "House Salad",
      categoryId: catMap.get("Starters"),
      stationId: stationMap.get("Salad Station"),
      priceMinor: 800, // $8.00
      sortOrder: 0,
      isAvailable: true,
      modifiers: [
        {
          name: "Dressing",
          minSelections: 1,
          maxSelections: 1,
          options: [
            { name: "Ranch", priceDeltaMinor: 0 },
            { name: "Vinaigrette", priceDeltaMinor: 0 },
          ],
        },
      ],
    },
    {
      name: "Cheeseburger",
      categoryId: catMap.get("Mains"),
      stationId: stationMap.get("Hot Line"),
      priceMinor: 1450, // $14.50
      sortOrder: 1,
      isAvailable: true,
      modifiers: [
        {
          name: "Add-ons",
          minSelections: 0,
          maxSelections: 2,
          options: [
            { name: "Bacon", priceDeltaMinor: 200 },
            { name: "Extra Cheese", priceDeltaMinor: 100 },
          ],
        },
      ],
    },
    {
      name: "Craft Beer",
      categoryId: catMap.get("Beverages"),
      stationId: stationMap.get("Main Bar"),
      priceMinor: 600, // $6.00
      sortOrder: 2,
      isAvailable: true,
      modifiers: [],
    },
  ];

  for (const m of menuItemsData) {
    await MenuItemModel.findOneAndUpdate(
      { name: m.name },
      { $set: m },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
  console.log("Menu Items seeded");

  console.log("Demo seed completed successfully.");
  await runtime.close();
  process.exit(0);
}

run().catch((err) => {
  console.error("Demo seed failed:", err);
  process.exit(1);
});
