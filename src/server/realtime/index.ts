import { parseServerEnv } from "../config/env-core";
import { RealTimeProvider, TestRealTimeProvider } from "./provider";
import { PusherRealTimeProvider } from "./pusher";

let providerInstance: RealTimeProvider | undefined;
let testProviderInstance: TestRealTimeProvider | undefined;

export function getRealTimeProvider(): RealTimeProvider {
  if (providerInstance) {
    return providerInstance;
  }

  const env = parseServerEnv();

  // In test mode, or if Pusher is not configured, fallback to TestProvider
  if (
    env.NODE_ENV === "test" ||
    !env.PUSHER_APP_ID ||
    !env.PUSHER_KEY ||
    !env.PUSHER_SECRET ||
    !env.PUSHER_CLUSTER
  ) {
    testProviderInstance = new TestRealTimeProvider();
    providerInstance = testProviderInstance;
    return providerInstance;
  }

  providerInstance = new PusherRealTimeProvider(
    env.PUSHER_APP_ID,
    env.PUSHER_KEY,
    env.PUSHER_SECRET,
    env.PUSHER_CLUSTER,
  );

  return providerInstance;
}

// Exported for tests
export function getTestRealTimeProvider(): TestRealTimeProvider {
  if (!testProviderInstance) {
    testProviderInstance = new TestRealTimeProvider();
    providerInstance = testProviderInstance;
  }
  return testProviderInstance;
}

export function __resetRealTimeProviderForTest() {
  providerInstance = undefined;
  testProviderInstance = undefined;
}
