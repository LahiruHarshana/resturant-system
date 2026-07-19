import { TicketModel } from "@/server/db/models/ticket.model";
import { OrderLineModel } from "@/server/db/models/order-line.model";
import { PaymentModel } from "@/server/db/models/payment.model";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { UserModel } from "@/server/db/models/user.model";
import { IdempotencyRecordModel } from "@/server/db/models/idempotency-record.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import type { ReceiptDTO } from "@/shared/cashier/schemas";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import { minorToDisplay } from "@/shared/money/money";

export async function getReceipt(
  ticketId: string,
  actorUserId: string,
): Promise<ReceiptDTO> {
  const ticket = await TicketModel.findById(ticketId).exec();
  if (!ticket) throw new Error("TICKET_NOT_FOUND");
  if (ticket.status !== "PAID") throw new Error("TICKET_NOT_PAID");

  const lines = await OrderLineModel.find({
    ticketId: ticket._id,
    status: "SERVED",
  }).exec();

  const settings = await RestaurantSettingsModel.findOne({
    key: "default",
  }).exec();
  if (!settings) throw new Error("SETTINGS_NOT_FOUND");

  const payment = await PaymentModel.findOne({ ticketId: ticket._id })
    .sort({ createdAt: -1 })
    .exec();

  if (!payment) throw new Error("PAYMENT_NOT_FOUND");

  const table = await RestaurantTableModel.findById(ticket.tableId).exec();
  const waiter = await UserModel.findById(ticket.waiterId).exec();
  const cashier = await UserModel.findById(payment.cashierId).exec();

  const receipt: ReceiptDTO = {
    id: ticket._id.toString(),
    ticketNo: ticket.ticketNo,
    restaurantName: settings.restaurantName || "Restaurant",
    restaurantAddress: settings.restaurantAddress ?? undefined,
    restaurantPhone: settings.restaurantPhone ?? undefined,
    restaurantEmail: settings.restaurantEmail ?? undefined,
    tableLabel: table?.label || "Unknown Table",
    waiterName: waiter?.name ?? "Unknown Waiter",
    openedAt: ticket.openedAt.toISOString(),
    closedAt: ticket.closedAt?.toISOString() || null,
    paidAt: ticket.paidAt?.toISOString() || null,
    lines: lines.map((line) => {
      const modifiersMinor = line.modifierSnapshots.reduce(
        (sum, m) => sum + m.priceDeltaMinor,
        0,
      );
      const lineTotalMinor =
        (line.priceSnapshotMinor + modifiersMinor) * line.quantity;
      return {
        quantity: line.quantity,
        nameSnapshot: line.nameSnapshot,
        totalMinor: lineTotalMinor,
      };
    }),
    subtotalMinor: ticket.subtotalMinor,
    discountMinor: ticket.discountMinor,
    taxMinor: ticket.taxMinor,
    serviceChargeMinor: ticket.serviceChargeMinor,
    totalMinor: ticket.totalMinor,
    payment: {
      method: payment.method,
      tenderedMinor: payment.tenderedMinor,
      changeMinor: payment.changeMinor,
      cashierName: cashier?.name || "Unknown Cashier",
    },
    footerText: settings.receiptFooter ?? undefined,
  };

  await AuditLogModel.create({
    actorId: actorUserId,
    entity: "Ticket",
    entityId: ticket._id.toString(),
    action: "READ",
    metadata: {
      details: "Viewed receipt",
    },
  });

  return receipt;
}

