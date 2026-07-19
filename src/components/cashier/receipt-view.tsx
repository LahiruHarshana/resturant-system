"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { minorToDisplay } from "@/shared/money/money";
import {
  Loader2,
  AlertCircle,
  Printer,
  Download,
  Mail,
  CheckCircle2,
} from "lucide-react";
import type { ReceiptDTO } from "@/shared/cashier/schemas";

export function ReceiptView({
  ticketId,
  onDone,
}: {
  ticketId: string;
  onDone: () => void;
}) {
  const [emailInput, setEmailInput] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  const {
    data: receipt,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ReceiptDTO>({
    queryKey: ["receipt", ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/cashier/tickets/${ticketId}/receipt`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch receipt");
      }
      return res.json();
    },
    retry: false,
  });

  const emailMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(
        `/api/cashier/tickets/${ticketId}/receipt/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, idempotencyKey: crypto.randomUUID() }),
        },
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to send email");
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        <p className="text-muted-foreground mt-2 text-sm">Loading receipt...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-destructive flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="mb-2 h-8 w-8" />
        <p className="text-sm font-medium">Failed to load receipt</p>
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

  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.open(`/api/cashier/tickets/${ticketId}/receipt/pdf`, "_blank");
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput) {
      emailMutation.mutate(emailInput);
    }
  };

  return (
    <div className="w-full">
      {/* Screen controls */}
      <div className="space-y-4 print:hidden">
        <div className="mb-6 text-center text-green-600">
          <CheckCircle2 className="mx-auto mb-2 h-12 w-12" />
          <p className="text-xl font-bold">Paid Successfully</p>
          <p className="text-muted-foreground text-sm">
            Ticket has been settled.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <Button
            onClick={handlePrint}
            variant="outline"
            className="min-w-[120px] flex-1"
          >
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button
            onClick={handleDownloadPdf}
            variant="outline"
            className="min-w-[120px] flex-1"
          >
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button
            onClick={() => setShowEmailForm(!showEmailForm)}
            variant="outline"
            className="min-w-[120px] flex-1"
          >
            <Mail className="mr-2 h-4 w-4" /> Email
          </Button>
        </div>

        {showEmailForm && (
          <form
            onSubmit={handleEmailSubmit}
            className="bg-muted/30 mt-4 space-y-3 rounded-md border p-4"
          >
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="customer@example.com"
                disabled={emailMutation.isPending || emailMutation.isSuccess}
              />
            </div>
            {emailMutation.isError && (
              <p className="text-destructive text-xs">
                {emailMutation.error.message}
              </p>
            )}
            {emailMutation.isSuccess ? (
              <p className="text-sm font-medium text-green-600">
                Email sent successfully!
              </p>
            ) : (
              <Button
                type="submit"
                disabled={emailMutation.isPending}
                className="w-full"
              >
                {emailMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send Receipt
              </Button>
            )}
          </form>
        )}

        <div className="pt-6">
          <Button onClick={onDone} className="w-full" size="lg">
            Done
          </Button>
        </div>
      </div>

      {/* Printable Receipt area */}
      <div className="mx-auto mt-8 max-w-[80mm] border-t pt-8 text-sm print:mt-0 print:border-none print:pt-0">
        <div className="mb-6 space-y-1 text-center">
          <h2 className="text-lg font-bold uppercase">
            {receipt.restaurantName}
          </h2>
          {receipt.restaurantAddress && <p>{receipt.restaurantAddress}</p>}
          {receipt.restaurantPhone && <p>{receipt.restaurantPhone}</p>}
          {receipt.restaurantEmail && <p>{receipt.restaurantEmail}</p>}
        </div>

        <div className="mb-2 space-y-1 border-b border-dashed pb-2">
          <p>Ticket: #{receipt.ticketNo}</p>
          <p>Table: {receipt.tableLabel}</p>
          <p>Server: {receipt.waiterName}</p>
          <p>Opened: {new Date(receipt.openedAt).toLocaleString()}</p>
          {receipt.paidAt && (
            <p>Paid: {new Date(receipt.paidAt).toLocaleString()}</p>
          )}
        </div>

        <div className="mb-2 border-b border-dashed pb-2">
          <table className="w-full">
            <tbody>
              {receipt.lines.map((line, idx) => (
                <tr key={idx} className="align-top">
                  <td className="w-8">{line.quantity}x</td>
                  <td>{line.nameSnapshot}</td>
                  <td className="text-right whitespace-nowrap">
                    ${minorToDisplay(line.totalMinor, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-2 space-y-1 border-b border-dashed pb-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${minorToDisplay(receipt.subtotalMinor, 2)}</span>
          </div>
          {receipt.discountMinor > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-${minorToDisplay(receipt.discountMinor, 2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${minorToDisplay(receipt.taxMinor, 2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Service Charge</span>
            <span>${minorToDisplay(receipt.serviceChargeMinor, 2)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
            <span>Total</span>
            <span>${minorToDisplay(receipt.totalMinor, 2)}</span>
          </div>
        </div>

        {receipt.payment && (
          <div className="space-y-1 pb-4">
            <div className="flex justify-between">
              <span>Method</span>
              <span>{receipt.payment.method}</span>
            </div>
            <div className="flex justify-between">
              <span>Tendered</span>
              <span>${minorToDisplay(receipt.payment.tenderedMinor, 2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Change</span>
              <span>${minorToDisplay(receipt.payment.changeMinor, 2)}</span>
            </div>
            <div className="text-muted-foreground mt-2 flex justify-between text-xs">
              <span>Cashier</span>
              <span>{receipt.payment.cashierName}</span>
            </div>
          </div>
        )}

        {receipt.footerText && (
          <div className="mt-6 text-center text-xs italic">
            {receipt.footerText}
          </div>
        )}
      </div>
    </div>
  );
}
