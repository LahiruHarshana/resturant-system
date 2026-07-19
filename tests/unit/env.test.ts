import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/server/config/env-core";

const secretSentinel = "server-secret-sentinel-value-1234567890";

function validEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    APP_URL: "http://localhost:3000",
    AUTH_SECRET: secretSentinel,
    AUTH_TRUST_HOST: "true",
    MONGODB_URI: "mongodb://localhost:27017/restaurant_dev",
    NODE_ENV: "development",
    ...overrides,
  };
}

describe("server environment validation", () => {
  it("accepts a valid development environment", () => {
    const parsed = parseServerEnv(validEnv());

    expect(parsed.NODE_ENV).toBe("development");
    expect(parsed.AUTH_TRUST_HOST).toBe(true);
  });

  it("accepts a valid test environment", () => {
    const parsed = parseServerEnv(
      validEnv({
        MONGODB_URI: "mongodb://localhost:27017/restaurant_test",
        NODE_ENV: "test",
      }),
    );

    expect(parsed.NODE_ENV).toBe("test");
  });

  it("fails when a required variable is missing", () => {
    expect(() => parseServerEnv(validEnv({ AUTH_SECRET: undefined }))).toThrow(
      /AUTH_SECRET/,
    );
  });

  it("fails when APP_URL is invalid", () => {
    expect(() => parseServerEnv(validEnv({ APP_URL: "not-a-url" }))).toThrow(
      /APP_URL/,
    );
  });

  it("rejects HTTP APP_URL in production", () => {
    expect(() =>
      parseServerEnv(
        validEnv({
          MONGODB_URI: "mongodb://localhost:27017/restaurant_prod",
          NODE_ENV: "production",
          PUSHER_APP_ID: "app-id",
          PUSHER_CLUSTER: "ap2",
          PUSHER_KEY: "public-key",
          PUSHER_SECRET: "pusher-secret-value",
          NEXT_PUBLIC_PUSHER_CLUSTER: "ap2",
          NEXT_PUBLIC_PUSHER_KEY: "public-key",
        }),
      ),
    ).toThrow(/Production APP_URL/);
  });

  it("fails when AUTH_SECRET is too short", () => {
    expect(() =>
      parseServerEnv(validEnv({ AUTH_SECRET: "too-short" })),
    ).toThrow(/AUTH_SECRET/);
  });

  it("fails when MONGODB_URI is invalid", () => {
    expect(() =>
      parseServerEnv(validEnv({ MONGODB_URI: "https://db" })),
    ).toThrow(/MONGODB_URI/);
  });

  it("rejects a production database in test mode", () => {
    expect(() =>
      parseServerEnv(
        validEnv({
          MONGODB_URI: "mongodb://localhost:27017/restaurant_production",
          NODE_ENV: "test",
        }),
      ),
    ).toThrow(/Test mode/);
  });

  it("parses boolean strings safely", () => {
    expect(
      parseServerEnv(validEnv({ AUTH_TRUST_HOST: "false" })).AUTH_TRUST_HOST,
    ).toBe(false);
    expect(
      parseServerEnv(validEnv({ AUTH_TRUST_HOST: "1" })).AUTH_TRUST_HOST,
    ).toBe(true);
  });

  it("handles optional service values consistently", () => {
    const withoutOptionalServices = parseServerEnv(
      validEnv({ CLOUDINARY_URL: "", RESEND_API_KEY: "", SENTRY_DSN: "" }),
    );

    expect(withoutOptionalServices.CLOUDINARY_URL).toBeUndefined();
    expect(() =>
      parseServerEnv(validEnv({ CLOUDINARY_URL: "not-a-url" })),
    ).toThrow(/CLOUDINARY_URL/);
    expect(() => parseServerEnv(validEnv({ RESEND_API_KEY: "short" }))).toThrow(
      /RESEND_API_KEY/,
    );
  });

  it("does not expose secret values in validation errors", () => {
    expect(() =>
      parseServerEnv(
        validEnv({
          APP_URL: "invalid",
          AUTH_SECRET: secretSentinel,
        }),
      ),
    ).toThrow(/Invalid environment configuration/);

    try {
      parseServerEnv(
        validEnv({ APP_URL: "invalid", AUTH_SECRET: secretSentinel }),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(secretSentinel);
    }
  });
});
