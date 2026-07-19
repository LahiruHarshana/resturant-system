import * as React from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";

export type StatusType =
  | "OPEN"
  | "CLOSED"
  | "PAID"
  | "CANCELLED"
  | "FREE"
  | "OCCUPIED"
  | "DIRTY"
  | "PENDING"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "VOID";

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: StatusType | string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  let variant: BadgeProps["variant"] = "default";
  const normalizedStatus = status.toUpperCase();

  switch (normalizedStatus) {
    case "PAID":
    case "FREE":
    case "READY":
    case "SERVED":
      variant = "success";
      break;
    case "PREPARING":
    case "OCCUPIED":
    case "PENDING":
    case "DIRTY":
      variant = "warning";
      break;
    case "CANCELLED":
    case "VOID":
    case "CLOSED":
      variant = "destructive";
      break;
    case "OPEN":
    case "NEW":
    default:
      variant = "info";
      break;
  }

  return (
    <Badge variant={variant} className={className} {...props}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
