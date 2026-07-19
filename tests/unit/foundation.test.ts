import { describe, expect, it } from "vitest";
import {
  APP_NAME,
  GUIDE_SEQUENCE,
  TOUCH_TARGET_MIN_PX,
} from "@/shared/constants/app";

describe("application foundation", () => {
  it("keeps the documented application identity", () => {
    expect(APP_NAME).toBe("Restaurant Order Management System");
  });

  it("preserves the completed guide sequence through repository bootstrap", () => {
    expect(GUIDE_SEQUENCE).toEqual([
      "01_AI_AGENT_OPERATING_PROTOCOL.md",
      "02_PRODUCT_SCOPE_AND_BUSINESS_FLOW.md",
      "03_ARCHITECTURE_AND_TECHNICAL_DECISIONS.md",
      "04_REPOSITORY_BOOTSTRAP_AND_STRUCTURE.md",
    ]);
  });

  it("sets an accessible minimum touch target", () => {
    expect(TOUCH_TARGET_MIN_PX).toBeGreaterThanOrEqual(44);
  });
});
