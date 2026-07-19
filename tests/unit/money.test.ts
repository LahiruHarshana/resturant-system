import { describe, expect, it } from "vitest";
import {
  addMinor,
  assertMoneyMinor,
  calculateBasisPoints,
  majorToMinor,
  minorToDisplay,
  multiplyMinorByQuantity,
  subtractMinor,
} from "@/shared/money";

describe("money helpers", () => {
  it("uses integer arithmetic for addition and subtraction", () => {
    expect(addMinor(100, 200, 300)).toBe(600);
    expect(subtractMinor(600, 150)).toBe(450);
  });

  it("multiplies minor units by quantity", () => {
    expect(multiplyMinorByQuantity(145_000, 2)).toBe(290_000);
  });

  it("calculates basis points with safe integer output", () => {
    expect(calculateBasisPoints(10_000, 1_000)).toBe(1_000);
  });

  it("converts major display input to minor units", () => {
    expect(majorToMinor("1450.00", 2)).toBe(145_000);
    expect(minorToDisplay(145_000, 2)).toBe("1450.00");
  });

  it("rejects unsafe or non-integer monetary values", () => {
    expect(() => assertMoneyMinor(10.5)).toThrow(/safe integer/);
    expect(() => assertMoneyMinor(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      /safe integer/,
    );
  });
});
