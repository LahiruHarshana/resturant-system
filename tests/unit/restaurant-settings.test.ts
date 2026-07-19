import { describe, expect, it } from "vitest";
import { restaurantSettingsSchema } from "@/shared/contracts/restaurant-settings";

const validSettings = {
  restaurantName: "Demo Restaurant",
  currency: "LKR",
  currencyMinorDigits: 2,
  kitchenAgingMinutes: 12,
  readySoundEnabled: true,
  receiptFooter: "Thank you for dining with us.",
  serviceChargeBps: 1_000,
  taxBps: 0,
  urgentAgingMinutes: 20,
};

describe("restaurant settings contract", () => {
  it("accepts valid restaurant settings", () => {
    expect(restaurantSettingsSchema.parse(validSettings)).toEqual(
      validSettings,
    );
  });

  it("rejects invalid basis-point values", () => {
    expect(() =>
      restaurantSettingsSchema.parse({
        ...validSettings,
        serviceChargeBps: 10_001,
      }),
    ).toThrow(/serviceChargeBps/);
  });

  it("rejects invalid aging thresholds", () => {
    expect(() =>
      restaurantSettingsSchema.parse({
        ...validSettings,
        urgentAgingMinutes: validSettings.kitchenAgingMinutes,
      }),
    ).toThrow(/urgentAgingMinutes/);
  });

  it("rejects invalid currency codes", () => {
    expect(() =>
      restaurantSettingsSchema.parse({ ...validSettings, currency: "lkr" }),
    ).toThrow(/currency/);
  });
});
