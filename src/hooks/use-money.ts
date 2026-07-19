"use client";

import { useSettings } from "@/components/settings/settings-provider";
import { formatMoney as formatMoneyBase } from "@/shared/money";
import { useCallback } from "react";

export function useMoney() {
  const { currency, currencyMinorDigits } = useSettings();

  const formatMoney = useCallback(
    (amountMinor: number) => {
      return formatMoneyBase(amountMinor, currency, currencyMinorDigits);
    },
    [currency, currencyMinorDigits],
  );

  return {
    formatMoney,
    currency,
    currencyMinorDigits,
  };
}
