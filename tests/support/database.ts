import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import {
  connectToDatabaseUri,
  disconnectFromDatabase,
} from "@/server/db/connect-core";
import { createDefinedIndexes } from "@/server/db/indexes";
import "@/server/db/models";

let memoryServer: MongoMemoryReplSet | null = null;

export async function startIntegrationDatabase() {
  if (!memoryServer) {
    memoryServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  }
  await connectToDatabaseUri(
    memoryServer.getUri("restaurant_test_integration"),
  );
  await createDefinedIndexes();
}

export async function clearIntegrationDatabase() {
  const database = mongoose.connection.db;
  if (!database) {
    throw new Error("No integration database connection");
  }

  if (!database.databaseName.includes("test")) {
    throw new Error("Refusing to clean a non-test database");
  }

  const collections = await database.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function stopIntegrationDatabase() {
  await disconnectFromDatabase();
  await memoryServer?.stop();
  memoryServer = null;
}
