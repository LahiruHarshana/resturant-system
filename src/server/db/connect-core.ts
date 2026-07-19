import mongoose, { type Mongoose } from "mongoose";

const CONNECTION_OPTIONS = {
  maxPoolSize: 5,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 5_000,
} as const;

type CachedConnection = {
  connection: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

type GlobalWithMongoose = typeof globalThis & {
  __restaurantMongoose?: CachedConnection;
};

const globalForMongoose = globalThis as GlobalWithMongoose;

const cached =
  globalForMongoose.__restaurantMongoose ??
  (globalForMongoose.__restaurantMongoose = {
    connection: null,
    promise: null,
  });

export async function connectToDatabaseUri(uri: string) {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, CONNECTION_OPTIONS)
      .then((connection) => {
        cached.connection = connection;
        return connection;
      })
      .catch((error: unknown) => {
        cached.promise = null;
        throw sanitizeConnectionError(error);
      });
  }

  return cached.promise;
}

export async function disconnectFromDatabase() {
  cached.connection = null;
  cached.promise = null;
  await mongoose.disconnect();
}

export function getConnectionState() {
  return mongoose.connection.readyState;
}

export function sanitizeConnectionError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown MongoDB connection error";
  const sanitized = message.replace(
    /mongodb(?:\+srv)?:\/\/[^\s]+/gi,
    "[redacted-mongodb-uri]",
  );
  return new Error(`MongoDB connection failed: ${sanitized}`);
}
