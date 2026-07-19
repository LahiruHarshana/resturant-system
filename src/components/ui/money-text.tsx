"use client";

import * as React from "react";
import { useMoney } from "@/hooks/use-money";
import { cn } from "@/lib/utils";

interface MoneyTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  amountMinor: number;
}

export function MoneyText({
  amountMinor,
  className,
  ...props
}: MoneyTextProps) {
  const { formatMoney } = useMoney();

  return (
    <span className={cn("font-medium tabular-nums", className)} {...props}>
      {formatMoney(amountMinor)}
    </span>
  );
}