export async function generateReceiptPdf(
  ticketId: string,
  actorUserId: string,
): Promise<Buffer> {
  const receipt = await getReceipt(ticketId, actorUserId);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(receipt.restaurantName, { align: "center" });
      doc.moveDown(0.5);

      doc.fontSize(10).font("Helvetica");
      if (receipt.restaurantAddress)
        doc.text(receipt.restaurantAddress, { align: "center" });
      if (receipt.restaurantPhone)
        doc.text(`Phone: ${receipt.restaurantPhone}`, { align: "center" });
      if (receipt.restaurantEmail)
        doc.text(`Email: ${receipt.restaurantEmail}`, { align: "center" });

      doc.moveDown(1);
      doc.text(`Ticket: #${receipt.ticketNo}`);
      doc.text(`Table: ${receipt.tableLabel}`);
      doc.text(`Server: ${receipt.waiterName}`);
      doc.text(`Opened: ${new Date(receipt.openedAt).toLocaleString()}`);
      if (receipt.paidAt)
        doc.text(`Paid: ${new Date(receipt.paidAt).toLocaleString()}`);

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // Items
      receipt.lines.forEach((line) => {
        doc.text(`${line.quantity}x ${line.nameSnapshot}`, 50, doc.y, {
          continued: true,
        });
        doc.text(`$${minorToDisplay(line.totalMinor, 2)}`, { align: "right" });
      });

      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // Totals
      doc
        .text("Subtotal", 50, doc.y, { continued: true })
        .text(`$${minorToDisplay(receipt.subtotalMinor, 2)}`, {
          align: "right",
        });
      if (receipt.discountMinor > 0) {
        doc
          .text("Discount", 50, doc.y, { continued: true })
          .text(`-$${minorToDisplay(receipt.discountMinor, 2)}`, {
            align: "right",
          });
      }
      doc
        .text("Tax", 50, doc.y, { continued: true })
        .text(`$${minorToDisplay(receipt.taxMinor, 2)}`, { align: "right" });
      doc
        .text("Service Charge", 50, doc.y, { continued: true })
        .text(`$${minorToDisplay(receipt.serviceChargeMinor, 2)}`, {
          align: "right",
        });

      doc.moveDown(0.5);
      doc
        .font("Helvetica-Bold")
        .text("Total", 50, doc.y, { continued: true })
        .text(`$${minorToDisplay(receipt.totalMinor, 2)}`, { align: "right" });

      doc.moveDown(1);
      doc.font("Helvetica");
      if (receipt.payment) {
        doc.text(`Method: ${receipt.payment.method}`);
        doc.text(
          `Tendered: $${minorToDisplay(receipt.payment.tenderedMinor, 2)}`,
        );
        doc.text(`Change: $${minorToDisplay(receipt.payment.changeMinor, 2)}`);
        doc.text(`Cashier: ${receipt.payment.cashierName}`);
      }

      doc.moveDown(1);
      if (receipt.footerText) {
        doc
          .font("Helvetica-Oblique")
          .text(receipt.footerText, { align: "center" });
      }

      doc.end();

      // Log PDF Generation (fire-and-forget logic done synchronously here)
      AuditLogModel.create({
        actorId: actorUserId,
        entity: "Ticket",
        entityId: ticketId,
        action: "READ",
        metadata: {
          details: "Exported PDF receipt",
        },
      }).catch(console.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function sendReceiptEmail(
  ticketId: string,
  email: string,
  actorUserId: string,
  idempotencyKey: string,
): Promise<{ success: boolean } | null> {
  const session = await mongoose.startSession();

  try {
    let result: { success: boolean } | null = null;
    await session.withTransaction(async () => {
      const scope = `send-receipt-email:${ticketId}`;
      const existing = await IdempotencyRecordModel.findOne({
        key: idempotencyKey,
        scope,
      }).session(session);

      if (existing) {
        result = existing.resultMetadata;
        return;
      }

      // Ensure receipt can be generated (also throws if not paid/not found)
      const ticket = await TicketModel.findById(ticketId).session(session);
      if (!ticket) throw new Error("TICKET_NOT_FOUND");
      if (ticket.status !== "PAID") throw new Error("TICKET_NOT_PAID");

      // Mock email sending
      console.log(
        `[Email Stub] Sending receipt for ticket ${ticketId} to ${email}`,
      );

      result = { success: true };

      await IdempotencyRecordModel.create(
        [
          {
            key: idempotencyKey,
            scope,
            status: "SUCCEEDED",
            requestHash: "N/A",
            resultMetadata: result,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
          },
        ],
        { session },
      );

      await AuditLogModel.create(
        [
          {
            actorId: actorUserId,
            entity: "Ticket",
            entityId: ticketId,
            action: "UPDATE",
            metadata: {
              details: `Sent receipt via email to ${email}`,
            },
          },
        ],
        { session },
      );
    });

    return result;
  } finally {
    await session.endSession();
  }
}
