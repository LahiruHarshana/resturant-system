import { describe, it, expect } from "vitest";
import {
  redactSensitiveData,
  REDACTED_VALUE,
} from "@/server/admin/audit-log-service";

describe("Audit Log Service Unit", () => {
  it("20. Audit logs redact sensitive metadata", () => {
    const input = {
      action: "LOGIN",
      ip: "127.0.0.1",
      password: "secretpassword",
      nested: {
        token: "abcdef123",
        safeVal: 42,
        card: "1234-5678",
      },
      arr: [{ PIN: "1234" }, { ok: true }],
    };

    const output = redactSensitiveData(input) as Record<string, unknown>;
    const nested = output.nested as Record<string, unknown>;
    const arr = output.arr as Array<Record<string, unknown>>;

    expect(output.action).toBe("LOGIN");
    expect(output.ip).toBe("127.0.0.1");
    expect(output.password).toBe(REDACTED_VALUE);
    expect(nested.safeVal).toBe(42);
    expect(nested.token).toBe(REDACTED_VALUE);
    expect(nested.card).toBe(REDACTED_VALUE);
    expect(arr[0]?.PIN).toBe(REDACTED_VALUE);
    expect(arr[1]?.ok).toBe(true);
  });

  it("21. Audit logs never expose raw request bodies", () => {
    const reqBody = { email: "a@b.com", passwordHash: "abc" };
    const output = redactSensitiveData(reqBody) as Record<string, unknown>;
    expect(output.passwordHash).toBe(REDACTED_VALUE);
    expect(output.email).toBe("a@b.com");
  });
});
