export const permissionCatalog = [
  ["user:manage", "Admin", "Manage users"],
  ["role:manage", "Admin", "Manage roles"],
  ["menu:manage", "Admin", "Manage menu"],
  ["table:manage", "Admin", "Manage tables"],
  ["settings:manage", "Admin", "Manage settings"],
  ["table:read", "Tables", "View tables"],
  ["order:create", "Orders", "Open tickets"],
  ["order:update", "Orders", "Update orders"],
  ["order:close", "Orders", "Close tickets"],
  ["line:read:kitchen", "Stations", "Read Kitchen lines"],
  ["line:read:bar", "Stations", "Read Bar lines"],
  ["line:status:kitchen", "Stations", "Update Kitchen line status"],
  ["line:status:bar", "Stations", "Update Bar line status"],
  ["line:void", "Orders", "Void order lines"],
  ["ticket:cancel", "Orders", "Cancel tickets"],
  ["payment:create", "Payments", "Create payments"],
  ["receipt:print", "Receipts", "Print receipts"],
  ["report:view", "Reports", "View reports"],
  ["audit:view", "Audit", "View audit logs"],
] as const;

export type PermissionKey = (typeof permissionCatalog)[number][0];

// Extract keys to use them purely
export const canonicalPermissionKeys = permissionCatalog.map(
  ([key]) => key,
) as unknown as PermissionKey[];

export const defaultRoleBundles = [
  {
    name: "super_admin",
    permissions: canonicalPermissionKeys,
  },
  {
    name: "manager",
    permissions: [
      "menu:manage",
      "table:manage",
      "report:view",
      "audit:view",
      "line:void",
      "ticket:cancel",
    ] as PermissionKey[],
  },
  {
    name: "waiter",
    permissions: [
      "table:read",
      "order:create",
      "order:update",
      "order:close",
    ] as PermissionKey[],
  },
  {
    name: "kitchen",
    permissions: [
      "line:read:kitchen",
      "line:status:kitchen",
    ] as PermissionKey[],
  },
  {
    name: "bar",
    permissions: ["line:read:bar", "line:status:bar"] as PermissionKey[],
  },
  {
    name: "cashier",
    permissions: [
      "table:read",
      "payment:create",
      "receipt:print",
    ] as PermissionKey[],
  },
] as const;
