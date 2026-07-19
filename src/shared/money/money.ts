import { z } from "zod";

export const moneyMinorSchema = z
  .number()
  .int()
  .refine(Number.isSafeInteger, "Money values must be safe integers");

export type MoneyMinor = z.infer<typeof moneyMinorSchema>;

export function assertMoneyMinor(value: number, label = "amountMinor") {
  const parsed = moneyMinorSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`${label} must be a safe integer`);
  }

  return parsed.data;
}

export function addMinor(...amounts: number[]) {
  return assertMoneyMinor(
    amounts.reduce(
      (total, amount) => safeAdd(total, assertMoneyMinor(amount)),
      0,
    ),
  );
}

export function subtractMinor(amountMinor: number, subtractMinorValue: number) {
  return safeAdd(
    assertMoneyMinor(amountMinor),
    -assertMoneyMinor(subtractMinorValue),
  );
}

export function multiplyMinorByQuantity(amountMinor: number, quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error("quantity must be a positive safe integer");
  }

  return assertMoneyMinor(assertMoneyMinor(amountMinor) * quantity);
}

export function calculateBasisPoints(amountMinor: number, basisPoints: number) {
  if (
    !Number.isSafeInteger(basisPoints) ||
    basisPoints < 0 ||
    basisPoints > 10_000
  ) {
    throw new Error("basisPoints must be an integer between 0 and 10000");
  }

  return assertMoneyMinor(
    Math.round((assertMoneyMinor(amountMinor) * basisPoints) / 10_000),
  );
}

export function majorToMinor(majorAmount: string, currencyMinorDigits: number) {
  if (
    !Number.isSafeInteger(currencyMinorDigits) ||
    currencyMinorDigits < 0 ||
    currencyMinorDigits > 4
  ) {
    throw new Error("currencyMinorDigits must be an integer between 0 and 4");
  }

  const normalized = majorAmount.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("majorAmount must be a non-negative decimal string");
  }

  const [major = "0", fraction = ""] = normalized.split(".");
  if (fraction.length > currencyMinorDigits) {
    throw new Error("majorAmount has too many minor digits");
  }

  return assertMoneyMinor(
    Number(`${major}${fraction.padEnd(currencyMinorDigits, "0")}`),
  );
}

export function minorToDisplay(
  amountMinor: number,
  currencyMinorDigits: number,
) {
  const amount = assertMoneyMinor(amountMinor);
  if (
    !Number.isSafeInteger(currencyMinorDigits) ||
    currencyMinorDigits < 0 ||
    currencyMinorDigits > 4
  ) {
    throw new Error("currencyMinorDigits must be an integer between 0 and 4");
  }

  const sign = amount < 0 ? "-" : "";
  const absolute = Math.abs(amount)
    .toString()
    .padStart(currencyMinorDigits + 1, "0");

  if (currencyMinorDigits === 0) {
    return `${sign}${absolute}`;
  }

  return `${sign}${absolute.slice(0, -currencyMinorDigits)}.${absolute.slice(-currencyMinorDigits)}`;
}

export function formatCurrency(
  amountMinor: number,
  currency: string,
  currencyMinorDigits: number,
  locale = "en-LK",
) {
  const amount = Number(minorToDisplay(amountMinor, currencyMinorDigits));
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: currencyMinorDigits,
    minimumFractionDigits: currencyMinorDigits,
    style: "currency",
  }).format(amount);
}

function safeAdd(left: number, right: number) {
  return assertMoneyMinor(left + right);
}

export function formatMoney(
  amountMinor: number,
  currency = "USD",
  currencyMinorDigits = 2,
  locale = "en-US",
) {
  return formatCurrency(amountMinor, currency, currencyMinorDigits, locale);
}
