"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { minorToDisplay } from "@/shared/money/money";
import {
  Loader2,
  AlertCircle,
  Receipt,
  DollarSign,
  CreditCard,
} from "lucide-react";
import type { BillResponseDTO } from "@/shared/cashier/schemas";
import { ReceiptView } from "./receipt-view";

export function TicketSettlement({
  ticketId,
  onSuccess,
}: {
  ticketId: string | null;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [discountInput, setDiscountInput] = useState("");
  const [tenderedInput, setTenderedInput] = useState("");
  const [method, setMethod] = useState<"CASH" | "CARD" | "OTHER" | null>(null);

  const {
    data: bill,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<BillResponseDTO>({
    queryKey: ["cashier-bill", ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/cashier/tickets/${ticketId}/bill`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch bill");
      }
      return res.json();
    },
    enabled: !!ticketId,
    retry: false,
  });

  const discountMutation = useMutation({
    mutationFn: async (amountMinor: number) => {
      const res = await fetch(`/api/cashier/tickets/${ticketId}/discount`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountMinor,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to apply discount");
      }
      return res.json();
    },
    onSuccess: () => {
      setDiscountInput("");
      queryClient.invalidateQueries({ queryKey: ["cashier-bill", ticketId] });
    },
  });

  const payMutation = useMutation({
    mutationFn: async (payload: {
      method: "CASH" | "CARD" | "OTHER";
      tenderedMinor: number;
    }) => {
      const res = await fetch(`/api/cashier/tickets/${ticketId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: () => {
      setMethod(null);
      setTenderedInput("");
      queryClient.invalidateQueries({ queryKey: ["cashier-bill", ticketId] });
      onSuccess?.();
    },
  });

  if (!ticketId) {
    return (
      <div className="text-muted-foreground text-center">
        <Receipt className="mx-auto mb-4 h-12 w-12 opacity-20" />
        <h3 className="text-lg font-medium">No Ticket Selected</h3>
        <p className="text-sm">
          Select a ticket from the queue to view details.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        <p className="text-muted-foreground mt-2 text-sm">Loading bill...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-destructive flex flex-col items-center justify-center text-center">
        <AlertCircle className="mb-2 h-8 w-8" />
        <p className="text-sm font-medium">Failed to load bill</p>
        <p className="mt-1 text-xs">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!bill) return null;

  const handleApplyDiscount = () => {
    const amount = parseFloat(discountInput);
    if (isNaN(amount) || amount < 0) return;
    discountMutation.mutate(Math.round(amount * 100));
  };

  const handlePay = () => {
    if (!method) return;
    const amount = parseFloat(tenderedInput);

    // For non-cash, tendered is always the total
    const tenderedMinor =
      method === "CASH" ? Math.round(amount * 100) : bill.totalMinor;

    payMutation.mutate({ method, tenderedMinor });
  };

  const isSubmitting = discountMutation.isPending || payMutation.isPending;
  const isPaid = bill.status === "PAID";

  return (
    <div className="bg-background mx-auto w-full max-w-md rounded-lg border p-6 shadow-sm print:max-w-none print:border-none print:bg-transparent print:p-0 print:shadow-none">
      {!isPaid && (
        <>
          <div className="mb-6 text-center">
            <h3 className="text-2xl font-bold">Ticket #{bill.ticketNo}</h3>
            <p className="text-muted-foreground">{bill.status}</p>
          </div>

          <div className="mb-6 max-h-60 space-y-3 overflow-y-auto border-b pb-4">
            {bill.lines.map((line) => (
              <div key={line.id} className="flex justify-between text-sm">
                <span>
                  {line.quantity}x {line.nameSnapshot}
                </span>
                <span>${minorToDisplay(line.totalMinor, 2)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-b pb-4">
            <div className="text-muted-foreground flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${minorToDisplay(bill.subtotalMinor, 2)}</span>
            </div>
            {bill.discountMinor > 0 && (
              <div className="text-destructive flex justify-between text-sm">
                <span>Discount</span>
                <span>-${minorToDisplay(bill.discountMinor, 2)}</span>
              </div>
            )}
            <div className="text-muted-foreground flex justify-between text-sm">
              <span>Tax</span>
              <span>${minorToDisplay(bill.taxMinor, 2)}</span>
            </div>
            <div className="text-muted-foreground flex justify-between text-sm">
              <span>Service Charge</span>
              <span>${minorToDisplay(bill.serviceChargeMinor, 2)}</span>
            </div>
            <div className="mt-2 flex justify-between pt-2 text-xl font-bold">
              <span>Total</span>
              <span>${minorToDisplay(bill.totalMinor, 2)}</span>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="discount" className="sr-only">
                  Discount Amount
                </Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Discount amount ($)"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <Button
                variant="outline"
                onClick={handleApplyDiscount}
                disabled={isSubmitting || !discountInput}
              >
                Apply
              </Button>
            </div>
            {discountMutation.isError && (
              <p className="text-destructive text-xs">
                {discountMutation.error.message}
              </p>
            )}

            <div className="border-t pt-4">
              <Label className="mb-2 block">Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={method === "CASH" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setMethod("CASH")}
                  disabled={isSubmitting}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Cash
                </Button>
                <Button
                  type="button"
                  variant={method === "CARD" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setMethod("CARD")}
                  disabled={isSubmitting}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Card
                </Button>
              </div>
            </div>

            {method === "CASH" && (
              <div className="pt-2">
                <Label htmlFor="tendered">Amount Tendered</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="tendered"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={tenderedInput}
                    onChange={(e) => setTenderedInput(e.target.value)}
                    disabled={isSubmitting}
                    className="text-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setTenderedInput(minorToDisplay(bill.totalMinor, 2))
                    }
                    disabled={isSubmitting}
                  >
                    Exact
                  </Button>
                </div>
                {tenderedInput &&
                  parseFloat(tenderedInput) * 100 >= bill.totalMinor && (
                    <p className="text-muted-foreground mt-2 text-sm">
                      Change due: $
                      {minorToDisplay(
                        Math.round(parseFloat(tenderedInput) * 100) -
                          bill.totalMinor,
                        2,
                      )}
                    </p>
                  )}
              </div>
            )}

            <Button
              className="mt-4 h-12 w-full text-lg"
              disabled={
                isSubmitting ||
                !method ||
                (method === "CASH" &&
                  (!tenderedInput ||
                    parseFloat(tenderedInput) * 100 < bill.totalMinor))
              }
              onClick={handlePay}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : null}
              {isSubmitting
                ? "Processing..."
                : `Pay $${minorToDisplay(bill.totalMinor, 2)}`}
            </Button>

            {payMutation.isError && (
              <p className="text-destructive mt-2 text-center text-sm">
                {payMutation.error.message}
              </p>
            )}
          </div>
        </>
      )}

      {isPaid && (
        <div className="mt-6">
          <ReceiptView ticketId={ticketId} onDone={() => onSuccess?.()} />
        </div>
      )}
    </div>
  );
}
