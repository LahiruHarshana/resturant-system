import { AuditLogModel } from "@/server/db/models/audit-log.model";
class ApplicationError extends Error {
  name = "ApplicationError";
}
import { connectToDatabase } from "@/server/db/connect";

export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  from?: Date;
  to?: Date;
  action?: string;
  actorId?: string;
}

export const REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_KEYS = /password|hash|token|secret|pin|card|cvv|credentials/i;

export function redactSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object" || data instanceof Date) return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  const redacted: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    if (SENSITIVE_KEYS.test(key)) {
      redacted[key] = REDACTED_VALUE;
    } else {
      redacted[key] = redactSensitiveData(
        (data as Record<string, unknown>)[key],
      );
    }
  }
  return redacted;
}

export async function getAuditLogs(query: AuditLogQuery) {
  await connectToDatabase();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 50));
  const skip = (page - 1) * pageSize;

  const filter: Record<string, unknown> = {};

  if (query.from || query.to) {
    const atFilter: Record<string, Date> = {};
    if (query.from) {
      if (isNaN(query.from.getTime())) {
        throw new ApplicationError("Invalid from date");
      }
      atFilter.$gte = query.from;
    }
    if (query.to) {
      if (isNaN(query.to.getTime())) {
        throw new ApplicationError("Invalid to date");
      }
      atFilter.$lt = query.to;
    }
    filter.at = atFilter;
  }

  if (query.action) {
    filter.action = query.action;
  }

  if (query.actorId) {
    filter.actorId = query.actorId;
  }

  const [total, items] = await Promise.all([
    AuditLogModel.countDocuments(filter),
    AuditLogModel.find(filter)
      .sort({ at: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate("actorId", "name email")
      .lean()
      .exec(),
  ]);

  const redactedItems = items.map((item: Record<string, unknown>) => ({
    id: (item._id as { toString(): string }).toString(),
    action: item.action,
    actorId:
      (item.actorId as { _id?: { toString(): string } })?._id?.toString() ||
      (item.actorId as { toString?(): string })?.toString?.() ||
      null,
    actorName: (item.actorId as { name?: string })?.name || null,
    entity: item.entity,
    entityId: (item.entityId as { toString?(): string })?.toString?.() || null,
    at: item.at instanceof Date ? item.at.toISOString() : item.at,
    metadata: redactSensitiveData(item.metadata) as Record<string, unknown>,
  }));

  return {
    items: redactedItems,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
