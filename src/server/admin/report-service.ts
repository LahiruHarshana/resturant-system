import { TicketModel, OrderLineModel, PaymentModel } from "@/server/db/models";
import { connectToDatabase } from "@/server/db/connect";
class ApplicationError extends Error {
  name = "ApplicationError";
}

export interface ReportDateRange {
  from: Date;
  to: Date;
}

function validateRange(range: ReportDateRange) {
  if (!(range.from instanceof Date) || !(range.to instanceof Date)) {
    throw new ApplicationError("Invalid date range provided");
  }
  if (isNaN(range.from.getTime()) || isNaN(range.to.getTime())) {
    throw new ApplicationError("Invalid date range provided");
  }
  if (range.from >= range.to) {
    throw new ApplicationError("Start date must be before end date");
  }
  // Max 1 year range to prevent memory overload
  if (range.to.getTime() - range.from.getTime() > 366 * 24 * 60 * 60 * 1000) {
    throw new ApplicationError("Date range cannot exceed 1 year");
  }
}

export async function getSalesSummary(range: ReportDateRange) {
  await connectToDatabase();
  validateRange(range);
  validateRange(range);

  const pipeline = [
    {
      $match: {
        status: "PAID",
        paidAt: { $gte: range.from, $lt: range.to },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenueMinor: { $sum: "$totalMinor" },
        paidTicketCount: { $sum: 1 },
      },
    },
  ];

  const result = await TicketModel.aggregate(pipeline).exec();
  const summary = result[0] || { totalRevenueMinor: 0, paidTicketCount: 0 };
  const averageTicketValueMinor =
    summary.paidTicketCount > 0
      ? Math.round(summary.totalRevenueMinor / summary.paidTicketCount)
      : 0;

  // Daily breakdown
  const dailyPipeline = [
    {
      $match: {
        status: "PAID",
        paidAt: { $gte: range.from, $lt: range.to },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$paidAt" },
        },
        revenueMinor: { $sum: "$totalMinor" },
        tickets: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 as const } },
  ];

  const dailyResult = await TicketModel.aggregate(dailyPipeline).exec();
  const salesByDay = dailyResult.map(
    (d: { _id: string; revenueMinor: number; tickets: number }) => ({
      date: d._id,
      revenueMinor: d.revenueMinor,
      tickets: d.tickets,
    }),
  );

  return {
    totalRevenueMinor: summary.totalRevenueMinor,
    paidTicketCount: summary.paidTicketCount,
    averageTicketValueMinor,
    salesByDay,
  };
}

export async function getPaymentBreakdown(range: ReportDateRange) {
  await connectToDatabase();
  validateRange(range);
  validateRange(range);

  const pipeline = [
    {
      $match: {
        createdAt: { $gte: range.from, $lt: range.to },
      },
    },
    // We only want payments linked to PAID tickets
    {
      $lookup: {
        from: "tickets",
        localField: "ticketId",
        foreignField: "_id",
        as: "ticket",
      },
    },
    { $unwind: "$ticket" },
    {
      $match: {
        "ticket.status": "PAID",
      },
    },
    {
      $group: {
        _id: "$method",
        totalMinor: { $sum: "$amountMinor" },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalMinor: -1 as const } },
  ];

  const results = await PaymentModel.aggregate(pipeline).exec();
  return results.map(
    (r: { _id: string; totalMinor: number; count: number }) => ({
      method: r._id,
      totalMinor: r.totalMinor,
      count: r.count,
    }),
  );
}

export async function getTopMenuItems(range: ReportDateRange, limit = 20) {
  validateRange(range);

  const pipeline = [
    {
      $match: {
        createdAt: { $gte: range.from, $lt: range.to },
        status: { $ne: "VOID" },
      },
    },
    {
      $lookup: {
        from: "tickets",
        localField: "ticketId",
        foreignField: "_id",
        as: "ticket",
      },
    },
    { $unwind: "$ticket" },
    {
      $match: {
        "ticket.status": "PAID",
      },
    },
    {
      $group: {
        _id: "$menuItemId",
        nameSnapshot: { $first: "$nameSnapshot" },
        quantity: { $sum: "$quantity" },
        revenueMinor: {
          $sum: { $multiply: ["$priceSnapshotMinor", "$quantity"] },
        },
      },
    },
    { $sort: { quantity: -1 as const } },
    { $limit: limit },
  ];

  const results = await OrderLineModel.aggregate(pipeline).exec();
  return results.map(
    (r: {
      _id: string;
      nameSnapshot: string;
      quantity: number;
      revenueMinor: number;
    }) => ({
      menuItemId: r._id.toString(),
      nameSnapshot: r.nameSnapshot,
      quantity: r.quantity,
      revenueMinor: r.revenueMinor,
    }),
  );
}

export async function getStationPerformance(range: ReportDateRange) {
  validateRange(range);

  const pipeline = [
    {
      $match: {
        createdAt: { $gte: range.from, $lt: range.to },
        status: "SERVED",
        firedAt: { $type: "date" },
        readyAt: { $type: "date" },
      },
    },
    {
      $lookup: {
        from: "tickets",
        localField: "ticketId",
        foreignField: "_id",
        as: "ticket",
      },
    },
    { $unwind: "$ticket" },
    {
      $match: {
        "ticket.status": "PAID",
      },
    },
    {
      $group: {
        _id: "$stationId",
        stationTypeSnapshot: { $first: "$stationTypeSnapshot" },
        linesServed: { $sum: 1 },
        totalPrepTimeMs: {
          $sum: { $subtract: ["$readyAt", "$firedAt"] },
        },
      },
    },
    { $sort: { linesServed: -1 as const } },
  ];

  const results = await OrderLineModel.aggregate(pipeline).exec();
  return results.map(
    (r: {
      _id: string;
      stationTypeSnapshot: string;
      linesServed: number;
      totalPrepTimeMs: number;
    }) => ({
      stationId: r._id.toString(),
      stationTypeSnapshot: r.stationTypeSnapshot,
      linesServed: r.linesServed,
      averagePrepTimeSeconds:
        r.linesServed > 0
          ? Math.round(r.totalPrepTimeMs / r.linesServed / 1000)
          : 0,
    }),
  );
}

export async function getWaiterPerformance(range: ReportDateRange) {
  validateRange(range);

  const pipeline = [
    {
      $match: {
        status: "PAID",
        paidAt: { $gte: range.from, $lt: range.to },
      },
    },
    {
      $group: {
        _id: "$waiterId",
        tickets: { $sum: 1 },
        revenueMinor: { $sum: "$totalMinor" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "waiter",
      },
    },
    { $unwind: "$waiter" },
    { $sort: { revenueMinor: -1 as const } },
  ];

  const results = await TicketModel.aggregate(pipeline).exec();
  return results.map(
    (r: {
      _id: string;
      tickets: number;
      revenueMinor: number;
      waiter: { name: string };
    }) => ({
      waiterId: r._id.toString(),
      waiterName: r.waiter.name,
      tickets: r.tickets,
      revenueMinor: r.revenueMinor,
    }),
  );
}

export async function getExceptionSummary(range: ReportDateRange) {
  await connectToDatabase();
  validateRange(range);
  validateRange(range);

  const cancelledTickets = await TicketModel.countDocuments({
    status: "CANCELLED",
    createdAt: { $gte: range.from, $lt: range.to },
  });

  const voidedLines = await OrderLineModel.countDocuments({
    status: "VOID",
    createdAt: { $gte: range.from, $lt: range.to },
  });

  return {
    cancelledTickets,
    voidedLines,
  };
}
