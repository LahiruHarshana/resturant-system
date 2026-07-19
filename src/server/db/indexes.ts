import mongoose from "mongoose";
import "./models";

export type IndexVerification = {
  collection: string;
  indexNames: string[];
  missing: string[];
};

const requiredIndexNames: Record<string, string[]> = {
  auditlogs: ["entity_1_entityId_1_at_-1", "actorId_1_at_-1"],
  counters: ["key_1"],
  idempotencyrecords: ["key_1_scope_1", "expiresAt_1"],
  menucategories: ["isActive_1_sortOrder_1"],
  menuitems: [
    "categoryId_1_isAvailable_1_sortOrder_1",
    "stationId_1_isAvailable_1",
  ],
  migrationledgers: ["migrationId_1"],
  orderlines: ["ticketId_1_status_1", "stationId_1_status_1_firedAt_1"],
  payments: ["ticketId_1", "createdAt_-1"],
  permissions: ["key_1"],
  restaurantsettings: ["key_1"],
  restauranttables: ["zone_1_status_1", "label_1"],
  roles: ["name_1"],
  stations: ["type_1_isActive_1"],
  tickets: [
    "ticketNo_1",
    "tableId_1_status_1",
    "tableId_1",
    "waiterId_1_status_1_openedAt_-1",
    "status_1_closedAt_1",
  ],
  users: ["email_1", "isActive_1"],
};

export async function createDefinedIndexes() {
  await Promise.all(
    mongoose
      .modelNames()
      .map((modelName) => mongoose.model(modelName).createIndexes()),
  );
}

export async function verifyRequiredIndexes(): Promise<IndexVerification[]> {
  const database = mongoose.connection.db;
  if (!database) {
    throw new Error("No active database connection");
  }

  const results: IndexVerification[] = [];

  for (const [collection, required] of Object.entries(requiredIndexNames)) {
    const indexInformation = await database.collection(collection).indexes();
    const indexNames = indexInformation
      .map((index) => index.name)
      .filter((name): name is string => Boolean(name));
    const missing = required.filter(
      (indexName) => !indexNames.includes(indexName),
    );
    results.push({ collection, indexNames, missing });
  }

  return results;
}

export function assertNoMissingIndexes(results: IndexVerification[]) {
  const missing = results.flatMap((result) =>
    result.missing.map((indexName) => `${result.collection}.${indexName}`),
  );

  if (missing.length > 0) {
    throw new Error(`Missing required indexes: ${missing.join(", ")}`);
  }
}
