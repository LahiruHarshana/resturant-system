import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { parseServerEnv } from "@/server/config/env-core";
import {
  connectToDatabaseUri,
  disconnectFromDatabase,
} from "@/server/db/connect-core";

type RuntimeConnection = {
  close: () => Promise<void>;
  databaseName: string;
};

export async function connectForDatabaseScript(): Promise<RuntimeConnection> {
  if (process.env.DB_SCRIPT_USE_MEMORY_SERVER === "true") {
    const memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri("restaurant_test_scripts");
    await connectToDatabaseUri(uri);
    return {
      close: async () => {
        await disconnectFromDatabase();
        await memoryServer.stop();
      },
      databaseName: "restaurant_test_scripts",
    };
  }

  const parsed = parseServerEnv();
  const databaseName = extractDatabaseName(parsed.MONGODB_URI);
  assertSafeMutableDatabase(parsed.NODE_ENV, databaseName);
  await connectToDatabaseUri(parsed.MONGODB_URI);

  return {
    close: disconnectFromDatabase,
    databaseName,
  };
}

export function assertSafeMutableDatabase(
  nodeEnv: string,
  databaseName: string,
) {
  const normalized = databaseName.toLowerCase();

  if (
    nodeEnv === "production" ||
    /(^|[-_])(prod|production)([-_]|$)/.test(normalized)
  ) {
    throw new Error("Refusing to mutate a production-looking database");
  }

  if (!/(test|dev|development|local|preview)/.test(normalized)) {
    throw new Error(
      "Refusing to mutate a database without an explicit safe environment name",
    );
  }
}

export async function clearDatabaseForTestOnly() {
  const database = mongoose.connection.db;
  if (!database) {
    throw new Error("No active database connection");
  }

  const databaseName = database.databaseName;
  assertSafeMutableDatabase(process.env.NODE_ENV ?? "test", databaseName);
  const collections = await database.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

function extractDatabaseName(uri: string) {
  const parsed = new URL(uri);
  return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
}
