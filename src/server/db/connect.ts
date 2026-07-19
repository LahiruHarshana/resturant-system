import "server-only";

import { env } from "@/server/config/env";
import {
  connectToDatabaseUri,
  disconnectFromDatabase,
  getConnectionState,
  sanitizeConnectionError,
} from "./connect-core";

export { disconnectFromDatabase, getConnectionState, sanitizeConnectionError };

export function connectToDatabase(uri = env.MONGODB_URI) {
  return connectToDatabaseUri(uri);
}
